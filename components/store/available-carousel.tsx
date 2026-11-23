"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ProductListing } from "@/lib/catalogue";
import { ProductImage } from "./product-image";

/**
 * Available Now showcase matching the client's luxury mockup:
 * - Centered flanked title: —— Available Now ——
 * - Desktop: 3-column editorial grid with portrait image, italic caption, and gold hairline button.
 * - Mobile: 2-up swipeable carousel with dot pagination indicators (••○).
 */
export function AvailableCarousel({ products }: { products: ProductListing[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const displayProducts = products.length > 0 ? products : [];
  const totalPages = Math.max(1, Math.ceil(displayProducts.length / 2));

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    const page = Math.round(scrollLeft / width);
    setActiveIndex(Math.min(totalPages - 1, Math.max(0, page)));
  };

  const scrollToPage = (pageIndex: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: pageIndex * el.clientWidth,
      behavior: "smooth",
    });
    setActiveIndex(pageIndex);
  };

  return (
    <div className="w-full pb-12 sm:pb-16">
      {/* Full-width Divider Line with "Available now" in Center Expanding to Edges */}
      <div className="w-full flex items-center justify-center gap-4 sm:gap-8 mb-8 sm:mb-12 px-4 sm:px-6 md:px-8">
        <div className="h-px bg-line/80 flex-1" />
        <h2
          id="available-heading"
          className="font-display italic text-[28px] sm:text-[36px] md:text-[40px] text-ink font-normal text-center tracking-tight shrink-0 px-2 sm:px-4"
        >
          Available now
        </h2>
        <div className="h-px bg-line/80 flex-1" />
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Desktop View (>= md): 3-Column Luxury Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
        {displayProducts.slice(0, 3).map((p) => (
          <div key={p.id} className="flex flex-col items-center group">
            <Link
              href={`/p/${p.slug}`}
              className="w-full aspect-[4/5] bg-surface-sunk relative overflow-hidden block border border-line/40 transition-transform duration-300 group-hover:scale-[1.01]"
            >
              {p.cover_path ? (
                <ProductImage
                  path={p.cover_path}
                  alt={p.cover_alt || p.name}
                  sizes="33vw"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-sunk" />
              )}
            </Link>

            <p className="font-display italic text-[18px] sm:text-[20px] text-ink/90 mt-4 mb-3 text-center">
              Shop available pieces
            </p>

            <Link
              href={`/p/${p.slug}`}
              className="border border-accent/60 hover:border-ink hover:bg-surface-sunk/30 px-8 py-2.5 label text-[11px] tracking-[0.22em] font-medium text-ink transition-colors inline-block text-center w-full max-w-[200px]"
            >
              SHOP NOW
            </Link>
          </div>
        ))}
      </div>

      {/* Mobile View (< md): Swipeable 2-Column Carousel with Dot Indicators */}
      <div className="md:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] px-1"
        >
          {displayProducts.map((p) => (
            <div
              key={p.id}
              className="w-[calc(50%-8px)] shrink-0 snap-start flex flex-col items-center group"
            >
              <Link
                href={`/p/${p.slug}`}
                className="w-full aspect-[4/5] bg-surface-sunk relative overflow-hidden block border border-line/40"
              >
                {p.cover_path ? (
                  <ProductImage
                    path={p.cover_path}
                    alt={p.cover_alt || p.name}
                    sizes="50vw"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-sunk" />
                )}
              </Link>

              <p className="font-display italic text-[15px] sm:text-[17px] text-ink/90 mt-3 mb-2 text-center line-clamp-1">
                Shop available pieces
              </p>

              <Link
                href={`/p/${p.slug}`}
                className="border border-accent/60 hover:border-ink px-4 py-2 label text-[10px] tracking-[0.18em] font-medium text-ink transition-colors inline-block text-center w-full"
              >
                SHOP
              </Link>
            </div>
          ))}
        </div>

        {/* Dot Pagination Indicators Below (as seen in mobile mockup: • • ○) */}
        {displayProducts.length > 2 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToPage(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`size-2 rounded-full transition-all ${
                  activeIndex === i ? "bg-accent scale-110" : "bg-line hover:bg-ink-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
}
