"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteProduct, type ActionState } from "../actions";
import { FormStatus, cellInput } from "../_components/form-parts";

const initial: ActionState = { status: "idle" };

/** Owner/manager only: permanently delete the product, its media files and variants. */
export function DeleteProduct({
  productId,
  productName,
  published,
}: {
  productId: string;
  productName: string;
  published: boolean;
}) {
  const [state, action, pending] = useActionState(deleteProduct.bind(null, productId), initial);
  const [typed, setTyped] = useState("");

  return (
    <form action={action} className="gap-space-3 flex flex-col">
      <p className="text-body-s text-ink-muted">
        Removes the product, its variants, prices, size chart and every photo and video file. Past orders keep
        their own copy of the name and price.
        {published && " It disappears from the shop immediately, and links to it will stop working."}
      </p>
      <label className="gap-space-1 flex flex-col sm:max-w-sm">
        <span className="label text-ink-muted">Type the product name to confirm</span>
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={productName}
          autoComplete="off"
          className={cellInput}
        />
      </label>
      <div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending || typed.trim() !== productName}
        >
          {pending ? "Deleting" : "Delete product"}
        </Button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}
