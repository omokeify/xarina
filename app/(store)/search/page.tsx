import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { getStorefrontProducts } from "@/lib/catalogue";
import { matchesQuery, normaliseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

// Results follow live drop state and availability, like the shop.
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.slice(0, 80);
  const hasQuery = normaliseQuery(query) !== "";
  const results = hasQuery ? (await getStorefrontProducts()).filter((p) => matchesQuery(p, query)) : [];

  return (
    <div className="mx-auto max-w-screen-xl px-space-3 py-space-5 md:px-space-5 md:py-space-6">
      <h1 className="font-display text-display-l">Search</h1>

      <form role="search" action="/search" className="mt-space-4 flex max-w-xl gap-space-2">
        <label htmlFor="q" className="sr-only">
          Search the shop
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          autoFocus={!hasQuery}
          placeholder="Search by design or collection"
          maxLength={80}
          className="h-[52px] w-full min-w-0 rounded-xs border border-line bg-surface-raised px-space-3 text-body text-ink placeholder:text-ink-muted"
        />
        <Button type="submit" aria-label="Search" className="shrink-0 px-space-4">
          <Search aria-hidden="true" className="size-5" />
        </Button>
      </form>

      {hasQuery && (
        <section aria-labelledby="results-heading" className="mt-space-5">
          <h2 id="results-heading" role="status" aria-live="polite" className="label mb-space-4 text-ink-muted">
            {results.length === 0
              ? `Nothing found for “${query}”`
              : `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
          </h2>
          {results.length === 0 ? (
            <p className="text-body text-ink-muted">
              Try another word, or{" "}
              <Link href="/shop" className="text-ink underline underline-offset-4">
                browse the shop
              </Link>
              .
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-space-3 gap-y-space-5 md:grid-cols-3 md:gap-x-space-4 lg:grid-cols-4">
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
