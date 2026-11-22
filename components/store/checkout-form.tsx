"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { identify } from "@/lib/analytics/client";
import { placeOrderAction, type PlaceOrderState } from "@/lib/checkout/actions";
import { formatMoney, type Currency } from "@/lib/money";
import { ProductImage } from "./product-image";

export type ShippingChoice = {
  id: string;
  label: string;
  etaText: string;
  amountMinor: number;
  countries: string[];
};

export type SummaryLine = {
  variantId: string;
  productName: string;
  colour: string;
  size: string;
  qty: number;
  imagePath: string | null;
  lineTotalMinor: number;
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function Field({
  name,
  label,
  error,
  ...props
}: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-space-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="text-body-s text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="label border-line pb-space-2 text-ink border-b">{children}</h2>;
}

/**
 * PAY-1..3: guest details, delivery choice and a summary that shows the total
 * before paying. Prices here are for display; the server re-prices everything
 * when payment starts, so nothing in this form can change what is charged.
 */
export function CheckoutForm({
  currency,
  lines,
  subtotalMinor,
  shipping,
  provider,
  whatsappHref,
}: {
  currency: Currency;
  lines: SummaryLine[];
  subtotalMinor: number;
  shipping: ShippingChoice[];
  /** Display name of the payment provider for this currency, or null if none is set up. */
  provider: { name: string; methods: string | null } | null;
  /** wa.me link for ordering by message while payments aren't switched on. */
  whatsappHref?: string | null;
}) {
  const [state, action, pending] = useActionState<PlaceOrderState, FormData>(placeOrderAction, {});
  const [rateId, setRateId] = useState(shipping[0]?.id ?? "");
  const rate = shipping.find((s) => s.id === rateId);
  const countries = [...new Set(shipping.flatMap((s) => s.countries))].sort();
  const fe = state.fieldErrors ?? {};
  const total = subtotalMinor + (rate?.amountMinor ?? 0);

  // Without any delivery charge for this currency there is nothing to choose or pay.
  if (shipping.length === 0) {
    return (
      <p className="text-body">We don&apos;t deliver in {currency} yet. Please choose another currency.</p>
    );
  }

  return (
    <div className="gap-space-6 lg:gap-space-5 grid grid-cols-1 items-start lg:grid-cols-12">
      <form
        action={action}
        onSubmit={(event) => {
          const email = new FormData(event.currentTarget).get("email");
          if (typeof email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            identify(email.trim().toLowerCase());
          }
        }}
        className="space-y-space-6 lg:col-span-7"
      >
        <section className="space-y-space-3">
          <SectionTitle>01. Contact &amp; delivery address</SectionTitle>
          <div className="gap-space-3 grid grid-cols-1 sm:grid-cols-2">
            <Field name="email" label="Email" type="email" autoComplete="email" required error={fe.email} />
            <Field
              name="phone"
              label="Phone or WhatsApp"
              type="tel"
              autoComplete="tel"
              required
              error={fe.phone}
            />
          </div>
          <Field name="name" label="Full name" autoComplete="name" required error={fe.name} />
          <Field name="line1" label="Street address" autoComplete="address-line1" required error={fe.line1} />
          <Field
            name="line2"
            label="Apartment, suite (optional)"
            autoComplete="address-line2"
            error={fe.line2}
          />
          <div className="gap-space-3 grid grid-cols-2">
            <Field name="city" label="City" autoComplete="address-level2" required error={fe.city} />
            <Field name="postcode" label="Postcode (optional)" autoComplete="postal-code" />
          </div>
          <div className="gap-space-3 grid grid-cols-1 sm:grid-cols-2">
            <Field name="region" label="State or region (optional)" autoComplete="address-level1" />
            <div className="space-y-space-1">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                name="country"
                required
                defaultValue=""
                className="border-line bg-surface-raised text-body text-ink px-space-3 h-12 w-full rounded-xs border"
              >
                <option value="" disabled>
                  Choose a country
                </option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {regionNames.of(c) ?? c}
                  </option>
                ))}
              </select>
              {fe.country && <p className="text-body-s text-critical">{fe.country}</p>}
            </div>
          </div>
        </section>

        <fieldset className="space-y-space-3">
          <legend className="label border-line pb-space-2 text-ink w-full border-b">
            02. Shipping zone ({currency})
          </legend>
          {shipping.map((s) => (
            <label
              key={s.id}
              className={`gap-space-3 p-space-3 flex min-h-11 cursor-pointer items-center justify-between border transition-colors ${
                rateId === s.id ? "border-ink bg-surface-raised" : "border-line hover:border-ink-muted"
              }`}
            >
              <span className="gap-space-3 flex items-center">
                <input
                  type="radio"
                  className="accent-action"
                  name="shippingRateId"
                  value={s.id}
                  checked={rateId === s.id}
                  onChange={() => setRateId(s.id)}
                />
                <span className="text-body">
                  <span className="font-medium">{s.label}</span>
                  {s.etaText && <span className="text-body-s text-ink-muted block">{s.etaText}</span>}
                </span>
              </span>
              <span className="text-body font-medium tabular-nums">
                {formatMoney(s.amountMinor, currency)}
              </span>
            </label>
          ))}
          {fe.shippingRateId && <p className="text-body-s text-critical">{fe.shippingRateId}</p>}
        </fieldset>

        <section className="space-y-space-3">
          <SectionTitle>03. Payment</SectionTitle>
          <div className="border-line bg-surface-raised p-space-3 space-y-space-2 border">
            {provider ? (
              <>
                <div className="gap-space-2 text-body-s flex flex-wrap items-center justify-between">
                  <span className="text-ink font-medium">
                    {provider.name} · {currency}
                    {provider.methods ? ` ${provider.methods}` : ""}
                  </span>
                  <span className="text-ink-muted tabular-nums">
                    Locked charge: {formatMoney(total, currency)}
                  </span>
                </div>
                <p className="text-body-s text-ink-muted">
                  You pay on {provider.name}&apos;s secure page, so your card details never touch Xarina. Your
                  order is confirmed as soon as the payment clears. Amount and currency ({currency}) are fixed
                  when you start.
                </p>
              </>
            ) : (
              <p className="text-body-s text-ink-muted">
                Payments in {currency} aren&apos;t switched on yet.{" "}
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline underline-offset-4"
                  >
                    Contact us on WhatsApp
                  </a>
                ) : (
                  "Contact us"
                )}{" "}
                to order.
              </p>
            )}
          </div>
        </section>

        {state.error && (
          <p role="alert" className="text-body text-critical font-medium">
            {state.error}
          </p>
        )}
        <Button block disabled={pending || !provider}>
          <Lock aria-hidden="true" className="size-4" />
          {pending
            ? "Starting payment…"
            : provider
              ? `Pay ${formatMoney(total, currency)} via ${provider.name}`
              : `Pay ${formatMoney(total, currency)}`}
        </Button>
        <p className="text-body-s text-ink-muted">Your pieces are held for 15 minutes once payment starts.</p>
      </form>

      <aside
        aria-label="Order summary"
        className="border-line bg-surface-sunk p-space-4 space-y-space-4 border lg:sticky lg:top-24 lg:col-span-5"
      >
        <h2 className="font-display text-display-m">Order summary</h2>
        <ul className="divide-line divide-y">
          {lines.map((l) => (
            <li key={l.variantId} className="py-space-3 gap-space-3 flex first:pt-0">
              <div className="w-16 shrink-0">
                <ProductImage path={l.imagePath} alt="" sizes="64px" />
              </div>
              <div className="text-body-s min-w-0 flex-1">
                <p className="text-body text-ink font-medium">{l.productName}</p>
                <p className="text-ink-muted mt-1 tabular-nums">
                  {l.colour} · {l.size} · Qty {l.qty}
                </p>
                <p className="mt-space-1 text-body font-medium tabular-nums">
                  {formatMoney(l.lineTotalMinor, currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="border-line space-y-space-2 pt-space-3 text-body border-t">
          <div className="text-ink-muted flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotalMinor, currency)}</dd>
          </div>
          <div className="text-ink-muted flex justify-between">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{rate ? formatMoney(rate.amountMinor, currency) : "—"}</dd>
          </div>
          <div className="border-line pt-space-2 flex justify-between border-t font-semibold">
            <dt>Total ({currency})</dt>
            <dd className="tabular-nums">{formatMoney(total, currency)}</dd>
          </div>
        </dl>
        <p className="text-body-s text-ink-muted gap-space-2 flex items-start">
          <ShieldCheck aria-hidden="true" className="text-ink mt-0.5 size-4 shrink-0 stroke-[1.5]" />
          <span>
            Each piece is held for you while you pay, so it can&apos;t be sold to someone else mid-checkout.
          </span>
        </p>
      </aside>
    </div>
  );
}
