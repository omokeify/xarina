"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { CURRENCIES } from "@/lib/money";
import { addSpend, type SpendState } from "./actions";

/** One-line form to record ad spend for a day. */
export function SpendForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<SpendState, FormData>(addSpend, { status: "idle" });
  return (
    <form
      action={action}
      className="gap-space-3 grid items-end sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
    >
      <div className="space-y-space-1">
        <Label htmlFor="spend-date">Date</Label>
        <Input id="spend-date" name="date" type="date" defaultValue={today} required />
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="spend-channel">Channel</Label>
        <Input id="spend-channel" name="channel" placeholder="Meta" required />
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="spend-campaign">Campaign (optional)</Label>
        <Input id="spend-campaign" name="campaign" />
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="spend-currency">Currency</Label>
        <select
          id="spend-currency"
          name="currency"
          defaultValue="NGN"
          className="border-line bg-surface-raised px-space-3 text-body text-ink h-12 w-full rounded-xs border"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="spend-amount">Amount spent</Label>
        <Input id="spend-amount" name="amount" inputMode="decimal" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding" : "Add spend"}
      </Button>
      {state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "text-body-s text-critical sm:col-span-2"
              : "text-body-s text-ink-muted sm:col-span-2"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
