"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

/** Sends a magic link to an existing staff account (ADM-1). Never creates users. */
export async function sendStaffMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { status: "error", message: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/admin`,
    },
  });

  // Same reply whether or not the address exists, so staff emails can't be probed.
  if (error && error.status !== 400 && error.status !== 422) {
    return { status: "error", message: "We couldn't send the link. Try again in a minute." };
  }
  return { status: "sent" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
