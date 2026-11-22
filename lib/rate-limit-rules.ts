// Pure rules for anti-abuse rate limiting (no server imports, so unit-tested).

/** Per-visitor limits. Generous for real shoppers, tight enough to stop scripts. */
export const LIMITS = {
  waitlist: { limit: 10, windowSeconds: 600 },
  dropAlerts: { limit: 5, windowSeconds: 600 },
  restock: { limit: 10, windowSeconds: 600 },
  priveRequest: { limit: 5, windowSeconds: 3600 },
  priveSignIn: { limit: 5, windowSeconds: 600 },
  checkout: { limit: 20, windowSeconds: 600 },
  // Provider webhooks retry legitimately, so this only throttles writes of
  // rejected (bad-signature) deliveries, not genuine paid events.
  webhookInvalid: { limit: 60, windowSeconds: 600 },
} as const;
export type LimitedAction = keyof typeof LIMITS;

export const TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a few minutes and try again.";

/** The visitor's IP: first x-forwarded-for entry (set by Vercel), else x-real-ip. */
export function clientIp(get: (name: string) => string | null): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : "unknown";
}

/** Off in development and when RATE_LIMITS=off (the e2e server, where every request comes from one IP). */
export function limitsEnabled(env: { NODE_ENV?: string; RATE_LIMITS?: string }): boolean {
  return env.NODE_ENV !== "development" && env.RATE_LIMITS !== "off";
}
