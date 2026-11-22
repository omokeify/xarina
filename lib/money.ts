// Money is integer minor units + currency code (rule 1). Never floats.

export const CURRENCIES = ["NGN", "GBP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "NGN";

/** Minor units per major unit. All three launch currencies use 2 decimals. */
export const MINOR_PER_MAJOR: Record<Currency, number> = { NGN: 100, GBP: 100, USD: 100 };

const LOCALE: Record<Currency, string> = { NGN: "en-NG", GBP: "en-GB", USD: "en-US" };

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/**
 * Format minor units for display. Whole amounts drop the decimals
 * (₦85,000 not ₦85,000.00) to keep price tags quiet.
 */
export function formatMoney(amountMinor: number | bigint, currency: Currency): string {
  const minor = BigInt(amountMinor);
  const per = BigInt(MINOR_PER_MAJOR[currency]);
  const whole = minor % per === BigInt(0);
  // Number() is safe for display: prices are far below 2^53 minor units.
  return new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(Number(minor) / Number(per));
}

/**
 * Parse a staff-typed major amount ("85000", "85,000.50") to minor units
 * using string arithmetic only. Returns null when it isn't a valid amount.
 */
export function parseMajorToMinor(input: string, currency: Currency): number | null {
  const cleaned = input.replace(/[,\s]/g, "").replace(/^[₦£$]/, "");
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const digits = String(MINOR_PER_MAJOR[currency]).length - 1;
  const frac = (m[2] ?? "").padEnd(digits, "0");
  const minor = Number(m[1] + frac);
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units → plain major string for form inputs ("85000" or "85000.50"). */
export function minorToMajorInput(amountMinor: number, currency: Currency): string {
  const per = MINOR_PER_MAJOR[currency];
  const whole = Math.trunc(amountMinor / per);
  const frac = amountMinor % per;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(String(per).length - 1, "0")}`;
}
