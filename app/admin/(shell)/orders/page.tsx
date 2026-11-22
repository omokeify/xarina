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
    <div className="gap-8 flex flex-col">
      <header className="gap-1 flex flex-col">
        <p className="label text-accent">
          Order Processing &amp; Fulfillment
        </p>
        <h1 className="font-display text-display-m">Orders Board</h1>
        <p className="text-body-s text-ink-muted">
          Orders are marked paid only when the payment provider confirms them. Times are shown in UTC.
        </p>
      </header>

      <form method="get" className="gap-4 flex flex-wrap items-end bg-surface-raised border border-line p-4">
        <div className="gap-1 flex flex-col">
          <label htmlFor="status" className="label text-ink-muted">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={isOrderStatus(status) ? status : ""}
            className="border-line bg-surface text-ink px-3 py-2 text-body-s border focus:outline-none cursor-pointer h-10"
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="gap-1 flex min-w-64 flex-1 flex-col">
          <label htmlFor="q" className="label text-ink-muted">
            Search Reference or Client Email
          </label>
          <Input id="q" name="q" defaultValue={search} placeholder="e.g. XAR-2026-0001 or client@..." maxLength={60} />
        </div>
        <Button type="submit" size="sm">
          Filter Board
        </Button>
      </form>

      {orders.length === 0 ? (
        <div className="border border-line bg-surface-raised p-12 text-center">
          <p className="text-body-s text-ink-muted">No orders match the selected criteria.</p>
        </div>
      ) : (
        <div className="border border-line bg-surface-raised overflow-hidden">
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="px-6 py-4 hover:bg-surface-sunk/30 transition-colors grid grid-cols-1 md:grid-cols-[10rem_1fr_auto_auto] gap-3 md:gap-6 items-start md:items-center"
                >
                  <span className="font-display text-title text-ink font-medium">{o.number}</span>
                  <div className="flex flex-col">
                    <span className="text-body font-normal text-ink">{o.email}</span>
                    <span className="text-body-s text-ink-muted">
                      {when.format(new Date(o.created_at))}
                      {o.channel === "vip" ? " · Privé Early Access" : " · Public Storefront"}
                    </span>
                  </div>
                  <span className="text-body font-medium tabular-nums text-ink">
                    {isCurrency(o.currency)
                      ? formatMoney(o.total_minor, o.currency as Currency)
                      : o.total_minor}
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-1 label border ${
                      o.status === "paid"
                        ? "bg-accent/20 text-accent border-accent/40"
                        : o.status === "delivered"
                        ? "bg-surface-sunk text-ink border-line"
                        : o.status === "cancelled" || o.status === "refunded"
                        ? "bg-critical/10 text-critical border-critical/30"
                        : "bg-surface text-ink-muted border-line"
                    }`}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
