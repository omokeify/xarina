import Link from "next/link";
import type { ProductListing } from "@/lib/catalogue";
import { badgeFor } from "@/lib/drop-display";
import { ProductImage } from "./product-image";
import { Price } from "./price";
import { cn } from "@/lib/utils";

// Concept wording for each state badge.
const BADGE_TEXT = {
  Available: "Available",
  Upcoming: "Upcoming drop",
  Privé: "Privé early access",
  "Sold out": "Sold out",
} as const;

/**
 * SHOP-3: image (4:5), name, price in the selected currency, state badge.
 * The badge sits on a solid band at the top of the photograph and a quiet
 * action bar slides up on hover (desktop): Join the waitlist for upcoming
 * designs, View design otherwise. Purchase rules are enforced on the server.
 */
export function ProductCard({
  product,
  priority = false,
  inset = false,
}: {
  product: ProductListing;
  priority?: boolean;
  /** Edge-to-edge rows: pad the text instead of the card. */
  inset?: boolean;
}) {
  const badge = badgeFor(product.drop_state, product.sold_out);
  const waitlist = product.drop_state === "upcoming" || product.drop_state === "vip";
  const href = `/p/${product.slug}`;

  return (
    <article className="group relative flex flex-col">
      <Link href={href} className="gap-space-3 flex flex-col">
        <div className="relative">
          <ProductImage
            path={product.cover_path}
            alt={product.cover_alt ?? product.name}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 82vw"
            priority={priority}
            className={cn("transition-opacity group-hover:opacity-90", product.sold_out && "opacity-80")}
          />
          <span
            data-theme={badge === "Privé" ? "prive" : undefined}
            className={cn(
              "label top-space-3 px-space-2 py-space-1 absolute left-1/2 w-max max-w-[calc(100%-var(--spacing-space-3))] -translate-x-1/2 text-center",
              badge === "Privé" ? "bg-accent text-on-action" : "bg-surface",
              badge === "Sold out" ? "text-ink-muted" : badge !== "Privé" && "text-ink",
            )}
          >
            {BADGE_TEXT[badge]}
          </span>
        </div>
        <div className={cn("gap-space-1 flex flex-col", inset && "px-space-3 pb-space-4")}>
          <h3 className="font-display text-title">{product.name}</h3>
          <div className="gap-space-2 flex items-baseline justify-between">
            <Price prices={product.prices} className="text-body text-ink" />
            {product.collection_name && (
              <span className="text-caption text-ink-muted truncate">{product.collection_name}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Hover action bar (desktop). Aspect 4:5 → the bar sits on the image's bottom edge. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden aspect-[4/5] overflow-hidden sm:block">
        <Link
          href={waitlist ? `${href}#waitlist` : href}
          tabIndex={-1}
          className="label border-line bg-surface text-ink pointer-events-auto absolute inset-x-0 bottom-0 flex min-h-11 translate-y-full items-center justify-center border-t transition-transform duration-200 group-hover:translate-y-0 motion-reduce:transition-none"
        >
          {waitlist ? "Join the waitlist" : product.sold_out ? "View design and restock" : "View design"}
        </Link>
      </div>
    </article>
  );
}
