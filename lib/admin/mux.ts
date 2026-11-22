import "server-only";
import Mux from "@mux/mux-node";

/**
 * Mux client for product video (PDP-2, ADM-2), or null when the keys are not
 * configured. Video upload is optional: the admin shows a notice instead of failing.
 */
export function getMux(): Mux | null {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) return null;
  return new Mux({ tokenId, tokenSecret, webhookSecret: process.env.MUX_WEBHOOK_SECRET ?? null });
}

export function muxConfigured(): boolean {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}
