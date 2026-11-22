"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveDropProducts, type DropFormState } from "./actions";

export type ProductOption = { id: string; name: string; interest: number; inDrop: boolean };

/** ADM-4: choose the designs in this drop. Interest is waitlist demand, not sales (WL-5). */
export function DropProductsForm({ dropId, options }: { dropId: string; options: ProductOption[] }) {
  const [state, action, pending] = useActionState<DropFormState, FormData>(
    saveDropProducts.bind(null, dropId),
    {
      status: "idle",
    },
  );

  if (options.length === 0)
    return <p className="text-body-s text-ink-muted">No products yet. Add a design first.</p>;

  return (
    <form action={action} className="flex flex-col gap-4 max-w-2xl">
      <div className="border border-line divide-line divide-y bg-surface">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-3 p-3.5 hover:bg-surface-sunk/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              name="product_id"
              value={o.id}
              defaultChecked={o.inDrop}
              className="accent-ink size-4"
            />
            <span className="text-body font-medium flex-1 text-ink">{o.name}</span>
            <span className="label text-ink-muted bg-surface-sunk px-2 py-0.5 border border-line">
              {o.interest} waitlist
            </span>
          </label>
        ))}
      </div>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? "text-body-s text-critical font-medium" : "text-body-s text-ink"}
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start h-11 px-6">
        {pending ? "Saving…" : "Save Drop Designs"}
      </Button>
    </form>
  );
}
