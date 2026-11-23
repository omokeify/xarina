"use client";

import { ChevronDown } from "lucide-react";
import { CURRENCIES, isCurrency, type Currency } from "@/lib/money";
import { useCurrency } from "@/lib/currency/context";

const CURRENCY_LABELS: Record<Currency, string> = {
  NGN: "NGN",
  GBP: "GBP",
  USD: "USD",
};

/** Region / currency pill control matching client mockup ([ NGN ⌄ ]). */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${className ?? ""}`}>
      <span className="sr-only">Select Currency</span>
      <select
        value={currency}
        onChange={(e) => isCurrency(e.target.value) && setCurrency(e.target.value)}
        aria-label="Currency"
        className="appearance-none bg-surface border border-line hover:border-ink px-2 pr-5 py-0.5 text-[11px] font-sans font-medium uppercase tracking-wider text-ink cursor-pointer focus:outline-none transition-colors"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c} className="bg-surface text-ink text-body-s">
            {CURRENCY_LABELS[c]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-1.5 size-3 text-ink-muted" />
    </label>
  );
}
