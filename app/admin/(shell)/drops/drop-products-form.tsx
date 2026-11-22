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
    <form action={action} className="gap-space-3 grid max-w-xl">
      <ul className="divide-line border-line divide-y border-y">
        {options.map((o) => (
          <li key={o.id}>
            <label className="gap-space-3 py-space-2 flex min-h-11 items-center">
              <input
                type="checkbox"
                name="product_id"
                value={o.id}
                defaultChecked={o.inDrop}
                className="accent-action size-4 rounded-none"
              />
              <span className="text-body flex-1">{o.name}</span>
              <span className="text-body-s text-ink-muted">{o.interest} interest</span>
            </label>
          </li>
        ))}
      </ul>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink"}
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving" : "Save designs"}
      </Button>
    </form>
  );
}
