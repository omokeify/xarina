"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { approvePriveEmails, createAccessLink, type PriveState } from "../actions";

const idle: PriveState = { status: "idle" };

function Message({ state }: { state: PriveState }) {
  if (!state.message) return null;
  return (
    <div className="gap-space-2 grid">
      <p
        role={state.status === "error" ? "alert" : "status"}
        className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink"}
      >
        {state.message}
      </p>
      {state.link && (
        <input
          readOnly
          value={state.link}
          aria-label="Access link"
          onFocus={(e) => e.currentTarget.select()}
          className="border-line bg-surface-sunk px-space-3 text-body-s text-ink h-12 w-full rounded-xs border"
        />
      )}
    </div>
  );
}

/** VIP-1: approve many at once from a pasted list. */
export function BulkApproveForm() {
  const [state, action, pending] = useActionState(approvePriveEmails, idle);
  return (
    <form action={action} className="gap-space-3 grid max-w-xl">
      <div className="space-y-space-1">
        <Label htmlFor="emails">Approve by email</Label>
        <textarea
          id="emails"
          name="emails"
          rows={4}
          placeholder="One email per line, or separated by commas"
          className="border-line bg-surface-raised px-space-3 py-space-2 text-body text-ink w-full rounded-xs border"
        />
      </div>
      <Message state={state} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Approving" : "Approve members"}
      </Button>
    </form>
  );
}

/** VIP-2, rule 7: a personal link that works once and expires. Shown once. */
export function AccessLinkForm({
  customerId,
  drops,
}: {
  customerId: string;
  drops: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createAccessLink.bind(null, customerId), idle);
  return (
    <form action={action} className="gap-space-2 grid">
      <div className="gap-space-2 flex flex-wrap items-end">
        <div className="space-y-space-1">
          <Label htmlFor={`drop-${customerId}`}>Drop</Label>
          <select
            id={`drop-${customerId}`}
            name="dropId"
            defaultValue=""
            className="border-line bg-surface-raised px-space-3 text-body-s text-ink h-11 rounded-xs border"
          >
            <option value="">Any drop</option>
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-space-1">
          <Label htmlFor={`days-${customerId}`}>Expires (days)</Label>
          <Input
            id={`days-${customerId}`}
            name="days"
            type="number"
            min={1}
            max={30}
            defaultValue={3}
            className="h-11 w-24"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Creating" : "Create link"}
        </Button>
      </div>
      <Message state={state} />
    </form>
  );
}
