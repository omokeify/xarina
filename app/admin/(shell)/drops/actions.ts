"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import PriveWelcome from "@/emails/prive-welcome";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/admin/products";
import { dropSchema } from "@/lib/drops/schema";
import { sendEmail } from "@/lib/email/client";
import { getEmailSite } from "@/lib/email/site";
import { publicEnv } from "@/lib/env";
import { earlyAccessHours } from "@/lib/prive/early-access";
import { hashToken, newToken } from "@/lib/prive/tokens";
import { can } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

const EDITORS = ["owner", "manager", "merchandiser"] as const;
const ADMINS = ["owner", "manager"] as const;

export type DropFormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type PriveState = { status: "idle" | "done" | "error"; message?: string; link?: string };

type PgError = { code?: string; message?: string } | null;

function explain(error: PgError): string {
  switch (error?.code) {
    case "42501":
      return "You don't have permission to do that.";
    case "23505":
    case "22023":
    case "23514":
    case "P0002":
      return error.message ?? "That change isn't allowed.";
    default:
      return "Couldn't save. Try again.";
  }
}

/**
 * Welcome a newly approved member. Best-effort: membership is already saved by
 * the time this runs, so an email failure is logged but never reported as a
 * failed approval (the same pattern as dispatch emails).
 */
async function welcomeNewMembers(recipients: { email: string; name: string | null }[]): Promise<void> {
  if (recipients.length === 0) return;
  const supabase = await createClient();
  const { data: drops } = await supabase
    .from("drops")
    .select("vip_opens_at, public_opens_at")
    .gt("public_opens_at", new Date().toISOString());
  const hours = earlyAccessHours(drops ?? [], process.env.PRIVE_EARLY_ACCESS_HOURS);
  const site = getEmailSite();
  const signInUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/prive`;

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.email,
      subject: "Welcome to Xarina Privé",
      react: PriveWelcome({
        site,
        firstName: recipient.name ?? undefined,
        earlyAccessHours: hours,
        email: recipient.email,
        signInUrl,
      }),
    });
    if (result.status === "failed") {
      console.error(`[prive] welcome email failed for ${recipient.email}: ${result.error}`);
    }
  }
}

/** ADM-4: create or update a drop. Times arrive as UTC ISO strings (DROP-1). */
export async function saveDrop(
  id: string | null,
  _: DropFormState,
  formData: FormData,
): Promise<DropFormState> {
  const staff = await requireStaff(EDITORS);
  const parsed = dropSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }
  // Publishing a drop makes it public, so it needs the same role as publishing a product.
  if (parsed.data.published && !can.publish(staff.role)) {
    return { status: "error", message: "Only an owner or manager can publish a drop." };
  }

  const supabase = await createClient();

  // Hero image (optional). undefined = leave as is, "" = remove, a path = replace.
  let heroPath: string | undefined;
  const hero = formData.get("hero");
  if (hero instanceof File && hero.size > 0) {
    const ext = IMAGE_TYPES[hero.type];
    if (!ext) return { status: "error", message: "Use a JPEG, PNG, WebP or AVIF image." };
    if (hero.size > MAX_IMAGE_BYTES) return { status: "error", message: "That image is over 8 MB." };
    if (!parsed.data.hero_alt) {
      return {
        status: "error",
        message: "Describe the hero image for screen readers.",
        fieldErrors: { hero_alt: "Describe the image" },
      };
    }
    heroPath = `drops/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-media")
      .upload(heroPath, hero, { contentType: hero.type });
    if (uploadError) return { status: "error", message: "The hero image didn't upload. Try again." };
  } else if (formData.get("remove_hero") === "on") {
    heroPath = "";
  }

  let previousHero: string | null = null;
  if (id && heroPath !== undefined) {
    const { data: current } = await supabase
      .from("drops")
      .select("hero_storage_path")
      .eq("id", id)
      .maybeSingle();
    previousHero = current?.hero_storage_path ?? null;
  }

  const { data, error } = await supabase.rpc("admin_save_drop", {
    p_data: { ...parsed.data, ...(heroPath !== undefined && { hero_storage_path: heroPath }) },
    p_id: id ?? undefined,
  });
  if (error) {
    if (heroPath) await supabase.storage.from("product-media").remove([heroPath]);
    return { status: "error", message: explain(error) };
  }
  // The new image is saved; the replaced or removed file is no longer referenced.
  if (previousHero) await supabase.storage.from("product-media").remove([previousHero]);

  revalidatePath("/admin/drops");
  revalidatePath("/drops", "layout");
  revalidatePath("/shop");
  revalidatePath("/");
  if (!id) redirect(`/admin/drops/${data}`);
  return { status: "saved", message: "Saved." };
}

/** ADM-4: the designs in a drop. A design can be in only one open drop. */
export async function saveDropProducts(
  dropId: string,
  _: DropFormState,
  formData: FormData,
): Promise<DropFormState> {
  await requireStaff(EDITORS);
  const ids = z.array(z.string().uuid()).safeParse(formData.getAll("product_id"));
  if (!ids.success) return { status: "error", message: "Choose valid designs." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_drop_products", {
    p_drop_id: dropId,
    p_product_ids: ids.data,
  });
  if (error) return { status: "error", message: explain(error) };

  revalidatePath(`/admin/drops/${dropId}`);
  revalidatePath("/shop");
  revalidatePath("/");
  return { status: "saved", message: "Designs saved." };
}

