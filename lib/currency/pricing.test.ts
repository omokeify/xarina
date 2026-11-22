import { describe, expect, it } from "vitest";
import { convertMinor, resolvePrice, type PricedProduct } from "./pricing";

describe("convertMinor (CUR-2)", () => {
  it("converts with integer maths", () => {
    // £100.00 at 2,000 NGN per GBP = ₦200,000.00
    expect(convertMinor(10_000, { rate: "2000", roundingIncrementMinor: null })).toBe(20_000_000);
  });

  it("rounds half up to the nearest step", () => {
    // $85.00 * 0.79 = £67.15 → nearest £5 = £65.00
    expect(convertMinor(8_500, { rate: "0.79", roundingIncrementMinor: 500 })).toBe(6_500);
    expect(convertMinor(8_500, { rate: "0.8", roundingIncrementMinor: 500 })).toBe(7_000);
  });

  it("has no float drift on awkward rates", () => {
    expect(convertMinor(10, { rate: "0.1", roundingIncrementMinor: null })).toBe(1);
    expect(convertMinor(30, { rate: "0.3333", roundingIncrementMinor: null })).toBe(10);
  });

  it("rejects invalid or zero rates", () => {
    expect(convertMinor(100, { rate: "abc", roundingIncrementMinor: null })).toBeNull();
    expect(convertMinor(100, { rate: "0", roundingIncrementMinor: null })).toBeNull();
  });
});

describe("resolvePrice (CUR-1)", () => {
  const fixed: PricedProduct = {
    mode: "fixed",
    prices: [
      { variantId: null, currency: "NGN", amountMinor: 8_500_000 },
      { variantId: "v2", currency: "NGN", amountMinor: 9_000_000 },
      { variantId: null, currency: "GBP", amountMinor: 12_000 },
    ],
  };

  it("uses the design price, with a per-variant override", () => {
    expect(resolvePrice(fixed, "v1", "NGN")).toBe(8_500_000);
    expect(resolvePrice(fixed, "v2", "NGN")).toBe(9_000_000);
  });

  it("returns null when no price is set (never guesses)", () => {
    expect(resolvePrice(fixed, "v1", "USD")).toBeNull();
  });

  const fx: PricedProduct = {
    mode: "fx",
    baseCurrency: "NGN",
    baseAmountMinor: 8_500_000,
    rates: [{ base: "NGN", quote: "GBP", rate: "0.0005", roundingIncrementMinor: 500 }],
  };

  it("returns the base amount in the base currency", () => {
    expect(resolvePrice(fx, "v1", "NGN")).toBe(8_500_000);
  });

  it("converts and rounds for other currencies", () => {
    // ₦85,000 * 0.0005 = £42.50 → nearest £5 = £45.00
    expect(resolvePrice(fx, "v1", "GBP")).toBe(4_500);
  });

  it("returns null when no rate exists", () => {
    expect(resolvePrice(fx, "v1", "USD")).toBeNull();
  });
});
