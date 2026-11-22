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
    <div className="gap-space-6 flex flex-col">
      <header className="gap-space-4 flex flex-col">
        <div className="gap-space-2 flex flex-col">
          <h1 className="font-display text-display-m">Reports</h1>
          <p className="text-body-s text-ink-muted">
            Sales come from paid orders only. Currencies are shown separately. Dates are in UTC.
          </p>
        </div>
        <form method="get" className="gap-space-3 flex flex-wrap items-end">
          <div className="space-y-space-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="space-y-space-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" defaultValue={to} />
          </div>
          <Button type="submit" variant="secondary">
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
  return (
    <Section
      title="Summary"
      note="CAC = ad spend ÷ new paying customers. ROAS = revenue ÷ ad spend. Approximate."
    >
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
    <section aria-labelledby={id} className="gap-space-3 border-line pt-space-4 flex flex-col border-t">
      <div className="gap-space-1 flex flex-col">
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
    <div className="overflow-x-auto">
      <table className="text-body-s w-full text-left tabular-nums">
        <thead>
          <tr className="border-line border-b">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="label text-ink-muted py-space-2 pr-space-4 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-line border-b">
              {r.map((cell, j) => (
                <td key={j} className="py-space-2 pr-space-4 whitespace-nowrap">
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
    <div className="overflow-x-auto">
      <table className="text-body-s w-full text-left tabular-nums">
        <thead>
          <tr className="border-line border-b">
            <th scope="col" className="label text-ink-muted py-space-2 pr-space-4">
              Date
            </th>
            <th scope="col" className="label text-ink-muted py-space-2 pr-space-4">
              Channel
            </th>
            <th scope="col" className="label text-ink-muted py-space-2 pr-space-4">
              Campaign
            </th>
            <th scope="col" className="label text-ink-muted py-space-2 pr-space-4">
              Amount
            </th>
            <th scope="col">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-line border-b">
              <td className="py-space-2 pr-space-4">{r.date}</td>
              <td className="py-space-2 pr-space-4">{r.channel}</td>
              <td className="py-space-2 pr-space-4">{r.campaign ?? "—"}</td>
              <td className="py-space-2 pr-space-4">{formatMoney(r.amount_minor, r.currency)}</td>
              <td className="py-space-2">
                <form action={deleteSpend}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="text-body-s text-ink-muted hover:text-ink min-h-11 underline underline-offset-4"
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
