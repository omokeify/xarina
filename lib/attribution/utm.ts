import { z } from "zod";

// Only these five params are attribution. Anything else in the URL (shop filters,
// payment refs, admin filters) must not end up on a waitlist entry or an order.
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type Attribution = Partial<Record<UtmKey, string>>;

// Long enough for real campaign names, short enough to keep the cookie well under 4 KB.
const value = z.string().trim().min(1).max(200);
const attributionSchema = z.strictObject({
  utm_source: value.optional(),
  utm_medium: value.optional(),
  utm_campaign: value.optional(),
  utm_term: value.optional(),
  utm_content: value.optional(),
});

/** Read UTMs from a URL query string. Returns null when there is nothing valid to save. */
export function parseAttribution(search: string): Attribution | null {
  const params = new URLSearchParams(search);
  const candidate: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const found = params.get(key);
    if (found) candidate[key] = found;
  }
  return parsedOrNull(candidate);
}

/**
 * What a visit should save: nothing when a valid first-touch cookie already
 * exists, otherwise the UTMs on this URL (if any). First touch wins.
 */
export function captureFromVisit(search: string, cookieValue?: string): Attribution | null {
  if (decodeAttribution(cookieValue)) return null;
  return parseAttribution(search);
}

/** Compact JSON for the cookie. The caller URL-encodes it when writing. */
export function encodeAttribution(attribution: Attribution): string {
  return JSON.stringify(attributionSchema.parse(attribution));
}

/**
 * Validate and decode a cookie value. Next.js decodes cookie values once when
 * reading them, but try both forms so a raw header value works too.
 */
export function decodeAttribution(raw?: string): Attribution | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      parsed = JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
  return parsedOrNull(parsed);
}

/** Get a cookie's value from a document.cookie string, tolerating "=" in the value. */
export function cookieValue(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

function parsedOrNull(candidate: unknown): Attribution | null {
  const result = attributionSchema.safeParse(candidate);
  if (!result.success) return null;
  return Object.keys(result.data).length > 0 ? (result.data as Attribution) : null;
}
