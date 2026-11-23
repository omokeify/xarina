"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Menu, X } from "lucide-react";
import { Lockup, Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { DRAWER_OPENED_EVENT } from "@/lib/checkout/events";
import type { DropState } from "@/lib/catalogue";
import { ProductImage } from "./product-image";

export type MenuDrop = {
  id: string;
  name: string;
  state: DropState;
  href: string;
  cover_path: string | null;
};
export type MenuCard = { title: string; href: string; cover_path: string | null };
export type HeaderMenu = {
  collections: { slug: string; name: string }[];
  drops: MenuDrop[];
  cards: MenuCard[];
};

type Panel = null | "shop" | "drops";

const STATE_LABEL: Record<DropState, string> = {
  upcoming: "Upcoming",
  vip: "Privé early access",
  public: "Open now",
  closed: "Closed",
};

/**
 * Three-zone editorial header (layout from the Xarina concept): nav | lockup |
 * controls, with Shop and Drops panels on desktop and a full-height menu on
 * mobile. Ivory & Ink per BRAND.md; panels are separated by hairlines, not shadows.
 * Server-rendered controls (search, currency, theme, Privé, bag) come in as slots.
 */
export function HeaderNav({
  menu,
  settings,
  actions,
}: {
  menu: HeaderMenu;
  /** Currency + theme: right zone on desktop, second row on mobile. */
  settings: React.ReactNode;
  /** Search, Privé, bag: right zone at every size. */
  actions: React.ReactNode;
}) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setPanel(null);
    setMobileOpen(false);
  }, [pathname]);

  // The bag drawer (a5) announces itself; close our overlays so they never stack.
  useEffect(() => {
    const close = () => {
      setPanel(null);
      setMobileOpen(false);
    };
    window.addEventListener(DRAWER_OPENED_EVENT, close);
    return () => window.removeEventListener(DRAWER_OPENED_EVENT, close);
  }, []);

  useEffect(() => {
    if (!panel && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel, mobileOpen]);

  const navItem = (active: boolean) =>
    cn(
      "label inline-flex items-center text-body-s tracking-[0.18em] transition-colors py-1",
      active ? "text-ink font-semibold" : "text-ink-muted hover:text-ink",
    );

  return (
    <div onMouseLeave={() => setPanel(null)} className="relative w-full">
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP HEADER (>= md)
          Two tiers:
          - Top: Centered Brand Name + Tagline, Right: Currency + Bag
          - Bottom: Centered Nav Row with pipe dividers
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col">
        {/* Tier 1: Brand Center + Controls Right */}
        <div className="relative max-w-screen-2xl w-full mx-auto px-space-5 pt-space-4 pb-space-3 flex items-center justify-center">
          <Link
            href="/"
            aria-label="Xarina home"
            className="flex flex-col items-center group text-center select-none"
          >
            <span className="font-display text-[32px] lg:text-[36px] tracking-[0.38em] uppercase text-ink font-normal leading-none pl-[0.38em]">
              Xarina
            </span>
            <span className="label text-[10px] lg:text-[11px] tracking-[0.24em] text-ink-muted uppercase mt-2">
              Wearable Statement Dressing
            </span>
          </Link>

          {/* Right Controls: [ NGN ⌄ ] and Bag Icon */}
          <div className="absolute right-space-5 top-1/2 -translate-y-1/2 flex items-center gap-space-3">
            {settings}
            {actions}
          </div>
        </div>

        {/* Tier 2: Centered Nav Links with Pipe Dividers */}
        <nav
          aria-label="Main navigation"
          className="border-t border-line/60 py-2.5 flex items-center justify-center gap-6 text-center"
        >
          <button
            type="button"
            aria-expanded={panel === "shop"}
            onMouseEnter={() => setPanel("shop")}
            onClick={() => setPanel((p) => (p === "shop" ? null : "shop"))}
            className={navItem(panel === "shop" || pathname.startsWith("/shop"))}
          >
            Shop
          </button>
          <span className="text-line select-none font-light">|</span>

          {menu.drops.length > 0 ? (
            <button
              type="button"
              aria-expanded={panel === "drops"}
              onMouseEnter={() => setPanel("drops")}
              onClick={() => setPanel((p) => (p === "drops" ? null : "drops"))}
              className={navItem(panel === "drops" || pathname.startsWith("/drops"))}
            >
              Upcoming Drops
            </button>
          ) : (
            <Link
              href="/drops"
              onMouseEnter={() => setPanel(null)}
              className={navItem(pathname.startsWith("/drops"))}
            >
              Upcoming Drops
            </Link>
          )}
          <span className="text-line select-none font-light">|</span>

          <Link
            href="/prive"
            onMouseEnter={() => setPanel(null)}
            className={navItem(pathname.startsWith("/prive"))}
          >
            Xarina Privé
          </Link>
          <span className="text-line select-none font-light">|</span>

          <Link
            href="/about"
            onMouseEnter={() => setPanel(null)}
            className={navItem(pathname === "/about")}
          >
            About
          </Link>
        </nav>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE HEADER (< md)
          - Left: Hamburger Menu Icon
          - Center: XARINA wordmark + Tagline | [ NGN ⌄ ]
          - Right: Bag Icon
         ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden px-space-3 py-space-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="text-ink inline-flex size-11 items-center justify-center -ml-space-2"
        >
          {mobileOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>

        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            aria-label="Xarina home"
            className="font-display text-title tracking-[0.32em] uppercase text-ink pl-[0.32em] leading-tight"
          >
            Xarina
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="label text-[9px] tracking-[0.16em] uppercase text-ink-muted">
              Wearable Statement Dressing
            </span>
            <span className="text-line text-[10px]">|</span>
            {settings}
          </div>
        </div>

        <div className="flex items-center justify-end -mr-space-2">
          {actions}
        </div>
      </div>

      {panel === "shop" && <ShopPanel menu={menu} />}
      {panel === "drops" && <DropsPanel drops={menu.drops} />}

      {mobileOpen && <MobileMenu id="mobile-menu" menu={menu} />}
    </div>
  );
}

function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-line bg-surface absolute inset-x-0 top-full z-40 hidden border-y md:block">
      <div className="gap-space-5 px-space-5 py-space-5 mx-auto grid max-w-screen-2xl grid-cols-12">
        {children}
      </div>
    </div>
  );
}

