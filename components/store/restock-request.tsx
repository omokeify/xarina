"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { requestRestock, type WaitlistState } from "@/lib/waitlist/actions";

/** Shown when the chosen size is sold out: ask to be told if it returns. */
export function RestockRequest({ variantId }: { variantId: string }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(requestRestock, {
    status: "idle",
  });

  if (state.status === "done") {
    return (
      <p role="status" className="text-body-s text-ink-muted">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="gap-space-3 grid" key={variantId}>
      <input type="hidden" name="variantId" value={variantId} />
      <p className="text-body-s text-ink-muted">Sold out in this size. Tell me when it is back.</p>
      <div className="space-y-space-1">
        <Label htmlFor="restock-email">Email</Label>
        <Input id="restock-email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-body-s text-critical">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="secondary" block disabled={pending}>
        {pending ? "Saving" : "Notify me"}
      </Button>
    </form>
  );
}
