import { describe, expect, it } from "vitest";
import { fxRateSchema, parseCountries, shippingRateSchema, zoneSchema } from "./settings";

const ZONE = "22222222-2222-4222-8222-222222222222";

describe("exchange rates (CUR-2)", () => {
  it("accepts a rate and a rounding step entered in major units", () => {
    const out = fxRateSchema.parse({ base: "GBP", quote: "NGN", rate: "2050", rounding: "5000" });
    expect(out).toEqual({ base: "GBP", quote: "NGN", rate: "2050", roundingIncrementMinor: 500000 });
  });

  it("treats a blank rounding step as none", () => {
    expect(
      fxRateSchema.parse({ base: "NGN", quote: "GBP", rate: "0.00049", rounding: "" }).roundingIncrementMinor,
    ).toBeNull();
  });

  it("rejects a zero, negative, or too precise rate and a same-currency pair", () => {
    expect(fxRateSchema.safeParse({ base: "GBP", quote: "NGN", rate: "0" }).success).toBe(false);
    expect(fxRateSchema.safeParse({ base: "GBP", quote: "NGN", rate: "-5" }).success).toBe(false);
    expect(fxRateSchema.safeParse({ base: "GBP", quote: "NGN", rate: "1.123456789" }).success).toBe(false);
    expect(fxRateSchema.safeParse({ base: "GBP", quote: "GBP", rate: "1" }).success).toBe(false);
  });

  it("rejects a zero or malformed rounding step", () => {
    expect(fxRateSchema.safeParse({ base: "GBP", quote: "NGN", rate: "1", rounding: "0" }).success).toBe(
      false,
    );
    expect(fxRateSchema.safeParse({ base: "GBP", quote: "NGN", rate: "1", rounding: "abc" }).success).toBe(
      false,
    );
  });
});

describe("shipping zones (PAY-3)", () => {
  it("parses country codes, upper-cased and de-duplicated", () => {
    expect(parseCountries("ng, gb  NG")).toEqual(["NG", "GB"]);
    expect(parseCountries("")).toEqual([]);
    expect(parseCountries("Nigeria")).toBeNull();
  });

  it("a blank country list means the rest of the world", () => {
    expect(zoneSchema.parse({ name: "Rest of world", countries: "" })).toEqual({
      name: "Rest of world",
      countries: [],
    });
  });

  it("rejects a bad country code", () => {
    expect(zoneSchema.safeParse({ name: "Zone", countries: "NGA" }).success).toBe(false);
  });
});

describe("shipping charges", () => {
  it("stores the charge as integer minor units", () => {
    const out = shippingRateSchema.parse({
      zoneId: ZONE,
      name: "Express",
      currency: "NGN",
      amount: "10,000",
      etaText: "2 days",
      active: true,
    });
    expect(out.amountMinor).toBe(1000000);
  });

  it("allows a free charge but not a blank or negative one", () => {
    expect(
      shippingRateSchema.parse({ zoneId: ZONE, name: "Free", currency: "GBP", amount: "0", active: true })
        .amountMinor,
    ).toBe(0);
    expect(
      shippingRateSchema.safeParse({ zoneId: ZONE, name: "X", currency: "GBP", amount: "", active: true })
        .success,
    ).toBe(false);
    expect(
      shippingRateSchema.safeParse({ zoneId: ZONE, name: "X", currency: "GBP", amount: "-5", active: true })
        .success,
    ).toBe(false);
  });
});
