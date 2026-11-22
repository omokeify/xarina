import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isOrderStatus, nextStatuses, STATUS_LABEL } from "@/lib/admin/orders";
import { type Currency, formatMoney, isCurrency } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";
import { Section } from "../../products/_components/form-parts";
import { NoteForm, StatusForm } from "./order-forms";

export const metadata: Metadata = { title: "Order" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

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
  const { data: notes } = canSeeNotes
    ? await supabase
        .from("notes")
        .select("id, body, created_at, staff:staff_id(name)")
        .eq("entity_type", "order")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const next = nextStatuses(staff.role, order.status);
  const address = (order.shipping_address ?? {}) as Record<string, unknown>;
  const addressLines = ["name", "line1", "line2", "city", "region", "postcode", "country"]
    .map((k) => (typeof address[k] === "string" ? (address[k] as string) : ""))
    .filter(Boolean);

  return (
    <div className="gap-space-5 flex max-w-3xl flex-col">
      <Link href="/admin/orders" className="label text-ink-muted hover:text-ink">
        ← All orders
      </Link>

      <header className="gap-space-1 flex flex-col">
        <h1 className="font-display text-display-m">Order {order.number}</h1>
        <p className="text-body text-ink-muted">
          {STATUS_LABEL[order.status]} · placed {when.format(new Date(order.created_at))}
          {order.paid_at ? ` · paid ${when.format(new Date(order.paid_at))}` : ""}
          {order.channel === "vip" ? " · Privé" : ""}
        </p>
      </header>

      <Section title="Pieces">
        <ul className="divide-line border-line divide-y border-y">
          {order.order_items.map((item) => (
            <li key={item.id} className="gap-space-3 py-space-3 flex items-baseline justify-between">
              <span className="flex flex-col">
                <span className="text-body font-medium">{item.product_name}</span>
                <span className="text-body-s text-ink-muted">
                  {item.colour} · {item.size} · {item.sku} · Qty {item.qty}
                </span>
              </span>
              <span className="text-body tabular-nums">{money(item.unit_price_minor * item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="gap-space-1 text-body flex max-w-xs flex-col">
          <div className="text-ink-muted flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{money(order.subtotal_minor)}</dd>
          </div>
          <div className="text-ink-muted flex justify-between">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{money(order.shipping_minor)}</dd>
          </div>
          <div className="border-line pt-space-1 flex justify-between border-t font-semibold">
            <dt>Total ({currency})</dt>
            <dd className="tabular-nums">{money(order.total_minor)}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Customer and delivery">
        <div className="gap-space-4 text-body grid sm:grid-cols-2">
          <div className="gap-space-1 flex flex-col">
            <p className="label text-ink-muted">Contact</p>
            <p>{order.email}</p>
            {order.phone && <p>{order.phone}</p>}
          </div>
          <div className="gap-space-1 flex flex-col">
            <p className="label text-ink-muted">Delivering to</p>
            {addressLines.map((line, i) => (
              <p key={`${i}-${line}`}>{line}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Payment and tracking">
        <dl className="gap-space-2 text-body grid sm:grid-cols-[10rem_1fr]">
          <dt className="text-ink-muted">Provider</dt>
          <dd>{order.provider ?? "—"}</dd>
          <dt className="text-ink-muted">Payment reference</dt>
          <dd className="break-all tabular-nums">{order.provider_ref ?? "—"}</dd>
          <dt className="text-ink-muted">Courier</dt>
          <dd>{order.courier ?? "—"}</dd>
          <dt className="text-ink-muted">Tracking</dt>
          <dd className="break-all">
            {order.tracking_number ?? "—"}
            {order.tracking_url && (
              <>
                {" "}
                ·{" "}
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Open link
                </a>
              </>
            )}
          </dd>
        </dl>
      </Section>

      {next.length > 0 && (
        <Section
          title="Update status"
          description="Orders move forward only. Paid is set automatically when the provider confirms payment."
        >
          <StatusForm orderId={order.id} options={next} />
        </Section>
      )}

      {canSeeNotes && (
        <Section title="Notes">
          <NoteForm orderId={order.id} />
          {(notes ?? []).length > 0 && (
            <ul className="divide-line border-line divide-y border-y">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="gap-space-1 py-space-3 flex flex-col">
                  <p className="text-body">{n.body}</p>
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
