import { afterEach, describe, expect, it, vi } from "vitest";
import { supabasePublishableKey } from "./keys";
import { supabaseSecretKey } from "./server-keys";

vi.mock("server-only", () => ({}));

const names = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

describe("Supabase key aliases", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers the legacy anon key, falling back to the publishable key", () => {
    for (const name of names) vi.stubEnv(name, undefined);
    expect(supabasePublishableKey()).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    expect(supabasePublishableKey()).toBe("publishable");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(supabasePublishableKey()).toBe("anon");
  });

  it("prefers the service role key, falling back to the secret key", () => {
    for (const name of names) vi.stubEnv(name, undefined);
    expect(supabaseSecretKey()).toBeUndefined();
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
    expect(supabaseSecretKey()).toBe("secret");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    expect(supabaseSecretKey()).toBe("service-role");
  });
});
