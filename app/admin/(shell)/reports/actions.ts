"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

const ADMINS = ["owner", "manager"] as const;

export type SpendState = { status: "idle" | "saved" | "error"; message?: string };

const spendSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  channel: z.string().trim().min(1, "Enter a channel, e.g. Meta").max(60),
  campaign: z.string().trim().max(120).optional(),
  currency: z.enum(CURRENCIES),
  amount: z.string().trim().min(1, "Enter the amount spent"),
});

/** Record ad spend by hand (owner/manager; RLS enforces it too). */
export async function addSpend(_: SpendState, formData: FormData): Promise<SpendState> {
  await requireStaff(ADMINS);
  const parsed = spendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { date, channel, campaign, currency, amount } = parsed.data;
  const amountMinor = parseMajorToMinor(amount, currency); // rule 1: integer minor units
  if (amountMinor == null)
    return { status: "error", message: "Enter the amount as a number, e.g. 25000 or 25000.50" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ad_spend")
    .insert({ date, channel, campaign: campaign || null, currency, amount_minor: amountMinor });
  if (error)
    return {
      status: "error",
      message: error.code === "42501" ? "You don't have permission to do that." : "Couldn't save. Try again.",
    };
  revalidatePath("/admin/reports");
  return { status: "saved", message: "Ad spend added." };
}

export async function deleteSpend(formData: FormData): Promise<void> {
  await requireStaff(ADMINS);
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("ad_spend").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/reports");
}