function ShopPanel({ menu }: { menu: HeaderMenu }) {
  return (
    <PanelFrame>
      <div className="gap-space-1 border-line pr-space-4 col-span-3 flex flex-col border-r">
        <p className="label mb-space-2 text-ink-muted">Shop</p>
        <PanelLink href="/shop#available">Available now</PanelLink>
        <PanelLink href="/shop#upcoming">Upcoming drops</PanelLink>
        <PanelLink href="/shop">All designs</PanelLink>
      </div>
      {menu.collections.length > 0 && (
        <div className="gap-space-1 col-span-2 flex flex-col">
          <p className="label mb-space-2 text-ink-muted">By design</p>
          {menu.collections.map((c) => (
            <Link
              key={c.slug}
              href={`/shop?design=${c.slug}`}
              className="text-body-s text-ink-muted hover:text-ink inline-flex min-h-11 items-center"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <ul
        className={cn(
          "gap-space-4 grid grid-cols-3",
          menu.collections.length > 0 ? "col-span-7" : "col-span-9",
        )}
      >
        {menu.cards.map((card) => (
          <li key={card.title}>
            <Link href={card.href} className="group gap-space-2 flex flex-col">
              <ProductImage
                path={card.cover_path}
                alt=""
                sizes="20vw"
                className="aspect-[4/3] transition-opacity group-hover:opacity-90"
              />
              <span className="text-body-s text-ink">{card.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

function DropsPanel({ drops }: { drops: MenuDrop[] }) {
  return (
    <PanelFrame>
      <div className="border-line pr-space-4 col-span-4 flex flex-col border-r">
        <p className="label mb-space-2 text-ink-muted">Drop calendar</p>
        <PanelLink href="/drops">All drops</PanelLink>
        {drops.map((d) => (
          <Link
            key={d.id}
            href={d.href}
            className="border-line py-space-2 flex flex-col border-b hover:opacity-80"
          >
            <span className="font-display text-title">{d.name}</span>
            <span className="text-caption text-ink-muted">{STATE_LABEL[d.state]}</span>
          </Link>
        ))}
      </div>
      <ul className="gap-space-4 col-span-8 grid grid-cols-2">
        {drops.slice(0, 2).map((d) => (
          <li key={d.id}>
            <Link href={d.href} className="group gap-space-2 flex flex-col">
              <ProductImage
                path={d.cover_path}
                alt=""
                sizes="30vw"
                className="aspect-[16/9] transition-opacity group-hover:opacity-90"
              />
              <span className="text-body-s text-ink">{d.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-body-s text-ink flex min-h-11 items-center justify-between hover:underline hover:underline-offset-4"
    >
      {children}
      <ChevronRight aria-hidden className="text-ink-muted size-4" />
    </Link>
  );
}

function MobileMenu({ id, menu }: { id: string; menu: HeaderMenu }) {
  const big = "font-display text-title inline-flex min-h-11 items-center";
  return (
    <nav
      id={id}
      aria-label="Menu"
      className="border-line bg-surface px-space-4 py-space-5 absolute inset-x-0 top-full z-40 flex h-[calc(100svh-6rem)] flex-col justify-between overflow-y-auto border-t md:hidden"
    >
      <div className="gap-space-4 flex flex-col">
        <div className="border-line pb-space-4 flex flex-col border-b">
          <p className="label mb-space-2 text-ink-muted">Shop</p>
          <Link href="/shop#available" className={big}>
            Available now
          </Link>
          <Link href="/shop#upcoming" className={big}>
            Upcoming drops
          </Link>
          <Link href="/drops" className={big}>
            All drops
          </Link>
          <Link href="/shop" className="text-body-s text-ink-muted inline-flex min-h-11 items-center">
            View all designs
          </Link>
          {menu.collections.map((c) => (
            <Link
              key={c.slug}
              href={`/shop?design=${c.slug}`}
              className="text-body-s text-ink-muted inline-flex min-h-11 items-center"
            >
              {c.name}
            </Link>
          ))}
        </div>
        <div className="border-line pb-space-4 flex flex-col border-b">
          <Link href="/prive" className={big}>
            Xarina Privé
          </Link>
          <Link href="/about" className="text-body text-ink inline-flex min-h-11 items-center">
            About Xarina
          </Link>
          <Link href="/delivery" className="text-body-s text-ink-muted inline-flex min-h-11 items-center">
            Delivery &amp; returns
          </Link>
        </div>
      </div>
      <p className="font-display text-caption pt-space-5 text-ink-muted italic">
        Wearable statement dressing
      </p>
    </nav>
  );
}
