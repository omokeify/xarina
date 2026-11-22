import { randomBytes } from "node:crypto";
import type { Currency } from "@/lib/money";
import type { PaymentProvider } from "@/lib/payments/types";

export type CheckoutInput = {
  items: { variantId: string; qty: number }[];
  currency: Currency;
  email: string;
  phone: string;
  address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postcode?: string;
    country: string;
  };
  shippingRateId: string;
  /** Verified Privé member's customer id (rule 7), or null for guests. Never from a form field. */
  priveCustomerId: string | null;
  utm: Record<string, string> | null;
};

export type OrderSummary = {
  id: string;
  number: string;
  totalMinor: number;
  currency: Currency;
  email: string;
};

/** Database operations, injected for testing. All run with the service role. */
export type CheckoutDb = {
  /** public.create_checkout: prices, checks drop + stock and holds it for 15 min in ONE transaction. */
  createCheckout(input: CheckoutInput): Promise<string>;
  getOrder(orderId: string): Promise<OrderSummary>;
  attachPaymentRef(orderId: string, provider: string, reference: string): Promise<void>;
  /** public.release_order: frees the hold and cancels the unpaid order. */
  releaseOrder(orderId: string): Promise<void>;
};

/**
 * PAY-2/PAY-4: create the pending order with a stock hold, then start payment
 * with the provider. Amount and currency come from the order row the database
 * priced, never from the browser. If the provider can't be reached the hold is
 * released straight away.
 */
export async function startCheckout(
  db: CheckoutDb,
  provider: PaymentProvider,
  input: CheckoutInput,
  siteUrl: string,
): Promise<{ redirectUrl: string; orderId: string }> {
  const orderId = await db.createCheckout(input);
  try {
    const order = await db.getOrder(orderId);
    const reference = `${order.number}-${randomBytes(6).toString("hex")}`;
    // Store the reference BEFORE calling the provider so a webhook can always find the order.
    await db.attachPaymentRef(orderId, provider.name, reference);
    const { redirectUrl } = await provider.initialize({
      reference,
      email: order.email,
      amountMinor: order.totalMinor,
      currency: order.currency,
      callbackUrl: `${siteUrl}/checkout/confirmation?ref=${encodeURIComponent(reference)}`,
      metadata: { orderId, orderNumber: order.number },
    });
    return { redirectUrl, orderId };
  } catch (error) {
    await db.releaseOrder(orderId);
    throw error;
  }
}
