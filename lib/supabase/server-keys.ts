import "server-only";

/** Supabase's newer `secret` key replaces the service-role key. Accept either. */
export function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}
