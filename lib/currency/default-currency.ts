import { DEFAULT_CURRENCY, isCurrency, type Currency } from "@/lib/money";

/**
 * CUR-4: pick the starting currency. A valid saved choice always wins;
 * otherwise the visitor's country (NG → NGN, GB → GBP, anywhere else → USD).
 * No country signal at all (local dev) falls back to DEFAULT_CURRENCY.
 */
export function pickInitialCurrency(cookieValue: string | undefined, country: string | null): Currency {
  if (isCurrency(cookieValue)) return cookieValue;
  const code = country?.trim().toUpperCase();
  if (!code) return DEFAULT_CURRENCY;
  if (code === "NG") return "NGN";
  if (code === "GB") return "GBP";
  return "USD";
}
