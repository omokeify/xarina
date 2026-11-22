// Pins the seeded drops' timing relative to NOW, so specs don't depend on how
// long ago `pnpm db:reset` ran. Uses the service role (server-side only; the
// key comes from .env.local, never from the app bundle).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const DROP_04 = "30000000-0000-4000-a000-000000000001"; // upcoming
export const DROP_05 = "30000000-0000-4000-a000-000000000002"; // Privé window

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} missing from env and .env.local`);
  return line.slice(name.length + 1).trim();
}

const HOUR = 3_600_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

/** Drop 04 upcoming (VIP in 1 day, public in 2), Drop 05 in its Privé window. */
export async function pinDropTimes() {
  const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const updates = [
    { id: DROP_04, vip_opens_at: iso(24 * HOUR), public_opens_at: iso(48 * HOUR), closes_at: iso(240 * HOUR) },
    { id: DROP_05, vip_opens_at: iso(-3 * HOUR), public_opens_at: iso(20 * HOUR), closes_at: iso(336 * HOUR) },
  ];
  for (const { id, ...times } of updates) {
    const { error } = await admin.from("drops").update(times).eq("id", id);
    if (error) throw error;
  }
}
