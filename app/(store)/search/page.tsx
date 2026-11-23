import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { getStorefrontProducts } from "@/lib/catalogue";
import { matchesQuery, normaliseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Search · Xarina", robots: { index: false } };

// Results follow live drop state and availability, like the shop.
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.slice(0, 80);
  const hasQuery = normaliseQuery(query) !== "";
  const results = hasQuery ? (await getStorefrontProducts()).filter((p) => matchesQuery(p, query)) : [];

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-20">
      <header className="flex flex-col items-start text-left max-w-2xl">
        <p className="label text-accent text-[11px] sm:text-[12px] tracking-[0.24em] uppercase font-semibold mb-2 sm:mb-3">
          CATALOGUE SEARCH
        </p>
        <h1 className="font-display italic text-[36px] sm:text-[44px] md:text-[50px] leading-[1.08] text-ink font-normal tracking-tight">
          {hasQuery ? `Results for “${query}”` : "Search Designs"}
        </h1>
        <div className="w-12 h-[2px] bg-accent my-4 sm:my-5" />
      </header>

      {hasQuery ? (
        <section aria-labelledby="results-heading" className="mt-6 sm:mt-8">
          <h2
            id="results-heading"
            role="status"
            aria-live="polite"
            className="label mb-6 text-[11px] sm:text-[12px] tracking-[0.22em] uppercase text-ink-muted font-semibold"
          >
            {results.length === 0
              ? `No silhouettes found for “${query}”`
              : `${results.length} ${results.length === 1 ? "design" : "designs"} found`}
          </h2>
          {results.length === 0 ? (
            <div className="max-w-md py-6 flex flex-col items-start gap-4">
              <p className="text-body text-ink-muted leading-relaxed">
                We could not find any pieces matching your search. Browse our curated ready-to-ship silhouettes or upcoming drops.
              </p>
              <Link
                href="/shop"
                className="label text-ink hover:text-accent underline underline-offset-8 transition-colors text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold"
              >
                EXPLORE ALL DESIGNS →
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {results.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 2} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-6 max-w-md flex flex-col items-start gap-4">
          <p className="text-body text-ink-muted leading-relaxed">
            Use the global search dock in the header above to auto-discover silhouettes, drops, and fabrics in real time.
          </p>
          <Link
            href="/shop"
            className="label text-ink hover:text-accent underline underline-offset-8 transition-colors text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold"
          >
            BROWSE ALL AVAILABLE PIECES →
          </Link>
        </div>
      )}
    </div>
  );
}
