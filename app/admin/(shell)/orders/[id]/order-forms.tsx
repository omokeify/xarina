"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL, type OrderStatus } from "@/lib/admin/orders";
import { Field } from "../../products/_components/form-parts";
import { addOrderNote, updateOrderStatus, type OrderFormState } from "../actions";

const idle: OrderFormState = { status: "idle" };

function Message({ state }: { state: OrderFormState }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink-muted"}
    >
      {state.status === "idle" ? "" : state.message}
    </p>
  );
}

/** Change the order's status. Dispatch asks for tracking, then emails the customer. */
export function StatusForm({ orderId, options }: { orderId: string; options: OrderStatus[] }) {
  const [state, action, pending] = useActionState(updateOrderStatus, idle);
  const [to, setTo] = useState<OrderStatus>(options[0]);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          (to === "cancelled" || to === "refunded") &&
          !window.confirm(`Mark this order as ${STATUS_LABEL[to].toLowerCase()}? This can't be undone.`)
        ) {
          e.preventDefault();
        }
      }}
      className="gap-space-3 flex max-w-md flex-col"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Field label="Change status to" htmlFor="to">
        <select
          id="to"
          name="to"
          value={to}
          onChange={(e) => setTo(e.target.value as OrderStatus)}
          className="border-line bg-surface-raised px-space-3 text-body text-ink h-12 w-full rounded-xs border"
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>

      {to === "dispatched" && (
        <>
          <Field label="Courier" htmlFor="courier">
            <Input id="courier" name="courier" required placeholder="DHL" />
          </Field>
          <Field label="Tracking number" htmlFor="trackingNumber">
            <Input id="trackingNumber" name="trackingNumber" required />
          </Field>
          <Field label="Tracking link" htmlFor="trackingUrl" hint="The customer gets this link by email.">
            <Input id="trackingUrl" name="trackingUrl" type="url" required placeholder="https://" />
          </Field>
        </>
      )}
      {to === "refunded" && (
        <p className="text-body-s text-ink-muted">
          This records a refund. Send the money back from your payment provider&apos;s dashboard.
        </p>
      )}

      <div className="gap-space-3 flex items-center">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : to === "dispatched" ? "Dispatch and email customer" : "Update status"}
        </Button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(addOrderNote, idle);
  return (
    <form action={action} className="gap-space-3 flex max-w-md flex-col">
      <input type="hidden" name="orderId" value={orderId} />
      <Field label="Add a note" htmlFor="body">
        <textarea
          id="body"
          name="body"
          rows={3}
          maxLength={2000}
          required
          className="border-line bg-surface-raised p-space-3 text-body text-ink w-full rounded-xs border"
        />
      </Field>
      <div className="gap-space-3 flex items-center">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        <Message state={state} />
      </div>
    </form>
  );
}
