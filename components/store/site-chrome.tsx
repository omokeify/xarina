import Link from "next/link";
import { User, Headset, Lock, Plane } from "lucide-react";
import { Lockup } from "@/components/brand/logo";
import { getCollections, getStorefrontProducts, type ProductListing } from "@/lib/catalogue";
import { dropImage, getDrops, type DropSummary } from "@/lib/drops-public";
import type { AnnouncementSettings, WhatsAppSettings } from "@/lib/site-settings";
import { whatsappLink } from "@/lib/site-settings";
import { CurrencySwitcher } from "./currency-switcher";
import { BagLink } from "./bag-link";
import { SearchControl } from "./search-control";
import { ThemeToggle } from "./theme-toggle";
import { HeaderNav, type HeaderMenu, type MenuDrop } from "./header-nav";
import { FooterRegion } from "./footer-region";
import { FooterSignup } from "./footer-signup";

export function AnnouncementBar({ settings }: { settings: AnnouncementSettings }) {
  // If explicitly disabled, don't show; otherwise display settings text or default chic announcement
  if (settings.enabled === false) return null;
  const displayText = settings.text?.trim() || "Xarina Privé · Complimentary delivery";
  const content = (
    <span className="font-display italic text-body-s tracking-wider text-ink/90">
      {displayText}
    </span>
  );
  return (
    <div className="border-line bg-surface-sunk/30 px-space-3 py-1.5 text-ink border-b text-center">
      {settings.href ? (
        <Link href={settings.href} className="hover:opacity-80 transition-opacity">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

/** Menu content for the header panels, from the live catalogue (no hard-coded designs). */
function buildMenu(
  products: ProductListing[],
  collections: { slug: string; name: string }[],
  allDrops: DropSummary[],
): HeaderMenu {
  // Drops menu: live and upcoming drops, each linking to its drop page.
  const drops: MenuDrop[] = allDrops
    .filter((d) => d.state !== "closed")
    .map((d) => ({
      id: d.id,
      name: d.name,
      state: d.state,
      href: `/drops/${d.slug}`,
      cover_path: dropImage(d).path,
    }));
  const cover = (pred: (p: ProductListing) => boolean) =>
    products.find((p) => pred(p) && p.cover_path)?.cover_path ?? null;
  return {
    collections,
    drops,
    cards: [
      {
        title: "Available now",
        href: "/shop#available",
        cover_path: cover((p) => p.section === "available"),
      },
      {
        title: "Upcoming drops: join the waitlist",
        href: "/shop#upcoming",
        cover_path: cover((p) => p.section === "upcoming"),
      },
      {
        title: "Xarina Privé: early access",
        href: "/prive",
        cover_path: cover((p) => p.drop_state === "vip") ?? cover(() => true),
      },
    ],
  };
}

/**
 * Sticky Ivory & Ink header: nav | wordmark | currency, theme, search, Privé, bag.
 * Mobile shows the wordmark alone and puts region + theme on a second row.
 */
export async function SiteHeader() {
  const [products, collections, drops] = await Promise.all([
    getStorefrontProducts(),
    getCollections(),
    getDrops(),
  ]);
  return (
    <header className="border-line bg-surface text-ink sticky top-0 z-40 border-b">
      <HeaderNav
        menu={buildMenu(products, collections ?? [], drops)}
        settings={<CurrencySwitcher />}
        actions={<BagLink />}
      />
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop#available", label: "Available now" },
      { href: "/shop#upcoming", label: "Upcoming drops" },
      { href: "/prive", label: "Xarina Privé" },
    ],
  },
  {
    title: "Client care",
    links: [
      { href: "/delivery", label: "Delivery" },
      { href: "/returns", label: "Returns" },
      { href: "/faq", label: "FAQs" },
    ],
  },
  {
    title: "Maison & legal",
    links: [
      { href: "/about", label: "About Xarina" },
      { href: "/privacy", label: "Privacy Notice" },
      { href: "/terms", label: "Terms & Conditions" },
    ],
  },
];

const PAYMENT_MARKS = ["Paystack NGN", "Visa", "Mastercard", "DHL Express"];

/**
 * Footer (Option 1: Minimal Luxury Bar):
 * - Trust Strip top-framed with hairlines and delicate icons
 * - Main luxury horizontal bar: XARINA wordmark on left, pipe-separated links on right
 * - Subtle footnote: Copyright, brand tagline, and discreet legal links
 */
export function SiteFooter({
  whatsapp,
  showTrustStrip = true,
}: {
  whatsapp: WhatsAppSettings;
  showTrustStrip?: boolean;
}) {
  const contactHref = whatsapp.number
    ? whatsappLink(whatsapp.number, "Hello Xarina, I would like assistance with an order.")
    : "/about#contact";

  return (
    <footer className="border-t border-line bg-surface text-ink">
      {/* Trust Strip */}
      {showTrustStrip && <TrustStrip />}

      {/* Main Luxury Bar matching client mockup */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-7 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-5 border-b border-line/40">
        {/* Left: Brand Wordmark */}
        <Link
          href="/"
          className="font-display tracking-[0.22em] text-[22px] sm:text-[24px] text-ink font-normal uppercase hover:opacity-80 transition-opacity"
        >
          XARINA
        </Link>

        {/* Right: Inline Pipe-Divided Links */}
        <nav
          aria-label="Footer Navigation"
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[12px] sm:text-[13px] text-ink/80 tracking-wide"
        >
          <Link href="/delivery" className="hover:text-ink transition-colors">
            Delivery
          </Link>
          <span className="text-line select-none font-light">|</span>
          <a
            href={contactHref}
            className="hover:text-ink transition-colors"
            {...(whatsapp.number ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            Contact
          </a>
          <span className="text-line select-none font-light">|</span>
          <Link href="/faq" className="hover:text-ink transition-colors">
            FAQs
          </Link>
          <span className="text-line select-none font-light">|</span>
          <Link href="/about" className="hover:text-ink transition-colors">
            About
          </Link>
        </nav>
      </div>

      {/* Discreet Footnote & Legal Links */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-caption text-ink-muted text-center sm:text-left">
        <p className="font-display italic text-[13px] sm:text-[14px]">
          © {new Date().getFullYear()} Xarina · Wearable statement dressing
        </p>

        <div className="flex items-center gap-4 text-[11px] tracking-wider uppercase">
          <Link href="/privacy" className="hover:text-ink transition-colors">
            Privacy Notice
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-ink transition-colors">
            Terms &amp; Conditions
          </Link>
          <span>·</span>
          <Link href="/returns" className="hover:text-ink transition-colors">
            Returns Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function TrustStrip() {
  return (
    <section aria-label="Why shop with Xarina" className="border-b border-line bg-surface py-4 sm:py-5 px-4">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-y-2.5 gap-x-4 sm:gap-x-8 text-center text-caption sm:text-body-s text-ink/90">
        <div className="flex items-center gap-2">
          <Lock aria-hidden="true" className="size-4 text-ink-muted stroke-[1.5]" />
          <span>Secure payments</span>
        </div>
        <span className="text-line select-none font-light">|</span>
        <div className="flex items-center gap-2">
          <Plane aria-hidden="true" className="size-4 text-ink-muted stroke-[1.5]" />
          <span>Local &amp; international delivery</span>
        </div>
        <span className="text-line select-none font-light">|</span>
        <div className="flex items-center gap-2">
          <Headset aria-hidden="true" className="size-4 text-ink-muted stroke-[1.5]" />
          <span>Personal assistance</span>
        </div>
      </div>
    </section>
  );
}
