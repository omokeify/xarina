"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { deleteDrop, type DropFormState } from "./actions";

const initial: DropFormState = { status: "idle" };

/** Owner only: delete the drop and everything attached to it, but not the products. */
export function DeleteDrop({
  dropId,
  dropName,
  published,
}: {
  dropId: string;
  dropName: string;
  published: boolean;
}) {
  const [state, action, pending] = useActionState(deleteDrop.bind(null, dropId), initial);
  const [typed, setTyped] = useState("");

  return (
    <form action={action} className="gap-space-3 flex flex-col">
      <p className="text-body-s text-ink-muted">
        Removes the drop, its designs, waitlist interest, notifications and access links. The designs
        themselves stay in Products. Drops with orders cannot be deleted.
        {published && " Published drop pages and old addresses stop working immediately."}
      </p>
      <div className="gap-space-1 flex flex-col sm:max-w-sm">
        <Label htmlFor="confirm-drop-delete">Type the drop name to confirm</Label>
        <Input
          id="confirm-drop-delete"
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={dropName}
          autoComplete="off"
        />
      </div>
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending || typed.trim() !== dropName}>
          {pending ? "Deleting" : "Delete drop"}
        </Button>
      </div>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-body-s text-critical">
          {state.message}
        </p>
      )}
    </form>
  );
}
