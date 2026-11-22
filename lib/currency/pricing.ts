// CUR-1 / CUR-2: resolve a price in a currency. Integer minor units only (rule 1):
// FX maths uses BigInt, never floats.

import type { Currency } from "@/lib/money";

export type FxRate = {
  base: Currency;
  quote: Currency;
  /** Decimal string, e.g. "0.00052000" (quote units per 1 base unit, major to major). */
  rate: string;
  /** Round to this step in minor units of `quote` (500 = nearest £5). Null = no rounding. */
  roundingIncrementMinor: number | null;
};

export type FixedPrice = {
  /** Null = whole-design price; set = override for one variant. */
  variantId: string | null;
  currency: Currency;
  amountMinor: number;
};

export type PricedProduct =
  | { mode: "fixed"; prices: FixedPrice[] }
  | { mode: "fx"; baseCurrency: Currency; baseAmountMinor: number; rates: FxRate[] };

const RATE_SCALE = BigInt(100_000_000); // numeric(18,8) in the database

function parseRate(rate: string): bigint | null {
  const m = /^(\d+)(?:\.(\d{1,8}))?$/.exec(rate);
  if (!m) return null;
  return BigInt(m[1]) * RATE_SCALE + BigInt((m[2] ?? "").padEnd(8, "0"));
}

/** Convert minor units of `base` to minor units of `quote`, rounding half up to the step. */
export function convertMinor(
  amountMinor: number,
  rate: Pick<FxRate, "rate" | "roundingIncrementMinor">,
): number | null {
  const scaled = parseRate(rate.rate);
  if (scaled === null || scaled === BigInt(0)) return null;
  // All launch currencies share the same minor-unit scale, so no extra scaling is needed.
  let result = (BigInt(amountMinor) * scaled + RATE_SCALE / BigInt(2)) / RATE_SCALE;
  if (rate.roundingIncrementMinor) {
    const step = BigInt(rate.roundingIncrementMinor);
    result = ((result + step / BigInt(2)) / step) * step;
  }
  const out = Number(result);
  return Number.isSafeInteger(out) ? out : null;
}

/**
 * Price of one variant in `currency`, or null when staff haven't set one.
 * Never guesses: a missing price means the item cannot be bought in that currency.
 */
export function resolvePrice(product: PricedProduct, variantId: string, currency: Currency): number | null {
  if (product.mode === "fixed") {
    const inCurrency = product.prices.filter((p) => p.currency === currency);
    const override = inCurrency.find((p) => p.variantId === variantId);
    const design = inCurrency.find((p) => p.variantId === null);
    return (override ?? design)?.amountMinor ?? null;
  }
  if (currency === product.baseCurrency) return product.baseAmountMinor;
  const rate = product.rates.find((r) => r.base === product.baseCurrency && r.quote === currency);
  return rate ? convertMinor(product.baseAmountMinor, rate) : null;
}
