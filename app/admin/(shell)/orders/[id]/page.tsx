import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { changeLines, actionLabel } from "@/lib/admin/audit";
import {
  orderAttribution,
  orderTimeline,
  paymentEventLabel,
  type StatusChange,
} from "@/lib/admin/order-detail";
import { isOrderStatus, nextStatuses, STATUS_LABEL } from "@/lib/admin/orders";
import { UTM_KEYS } from "@/lib/attribution/utm";
import { type Currency, formatMoney, isCurrency } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";
import { Section } from "../../products/_components/form-parts";
import { NoteForm, StatusForm } from "./order-forms";

export const metadata: Metadata = { title: "Order" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

const UTM_LABEL: Record<(typeof UTM_KEYS)[number], string> = {
  utm_source: "Source",
  utm_medium: "Medium",
  utm_campaign: "Campaign",
  utm_term: "Term",
  utm_content: "Content",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(["owner", "manager", "fulfilment", "support"]);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (!order || !isOrderStatus(order.status) || !isCurrency(order.currency)) notFound();
  const currency = order.currency as Currency;
  const money = (minor: number) => formatMoney(minor, currency);

  const canSeeNotes = staff.role === "owner" || staff.role === "manager" || staff.role === "support";
  // payment_events and audit_log are readable by owner/manager only (RLS).
  const canSeeHistory = staff.role === "owner" || staff.role === "manager";

  const { data: notes } = canSeeNotes
    ? await supabase
        .from("notes")
        .select("id, body, created_at, staff:staff_id(name)")
        .eq("entity_type", "order")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const [history, paymentEvents, drop] = await Promise.all([
    canSeeHistory
      ? supabase
          .from("audit_log")
          .select("id, action, before, after, at, staff:staff_id(name)")
          .eq("entity_type", "order")
          .eq("entity_id", id)
          .order("at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canSeeHistory && order.provider_ref
      ? supabase
          .from("payment_events")
          .select("id, event_type, signature_valid, received_at, payload")
          .eq("provider_ref", order.provider_ref)
          .order("received_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    order.drop_id
      ? supabase.from("drops").select("name, slug").eq("id", order.drop_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const statusChanges: StatusChange[] = (history.data ?? [])
    .filter((h) => h.action === "order.status")
    .map((h) => {
      const after = h.after;
      const to = after && typeof after === "object" && !Array.isArray(after) ? after.status : null;
      return isOrderStatus(to) ? { to, at: h.at } : null;
    })
    .filter((c): c is StatusChange => c !== null);

  const timeline = orderTimeline({
    createdAt: order.created_at,
    paidAt: order.paid_at,
    status: order.status,
    statusChanges,
  });
  const attribution = orderAttribution(order.utm);
  const utmRows = attribution
    ? UTM_KEYS.filter((key) => attribution[key]).map((key) => [key, attribution[key]!] as const)
    : [];
  const units = order.order_items.reduce((sum, item) => sum + item.qty, 0);
  const next = nextStatuses(staff.role, order.status);
  const address = (order.shipping_address ?? {}) as Record<string, unknown>;
  const addressLines = ["name", "line1", "line2", "city", "region", "postcode", "country"]
    .map((k) => (typeof address[k] === "string" ? (address[k] as string) : ""))
    .filter(Boolean);
  const canSeeCustomer = staff.role === "owner" || staff.role === "manager" || staff.role === "support";

  return (
    <div className="max-w-4xl space-y-8">
      <Link
        href="/admin/orders"
        className="label text-ink-muted hover:text-ink inline-flex items-center gap-1.5"
      >
        ← Back to Orders
      </Link>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-display-m text-ink">Order {order.number}</h1>
          <span className="label border-line bg-surface-raised text-ink border px-2 py-0.5">
            {STATUS_LABEL[order.status]}
          </span>
          {order.channel === "vip" && (
            <span className="label border-accent/40 bg-accent/10 text-ink border px-2 py-0.5">
              Privé Allocation
            </span>
          )}
          <span className="label border-line bg-surface-sunk text-ink-muted border px-2 py-0.5">
            {order.order_items.length} {order.order_items.length === 1 ? "piece" : "pieces"} · {units}{" "}
            {units === 1 ? "unit" : "units"}
          </span>
        </div>
        <p className="text-body-s text-ink-muted">
          Placed {when.format(new Date(order.created_at))}
          {order.paid_at ? ` · Paid ${when.format(new Date(order.paid_at))}` : ""}
          {` · Updated ${when.format(new Date(order.updated_at))}`}
        </p>
      </header>

      <Section
        title="Order Progress"
        description="The dates we actually have; audit history is included for owners and managers."
      >
        <ol className="border-line ml-1 flex flex-col border-l">
          {timeline.map((step) => (
            <li key={step.label} className="relative pb-5 pl-6 last:pb-0">
              <span
                aria-hidden
                className={`absolute top-1 -left-[5px] h-2.5 w-2.5 border ${
                  step.state === "done"
                    ? "border-accent bg-accent"
                    : step.state === "current"
                      ? "border-accent bg-surface"
                      : step.state === "skipped"
                        ? "border-critical bg-critical/20"
                        : "border-line bg-surface"
                }`}
              />
              <p
                className={`text-body-s ${step.state === "todo" || step.state === "skipped" ? "text-ink-muted" : "text-ink"}`}
              >
                {step.label}
                {step.state === "current" && <span className="label text-accent ml-2">Current</span>}
              </p>
              <p className="text-caption text-ink-muted">{step.at ? when.format(new Date(step.at)) : "—"}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Ordered Pieces">
        <ul className="divide-line border-line divide-y border-y">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 py-4">
              <span className="flex flex-col gap-0.5">
                <span className="text-body text-ink font-medium">{item.product_name}</span>
                <span className="text-body-s text-ink-muted">
                  {item.colour} · {item.size} · {item.sku} · Qty {item.qty}
                </span>
              </span>
              <span className="text-body text-ink tabular-nums">
                {money(item.unit_price_minor * item.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end pt-2">
          <dl className="text-body flex w-full max-w-xs flex-col gap-2">
            <div className="text-ink-muted text-body-s flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{money(order.subtotal_minor)}</dd>
            </div>
            <div className="text-ink-muted text-body-s flex justify-between">
              <dt>Delivery</dt>
              <dd className="tabular-nums">{money(order.shipping_minor)}</dd>
            </div>
            <div className="border-line text-ink flex justify-between border-t pt-2 font-medium">
              <dt>Total ({currency})</dt>
              <dd className="text-body tabular-nums">{money(order.total_minor)}</dd>
            </div>
          </dl>
        </div>
      </Section>

      <Section title="Customer &amp; Shipping Address">
        <div className="text-body grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <p className="label text-ink-muted">Contact Details</p>
            <p className="text-ink font-medium">{order.email}</p>
            {order.phone && <p className="text-body-s text-ink-muted">{order.phone}</p>}
            {canSeeCustomer && order.customer_id && (
              <Link
                href={`/admin/customers/${order.customer_id}`}
                className="label text-accent hover:text-ink mt-1 underline underline-offset-4"
              >
                View client profile →
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="label text-ink-muted">Delivery Address</p>
            {addressLines.map((line, i) => (
              <p key={`${i}-${line}`} className="text-body-s text-ink">
                {line}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Source &amp; Attribution">
        <dl className="text-body text-body-s grid gap-3 sm:grid-cols-[12rem_1fr]">
          <dt className="label text-ink-muted">Sales Channel</dt>
          <dd className="text-ink">{order.channel === "vip" ? "Privé Early Access" : "Public Storefront"}</dd>
          <dt className="label text-ink-muted">Drop</dt>
          <dd className="text-ink">
            {drop.data ? (
              <Link
                href={`/admin/drops/${order.drop_id}`}
                className="text-accent hover:text-ink underline underline-offset-4"
              >
                {drop.data.name}
              </Link>
            ) : (
              "Available now"
            )}
          </dd>
          {utmRows.length === 0 ? (
            <>
              <dt className="label text-ink-muted">Campaign</dt>
              <dd className="text-ink-muted">No campaign data recorded</dd>
            </>
          ) : (
            utmRows.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="label text-ink-muted">{UTM_LABEL[key]}</dt>
                <dd className="text-ink break-all">{value}</dd>
              </div>
            ))
          )}
        </dl>
      </Section>

      <Section title="Settlement &amp; Logistics">
        <dl className="text-body text-body-s grid gap-3 sm:grid-cols-[12rem_1fr]">
          <dt className="label text-ink-muted">Payment Gateway</dt>
          <dd className="text-ink">{order.provider ?? "—"}</dd>
          <dt className="label text-ink-muted">Gateway Reference</dt>
          <dd className="text-ink break-all tabular-nums">{order.provider_ref ?? "—"}</dd>
          <dt className="label text-ink-muted">Logistics Courier</dt>
          <dd className="text-ink">{order.courier ?? "—"}</dd>
          <dt className="label text-ink-muted">Tracking Identifier</dt>
          <dd className="text-ink break-all">
            {order.tracking_number ?? "—"}
            {order.tracking_url && (
              <>
                {" "}
                ·{" "}
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink text-accent underline underline-offset-4"
                >
                  Track Consignment
                </a>
              </>
            )}
          </dd>
        </dl>
      </Section>

      {next.length > 0 && (
        <Section
          title="Fulfillment Transition"
          description="Orders advance sequentially through the fulfillment lifecycle. Paid status is locked and confirmed via webhook from the payment provider."
        >
          <StatusForm orderId={order.id} options={next} />
        </Section>
      )}

      {canSeeHistory && (
        <Section
          title="Payment Events"
          description="Every webhook received for this reference, including deliveries that were rejected."
        >
          {(paymentEvents.data ?? []).length === 0 ? (
            <p className="text-body-s text-ink-muted py-2">No webhook events recorded for this order.</p>
          ) : (
            <ul className="divide-line border-line divide-y border-y">
              {(paymentEvents.data ?? []).map((event) => {
                const raw = JSON.stringify(event.payload, null, 2);
                return (
                  <li key={event.id} className="flex flex-col gap-1 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-body text-ink">
                        {paymentEventLabel(event.event_type)}
                        <span className="text-caption text-ink-muted ml-2">{event.event_type}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span
                          className={`label ${event.signature_valid ? "text-ink-muted" : "text-critical"}`}
                        >
                          {event.signature_valid ? "Valid signature" : "Invalid signature"}
                        </span>
                        <span className="text-caption text-ink-muted">
                          {when.format(new Date(event.received_at))}
                        </span>
                      </span>
                    </div>
                    <details className="label text-ink-muted">
                      <summary className="hover:text-ink cursor-pointer">View raw payload</summary>
                      <pre className="bg-surface-sunk text-ink text-caption mt-2 max-h-64 overflow-auto p-3 tracking-normal normal-case">
                        {raw.length > 4000 ? `${raw.slice(0, 4000)}…` : raw}
                      </pre>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}

      {canSeeHistory && (
        <Section title="Order Activity" description="Status changes and the staff member who made them.">
          {(history.data ?? []).length === 0 ? (
            <p className="text-body-s text-ink-muted py-2">No staff activity recorded for this order.</p>
          ) : (
            <ul className="divide-line border-line divide-y border-y">
              {(history.data ?? []).map((entry) => {
                const changes = changeLines(entry.before, entry.after);
                return (
                  <li key={entry.id} className="flex flex-col gap-0.5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-body text-ink">{actionLabel(entry.action)}</span>
                      <span className="text-caption text-ink-muted">{when.format(new Date(entry.at))}</span>
                    </div>
                    {changes.length > 0 && (
                      <p className="text-caption text-ink-muted">{changes.join(" · ")}</p>
                    )}
                    <p className="text-caption text-ink-muted">{entry.staff?.name ?? "System"}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}

      {canSeeNotes && (
        <Section title="Stylist &amp; Operations Notes">
          <NoteForm orderId={order.id} />
          {(notes ?? []).length > 0 && (
            <ul className="divide-line border-line mt-3 divide-y border-y">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="flex flex-col gap-1 py-3">
                  <p className="text-body text-ink">{n.body}</p>
                  <p className="text-caption text-ink-muted">
                    {n.staff?.name ?? "Staff"} · {when.format(new Date(n.created_at))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
