import "server-only";
import { z } from "zod";
import { CURRENCIES } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Reporting page (PRD › Reporting page). Data from public.admin_report: paid
// orders only (rule 2), waitlists as interest (rule 9), minor units per
// currency (rule 1). Owner and manager only (checked again in the database).

const currency = z.enum(CURRENCIES);
const int = z.coerce.number().int();

const report = z.object({
  by_currency: z.array(
    z.object({ currency, orders: int, revenue_minor: int, new_customers: int, spend_minor: int }),
  ),
  by_day: z.array(z.object({ day: z.string(), currency, orders: int, revenue_minor: int })),
  by_drop: z.array(z.object({ drop: z.string().nullable(), currency, orders: int, revenue_minor: int })),
  interest: z.array(z.object({ product: z.string(), slug: z.string(), signups: int })),
  spend: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      channel: z.string(),
      campaign: z.string().nullable(),
      currency,
      amount_minor: int,
    }),
  ),
});
export type Report = z.infer<typeof report>;

export async function getReport(from: string, to: string): Promise<Report> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_report", { p_from: from, p_to: to });
  if (error) throw error;
  return report.parse(data);
}

/** ISO date (YYYY-MM-DD) in UTC, `daysAgo` days before `now`. */
export function isoDay(now: Date, daysAgo = 0): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
  return d.toISOString().slice(0, 10);
}
