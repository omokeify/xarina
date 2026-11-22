"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ProductListing } from "@/lib/catalogue";
import { ProductCard } from "./product-card";

/**
 * Available Now row (HOME-3, concept layout): edge to edge, one card per screen
 * on phones, two on tablets, four on desktop, scroll-snapped, hairline dividers. Arrows page through it;
 * it still scrolls by touch or keyboard without JavaScript.
 */
export function AvailableCarousel({ products }: { products: ProductListing[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  function slide(direction: -1 | 1) {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth : el.clientWidth;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  function onScroll() {
    const el = ref.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (el && card) setIndex(Math.min(products.length - 1, Math.round(el.scrollLeft / card.offsetWidth)));
  }

  const arrow =
    "absolute top-[40%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center border border-line bg-surface text-ink hover:bg-surface-raised sm:flex";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => slide(-1)}
        aria-label="Previous designs"
        className={`${arrow} left-space-3`}
      >
        <ArrowLeft aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => slide(1)}
        aria-label="Next designs"
        className={`${arrow} right-space-3`}
      >
        <ArrowRight aria-hidden className="size-4" />
      </button>

      <ul
        ref={ref}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="Available now designs"
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto scroll-smooth motion-reduce:scroll-auto"
      >
        {products.map((p, i) => (
          <li key={p.id} className="border-line w-[82vw] shrink-0 snap-start border-r sm:w-1/2 lg:w-1/4">
            <ProductCard product={p} priority={i < 2} inset />
          </li>
        ))}
      </ul>

      <div className="border-line px-space-3 flex items-center justify-between border-t sm:hidden">
        <span className="text-caption text-ink-muted tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
        </span>
        <div className="flex">
          <button
            type="button"
            onClick={() => slide(-1)}
            aria-label="Previous"
            className="text-ink inline-flex size-11 items-center justify-center"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => slide(1)}
            aria-label="Next"
            className="text-ink inline-flex size-11 items-center justify-center"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
