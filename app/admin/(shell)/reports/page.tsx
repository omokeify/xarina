import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { getReport, isoDay, type Report } from "@/lib/admin/reports";
import { cac, roas } from "@/lib/admin/report-ratios";
import { formatMoney } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { deleteSpend } from "./actions";
import { SpendForm } from "./spend-form";

export const metadata: Metadata = { title: "Reports" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reporting page (PRD › Reporting page). Sales come only from paid orders
 * (rule 2); waitlists are a separate "interest" panel (rule 9); each currency
 * is shown on its own, never converted.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireStaff(["owner", "manager"]);
  const params = await searchParams;
  const now = new Date();
  const to = params.to && DAY.test(params.to) ? params.to : isoDay(now);
  const from = params.from && DAY.test(params.from) && params.from <= to ? params.from : isoDay(now, 29);
  const report = await getReport(from, to);

  return (
    <div className="gap-8 flex flex-col">
      <header className="gap-4 flex flex-col">
        <div className="gap-1 flex flex-col">
          <p className="label text-accent">
            Financial &amp; Campaign Attribution
          </p>
          <h1 className="font-display text-display-m">Reports</h1>
          <p className="text-body-s text-ink-muted">
            Sales come from paid orders only. Currencies are shown separately. Dates are in UTC.
          </p>
        </div>
        <form method="get" className="gap-3 flex flex-wrap items-end bg-surface-raised p-4 border border-line">
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" defaultValue={to} />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Show
          </Button>
        </form>
      </header>

      <Totals rows={report.by_currency} />

      <Section title="Sales by drop">
        <Table
          head={["Drop", "Currency", "Paid orders", "Revenue"]}
          rows={report.by_drop.map((r) => [
            r.drop ?? "Available now (no drop)",
            r.currency,
            r.orders,
            formatMoney(r.revenue_minor, r.currency),
          ])}
          empty="No paid orders in this period."
        />
      </Section>

      <Section title="Sales by day">
        <Table
          head={["Day", "Currency", "Paid orders", "Revenue"]}
          rows={report.by_day.map((r) => [
            r.day,
            r.currency,
            r.orders,
            formatMoney(r.revenue_minor, r.currency),
          ])}
          empty="No paid orders in this period."
        />
      </Section>

      <Section
        title="Waitlist interest"
        note="Interest, not sales. Sign-ups are not orders and may not convert."
      >
        <Table
          head={["Design", "Waitlist sign-ups (interest)"]}
          rows={report.interest.map((r) => [r.product, r.signups])}
          empty="No waitlist sign-ups in this period."
        />
      </Section>

      <Section
        title="Ad spend"
        note="Entered by hand. The summary's CAC and ROAS use it; ad attribution is approximate."
      >
        <SpendForm today={isoDay(now)} />
        <SpendTable rows={report.spend} />
      </Section>
    </div>
  );
}

