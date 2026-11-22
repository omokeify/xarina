"use client";

import { useActionState, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminMeasurement } from "@/lib/admin/products";
import { saveMeasurements, type ActionState } from "../actions";
import { FormStatus, cellInput } from "../_components/form-parts";

type Row = {
  key: string;
  size: string;
  bust_cm: string;
  waist_cm: string;
  hip_cm: string;
  length_cm: string;
};
const FIELDS = [
  ["bust_cm", "Bust"],
  ["waist_cm", "Waist"],
  ["hip_cm", "Hip"],
  ["length_cm", "Length"],
] as const;

const initial: ActionState = { status: "idle" };
const str = (n: number | null) => (n === null ? "" : String(n));

function toRows(rows: AdminMeasurement[]): Row[] {
  return rows.map((r) => ({
    key: crypto.randomUUID(),
    size: r.size,
    bust_cm: str(r.bust_cm),
    waist_cm: str(r.waist_cm),
    hip_cm: str(r.hip_cm),
    length_cm: str(r.length_cm),
  }));
}

export function MeasurementsEditor({
  productId,
  rows: initialRows,
  sizes,
}: {
  productId: string;
  rows: AdminMeasurement[];
  sizes: string[];
}) {
  const [rows, setRows] = useState(() => toRows(initialRows));
  const [state, action, pending] = useActionState(saveMeasurements.bind(null, productId), initial);

  useEffect(() => setRows(toRows(initialRows)), [initialRows]);

  const missing = sizes.filter((s) => !rows.some((r) => r.size.toLowerCase() === s.toLowerCase()));
  const blank = (size = ""): Row => ({
    key: crypto.randomUUID(),
    size,
    bust_cm: "",
    waist_cm: "",
    hip_cm: "",
    length_cm: "",
  });
  const update = (key: string, field: keyof Row, value: string) =>
    setRows((all) => all.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const payload = JSON.stringify(
    rows.map((r) => ({
      size: r.size,
      bust_cm: r.bust_cm,
      waist_cm: r.waist_cm,
      hip_cm: r.hip_cm,
      length_cm: r.length_cm,
    })),
  );

  return (
    <form action={action} className="gap-space-3 flex flex-col">
      <input type="hidden" name="measurements" value={payload} />
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <caption className="sr-only">Size chart in centimetres</caption>
            <thead>
              <tr className="border-line border-b">
                <th scope="col" className="label py-2.5 pr-2 text-ink-muted">
                  Size
                </th>
                {FIELDS.map(([, label]) => (
                  <th key={label} scope="col" className="label py-2.5 pr-2 text-ink-muted">
                    {label} (cm)
                  </th>
                ))}
                <th scope="col">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key} className="border-line border-b">
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
                  {FIELDS.map(([field, label]) => (
                    <td key={field} className="py-space-2 pr-space-2">
                      <input
                        aria-label={`${label} in cm, ${r.size || `row ${i + 1}`}`}
                        inputMode="decimal"
                        value={r[field]}
                        onChange={(e) => update(r.key, field, e.target.value)}
                        className={cellInput}
                      />
                    </td>
                  ))}
                  <td className="py-space-2 w-11">
                    <button
                      type="button"
                      aria-label={`Remove size ${r.size || i + 1}`}
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
      <div className="gap-space-3 flex flex-wrap">
        {missing.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setRows((all) => [...all, ...missing.map((s) => blank(s))])}
          >
            Add rows for {missing.join(", ")}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => setRows((all) => [...all, blank()])}>
          Add a size
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving" : "Save size chart"}
        </Button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}
