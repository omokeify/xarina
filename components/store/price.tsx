"use client";

import { useCurrency } from "@/lib/currency/context";
import { formatMoney } from "@/lib/money";
import type { Prices } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

/** Shows the price in the shopper's currency (CUR-3). Renders nothing if unpriced. */
export function Price({
  prices,
  from = false,
  className,
}: {
  prices: Prices | null;
  from?: boolean;
  className?: string;
}) {
  const { currency } = useCurrency();
  const amount = prices?.[currency];
  if (amount == null) return null;
  return (
    <span className={cn("tabular-nums", className)}>
      {from && <span className="text-ink-muted">From </span>}
      {formatMoney(amount, currency)}
    </span>
  );
}
