"use client";

import { useActionState, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HEX_PATTERN, splitList, suggestSku, type AdminVariant } from "@/lib/admin/products";
import { saveVariants, type ActionState } from "../actions";
import { FormStatus, cellInput } from "../_components/form-parts";

type Row = {
  key: string;
  id?: string;
  colour: string;
  colour_hex: string;
  size: string;
  sku: string;
  stock_on_hand: string;
  reserved_public_qty: string;
};

const initial: ActionState = { status: "idle" };

function toRows(variants: AdminVariant[]): Row[] {
  return variants.map((v) => ({
    key: v.id,
    id: v.id,
    colour: v.colour,
    colour_hex: v.colour_hex ?? "",
    size: v.size,
    sku: v.sku,
    stock_on_hand: String(v.stock_on_hand),
    reserved_public_qty: String(v.reserved_public_qty),
  }));
}

export function VariantsEditor({
  productId,
  productSlug,
  variants,
  canStock,
}: {
  productId: string;
  productSlug: string;
  variants: AdminVariant[];
  canStock: boolean;
}) {
  const [rows, setRows] = useState(() => toRows(variants));
  const [colours, setColours] = useState("");
  const [sizes, setSizes] = useState("");
  const [state, action, pending] = useActionState(saveVariants.bind(null, productId), initial);

  useEffect(() => setRows(toRows(variants)), [variants]);

  function update(key: string, field: keyof Row, value: string) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addCombinations() {
    const cs = splitList(colours);
    const ss = splitList(sizes);
    if (cs.length === 0 || ss.length === 0) return;
    const have = new Set(rows.map((r) => `${r.colour.toLowerCase()}|${r.size.toLowerCase()}`));
    const added: Row[] = [];
    for (const colour of cs) {
      for (const size of ss) {
        if (have.has(`${colour.toLowerCase()}|${size.toLowerCase()}`)) continue;
        added.push({
          key: crypto.randomUUID(),
          colour,
          colour_hex: rows.find((r) => r.colour.toLowerCase() === colour.toLowerCase())?.colour_hex ?? "",
          size,
          sku: suggestSku(productSlug, colour, size),
          stock_on_hand: "0",
          reserved_public_qty: "0",
        });
      }
    }
    setRows((all) => [...all, ...added]);
    setColours("");
    setSizes("");
  }

  const payload = JSON.stringify(
    rows.map((r, i) => ({
      ...(r.id ? { id: r.id } : {}),
      colour: r.colour,
      colour_hex: r.colour_hex,
      size: r.size,
      sku: r.sku,
      sort: i,
      ...(canStock
        ? { stock_on_hand: r.stock_on_hand || "0", reserved_public_qty: r.reserved_public_qty || "0" }
        : {}),
    })),
  );

  return (
    <div className="gap-space-4 flex flex-col">
      <div className="gap-space-3 border-line p-space-3 grid border md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="gap-space-1 flex flex-col">
          <span className="label text-ink-muted">Colours</span>
          <input
            value={colours}
            onChange={(e) => setColours(e.target.value)}
            placeholder="Black, Ivory"
            className={cellInput}
          />
        </label>
        <label className="gap-space-1 flex flex-col">
          <span className="label text-ink-muted">Sizes</span>
          <input
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            placeholder="S, M, L"
            className={cellInput}
          />
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={addCombinations}>
          Add combinations
        </Button>
      </div>

      <form action={action} className="gap-space-3 flex flex-col">
        <input type="hidden" name="variants" value={payload} />
        {rows.length === 0 ? (
          <p className="text-body-s text-ink-muted">No variants yet. Add colours and sizes above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <caption className="sr-only">Variants</caption>
              <thead>
                <tr className="border-line border-b">
                  <th scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                    Colour
                  </th>
                  <th scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                    Swatch
                  </th>
                  <th scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                    Size
                  </th>
                  <th scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                    SKU
                  </th>
                  {canStock && (
                    <th scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                      Stock
                    </th>
                  )}
                  {canStock && (
                    <th scope="col" className="label py-space-2 pr-space-2 text-ink-muted">
                      Reserved for public
                    </th>
                  )}
                  <th scope="col" className="py-space-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-line border-b">
                    <td className="py-space-2 pr-space-2">
                      <input
                        aria-label={`Colour, row ${i + 1}`}
                        value={r.colour}
                        maxLength={60}
                        required
                        onChange={(e) => update(r.key, "colour", e.target.value)}
                        className={cellInput}
                      />
                    </td>
                    <td className="py-space-2 pr-space-2 w-32">
                      <div className="gap-space-1 flex items-center">
                        <span
                          aria-hidden="true"
                          title={r.colour_hex || "No swatch"}
                          // Garment colour from the catalogue data, not a brand colour.
                          style={
                            HEX_PATTERN.test(r.colour_hex) ? { backgroundColor: r.colour_hex } : undefined
                          }
                          className="border-line bg-surface-sunk size-6 shrink-0 rounded-full border"
                        />
                        <input
                          aria-label={`Swatch hex, row ${i + 1}`}
                          value={r.colour_hex}
                          placeholder="No swatch"
                          maxLength={7}
                          onChange={(e) => update(r.key, "colour_hex", e.target.value)}
                          className={cellInput}
                        />
                      </div>
                    </td>
                    <td className="py-space-2 pr-space-2 w-24">
                      <input
                        aria-label={`Size, row ${i + 1}`}
                        value={r.size}
                        maxLength={20}
                        required
                        onChange={(e) => update(r.key, "size", e.target.value)}
                        className={cellInput}
                      />
                    </td>
                    <td className="py-space-2 pr-space-2">
                      <input
                        aria-label={`SKU, row ${i + 1}`}
                        value={r.sku}
                        maxLength={60}
                        required
                        onChange={(e) => update(r.key, "sku", e.target.value)}
                        className={cellInput}
                      />
                    </td>
                    {canStock && (
                      <td className="py-space-2 pr-space-2 w-24">
                        <input
                          aria-label={`Stock, row ${i + 1}`}
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={r.stock_on_hand}
                          onChange={(e) => update(r.key, "stock_on_hand", e.target.value)}
                          className={cellInput}
                        />
                      </td>
                    )}
                    {canStock && (
                      <td className="py-space-2 pr-space-2 w-28">
                        <input
                          aria-label={`Reserved for public, row ${i + 1}`}
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={r.reserved_public_qty}
                          onChange={(e) => update(r.key, "reserved_public_qty", e.target.value)}
                          className={cellInput}
                        />
                      </td>
                    )}
                    <td className="py-space-2 w-11">
                      <button
                        type="button"
                        aria-label={`Remove ${r.colour || "variant"} ${r.size}`.trim()}
                        title="Remove"
                        onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}
                        className="hover:bg-surface-sunk inline-flex size-11 items-center justify-center"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving" : "Save variants"}
          </Button>
        </div>
        <FormStatus state={state} />
      </form>
    </div>
  );
}
