// Validation for the settings forms: exchange rates (CUR-2) and shipping zones and
// charges (PAY-3). Money is entered in major units ("5000") and stored as integer
// minor units (rule 1). Nothing here uses floats for money.

import { z } from "zod";
import { CURRENCIES, parseMajorToMinor, type Currency } from "@/lib/money";

const currency = z.enum(CURRENCIES);

/** Optional money amount in major units. Blank = none. */
function majorAmount(cur: Currency, raw: string): number | null | "invalid" {
  const text = raw.trim();
  if (text === "") return null;
  const minor = parseMajorToMinor(text, cur);
  return minor === null ? "invalid" : minor;
}

export const fxRateSchema = z
  .object({
    base: currency,
    quote: currency,
    rate: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,8})?$/, "Enter a rate like 2050 or 0.00049")
      .refine((v) => Number(v) > 0, "The rate must be more than zero"),
    rounding: z.string().default(""),
  })
  .refine((v) => v.base !== v.quote, { message: "Choose two different currencies", path: ["quote"] })
  .transform((v, ctx) => {
    const step = majorAmount(v.quote, v.rounding);
    if (step === "invalid" || step === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a whole or decimal amount, or leave blank",
        path: ["rounding"],
      });
      return z.NEVER;
    }
    return { base: v.base, quote: v.quote, rate: v.rate, roundingIncrementMinor: step };
  });

/** "ng, gb GB" → ["NG", "GB"]. Blank = the rest of the world. */
export function parseCountries(raw: string): string[] | null {
  const codes = raw
    .split(/[\s,]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (codes.some((c) => !/^[A-Z]{2}$/.test(c))) return null;
  return [...new Set(codes)];
}

export const zoneSchema = z
  .object({
    name: z.string().trim().min(1, "Give the zone a name").max(80),
    countries: z.string().default(""),
  })
  .transform((v, ctx) => {
    const countries = parseCountries(v.countries);
    if (countries === null) {
      ctx.addIssue({
        code: "custom",
        message: "Use two-letter country codes, like NG, GB",
        path: ["countries"],
      });
      return z.NEVER;
    }
    return { name: v.name, countries };
  });

export const shippingRateSchema = z
  .object({
    zoneId: z.string().uuid(),
    name: z.string().trim().min(1, "Give the charge a name").max(80),
    currency,
    amount: z.string(),
    etaText: z.string().trim().max(120).default(""),
    active: z.boolean(),
  })
  .transform((v, ctx) => {
    const amountMinor = majorAmount(v.currency, v.amount);
    if (amountMinor === null || amountMinor === "invalid") {
      ctx.addIssue({ code: "custom", message: "Enter the charge, like 5000 (0 for free)", path: ["amount"] });
      return z.NEVER;
    }
    return {
      zoneId: v.zoneId,
      name: v.name,
      currency: v.currency,
      amountMinor,
      etaText: v.etaText,
      active: v.active,
    };
  });
