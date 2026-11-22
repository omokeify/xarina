import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/admin/service-client";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "./tokens";

/** Opaque Privé session cookie, set when a single-use access link is redeemed. */
export const PRIVE_COOKIE = "xa_prive";

/**
 * The approved Privé member making this request, or null (VIP-2, rule 7).
 * Two ways in, both verified server-side:
 *  1. a Privé session cookie created by redeeming a single-use access link;
 *  2. a verified email login (magic link / OTP) whose email belongs to an
 *     approved member. Never an email typed into a form.
 */
export const getPriveCustomerId = cache(async (): Promise<string | null> => {
  const jar = await cookies();
  const service = createServiceClient();

  const token = jar.get(PRIVE_COOKIE)?.value;
  if (token) {
    const { data } = await service.rpc("prive_session_customer", { p_session_hash: hashToken(token) });
    if (data) return data;
  }

  // Skip the auth round trip for visitors with no Supabase session cookie.
  if (!jar.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email?.toLowerCase();
  if (!auth.user || !email || !auth.user.email_confirmed_at) return null;

  const { data: customer } = await service
    .from("customers")
    .select("id, is_vip, auth_user_id")
    .eq("email", email)
    .maybeSingle();
  if (!customer?.is_vip) return null;
  if (!customer.auth_user_id) {
    await service.from("customers").update({ auth_user_id: auth.user.id }).eq("id", customer.id);
  }
  return customer.id;
});

export async function isPriveMember(): Promise<boolean> {
  return (await getPriveCustomerId()) !== null;
}
