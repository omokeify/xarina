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
    <form action={action} className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="emails" className="label text-ink-muted">
          Customer Emails
        </Label>
        <textarea
          id="emails"
          name="emails"
          rows={3}
          placeholder="One email per line, or separated by commas (e.g. client@domain.com, vip@domain.com)"
          className="border border-line bg-surface p-3 text-body-s text-ink focus:border-ink focus:outline-none transition-colors w-full"
        />
      </div>
      <Message state={state} />
      <Button type="submit" disabled={pending} className="self-start h-11 px-5">
        {pending ? "Approving…" : "Approve Members"}
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
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`drop-${customerId}`} className="label text-ink-muted">
            Target Drop
          </Label>
          <select
            id={`drop-${customerId}`}
            name="dropId"
            defaultValue=""
            className="border border-line bg-surface px-3 text-body-s text-ink h-9 focus:border-ink focus:outline-none transition-colors"
          >
            <option value="">Any active drop</option>
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`days-${customerId}`} className="label text-ink-muted">
            Valid (Days)
          </Label>
          <Input
            id={`days-${customerId}`}
            name="days"
            type="number"
            min={1}
            max={30}
            defaultValue={3}
            className="h-9 w-20 text-body-s bg-surface"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={pending} className="h-9 px-3">
          {pending ? "Creating…" : "Generate Access Link"}
        </Button>
      </div>
      <Message state={state} />
    </form>
  );
}
