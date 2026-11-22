"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CURRENCIES, minorToMajorInput, type Currency } from "@/lib/money";
import { savePricingMode, type ActionState } from "../actions";
import { FormStatus, cellInput } from "../_components/form-parts";

const initial: ActionState = { status: "idle" };

/**
 * CUR-1: how this design is priced. Fixed = the price grid below. Exchange
 * rate = one base price converted with the rates (and rounding) in Settings;
 * shoppers see and pay the converted amount.
 */
export function PricingModeForm({
  productId,
  mode,
  baseCurrency,
  baseAmountMinor,
}: {
  productId: string;
  mode: "fixed" | "fx";
  baseCurrency: Currency | null;
  baseAmountMinor: number | null;
}) {
  const [state, action, pending] = useActionState(savePricingMode.bind(null, productId), initial);
  const [choice, setChoice] = useState(mode);
  const currency = baseCurrency ?? "NGN";

  return (
    <form action={action} className="border-line gap-space-3 pb-space-4 flex flex-col border-b">
      <fieldset className="gap-space-2 flex flex-col">
        <legend className="label text-ink-muted mb-space-2">Pricing method</legend>
        <label className="gap-space-2 text-body-s inline-flex min-h-11 items-center">
          <input
            type="radio"
            name="mode"
            value="fixed"
            checked={choice === "fixed"}
            onChange={() => setChoice("fixed")}
            className="accent-ink size-5"
          />
          Fixed prices per currency (set below)
        </label>
        <label className="gap-space-2 text-body-s inline-flex min-h-11 items-center">
          <input
            type="radio"
            name="mode"
            value="fx"
            checked={choice === "fx"}
            onChange={() => setChoice("fx")}
            className="accent-ink size-5"
          />
          Exchange rate from one base price
        </label>
      </fieldset>

      {choice === "fx" && (
        <div className="gap-space-3 flex flex-wrap items-end">
          <label className="gap-space-1 flex flex-col">
            <span className="label text-ink-muted">Base currency</span>
            <select name="base_currency" defaultValue={currency} className={cellInput}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="gap-space-1 flex flex-col">
            <span className="label text-ink-muted">Base price</span>
            <input
              name="base_amount"
              inputMode="decimal"
              defaultValue={baseAmountMinor != null ? minorToMajorInput(baseAmountMinor, currency) : ""}
              placeholder="e.g. 185000"
              className={cellInput}
            />
          </label>
          <p className="text-caption text-ink-muted basis-full">
            Other currencies are converted with the exchange rates and rounding in Settings. A currency
            without a rate isn&apos;t sold.
          </p>
        </div>
      )}

      <div className="gap-space-3 flex items-center">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Saving" : "Save pricing method"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
