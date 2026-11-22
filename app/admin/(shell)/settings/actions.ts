"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fxRateSchema, shippingRateSchema, zoneSchema } from "@/lib/admin/settings";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { status: "idle" | "saved" | "error"; message?: string };

const uuid = z.string().uuid();

function firstProblem(error: z.ZodError): SettingsState {
  return { status: "error", message: error.issues[0]?.message ?? "Check the fields and try again." };
}

function dbProblem(error: { code?: string }, duplicate: string): SettingsState {
  if (error.code === "23505") return { status: "error", message: duplicate };
  if (error.code === "42501") return { status: "error", message: "You don't have permission to do that." };
  return { status: "error", message: "Couldn't save. Try again." };
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const maybeId = (formData: FormData) => {
  const id = uuid.safeParse(formData.get("id"));
  return id.success ? id.data : null;
};

// Settings are owner-only (PRD › Users and roles). Writes use the owner's own session,
// so row-level security and the audit triggers still apply (ADM-7).

/** CUR-2: an exchange rate, with an optional rounding step. */
export async function saveFxRate(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const staff = await requireStaff(["owner"]);
  const parsed = fxRateSchema.safeParse({
    base: text(formData, "base"),
    quote: text(formData, "quote"),
    rate: text(formData, "rate"),
    rounding: text(formData, "rounding"),
  });
  if (!parsed.success) return firstProblem(parsed.error);

  const row = {
    base: parsed.data.base,
    quote: parsed.data.quote,
    rate: Number(parsed.data.rate),
    rounding_increment_minor: parsed.data.roundingIncrementMinor,
    updated_by: staff.id,
  };
  const supabase = await createClient();
  const id = maybeId(formData);
  const { error } = id
    ? await supabase.from("fx_rates").update(row).eq("id", id)
    : await supabase.from("fx_rates").insert(row);
  if (error) return dbProblem(error, "That pair of currencies already has a rate. Edit it instead.");

  revalidatePath("/admin/settings");
  return { status: "saved", message: id ? "Rate saved." : "Rate added." };
}

export async function deleteFxRate(formData: FormData): Promise<void> {
  await requireStaff(["owner"]);
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  await (await createClient()).from("fx_rates").delete().eq("id", id.data);
  revalidatePath("/admin/settings");
}

/** PAY-3: a shipping zone (a set of countries; blank = the rest of the world). */
export async function saveZone(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireStaff(["owner"]);
  const parsed = zoneSchema.safeParse({
    name: text(formData, "name"),
    countries: text(formData, "countries"),
  });
  if (!parsed.success) return firstProblem(parsed.error);

  const supabase = await createClient();
  const id = maybeId(formData);
  const { error } = id
    ? await supabase.from("shipping_zones").update(parsed.data).eq("id", id)
    : await supabase.from("shipping_zones").insert(parsed.data);
  if (error) return dbProblem(error, "A zone with that name already exists.");

  revalidatePath("/admin/settings");
  return { status: "saved", message: id ? "Zone saved." : "Zone added." };
}

export async function deleteZone(formData: FormData): Promise<void> {
  await requireStaff(["owner"]);
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  // Its delivery charges go with it. Past orders keep their own totals.
  await (await createClient()).from("shipping_zones").delete().eq("id", id.data);
  revalidatePath("/admin/settings");
}

/** PAY-3: a delivery charge in one currency for a zone. */
export async function saveShippingRate(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireStaff(["owner"]);
  const parsed = shippingRateSchema.safeParse({
    zoneId: text(formData, "zoneId"),
    name: text(formData, "name"),
    currency: text(formData, "currency"),
    amount: text(formData, "amount"),
    etaText: text(formData, "etaText"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return firstProblem(parsed.error);

  const row = {
    zone_id: parsed.data.zoneId,
    name: parsed.data.name,
    currency: parsed.data.currency,
    amount_minor: parsed.data.amountMinor,
    eta_text: parsed.data.etaText,
    active: parsed.data.active,
  };
  const supabase = await createClient();
  const id = maybeId(formData);
  const { error } = id
    ? await supabase.from("shipping_rates").update(row).eq("id", id)
    : await supabase.from("shipping_rates").insert(row);
  if (error) return dbProblem(error, "That delivery charge already exists.");

  revalidatePath("/admin/settings");
  return { status: "saved", message: id ? "Charge saved." : "Charge added." };
}

export async function deleteShippingRate(formData: FormData): Promise<void> {
  await requireStaff(["owner"]);
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  await (await createClient()).from("shipping_rates").delete().eq("id", id.data);
  revalidatePath("/admin/settings");
}
