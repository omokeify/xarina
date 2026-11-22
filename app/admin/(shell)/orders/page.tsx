import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cleanSearch, isOrderStatus, ORDER_STATUSES, STATUS_LABEL } from "@/lib/admin/orders";
import { type Currency, formatMoney, isCurrency } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

// ADM-5: the orders board. Newest first, filtered by status, searched by number or email.
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireStaff(["owner", "manager", "fulfilment", "support"]);
  const { status = "", q = "" } = await searchParams;
  const search = cleanSearch(q);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, number, status, email, currency, total_minor, channel, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (isOrderStatus(status)) query = query.eq("status", status);
  if (search) query = query.or(`number.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  const orders = data ?? [];

  return (
    <div className="gap-space-5 flex flex-col">
      <header className="gap-space-2 flex flex-col">
        <h1 className="font-display text-display-m">Orders</h1>
        <p className="text-body-s text-ink-muted">
          Orders are marked paid only when the payment provider confirms them. Times are shown in UTC.
        </p>
      </header>

      <form method="get" className="gap-space-3 flex flex-wrap items-end">
        <div className="gap-space-1 flex flex-col">
          <label htmlFor="status" className="label text-ink-muted">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={isOrderStatus(status) ? status : ""}
            className="border-line bg-surface-raised px-space-3 text-body text-ink h-12 rounded-xs border"
          >
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="gap-space-1 flex min-w-56 flex-1 flex-col">
          <label htmlFor="q" className="label text-ink-muted">
            Search
          </label>
          <Input id="q" name="q" defaultValue={search} placeholder="Order number or email" maxLength={60} />
        </div>
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>

      {orders.length === 0 ? (
        <p className="py-space-5 text-body-s text-ink-muted">No orders match.</p>
      ) : (
        <ul className="divide-line border-line divide-y border-y">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="gap-space-1 py-space-3 hover:bg-surface-sunk md:gap-space-4 md:px-space-3 grid md:grid-cols-[8rem_1fr_auto_auto] md:items-center"
              >
                <span className="font-display text-title">{o.number}</span>
                <span className="flex flex-col">
                  <span className="text-body">{o.email}</span>
                  <span className="text-body-s text-ink-muted">
                    {when.format(new Date(o.created_at))}
                    {o.channel === "vip" ? " · Privé" : ""}
                  </span>
                </span>
                <span className="text-body tabular-nums">
                  {isCurrency(o.currency)
                    ? formatMoney(o.total_minor, o.currency as Currency)
                    : o.total_minor}
                </span>
                <span className="label text-ink-muted">{STATUS_LABEL[o.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
