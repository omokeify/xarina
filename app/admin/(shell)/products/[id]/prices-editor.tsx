"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CURRENCIES, minorToMajorInput, type Currency } from "@/lib/money";
import type { AdminPrice, AdminVariant } from "@/lib/admin/products";
import { savePrices, type ActionState } from "../actions";
import { FormStatus, cellInput } from "../_components/form-parts";

type Grid = Record<string, Partial<Record<Currency, string>>>; // key: variant id or "design"

const initial: ActionState = { status: "idle" };
const DESIGN = "design";

function toGrid(prices: AdminPrice[]): Grid {
  const grid: Grid = { [DESIGN]: {} };
  for (const p of prices) {
    const key = p.variant_id ?? DESIGN;
    grid[key] = { ...grid[key], [p.currency]: minorToMajorInput(p.amount_minor, p.currency) };
  }
  return grid;
}

export function PricesEditor({
  productId,
  variants,
  prices,
  pricingMode,
}: {
  productId: string;
  variants: AdminVariant[];
  prices: AdminPrice[];
  pricingMode: "fixed" | "fx";
}) {
  const [grid, setGrid] = useState(() => toGrid(prices));
  const [showOverrides, setShowOverrides] = useState(() => prices.some((p) => p.variant_id));
  const [state, action, pending] = useActionState(savePrices.bind(null, productId), initial);

  useEffect(() => setGrid(toGrid(prices)), [prices]);

  function set(key: string, currency: Currency, value: string) {
    setGrid((g) => ({ ...g, [key]: { ...g[key], [currency]: value } }));
  }

  const payload = JSON.stringify(
    Object.entries(grid).flatMap(([key, row]) =>
      CURRENCIES.map((currency) => ({
        variant_id: key === DESIGN ? null : key,
        currency,
        amount: (row[currency] ?? "").trim(),
      })).filter(
        (r) => r.amount !== "" && (r.variant_id === null || variants.some((v) => v.id === r.variant_id)),
      ),
    ),
  );

  return (
    <form action={action} className="gap-space-4 flex flex-col">
      <input type="hidden" name="prices" value={payload} />
      {pricingMode === "fx" && (
        <p role="note" className="border-ink pl-space-3 text-body-s border-l-2">
          This design is set to exchange-rate pricing. Fixed prices below are kept but not used until it is
          switched back to fixed pricing.
        </p>
      )}

      <fieldset className="gap-space-3 grid sm:grid-cols-3">
        <legend className="label mb-space-2 text-ink-muted">Design price</legend>
        {CURRENCIES.map((c) => (
          <label key={c} className="gap-space-1 flex flex-col">
            <span className="label text-ink-muted">{c}</span>
            <input
              inputMode="decimal"
              value={grid[DESIGN]?.[c] ?? ""}
              onChange={(e) => set(DESIGN, c, e.target.value)}
              placeholder="Not sold in this currency"
              className={cellInput}
            />
          </label>
        ))}
      </fieldset>

      {variants.length > 0 && (
        <div className="gap-space-3 flex flex-col">
          <button
            type="button"
            aria-expanded={showOverrides}
            onClick={() => setShowOverrides((v) => !v)}
            className="label text-ink self-start underline underline-offset-4"
          >
            {showOverrides ? "Hide variant prices" : "Set a different price for a variant"}
          </button>
          {showOverrides && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <caption className="sr-only">
                  Variant price overrides. Leave blank to use the design price.
                </caption>
                <thead>
                  <tr className="border-line border-b">
                    <th scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                      Variant
                    </th>
                    {CURRENCIES.map((c) => (
                      <th key={c} scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-line border-b">
                      <th scope="row" className="py-space-2 pr-space-2 text-body-s text-left font-normal">
                        {v.colour} · {v.size}
                      </th>
                      {CURRENCIES.map((c) => (
                        <td key={c} className="py-space-2 pr-space-2">
                          <input
                            aria-label={`${c} price for ${v.colour} ${v.size}`}
                            inputMode="decimal"
                            value={grid[v.id]?.[c] ?? ""}
                            onChange={(e) => set(v.id, c, e.target.value)}
                            placeholder={grid[DESIGN]?.[c] ?? ""}
                            className={cellInput}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-space-2 text-caption text-ink-muted">
                Blank uses the design price. Save new variants before pricing them.
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving" : "Save prices"}
        </Button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}
