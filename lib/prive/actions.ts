"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceClient } from "@/lib/admin/service-client";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { PRIVE_COOKIE } from "./session";
import { hashToken, newToken } from "./tokens";
import { isRateLimited, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";

export type PriveFormState = { status: "idle" | "done" | "error"; message?: string };

const email = z.string().trim().toLowerCase().email("Enter a valid email address");

const requestSchema = z.object({
  email,
  name: z.string().trim().min(1, "Enter your name").max(120),
  phone: z.string().trim().max(40).optional(),
  // Rule 12: drop-alert consent is its own unticked box, recorded with a timestamp.
  dropAlerts: z.literal("on").optional(),
});

/** VIP-1: ask to join. Nothing is granted until staff approve. */
export async function requestPriveAccess(_: PriveFormState, formData: FormData): Promise<PriveFormState> {
  if (await isRateLimited("priveRequest")) return { status: "error", message: TOO_MANY_ATTEMPTS };
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { error } = await createServiceClient().rpc("request_prive_access", {
    p_email: parsed.data.email,
    p_name: parsed.data.name,
    p_drop_alert_consent: parsed.data.dropAlerts === "on",
    p_phone: parsed.data.phone || undefined,
  });
  if (error) return { status: "error", message: "Something went wrong. Please try again." };
  return { status: "done", message: "Thank you. We will be in touch once your request has been reviewed." };
}

/**
 * VIP-2: verified email login. The reply is identical whether or not the address
 * belongs to a member, so the list of members can't be probed.
 */
export async function sendPriveSignInLink(_: PriveFormState, formData: FormData): Promise<PriveFormState> {
  if (await isRateLimited("priveSignIn")) return { status: "error", message: TOO_MANY_ATTEMPTS };
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { data: customer } = await createServiceClient()
    .from("customers")
    .select("is_vip")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (customer?.is_vip) {
    const supabase = await createClient();
    await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/prive` },
    });
  }
  return {
    status: "done",
    message: "If that address belongs to a Privé member, a sign-in link is on its way.",
  };
}

/** End the Privé session: forget the link session and any verified email login. */
export async function signOutPrive(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(PRIVE_COOKIE)?.value;
  if (token) {
    await createServiceClient().from("prive_sessions").delete().eq("token_hash", hashToken(token));
    jar.delete(PRIVE_COOKIE);
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prive");
}

/** VIP-2, rule 7: spend a single-use link and start a Privé session. */
export async function redeemAccessLink(token: string): Promise<void> {
  const sessionToken = newToken();
  const { data } = await createServiceClient().rpc("redeem_access_link", {
    p_link_hash: hashToken(token),
    p_session_hash: hashToken(sessionToken),
  });

  const result = z.object({ expires_at: z.string() }).nullable().safeParse(data);
  if (!result.success || !result.data) redirect("/access/invalid");

  const jar = await cookies();
  jar.set(PRIVE_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(result.data.expires_at),
  });
  redirect("/prive");
}
