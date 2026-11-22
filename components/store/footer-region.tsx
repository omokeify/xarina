"use client";

import { CURRENCIES, isCurrency, type Currency } from "@/lib/money";
import { useCurrency } from "@/lib/currency/context";

const REGION: Record<Currency, string> = {
  NGN: "Nigeria (NGN ₦)",
  GBP: "United Kingdom (GBP £)",
  USD: "United States and international (USD $)",
};

/** Footer region select (concept). Same currency state as the header switcher (CUR-4). */
export function FooterRegion() {
  const { currency, setCurrency } = useCurrency();
  return (
    <label className="text-body-s gap-space-2 text-ink-muted inline-flex min-h-11 items-center">
      Region
      <select
        value={currency}
        onChange={(e) => isCurrency(e.target.value) && setCurrency(e.target.value)}
        className="text-ink cursor-pointer bg-transparent underline underline-offset-4"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {REGION[c]}
          </option>
        ))}
      </select>
    </label>
  );
}
