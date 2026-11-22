import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ANALYTICS_RANGES,
  funnelQuery,
  getAnalytics,
  isAnalyticsConfigured,
  kpiQuery,
  topPagesQuery,
} from "./analytics";

afterEach(() => vi.unstubAllEnvs());

function configure() {
  vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "phx_test");
  vi.stubEnv("POSTHOG_API_HOST", "https://us.posthog.com/");
  vi.stubEnv("POSTHOG_PROJECT_ID", "12345");
}

function respond(resultsByQuery: Record<string, unknown>, status = 200): typeof fetch {
  return (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { name: string };
    if (!(body.name in resultsByQuery)) throw new Error(`Unexpected query ${body.name}`);
    return new Response(JSON.stringify({ results: resultsByQuery[body.name] }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

const results = {
  admin_analytics_kpis: [
    ["$pageview", 100, 40],
    ["add_to_cart", 30, 18],
    ["begin_checkout", 20, 12],
    ["purchase", 8, 8],
  ],
  admin_analytics_funnel: [
    { count: 40 },
    { count: 18 },
    { count: 12 },
    { count: 8 },
  ],
  admin_analytics_top_pages: [
    ["/", 50, 30],
    ["/drops/summer", 25, 15],
    [null, 5, 2],
  ],
};

describe("admin analytics", () => {
  it("reports when no read key is configured", () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", undefined);
    expect(isAnalyticsConfigured()).toBe(false);
  });

  it("uses the app host and the configured project id", async () => {
    configure();
    const calls: string[] = [];
    const fake = (async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    }) as typeof fetch;
    await getAnalytics(7, fake);
    expect(calls.every((url) => url === "https://us.posthog.com/api/projects/12345/query/")).toBe(true);
  });

  it("shapes KPIs, funnel and top pages", async () => {
    configure();
    const result = await getAnalytics(30, respond(results));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.kpis).toEqual({
      pageviews: 100,
      visitors: 40,
      addToCart: 30,
      beginCheckout: 20,
      purchases: 8,
      conversion: 0.2,
    });
    expect(result.data.funnel[0]).toMatchObject({ label: "Page view", count: 40, fromPrevious: null });
    expect(result.data.funnel[3]).toMatchObject({ label: "Purchase", count: 8 });
    expect(result.data.funnel[3].fromPrevious).toBeCloseTo(8 / 12);
    expect(result.data.topPages[2]).toEqual({ path: "(unknown)", pageviews: 5, visitors: 2 });
  });

  it("returns an error result when PostHog rejects a query", async () => {
    configure();
    const result = await getAnalytics(30, respond(results, 401));
    expect(result).toEqual({ status: "error", message: "PostHog query failed (401)" });
  });

  it("queries only tracked events inside the chosen window", () => {
    for (const days of ANALYTICS_RANGES) {
      expect(kpiQuery(days).query).toContain(`INTERVAL ${days} DAY`);
      expect(kpiQuery(days).query).toContain("'purchase'");
      expect(topPagesQuery(days).query).toContain("LIMIT 10");
      expect(funnelQuery(days).series).toHaveLength(4);
      expect(funnelQuery(days).dateRange).toEqual({ date_from: `-${days}d` });
    }
  });
});
