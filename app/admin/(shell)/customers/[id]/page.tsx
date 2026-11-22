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
    <section aria-labelledby={id} className="gap-space-3 flex flex-col">
      <h2 id={id} className="font-display text-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gap-space-1 py-space-2 border-line grid border-b md:grid-cols-[200px_1fr]">
      <dt className="label text-ink-muted">{label}</dt>
      <dd className="text-body">{children}</dd>
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
    <div className="gap-space-6 flex flex-col">
      <header className="gap-space-2 flex flex-col">
        <Link href="/admin/customers" className="label text-ink-muted hover:text-ink">
          Customers
        </Link>
        <h1 className="font-display text-display-m">{customer.name ?? customer.email}</h1>
        {customer.name && <p className="text-body-s text-ink-muted">{customer.email}</p>}
      </header>

      <Section id="details" title="Details">
        <dl>
          <Row label="Email">{customer.email}</Row>
          <Row label="Phone">{customer.phone ?? "Not given"}</Row>
          <Row label="Country">{customer.country ?? "Not given"}</Row>
          <Row label="Customer since">{when(customer.created_at)}</Row>
        </dl>
      </Section>

      <Section id="prive" title="Privé">
        <dl>
          <Row label="Status">{customer.is_vip ? "Member" : "Not a member"}</Row>
          {customer.vip_approved_at && <Row label="Approved">{when(customer.vip_approved_at)}</Row>}
          {customer.prive_requested_at && !customer.is_vip && (
            <Row label="Requested">{when(customer.prive_requested_at)}</Row>
          )}
        </dl>
        <Link
          href="/admin/drops/prive"
          className="text-body-s text-ink-muted hover:text-ink underline underline-offset-4"
        >
          Manage Privé members
        </Link>
      </Section>

      <Section id="consent" title="Consent">
        <dl>
          <Row label="Drop alerts">
            {consentText(consents.drop_alerts)}
            {customer.all_drops_alerts && " · every drop"}
          </Row>
          <Row label="Marketing emails">{consentText(consents.marketing)}</Row>
        </dl>
      </Section>

      <Section id="orders" title={`Paid orders (${orders.length})`}>
        {orders.length === 0 ? (
          <p className="text-body-s text-ink-muted">No paid orders.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {orders.map((o) => (
              <li key={o.id} className="gap-space-2 py-space-3 flex flex-wrap items-center justify-between">
                <span className="flex flex-col">
                  <span className="text-body">{o.number}</span>
                  <span className="text-body-s text-ink-muted">
                    Paid {when(o.paid_at)} · {o.channel === "vip" ? "Privé" : "Public"} ·{" "}
                    {o.status.replace(/_/g, " ")}
                  </span>
                </span>
                <span className="text-body tabular-nums">{formatMoney(o.total_minor, o.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="interest" title={`Waitlist interest (${waitlist.length})`}>
        <p className="text-body-s text-ink-muted">Designs this customer asked to hear about. Not orders.</p>
        {waitlist.length === 0 ? (
          <p className="text-body-s text-ink-muted">None.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {waitlist.map((w) => (
              <li
                key={w.product_id}
                className="gap-space-2 py-space-3 flex flex-wrap items-center justify-between"
              >
                <span className="text-body">{w.name}</span>
                <span className="text-body-s text-ink-muted">
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
