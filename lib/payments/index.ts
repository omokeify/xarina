import "server-only";
import type { Currency } from "@/lib/money";
import { createPaystackProvider } from "./paystack";
import type { PaymentProvider } from "./types";

/**
 * Open decision (PRD): which processor takes GBP and USD. Nothing is hard-coded:
 * each currency is routed by env var, e.g. PAYMENT_PROVIDER_GBP=paystack.
 * NGN defaults to Paystack. A currency with no provider cannot be checked out.
 */
const DEFAULT_ROUTE: Partial<Record<Currency, string>> = { NGN: "paystack" };

export function getProviderByName(name: string): PaymentProvider | null {
  if (name === "paystack") {
    const key = process.env.PAYSTACK_SECRET_KEY;
    return key ? createPaystackProvider(key) : null;
  }
  return null;
}

export function getProviderForCurrency(currency: Currency): PaymentProvider | null {
  const name = process.env[`PAYMENT_PROVIDER_${currency}`] ?? DEFAULT_ROUTE[currency];
  return name ? getProviderByName(name) : null;
}

export type { PaymentProvider } from "./types";
