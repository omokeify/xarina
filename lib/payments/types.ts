import type { Currency } from "@/lib/money";

/** Everything a provider needs to start a payment. Amount and currency are fixed here (PAY-2). */
export type InitializeInput = {
  /** Our own unique reference; also stored on the order before the provider is called. */
  reference: string;
  email: string;
  amountMinor: number;
  currency: Currency;
  callbackUrl: string;
  metadata: { orderId: string; orderNumber: string };
};

export type InitializeResult = { redirectUrl: string };

/** A webhook whose signature has been verified. Only these may change an order. */
export type VerifiedPaymentEvent = {
  /** Provider's own event name, e.g. "charge.success". Part of the idempotency key. */
  eventType: string;
  providerRef: string;
  amountMinor: number;
  currency: Currency;
  /** True only for events that mean money was received. */
  succeeded: boolean;
  payload: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /**
   * Check the signature over the RAW request body (rule 2).
   * Returns null when the signature is missing or wrong, and also when
   * the body isn't a payment event we understand.
   */
  verifyWebhook(rawBody: string, signature: string | null): VerifiedPaymentEvent | null;
}
