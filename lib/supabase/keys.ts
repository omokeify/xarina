/**
 * Supabase renamed its keys: `anon` is now `publishable`. Both work with
 * supabase-js, so accept either. Keep the literal property accesses so Next.js
 * can inline the public key at build time.
 */
export function supabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
