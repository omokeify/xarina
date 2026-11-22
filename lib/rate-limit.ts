import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/admin/service-client";
import { LIMITS, clientIp, limitsEnabled, type LimitedAction } from "./rate-limit-rules";

export { TOO_MANY_ATTEMPTS } from "./rate-limit-rules";

/**
 * Records an attempt and returns true when this visitor is over the limit for
 * the action. Fails open: if the check itself errors, the shopper is not blocked.
 */
export async function isRateLimited(action: LimitedAction): Promise<boolean> {
  if (!limitsEnabled(process.env)) return false;
  const h = await headers();
  const { limit, windowSeconds } = LIMITS[action];
  const { data, error } = await createServiceClient().rpc("hit_rate_limit", {
    p_key: `${action}:${clientIp((name) => h.get(name))}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return false;
  }
  return data === false;
}
