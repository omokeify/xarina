import type { PaymentProvider, VerifiedPaymentEvent } from "./types";

export type MarkPaidResult =
  "paid" | "already_paid" | "duplicate" | "unknown_order" | "mismatch" | "no_stock";

/** Database calls the webhook needs, injected so the rules can be tested without a database. */
export type WebhookDb = {
  /** Calls public.mark_order_paid: idempotent, matches amount and currency (rules 2, 3). */
  markOrderPaid(provider: string, event: VerifiedPaymentEvent): Promise<MarkPaidResult>;
  /** Keeps a rejected delivery for audit (signature_valid = false). Never blocks a genuine event. */
  recordInvalidEvent(provider: string, rawBody: string): Promise<void>;
};

export type WebhookOutcome = { status: number; result: string };

/**
 * PAY-5: an order becomes paid only here, from a signature-verified provider
 * webhook. The browser redirect never reaches this code path.
 */
export async function handlePaymentWebhook(
  provider: PaymentProvider,
  rawBody: string,
  signature: string | null,
  db: WebhookDb,
  onPaid?: (event: VerifiedPaymentEvent) => Promise<void>,
): Promise<WebhookOutcome> {
  const event = provider.verifyWebhook(rawBody, signature);
  if (!event) {
    await db.recordInvalidEvent(provider.name, rawBody);
    return { status: 401, result: "invalid_signature" };
  }
  // Events that aren't a payment success are acknowledged and ignored.
  if (!event.succeeded) return { status: 200, result: "ignored" };

  const result = await db.markOrderPaid(provider.name, event);
  if (result === "paid" && onPaid) await onPaid(event);
  // mismatch / no_stock / unknown_order are acknowledged (retrying cannot fix them)
  // and kept in payment_events for staff to review.
  return { status: 200, result };
}
