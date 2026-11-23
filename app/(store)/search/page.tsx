import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
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
        <p className="label text-ink-muted text-[11px] sm:text-[12px] tracking-[0.24em] uppercase font-semibold mb-2 sm:mb-3">
          CATALOGUE SEARCH
        </p>
        <h1 className="font-display italic text-[36px] sm:text-[44px] md:text-[50px] leading-[1.08] text-ink font-normal tracking-tight">
          Search Designs
        </h1>
        <div className="w-12 h-[2px] bg-accent my-4 sm:my-5" />
      </header>

      <form role="search" action="/search" className="mt-4 sm:mt-6 flex max-w-2xl gap-2.5">
        <label htmlFor="q" className="sr-only">
          Search the shop
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          autoFocus={!hasQuery}
          placeholder="Search by silhouette, drop name, or fabric..."
          maxLength={80}
          className="h-[48px] sm:h-[52px] w-full min-w-0 rounded-xs border border-line bg-surface-raised px-4 text-body-s sm:text-body text-ink placeholder:text-ink-muted/70 focus:outline-hidden focus:border-accent transition-colors shadow-xs"
        />
        <button
          type="submit"
          aria-label="Search"
          className="shrink-0 bg-accent hover:bg-accent/90 text-[#121110] px-5 sm:px-7 label text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Search aria-hidden="true" className="size-4 sm:size-4.5" />
          <span className="hidden sm:inline">SEARCH</span>
        </button>
      </form>

      {hasQuery && (
        <section aria-labelledby="results-heading" className="mt-10 sm:mt-12 border-t border-line/60 pt-8 sm:pt-10">
          <h2
            id="results-heading"
            role="status"
            aria-live="polite"
            className="label mb-6 text-[11px] sm:text-[12px] tracking-[0.22em] uppercase text-ink-muted font-semibold"
          >
            {results.length === 0
              ? `No silhouettes found for “${query}”`
              : `${results.length} ${results.length === 1 ? "design" : "designs"} found for “${query}”`}
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
      )}
    </div>
  );
}
