"use client";

import { CURRENCIES, isCurrency, type Currency } from "@/lib/money";
import { useCurrency } from "@/lib/currency/context";

const CURRENCY_LABELS: Record<Currency, string> = {
  NGN: "NGN ₦",
  GBP: "GBP £",
  USD: "USD $",
};

/** CUR-4: region / currency control in the header matching the clone repo box style. */
export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  return (
    <label className="text-ink-muted hover:text-ink relative inline-flex min-h-11 cursor-pointer items-center px-1">
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(e) => isCurrency(e.target.value) && setCurrency(e.target.value)}
        className="bg-transparent text-[12px] tracking-wider text-inherit px-1.5 py-1.5 cursor-pointer focus:outline-none border-b border-transparent hover:border-current tabular-nums"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c} className="bg-surface text-ink">
            {CURRENCY_LABELS[c]}
          </option>
        ))}
      </select>
    </label>
  );
}