function Totals({ rows }: { rows: Report["by_currency"] }) {
  if (rows.length === 0) {
    return <p className="text-body text-ink-muted">No paid orders or ad spend in this period.</p>;
  }

  const totalPaidOrders = rows.reduce((sum, r) => sum + r.orders, 0);
  const ngnRow = rows.find((r) => r.currency === "NGN");
  const gbpRow = rows.find((r) => r.currency === "GBP");
  const usdRow = rows.find((r) => r.currency === "USD");

  const ngnRevenue = ngnRow ? formatMoney(ngnRow.revenue_minor, "NGN") : "₦0";
  const gbpRevenue = gbpRow ? formatMoney(gbpRow.revenue_minor, "GBP") : "£0";
  const usdRevenue = usdRow ? formatMoney(usdRow.revenue_minor, "USD") : "$0";

  const totalSpendMinorNgn = ngnRow?.spend_minor ?? 0;
  const newCustomersNgn = ngnRow?.new_customers ?? 0;
  const cacNgn = cac(totalSpendMinorNgn, newCustomersNgn);
  const roasNgn = roas(ngnRow?.revenue_minor ?? 0, totalSpendMinorNgn);

  return (
    <Section
      title="Summary & Performance"
      note="CAC = ad spend ÷ new paying customers. ROAS = revenue ÷ ad spend. Approximate."
    >
      {/* 4-Column Luxury KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-surface-raised border border-line p-5">
          <p className="label text-ink-muted">Paid Orders</p>
          <p className="font-display text-display-m mt-2 tabular-nums text-ink">{totalPaidOrders}</p>
          <p className="text-caption text-ink-muted mt-1">Confirmed payments across drops</p>
        </div>
        <div className="bg-surface-raised border border-line p-5">
          <p className="label text-ink-muted">NGN Settled</p>
          <p className="font-display text-title mt-2 tabular-nums text-ink">{ngnRevenue}</p>
          <p className="text-caption text-ink-muted mt-1">Paystack webhook verified</p>
        </div>
        <div className="bg-surface-raised border border-line p-5">
          <p className="label text-ink-muted">GBP / USD Settled</p>
          <p className="font-display text-title mt-2 tabular-nums text-ink">
            {gbpRevenue} · {usdRevenue}
          </p>
          <p className="text-caption text-ink-muted mt-1">International boutique settlement</p>
        </div>
        <div className="bg-action text-on-action p-5 border border-line">
          <p className="label text-accent">Blended ROAS · CAC</p>
          <p className="font-display text-display-m mt-2 tabular-nums text-on-action">
            {roasNgn == null ? "—" : `${roasNgn.toFixed(2)}×`}
          </p>
          <p className="text-caption text-on-action/80 mt-1 tabular-nums">
            CAC: {cacNgn == null ? "—" : formatMoney(cacNgn, "NGN")} / customer
          </p>
        </div>
      </div>

      <Table
        head={["Currency", "Paid orders", "Revenue", "New paying customers", "Ad spend", "CAC", "ROAS"]}
        rows={rows.map((r) => {
          const c = cac(r.spend_minor, r.new_customers);
          const ro = roas(r.revenue_minor, r.spend_minor);
          return [
            r.currency,
            r.orders,
            formatMoney(r.revenue_minor, r.currency),
            r.new_customers,
            formatMoney(r.spend_minor, r.currency),
            c == null ? "—" : formatMoney(c, r.currency),
            ro == null ? "—" : `${ro.toFixed(2)}×`,
          ];
        })}
        empty=""
      />
    </Section>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section aria-labelledby={id} className="gap-3 border-line pt-6 flex flex-col border-t">
      <div className="gap-1 flex flex-col">
        <h2 id={id} className="font-display text-title">
          {title}
        </h2>
        {note && <p className="text-body-s text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-body-s text-ink-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto border border-line bg-surface-raised">
      <table className="text-body-s w-full text-left tabular-nums">
        <thead>
          <tr className="border-b border-line bg-surface-sunk/40">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="py-3 px-4 whitespace-nowrap label text-ink-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface-sunk/30 transition-colors">
              {r.map((cell, j) => (
                <td key={j} className="py-3 px-4 whitespace-nowrap text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpendTable({ rows }: { rows: Report["spend"] }) {
  if (rows.length === 0)
    return <p className="text-body-s text-ink-muted">No ad spend recorded in this period.</p>;
  return (
    <div className="overflow-x-auto border border-line bg-surface-raised">
      <table className="text-body-s w-full text-left tabular-nums">
        <thead>
          <tr className="border-b border-line bg-surface-sunk/40">
            <th scope="col" className="py-3 px-4 label text-ink-muted">
              Date
            </th>
            <th scope="col" className="py-3 px-4 label text-ink-muted">
              Channel
            </th>
            <th scope="col" className="py-3 px-4 label text-ink-muted">
              Campaign
            </th>
            <th scope="col" className="py-3 px-4 label text-ink-muted">
              Amount
            </th>
            <th scope="col" className="py-3 px-4">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-surface-sunk/30 transition-colors">
              <td className="py-3 px-4">{r.date}</td>
              <td className="py-3 px-4 font-medium uppercase label text-ink">{r.channel}</td>
              <td className="py-3 px-4">{r.campaign ?? "—"}</td>
              <td className="py-3 px-4 font-medium">{formatMoney(r.amount_minor, r.currency)}</td>
              <td className="py-3 px-4 text-right">
                <form action={deleteSpend}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="label text-critical hover:underline underline-offset-4 cursor-pointer"
                  >
                    Remove
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
