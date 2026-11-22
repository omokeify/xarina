import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { Countdown } from "@/components/store/countdown";
import { getCollections, getServerNow, getStorefrontProducts, type ProductListing } from "@/lib/catalogue";
import { getInitialCurrency } from "@/lib/currency/server";
import { isPriveMember } from "@/lib/prive/session";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/store/filter-select";
import { AVAILABILITY, matchesFilter } from "@/lib/shop-filter";

export const metadata: Metadata = {
  title: "Shop",
  description: "Pieces available now and the drops coming next.",
};

// Availability and drop state change by the clock: always render fresh.
export const dynamic = "force-dynamic";

const SECTIONS = [
  { value: undefined, label: "All" },
  { value: "available", label: "Available now" },
  { value: "upcoming", label: "Upcoming drops" },
] as const;
type Section = "available" | "upcoming";

const SORTS = [
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string; availability?: string; sort?: string; section?: string }>;
}) {
  const params = await searchParams;
  const availability = AVAILABILITY.find((a) => a.value === params.availability)?.value;
  const sort = SORTS.find((s) => s.value === params.sort)?.value;
  const section: Section | undefined =
    params.section === "available" || params.section === "upcoming" ? params.section : undefined;
  const [products, collections, currency, serverNow, prive] = await Promise.all([
    getStorefrontProducts(),
    getCollections(),
    getInitialCurrency(),
    getServerNow(),
    isPriveMember(),
  ]);
  const design = collections.some((c) => c.slug === params.design) ? params.design : undefined;

  const shown = products.filter((p) => matchesFilter(p, design, availability));
  if (sort) {
    // Unpriced designs sort last in either direction.
    const price = (p: ProductListing) => p.prices?.[currency] ?? null;
    shown.sort((a, b) => {
      const pa = price(a);
      const pb = price(b);
      if (pa == null || pb == null) return pa == null ? (pb == null ? 0 : 1) : -1;
      return sort === "price-asc" ? pa - pb : pb - pa;
    });
  }
  const available = section === "upcoming" ? [] : shown.filter((p) => p.section === "available");
  const upcoming = section === "available" ? [] : shown.filter((p) => p.section === "upcoming");

  // Next drop to open, for the countdown beside Upcoming drops (server time, DROP-2).
  const next = upcoming
    .filter((p) => p.public_opens_at && (p.drop_state === "upcoming" || p.drop_state === "vip"))
    .sort((a, b) => Date.parse(a.public_opens_at!) - Date.parse(b.public_opens_at!))[0];

  const current = { design, availability, sort, section };
  const href = (change: Partial<typeof current>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...change })) if (v) q.set(k, v);
    const str = q.toString();
    return str ? `/shop?${str}` : "/shop";
  };

  const title =
    section === "upcoming" || availability === "upcoming"
      ? "Upcoming drops"
      : section === "available" || availability
        ? "Available now"
        : "The Xarina edit";

  return (
    <div className="px-space-3 md:px-space-5 mx-auto max-w-screen-2xl">
      <header className="gap-space-4 pt-space-5 pb-space-4 flex flex-col md:flex-row md:items-end md:justify-between">
        <div className="gap-space-2 flex flex-col">
          <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <span aria-hidden className="px-space-2">
              /
            </span>
            <span className="text-ink">Shop</span>
          </nav>
          <h1 className="font-display text-display-m md:text-display-l">{title}</h1>
          <p className="text-body text-ink-muted max-w-2xl">
            Ready-to-ship designs alongside numbered, scheduled drops.
          </p>
        </div>
        <nav aria-label="Shop sections" className="shrink-0">
          <ul className="border-line bg-surface-sunk p-space-1 inline-flex border">
            {SECTIONS.map((s) => (
              <li key={s.label}>
                <Link
                  href={href({ section: s.value })}
                  aria-current={section === s.value ? "true" : undefined}
                  className={cn(
                    "text-body-s px-space-3 inline-flex min-h-11 items-center whitespace-nowrap",
                    section === s.value ? "bg-action text-on-action" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="gap-space-3 border-line pb-space-4 flex flex-col border-b lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter products" className="[scrollbar-width:none] overflow-x-auto">
          <ul className="gap-space-2 flex">
            <FilterLink href={href({ design: undefined })} active={!design}>
              All
            </FilterLink>
            {collections.map((c) => (
              <FilterLink key={c.slug} href={href({ design: c.slug })} active={design === c.slug}>
                {c.name}
              </FilterLink>
            ))}
          </ul>
        </nav>
        <div className="gap-space-4 flex flex-wrap items-center">
          <FilterSelect
            label="Availability"
            name="availability"
            value={availability ?? ""}
            options={[{ value: "", label: "All states" }, ...AVAILABILITY]}
            keep={{ design, sort, section }}
          />
          <FilterSelect
            label="Sort"
            name="sort"
            value={sort ?? ""}
            options={[{ value: "", label: "Featured" }, ...SORTS]}
            keep={{ design, availability, section }}
          />
        </div>
      </div>

      {shown.length === 0 && (
        <p className="py-space-6 text-body text-ink-muted">
          Nothing matches these filters.{" "}
          <Link href="/shop" className="text-ink underline underline-offset-4">
            Show everything
          </Link>
        </p>
      )}

      {/* SHOP-1: two clearly separated sections */}
      {available.length > 0 && (
        <Section
          id="available"
          kicker="Ready to ship · Immediate checkout"
          title="Available now"
          products={available}
        />
      )}
      {upcoming.length > 0 && (
        <Section
          id="upcoming"
          kicker="Scheduled numbered releases"
          title="Upcoming drops & Privé early access"
          intro="Join the waitlist on any design to hear the moment it opens, or sign in as a Privé member to shop early during Privé windows."
          aside={
            next && (
              <Countdown
                to={
                  prive && next.drop_state === "upcoming" && next.vip_opens_at
                    ? next.vip_opens_at
                    : next.public_opens_at!
                }
                serverNow={serverNow}
                label={`${next.drop_name ?? "Next drop"} · ${
                  next.drop_state === "vip" ? "opens to everyone in" : prive ? "Privé opens in" : "opens in"
                }`}
                className="border-line px-space-4 py-space-3 border"
              />
            )
          }
          products={upcoming}
        />
      )}
    </div>
  );
}

function Section({
  id,
  kicker,
  title,
  intro,
  aside,
  products,
}: {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  aside?: React.ReactNode;
  products: ProductListing[];
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-space-7 border-line py-space-5 md:py-space-6 border-b last:border-b-0"
    >
      <div className="mb-space-5 gap-space-4 flex flex-col lg:flex-row lg:items-end lg:justify-between">
        <div className="gap-space-1 flex flex-col">
          <p className="label text-ink-muted">{kicker}</p>
          <h2 id={`${id}-heading`} className="font-display text-display-m">
            {title}
          </h2>
          {intro && <p className="text-body-s text-ink-muted max-w-xl">{intro}</p>}
          <p className="text-caption text-ink-muted tabular-nums">
            {products.length} {products.length === 1 ? "design" : "designs"}
          </p>
        </div>
        {aside}
      </div>
      <ul className="gap-x-space-3 gap-y-space-5 md:gap-x-space-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <li key={p.id}>
            <ProductCard product={p} priority={i < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={cn(
          "text-body-s px-space-3 inline-flex min-h-11 items-center border whitespace-nowrap transition-colors",
          active
            ? "border-action bg-action text-on-action"
            : "border-line text-ink-muted hover:border-ink hover:text-ink",
        )}
      >
        {children}
      </Link>
    </li>
  );
}