/** ADM-4: permanently delete a drop. Owner only; the DB RPC enforces it too. */
export async function deleteDrop(id: string, _: DropFormState, formData: FormData): Promise<DropFormState> {
  const staff = await requireStaff(EDITORS);
  if (staff.role !== "owner") return { status: "error", message: "Only an owner can delete a drop." };
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown drop" };

  const supabase = await createClient();
  const { data: drop } = await supabase.from("drops").select("id, name").eq("id", id).maybeSingle();
  if (!drop) return { status: "error", message: "That drop is already gone" };
  if (String(formData.get("confirm") ?? "").trim() !== drop.name) {
    return { status: "error", message: `Type the drop name exactly (${drop.name}) to confirm` };
  }

  const { error } = await supabase.rpc("admin_delete_drop", { p_id: id });
  if (error) return { status: "error", message: explain(error) };

  revalidatePath("/admin/drops");
  revalidatePath("/drops", "layout");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/drops?deleted=1");
}

/** VIP-1: bulk approve from a pasted list of emails. */
export async function approvePriveEmails(_: PriveState, formData: FormData): Promise<PriveState> {
  const staff = await requireStaff(ADMINS);
  if (!can.approvePrive(staff.role))
    return { status: "error", message: "You don't have permission to do that." };

  const emails = String(formData.get("emails") ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const valid = z.array(z.string().email()).min(1, "Paste at least one email").safeParse(emails);
  if (!valid.success) return { status: "error", message: valid.error.issues[0].message };

  const supabase = await createClient();
  // Snapshot who was already a member so re-pasting a list never re-welcomes them.
  const { data: existing } = await supabase
    .from("customers")
    .select("email")
    .in("email", valid.data)
    .eq("is_vip", true);
  const already = new Set((existing ?? []).map((c) => c.email));

  const { data, error } = await supabase.rpc("admin_approve_vip_emails", { p_emails: valid.data });
  if (error) return { status: "error", message: explain(error) };

  const { data: nowMembers } = await supabase
    .from("customers")
    .select("email, name")
    .in("email", valid.data)
    .eq("is_vip", true);
  await welcomeNewMembers((nowMembers ?? []).filter((c) => !already.has(c.email)));

  revalidatePath("/admin/drops/prive");
  return { status: "done", message: `${data} new member${data === 1 ? "" : "s"} approved.` };
}

/** VIP-1: approve or revoke one customer. */
export async function setPriveMembership(customerId: string, approve: boolean): Promise<void> {
  const staff = await requireStaff(ADMINS);
  if (!can.approvePrive(staff.role)) return;
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("customers")
    .select("email, name, is_vip")
    .eq("id", customerId)
    .maybeSingle();
  const { error } = await supabase.rpc("admin_set_vip", { p_customer_ids: [customerId], p_is_vip: approve });
  if (!error && approve && before && !before.is_vip) {
    await welcomeNewMembers([{ email: before.email, name: before.name }]);
  }
  revalidatePath("/admin/drops/prive");
}

/** Revoke one unused access link. Revoking the member remains the wider action. */
export async function revokeAccessLink(linkId: string): Promise<void> {
  const staff = await requireStaff(ADMINS);
  if (!can.approvePrive(staff.role)) return;
  if (!z.string().uuid().safeParse(linkId).success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_access_link", { p_link_id: linkId });
  if (error) console.error(`[prive] could not revoke access link ${linkId}: ${error.message}`);
  revalidatePath("/admin/drops/prive");
}

/**
 * VIP-2, rule 7: a personal single-use link. The raw token is shown once and
 * never stored; only its hash is.
 */
export async function createAccessLink(
  customerId: string,
  _: PriveState,
  formData: FormData,
): Promise<PriveState> {
  const staff = await requireStaff(ADMINS);
  if (!can.approvePrive(staff.role))
    return { status: "error", message: "You don't have permission to do that." };

  const parsed = z
    .object({
      days: z.coerce.number().int().min(1).max(30),
      dropId: z.union([z.literal(""), z.string().uuid()]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Choose an expiry between 1 and 30 days." };

  const token = newToken();
  const expires = new Date(Date.now() + parsed.data.days * 86_400_000).toISOString();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_access_link", {
    p_customer_id: customerId,
    p_token_hash: hashToken(token),
    p_expires_at: expires,
    p_drop_id: parsed.data.dropId || undefined,
  });
  if (error) return { status: "error", message: explain(error) };

  // Refresh the roster so the new link appears immediately in its history.
  revalidatePath("/admin/drops/prive");
  return {
    status: "done",
    message: `Single-use link, expires ${new Date(expires).toUTCString()}. Copy it now: it cannot be shown again.`,
    link: `${publicEnv.NEXT_PUBLIC_SITE_URL}/access/${token}`,
  };
}
