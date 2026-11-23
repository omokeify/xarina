"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ExpandingSearchDock } from "@/components/ui/expanding-search-dock-shadcnui";
import { useCurrency } from "@/lib/currency/context";
import { formatMoney, type Currency } from "@/lib/money";
import { productMediaUrl } from "@/lib/supabase/media-url";
import { badgeFor } from "@/lib/drop-display";
import type { DropState } from "@/lib/catalogue";

type SearchItem = {
  id: string;
  slug: string;
  name: string;
  collection_name: string | null;
  drop_name: string | null;
  cover_path: string | null;
  cover_alt: string | null;
  prices: { NGN?: number | null; GBP?: number | null; USD?: number | null } | null;
  drop_state: DropState | null;
  sold_out: boolean;
  section: "available" | "upcoming";
};

export function SearchControl() {
  const router = useRouter();
  const pathname = usePathname();
  const { currency } = useCurrency();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce query input (150ms for snappy auto-discovery)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 150);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch results as debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? []);
        setLoading(false);

        // If currently on /search page, automatically keep page synced without requiring Enter
        if (pathname === "/search") {
          router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false });
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, pathname, router]);

  const handleSelectProduct = () => {
    setQuery("");
    setIsExpanded(false);
  };

  const handleSearchSubmit = (q: string) => {
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setQuery("");
      setIsExpanded(false);
    }
  };

  return (
    <ExpandingSearchDock
      value={query}
      onChange={setQuery}
      onSearch={handleSearchSubmit}
      isLoading={loading}
      onExpandedChange={setIsExpanded}
      placeholder="Search designs, drops, fabrics..."
    >
      {isExpanded && query.trim().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-[calc(100%+8px)] w-[min(360px,calc(100vw-32px))] bg-surface border border-line rounded-lg shadow-xl overflow-hidden z-50 text-ink"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-line bg-surface-sunk/30">
            <span className="label text-[10px] tracking-[0.18em] uppercase text-ink-muted font-semibold">
              {loading ? "SEARCHING..." : `${results.length} ${results.length === 1 ? "DESIGN FOUND" : "DESIGNS FOUND"}`}
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-line/40">
            {loading && results.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Loader2 className="size-5 animate-spin mx-auto text-accent mb-2" />
                <p className="text-body-s text-ink-muted">Searching atelier pieces...</p>
              </div>
            ) : results.length > 0 ? (
              results.slice(0, 5).map((item) => {
                const amount = item.prices?.[currency as Currency];
                const priceFormatted = amount != null ? formatMoney(amount, currency as Currency) : null;
                const badge = badgeFor(item.drop_state, item.sold_out);

                return (
                  <Link
                    key={item.id}
                    href={`/p/${item.slug}`}
                    onClick={handleSelectProduct}
                    className="flex items-center gap-3 p-3 hover:bg-surface-sunk/50 transition-colors group cursor-pointer"
                  >
                    <div className="relative aspect-[4/5] w-11 shrink-0 bg-surface-sunk overflow-hidden rounded-2xs border border-line/60">
                      {item.cover_path ? (
                        <Image
                          src={productMediaUrl(item.cover_path)}
                          alt={item.cover_alt ?? item.name}
                          fill
                          sizes="44px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-ink-muted text-xs">X</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="label text-[9px] tracking-[0.18em] uppercase text-accent line-clamp-1 mb-0.5 font-semibold">
                        {item.drop_name ?? item.collection_name ?? "COUTURE"}
                      </p>
                      <h4 className="font-display italic text-[15px] sm:text-[16px] text-ink leading-snug line-clamp-1 group-hover:text-accent transition-colors font-normal">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {priceFormatted && (
                          <span className="text-body-xs font-semibold tabular-nums text-ink">
                            {priceFormatted}
                          </span>
                        )}
                        <span className="label text-[8px] tracking-[0.16em] uppercase px-1.5 py-0.5 border border-line/60 rounded-2xs text-ink-muted">
                          {badge}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="py-8 px-4 text-center">
                <p className="font-display italic text-base text-ink mb-1">No silhouettes found</p>
                <p className="text-body-xs text-ink-muted">
                  Try searching by silhouette, drop name, or fabric
                </p>
              </div>
            )}
          </div>

          {/* Footer bar */}
          {results.length > 0 && (
            <div className="p-2.5 border-t border-line bg-surface-sunk/35 text-center">
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={handleSelectProduct}
                className="label text-[10px] tracking-[0.2em] uppercase font-semibold text-ink hover:text-accent transition-colors py-1 block"
              >
                VIEW ALL {results.length} {results.length === 1 ? "DESIGN" : "DESIGNS"} IN FULL CATALOGUE →
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </ExpandingSearchDock>
  );
}
