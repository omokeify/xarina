"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES, minorToMajorInput, type Currency } from "@/lib/money";
import {
  deleteFxRate,
  deleteShippingRate,
  deleteZone,
  saveFxRate,
  saveShippingRate,
  saveZone,
  type SettingsState,
} from "./actions";

const idle: SettingsState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-xs border border-line bg-surface-raised px-space-3 text-body text-ink";

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="gap-space-1 flex min-w-0 flex-col">
      <span className="label text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function CurrencySelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? CURRENCIES[0]} className={selectClass}>
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

/** One editable row: Save, and (for existing rows) Delete, with a status line. */
function RowActions({
  pending,
  state,
  saveLabel,
  deleteAction,
  deleteWhat,
}: {
  pending: boolean;
  state: SettingsState;
  saveLabel: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  deleteWhat?: string;
}) {
  return (
    <div className="gap-space-3 flex flex-wrap items-center">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : saveLabel}
      </Button>
      {deleteAction && (
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          formAction={deleteAction}
          formNoValidate
          onClick={(e) => {
            if (!window.confirm(`Delete this ${deleteWhat}?`)) e.preventDefault();
          }}
        >
          Delete
        </Button>
      )}
      <p
        role="status"
        aria-live="polite"
        className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink-muted"}
      >
        {state.status === "idle" ? "" : state.message}
      </p>
    </div>
  );
}

export function FxRateForm({
  rate,
}: {
  rate?: {
    id: string;
    base: Currency;
    quote: Currency;
    rate: number;
    rounding_increment_minor: number | null;
  };
}) {
  const [state, action, pending] = useActionState(saveFxRate, idle);
  return (
    <form action={action} className="gap-space-3 py-space-3 flex flex-col">
      {rate && <input type="hidden" name="id" value={rate.id} />}
      <div className="gap-space-3 grid sm:grid-cols-2 lg:grid-cols-4">
        <Labelled label="From">
          <CurrencySelect name="base" defaultValue={rate?.base} />
        </Labelled>
        <Labelled label="To">
          <CurrencySelect name="quote" defaultValue={rate?.quote ?? CURRENCIES[1]} />
        </Labelled>
        <Labelled label="Rate (1 unit buys)">
          <Input name="rate" required inputMode="decimal" defaultValue={rate ? String(rate.rate) : ""} />
        </Labelled>
        <Labelled label="Round to nearest (optional)">
          <Input
            name="rounding"
            inputMode="decimal"
            defaultValue={
              rate?.rounding_increment_minor
                ? minorToMajorInput(rate.rounding_increment_minor, rate.quote)
                : ""
            }
            placeholder="e.g. 5"
          />
        </Labelled>
      </div>
      <RowActions
        pending={pending}
        state={state}
        saveLabel={rate ? "Save rate" : "Add rate"}
        deleteAction={rate ? deleteFxRate : undefined}
        deleteWhat="exchange rate"
      />
    </form>
  );
}

export function ZoneForm({ zone }: { zone?: { id: string; name: string; countries: string[] } }) {
  const [state, action, pending] = useActionState(saveZone, idle);
  return (
    <form action={action} className="gap-space-3 py-space-3 flex flex-col">
      {zone && <input type="hidden" name="id" value={zone.id} />}
      <div className="gap-space-3 grid sm:grid-cols-2">
        <Labelled label="Zone name">
          <Input name="name" required defaultValue={zone?.name ?? ""} />
        </Labelled>
        <Labelled label="Countries (two-letter codes, blank = rest of the world)">
          <Input name="countries" defaultValue={zone?.countries.join(", ") ?? ""} placeholder="NG, GB" />
        </Labelled>
      </div>
      <RowActions
        pending={pending}
        state={state}
        saveLabel={zone ? "Save zone" : "Add zone"}
        deleteAction={zone ? deleteZone : undefined}
        deleteWhat="zone and all its delivery charges"
      />
    </form>
  );
}

export function ShippingRateForm({
  zoneId,
  rate,
}: {
  zoneId: string;
  rate?: {
    id: string;
    name: string;
    currency: Currency;
    amount_minor: number;
    eta_text: string;
    active: boolean;
  };
}) {
  const [state, action, pending] = useActionState(saveShippingRate, idle);
  return (
    <form action={action} className="gap-space-3 py-space-3 flex flex-col">
      <input type="hidden" name="zoneId" value={zoneId} />
      {rate && <input type="hidden" name="id" value={rate.id} />}
      <div className="gap-space-3 grid sm:grid-cols-2 lg:grid-cols-4">
        <Labelled label="Charge name">
          <Input name="name" required defaultValue={rate?.name ?? ""} />
        </Labelled>
        <Labelled label="Currency">
          <CurrencySelect name="currency" defaultValue={rate?.currency} />
        </Labelled>
        <Labelled label="Charge (0 = free)">
          <Input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={rate ? minorToMajorInput(rate.amount_minor, rate.currency) : ""}
          />
        </Labelled>
        <Labelled label="Delivery time">
          <Input name="etaText" defaultValue={rate?.eta_text ?? ""} placeholder="2 to 4 working days" />
        </Labelled>
      </div>
      <label className="gap-space-2 text-body flex min-h-11 items-center">
        <input
          type="checkbox"
          name="active"
          defaultChecked={rate?.active ?? true}
          className="accent-action"
        />
        Offer this charge at checkout
      </label>
      <RowActions
        pending={pending}
        state={state}
        saveLabel={rate ? "Save charge" : "Add charge"}
        deleteAction={rate ? deleteShippingRate : undefined}
        deleteWhat="delivery charge"
      />
    </form>
  );
}
