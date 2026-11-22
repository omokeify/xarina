"use server";

import { z } from "zod";
import WaitlistConfirmation from "@/emails/waitlist-confirmation";
import { createServiceClient } from "@/lib/admin/service-client";
import { getAttribution } from "@/lib/attribution/server";
import { sendEmail } from "@/lib/email/client";
import { getEmailSite } from "@/lib/email/site";
import { publicEnv } from "@/lib/env";
import { isRateLimited, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";

export type WaitlistState = { status: "idle" | "done" | "error"; message?: string; detail?: string };

const checkbox = z.literal("on").optional();

const joinSchema = z.object({
  productId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  colour: z.string().trim().max(60).optional(),
  size: z.string().trim().max(30).optional(),
  // Rule 12: two separate boxes, never ticked for the shopper.
  marketing: checkbox,
  dropAlerts: checkbox,
});

/** WL-1..4: one entry per email per design; a repeat sign-up updates preferences. */
export async function joinWaitlist(_: WaitlistState, formData: FormData): Promise<WaitlistState> {
  if (await isRateLimited("waitlist")) return { status: "error", message: TOO_MANY_ATTEMPTS };
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await createServiceClient().rpc("join_waitlist", {
    p_product_id: d.productId,
    p_email: d.email,
    p_name: d.name || undefined,
    p_phone: d.phone || undefined,
    p_colour: d.colour || undefined,
    p_size: d.size || undefined,
    p_marketing_consent: d.marketing === "on",
    p_drop_alert_consent: d.dropAlerts === "on",
    p_utm: await getAttribution(),
  });
  if (error) return { status: "error", message: "We could not add you just now. Please try again." };

  // WL-3. The signup is already saved, so a failed email never fails the request.
  const { data: product } = await createServiceClient()
    .from("products")
    .select("name, slug")
    .eq("id", d.productId)
    .single();
  const sent = product
    ? await sendEmail({
        to: d.email,
        subject: `You are on the waitlist for ${product.name}`,
        react: WaitlistConfirmation({
          site: getEmailSite(),
          productName: product.name,
          productUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${product.slug}`,
          dropAlerts: d.dropAlerts === "on",
        }),
      })
    : null;

  return {
    status: "done",
    message:
      sent?.status === "sent"
        ? "You are on the waitlist. We have sent a confirmation to your email."
        : "You are on the waitlist.",
    // What was recorded, so the shopper sees exactly what they agreed to (rule 12).
    detail: `Drop alerts ${d.dropAlerts === "on" ? "on" : "off"}. Marketing emails ${d.marketing === "on" ? "on" : "off"}.`,
  };
}

const dropAlertsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Rule 12: separate boxes, never ticked for the shopper. Drop alerts are the
  // point of this form, so they are required; marketing stays optional.
  dropAlerts: z.literal("on", { error: "Tick the box to receive drop alerts" }),
  marketing: z.literal("on").optional(),
});

/**
 * Site-wide drop alerts (footer signup): every future drop, not one design's
 * waitlist. Fields: email, dropAlerts (required checkbox), marketing (optional).
 */
export async function joinDropAlerts(_: WaitlistState, formData: FormData): Promise<WaitlistState> {
  if (await isRateLimited("dropAlerts")) return { status: "error", message: TOO_MANY_ATTEMPTS };
  const parsed = dropAlertsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { error } = await createServiceClient().rpc("join_drop_alerts", {
    p_email: parsed.data.email,
    p_drop_alert_consent: true,
    p_marketing_consent: parsed.data.marketing === "on",
    // First touch only: the database keeps the earliest campaign and ignores later ones.
    p_utm: await getAttribution(),
  });
  if (error) return { status: "error", message: "We could not add you just now. Please try again." };
  return { status: "done", message: "You are on the list. We will email you when a drop opens." };
}

const restockSchema = z.object({
  variantId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

/** Ask to be told when a sold-out size is back. */
export async function requestRestock(_: WaitlistState, formData: FormData): Promise<WaitlistState> {
  if (await isRateLimited("restock")) return { status: "error", message: TOO_MANY_ATTEMPTS };
  const parsed = restockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { error } = await createServiceClient().rpc("request_restock", {
    p_variant_id: parsed.data.variantId,
    p_email: parsed.data.email,
  });
  if (error) return { status: "error", message: "We could not save that just now. Please try again." };
  return { status: "done", message: "Noted. We will email you once this size is back." };
}
