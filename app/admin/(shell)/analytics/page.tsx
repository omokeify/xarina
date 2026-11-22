import type { Metadata } from "next";
import Link from "next/link";
import { ANALYTICS_RANGES, getAnalytics, type AnalyticsRange } from "@/lib/admin/analytics";
import { requireStaff } from "@/lib/staff/session";

export const metadata: Metadata = { title: "Analytics" };

const percent = (value: number | null) => (value == null ? "—" : `${(value * 100).toFixed(1)}%`);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireStaff(["owner", "manager"]);
  const params = await searchParams;
  const days: AnalyticsRange = ANALYTICS_RANGES.find((d) => String(d) === params.days) ?? 30;
  const result = await getAnalytics(days);

  return (
    <div className="gap-8 flex flex-col">
      <header className="gap-4 flex flex-col">
        <div className="gap-1 flex flex-col">
          <p className="label text-accent">
            Behaviour &amp; Conversion
          </p>
          <h1 className="font-display text-display-m">Analytics</h1>
          <p className="text-body-s text-ink-muted max-w-2xl">
            Storefront traffic and the path to purchase, read straight from PostHog. Counts are
            verified events; a purchase is only counted once payment is confirmed.
          </p>
        </div>
        <nav aria-label="Analytics period" className="flex items-center gap-2">
          {ANALYTICS_RANGES.map((d) => (
            <Link
              key={d}
              href={`/admin/analytics?days=${d}`}
              aria-current={d === days ? "page" : undefined}
              className={
                d === days
                  ? "bg-action text-on-action px-4 py-2 label"
                  : "border border-line px-4 py-2 label text-ink-muted hover:text-ink"
              }
            >
              {d} days
            </Link>
          ))}
        </nav>
      </header>

      {result.status === "unconfigured" && (
        <Panel title="Analytics isn't connected yet">
          <p className="text-body-s text-ink-muted">
            Set <Code>POSTHOG_PERSONAL_API_KEY</Code> (with the <Code>query:read</Code> scope) in the
            Vercel project, then redeploy. Add <Code>POSTHOG_PROJECT_ID</Code> if the key is not tied
            to a single project, and <Code>POSTHOG_API_HOST</Code> for EU Cloud
            (<Code>https://eu.posthog.com</Code>).
          </p>
          <p className="text-body-s text-ink-muted">
            The public <Code>POSTHOG_PROJECT_KEY</Code> only captures events; it cannot read them.
            Nothing is exposed to the browser here.
          </p>
        </Panel>
      )}

      {result.status === "error" && (
        <Panel title="Couldn't load analytics">
          <p role="alert" className="text-body-s text-critical">
            {result.message}
          </p>
        </Panel>
      )}

      {result.status === "ok" && (
        <>
          <section aria-labelledby="analytics-kpis" className="gap-3 flex flex-col">
            <h2 id="analytics-kpis" className="font-display text-title">
              At a glance
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi label="Page views" value={result.data.kpis.pageviews} note="Storefront views" />
              <Kpi label="Visitors" value={result.data.kpis.visitors} note="Unique people" />
              <Kpi label="Add to bag" value={result.data.kpis.addToCart} note="Product actions" />
              <Kpi
                label="Purchases"
                value={result.data.kpis.purchases}
                note={`${percent(result.data.kpis.conversion)} of visitors`}
                highlight
              />
            </div>
          </section>

          <Panel title="Purchase funnel" note="Ordered steps within 14 days. Visitors are counted once per step.">
            <ol className="gap-4 flex flex-col">
              {result.data.funnel.map((step, i) => {
                const width = result.data.funnel[0]?.count
                  ? Math.max((step.count / result.data.funnel[0].count) * 100, 2)
                  : 0;
                return (
                  <li key={step.label} className="gap-2 flex flex-col">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-body-s text-ink">
                        <span className="text-ink-muted tabular-nums mr-3">{i + 1}.</span>
                        {step.label}
                      </span>
                      <span className="text-body-s tabular-nums text-ink">
                        {step.count.toLocaleString()}
                        {i > 0 && (
                          <span className="text-ink-muted ml-2">({percent(step.fromPrevious)} of previous)</span>
                        )}
                      </span>
                    </div>
                    <div className="bg-surface-sunk h-2 w-full">
                      <div className="bg-accent h-2" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel title="Top pages" note="Most viewed storefront pages in this period.">
            {result.data.topPages.length === 0 ? (
              <p className="text-body-s text-ink-muted">No page views recorded yet.</p>
            ) : (
              <div className="overflow-x-auto border border-line bg-surface-raised">
                <table className="text-body-s w-full text-left tabular-nums">
                  <thead>
                    <tr className="border-b border-line bg-surface-sunk/40">
                      <th scope="col" className="py-3 px-4 label text-ink-muted">
                        Path
                      </th>
                      <th scope="col" className="py-3 px-4 label text-ink-muted">
                        Views
                      </th>
                      <th scope="col" className="py-3 px-4 label text-ink-muted">
                        Visitors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {result.data.topPages.map((page) => (
                      <tr key={page.path} className="hover:bg-surface-sunk/30 transition-colors">
                        <td className="py-3 px-4 text-ink">{page.path}</td>
                        <td className="py-3 px-4">{page.pageviews.toLocaleString()}</td>
                        <td className="py-3 px-4">{page.visitors.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: number;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "bg-action text-on-action p-5 border border-line" : "bg-surface-raised p-5 border border-line"}>
      <p className={`label ${highlight ? "text-accent" : "text-ink-muted"}`}>
        {label}
      </p>
      <p className="font-display text-display-m mt-2 tabular-nums">{value.toLocaleString()}</p>
      <p className={`text-caption mt-1 ${highlight ? "text-on-action" : "text-ink-muted"}`}>{note}</p>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={title.toLowerCase().replace(/[^a-z]+/g, "-")} className="gap-3 border-line pt-6 flex flex-col border-t">
      <div className="gap-1 flex flex-col">
        <h2 id={title.toLowerCase().replace(/[^a-z]+/g, "-")} className="font-display text-title">
          {title}
        </h2>
        {note && <p className="text-body-s text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-surface-sunk px-1 py-0.5 text-body-s">{children}</code>;
}
