import "server-only";
import { z } from "zod";

// Native analytics for the admin dashboard. PostHog stays the source of truth
// for capture and session replay; this module reads aggregates through its
// query API so staff never have to leave the admin UI to see the numbers.

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

const trackedEvents = ["$pageview", "add_to_cart", "begin_checkout", "purchase"] as const;

const kpiRow = z.tuple([z.string(), z.coerce.number(), z.coerce.number()]);
const funnelStep = z.object({ count: z.coerce.number() }).passthrough();
const topPageRow = z.tuple([z.string().nullable(), z.coerce.number(), z.coerce.number()]);

export type Analytics = {
  days: AnalyticsRange;
  kpis: {
    pageviews: number;
    visitors: number;
    addToCart: number;
    beginCheckout: number;
    purchases: number;
    /** Visitors who completed a purchase. Null before any visitors exist. */
    conversion: number | null;
  };
  funnel: { label: string; count: number; fromPrevious: number | null; fromFirst: number | null }[];
  topPages: { path: string; pageviews: number; visitors: number }[];
};

export type AnalyticsResult =
  | { status: "ok"; data: Analytics }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/** The public project key is capture-only; reading needs a personal API key. */
function readKey(): string | undefined {
  return process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_API_KEY;
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(readKey());
}

function settings() {
  return {
    key: readKey(),
    // Private endpoints use the app host, not the capture host (us.i.posthog.com).
    host: (process.env.POSTHOG_API_HOST || "https://us.posthog.com").replace(/\/$/, ""),
    project: process.env.POSTHOG_PROJECT_ID || "@current",
  };
}

export function kpiQuery(days: AnalyticsRange) {
  return {
    kind: "HogQLQuery",
    query: `
      SELECT event, count() AS events, uniqExact(distinct_id) AS people
      FROM events
      WHERE timestamp >= now() - INTERVAL ${days} DAY
        AND event IN (${trackedEvents.map((e) => `'${e}'`).join(", ")})
      GROUP BY event
    `.trim(),
  };
}

export function topPagesQuery(days: AnalyticsRange) {
  return {
    kind: "HogQLQuery",
    query: `
      SELECT properties.path AS path, count() AS views, uniqExact(distinct_id) AS people
      FROM events
      WHERE timestamp >= now() - INTERVAL ${days} DAY
        AND event = '$pageview'
        AND properties.path IS NOT NULL
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `.trim(),
  };
}

export function funnelQuery(days: AnalyticsRange) {
  return {
    kind: "FunnelsQuery",
    dateRange: { date_from: `-${days}d` },
    series: trackedEvents.map((event) => ({ kind: "EventsNode", event })),
    funnelsFilter: {
      funnelOrderType: "ordered",
      funnelWindowInterval: 14,
      funnelWindowIntervalUnit: "day",
    },
  };
}

type FetchLike = typeof fetch;

async function query(
  body: { query: unknown; name: string },
  fetchImpl: FetchLike,
): Promise<unknown> {
  const { key, host, project } = settings();
  if (!key) throw new Error("POSTHOG_PERSONAL_API_KEY is not set"); // POSTHOG_API_KEY is also accepted
  const res = await fetchImpl(`${host}/api/projects/${encodeURIComponent(project)}/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`PostHog query failed (${res.status})`);
  const json = z.object({ results: z.unknown() }).parse(await res.json());
  return json.results;
}

function funnelSteps(results: unknown): z.infer<typeof funnelStep>[] {
  // The steps response is an array; tolerate the wrapped shape too.
  const raw = Array.isArray(results)
    ? results
    : z.object({ steps: z.array(z.unknown()) }).safeParse(results).data?.steps ?? [];
  return z.array(funnelStep).parse(raw);
}

const FUNNEL_LABELS = ["Page view", "Add to bag", "Checkout started", "Purchase"];

function shape(days: AnalyticsRange, kpis: unknown, funnel: unknown, pages: unknown): Analytics {
  const counts = new Map(
    z.array(kpiRow).parse(kpis).map(([event, events, people]) => [event, { events, people }]),
  );
  const get = (event: string) => counts.get(event) ?? { events: 0, people: 0 };

  const pageviews = get("$pageview").events;
  const visitors = get("$pageview").people;
  const purchases = get("purchase").events;

  const steps = funnelSteps(funnel);
  const funnelRows = FUNNEL_LABELS.map((label, i) => {
    const count = steps[i]?.count ?? 0;
    const previous = i === 0 ? null : (steps[i - 1]?.count ?? 0);
    return {
      label,
      count,
      fromPrevious: previous && previous > 0 ? count / previous : null,
      fromFirst: i === 0 || !steps[0]?.count ? null : count / steps[0].count,
    };
  });

  return {
    days,
    kpis: {
      pageviews,
      visitors,
      addToCart: get("add_to_cart").events,
      beginCheckout: get("begin_checkout").events,
      purchases,
      conversion: visitors > 0 ? purchases / visitors : null,
    },
    funnel: funnelRows,
    topPages: z.array(topPageRow)
      .parse(pages)
      .map(([path, views, people]) => ({ path: path ?? "(unknown)", pageviews: views, visitors: people })),
  };
}

/** Fetches dashboard aggregates. Never throws for a missing key or an API error. */
export async function getAnalytics(
  days: AnalyticsRange,
  fetchImpl: FetchLike = fetch,
): Promise<AnalyticsResult> {
  if (!isAnalyticsConfigured()) return { status: "unconfigured" };
  try {
    const [kpis, funnel, pages] = await Promise.all([
      query({ query: kpiQuery(days), name: "admin_analytics_kpis" }, fetchImpl),
      query({ query: funnelQuery(days), name: "admin_analytics_funnel" }, fetchImpl),
      query({ query: topPagesQuery(days), name: "admin_analytics_top_pages" }, fetchImpl),
    ]);
    return { status: "ok", data: shape(days, kpis, funnel, pages) };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}
