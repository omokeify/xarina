import type { Metadata } from "next";
import { isCurrency, type Currency } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";
import { Section } from "../products/_components/form-parts";
import { FxRateForm, ShippingRateForm, ZoneForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

// Owner-only: the numbers that decide what shoppers are charged (CUR-2, PAY-3).
// Which payment processor takes GBP and USD is configured with PAYMENT_PROVIDER_* in the
// environment, not here, because it depends on Xarina's payout accounts.
export default async function SettingsPage() {
  await requireStaff(["owner"]);
  const supabase = await createClient();
  const [{ data: rates }, { data: zones }] = await Promise.all([
    supabase.from("fx_rates").select("*").order("base").order("quote"),
    supabase.from("shipping_zones").select("*, shipping_rates(*)").order("sort").order("name"),
  ]);

  return (
    <div className="gap-space-5 flex max-w-5xl flex-col">
      <header className="gap-space-2 flex flex-col">
        <p className="label text-accent">Store Configuration</p>
        <h1 className="font-display text-display-m text-ink">Settings &amp; Global Rates</h1>
        <p className="text-body-s text-ink-muted">
          Changes apply to new checkouts immediately. Every change is recorded in the audit log.
        </p>
      </header>

      <Section
        id="fx"
        title="Exchange Rates &amp; Auto FX Rules"
        description="Used for designs set to convert from a base price. The rate is how much of the quote currency one unit of the base currency buys. Rounding tidies the converted price, for example to the nearest £5 or $5."
      >
        <div className="divide-line border-line divide-y border-y">
          {(rates ?? []).map((r) => (
            <FxRateForm
              key={r.id}
              rate={{
                id: r.id,
                base: r.base as Currency,
                quote: r.quote as Currency,
                rate: Number(r.rate),
                rounding_increment_minor: r.rounding_increment_minor,
              }}
            />
          ))}
        </div>
        <div className="pt-space-2">
          <h3 className="label text-ink-muted mb-space-2">Add Currency Pair</h3>
          <FxRateForm />
        </div>
      </Section>

      <Section
        id="shipping"
        title="Shipping Zones &amp; Delivery Charges"
        description="A zone is a set of countries with its own delivery charges. A zone with no countries covers the rest of the world. Shoppers only see the charges for their currency."
      >
        {(zones ?? []).map((zone) => (
          <div key={zone.id} className="border border-line bg-surface p-space-3 flex flex-col gap-space-3">
            <ZoneForm zone={{ id: zone.id, name: zone.name, countries: zone.countries }} />
            <div className="divide-line border-line divide-y border-t pt-space-2">
              {[...zone.shipping_rates]
                .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
                .filter((r) => isCurrency(r.currency))
                .map((r) => (
                  <ShippingRateForm
                    key={r.id}
                    zoneId={zone.id}
                    rate={{
                      id: r.id,
                      name: r.name,
                      currency: r.currency as Currency,
                      amount_minor: r.amount_minor,
                      eta_text: r.eta_text,
                      active: r.active,
                    }}
                  />
                ))}
              <div className="pt-space-3">
                <h3 className="label text-ink-muted mb-space-2">
                  Add Delivery Charge to {zone.name}
                </h3>
                <ShippingRateForm zoneId={zone.id} />
              </div>
            </div>
          </div>
        ))}
        <div className="border border-dashed border-line p-space-3">
          <h3 className="label text-ink-muted mb-space-2">Add New Shipping Zone</h3>
          <ZoneForm />
        </div>
      </Section>
    </div>
  );
}
