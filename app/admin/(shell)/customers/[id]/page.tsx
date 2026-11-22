import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { customerRecord } from "@/lib/customers/admin";
import { formatMoney } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Customer" };

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const when = (iso: string | null) => (iso ? day.format(new Date(iso)) : "");

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border border-line bg-surface-raised p-6 sm:p-8 flex flex-col gap-4">
      <div className="border-b border-line pb-3">
        <h2 id={id} className="font-display text-xl text-ink font-normal">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 border-line grid border-b sm:grid-cols-[200px_1fr] items-center text-body-s">
      <dt className="label text-ink-muted">{label}</dt>
      <dd className="text-body-s text-ink">{children}</dd>
    </div>
  );
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["owner", "manager", "support"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_customer", { p_id: id });
  if (error) {
    if (error.code === "P0002" || error.code === "22P02") notFound();
    throw error;
  }
  const { customer, consents, orders, waitlist } = customerRecord.parse(data);

  const consentText = (c: { given: boolean; at: string | null; source: string | null }) =>
    c.given ? `Given on ${when(c.at)}${c.source ? ` (${c.source})` : ""}` : "Not given";

  return (
    <div className="space-y-8 max-w-4xl">
      <Link href="/admin/customers" className="label text-ink-muted hover:text-ink inline-flex items-center gap-1.5">
        ← Back to Customers
      </Link>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-display-m text-ink">{customer.name ?? customer.email}</h1>
          <span
            className={`label px-2 py-0.5 border ${
              customer.is_vip
                ? "border-accent/40 bg-accent/10 text-ink"
                : "border-line bg-surface-sunk text-ink-muted"
            }`}
          >
            {customer.is_vip ? "Privé VIP" : "Standard Client"}
          </span>
        </div>
        {customer.name && <p className="text-body-s text-ink-muted">{customer.email}</p>}
      </header>

      <Section id="details" title="Client Profile">
        <dl className="divide-line">
          <Row label="Email Address">{customer.email}</Row>
          <Row label="Telephone">{customer.phone ?? "Not given"}</Row>
          <Row label="Country Residence">{customer.country ?? "Not given"}</Row>
          <Row label="Member Since">{when(customer.created_at)}</Row>
        </dl>
      </Section>

      <Section id="prive" title="Privé Salon Allocation">
        <dl className="divide-line">
          <Row label="Membership Tier">{customer.is_vip ? "Privé Member" : "Standard"}</Row>
          {customer.vip_approved_at && <Row label="VIP Approved Date">{when(customer.vip_approved_at)}</Row>}
          {customer.prive_requested_at && !customer.is_vip && (
            <Row label="Access Requested">{when(customer.prive_requested_at)}</Row>
          )}
        </dl>
        <div className="pt-2">
          <Link
            href="/admin/drops/prive"
            className="label text-accent hover:text-ink underline underline-offset-4"
          >
            Manage Privé membership roster →
          </Link>
        </div>
      </Section>

      <Section id="consent" title="Consents &amp; Notifications">
        <dl className="divide-line">
          <Row label="Drop Alerts">
            {consentText(consents.drop_alerts)}
            {customer.all_drops_alerts && " · every drop"}
          </Row>
          <Row label="Private Lookbook / Marketing">{consentText(consents.marketing)}</Row>
        </dl>
      </Section>

      <Section id="orders" title={`Settled Orders (${orders.length})`}>
        {orders.length === 0 ? (
          <p className="text-body-s text-ink-muted py-2">No settled orders.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {orders.map((o) => (
              <li key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-medium text-ink">Order {o.number}</span>
                  <span className="text-caption text-ink-muted">
                    Paid {when(o.paid_at)} · {o.channel === "vip" ? "Privé" : "Public"} ·{" "}
                    {o.status.replace(/_/g, " ")}
                  </span>
                </span>
                <span className="text-body tabular-nums text-ink">{formatMoney(o.total_minor, o.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="interest" title={`Waitlist Engagement (${waitlist.length})`}>
        <p className="text-body-s text-ink-muted leading-relaxed">
          Designs and silhouettes this client registered early interest for.
        </p>
        {waitlist.length === 0 ? (
          <p className="text-body-s text-ink-muted py-2">No waitlist entries.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y mt-2">
            {waitlist.map((w) => (
              <li
                key={w.product_id}
                className="py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-body font-medium text-ink">{w.name}</span>
                <span className="text-caption text-ink-muted">
                  {[w.colour, w.size].filter(Boolean).join(", ")}
                  {w.colour || w.size ? " · " : ""}Joined {when(w.joined_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
