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
      "label inline-flex min-h-11 items-center border-b border-transparent transition-colors",
      active ? "border-ink text-ink" : "text-ink-muted hover:text-ink",
    );

  return (
    <div onMouseLeave={() => setPanel(null)} className="relative">
      <div className="gap-x-space-2 px-space-3 md:px-space-5 mx-auto grid max-w-screen-2xl grid-cols-[auto_1fr_auto] items-center md:grid-cols-[1fr_auto_1fr]">
        {/* Left zone */}
        <div className="col-start-1 row-start-1 flex min-w-0 items-center">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="-ml-space-2 text-ink inline-flex size-11 items-center justify-center md:hidden"
          >
            {mobileOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>

          <nav aria-label="Main" className="gap-space-4 hidden items-center md:flex">
            <button
              type="button"
              aria-expanded={panel === "shop"}
              onMouseEnter={() => setPanel("shop")}
              onClick={() => setPanel((p) => (p === "shop" ? null : "shop"))}
              className={navItem(panel === "shop" || pathname.startsWith("/shop"))}
            >
              Shop
            </button>
            {menu.drops.length > 0 ? (
              <button
                type="button"
                aria-expanded={panel === "drops"}
                onMouseEnter={() => setPanel("drops")}
                onClick={() => setPanel((p) => (p === "drops" ? null : "drops"))}
                className={navItem(panel === "drops" || pathname.startsWith("/drops"))}
              >
                Drops
              </button>
            ) : (
              <Link
                href="/drops"
                onMouseEnter={() => setPanel(null)}
                className={navItem(pathname.startsWith("/drops"))}
              >
                Drops
              </Link>
            )}
            <Link
              href="/prive"
              onMouseEnter={() => setPanel(null)}
              className={navItem(pathname.startsWith("/prive"))}
            >
              Xarina Privé
            </Link>
            <Link
              href="/about"
              onMouseEnter={() => setPanel(null)}
              className={navItem(pathname === "/about")}
            >
              Maison
            </Link>
          </nav>
        </div>

        {/* Centre zone: wordmark alone on mobile, lockup on desktop (BRAND.md › Lockups) */}
        <Link
          href="/"
          aria-label="Xarina home"
          className="py-space-2 md:py-space-3 col-start-2 row-start-1 flex flex-col items-center"
        >
          <Wordmark className="text-body-s sm:text-title md:hidden" />
          <Lockup size="sm" className="hidden md:inline-flex" />
        </Link>

        {/* Right zone. Settings render once: second row on mobile, here on desktop. */}
        <div className="contents md:col-start-3 md:row-start-1 md:flex md:items-center md:justify-end">
          <div className="col-start-2 col-end-4 row-start-2 flex items-center justify-self-end md:col-auto md:row-auto">
            {settings}
          </div>
          <div className="col-start-3 row-start-1 flex items-center justify-self-end md:col-auto md:row-auto">
            {actions}
          </div>
        </div>

        {/* Mobile second row: hairline + quick links (keeps a 360px screen from overflowing) */}
        <div
          aria-hidden
          className="border-line pointer-events-none col-span-3 col-start-1 row-start-2 h-full border-t md:hidden"
        />
        <nav
          aria-label="Quick links"
          className="gap-space-3 col-span-2 col-start-1 row-start-2 flex items-center md:hidden"
        >
          <Link
            href="/shop"
            className="label text-ink-muted hover:text-ink inline-flex min-h-11 items-center"
          >
            Shop
          </Link>
          <Link
            href="/prive"
            className="label text-ink-muted hover:text-ink inline-flex min-h-11 items-center"
          >
            Privé
          </Link>
        </nav>
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
