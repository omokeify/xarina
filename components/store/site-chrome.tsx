import Link from "next/link";
import { User } from "lucide-react";
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
  if (!settings.enabled || !settings.text.trim()) return null;
  const text = <span className="text-caption">{settings.text}</span>;
  return (
    <div className="border-line bg-surface px-space-3 py-space-1 text-ink border-b text-center">
      {settings.href ? (
        <Link href={settings.href} className="underline-offset-4 hover:underline">
          {text}
        </Link>
      ) : (
        text
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
        settings={
          <>
            <CurrencySwitcher />
            <ThemeToggle />
          </>
        }
        actions={
          <>
            <SearchControl />
            <Link
              href="/prive"
              aria-label="Xarina Privé sign in"
              title="Privé sign in"
              className="text-ink-muted hover:text-ink inline-flex size-11 items-center justify-center"
            >
              <User aria-hidden="true" className="size-5" />
            </Link>
            <BagLink />
          </>
        }
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
 * Footer (concept layout): lockup and tagline, drop alerts, link columns, then
 * region, copyright and payment marks. Only confirmed providers are shown
 * (the GBP/USD provider is an open decision).
 */
export function SiteFooter({ whatsapp }: { whatsapp: WhatsAppSettings }) {
  return (
    <footer className="border-line border-t">
      <div className="gap-space-6 px-space-3 pt-space-6 pb-space-5 md:px-space-5 mx-auto grid max-w-screen-2xl lg:grid-cols-12">
        <div className="gap-space-3 flex max-w-md flex-col lg:col-span-5">
          <Lockup />
          <p className="font-display text-title text-ink-muted italic">Wearable statement dressing.</p>
          <h2 className="font-display text-title mt-space-3">Drop alerts &amp; waitlist</h2>
          <p className="text-body-s text-ink-muted">Hear the moment each new drop opens to the public.</p>
          <FooterSignup />
        </div>

        <nav aria-label="Information" className="gap-space-4 grid grid-cols-2 sm:grid-cols-3 lg:col-span-7">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col">
              <h2 className="label mb-space-2 text-ink">{col.title}</h2>
              <ul>
                {col.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-body-s text-ink-muted hover:text-ink inline-flex min-h-11 items-center"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
                {col.title === "Client care" && whatsapp.number && (
                  <li>
                    <a
                      href={whatsappLink(whatsapp.number, "Hello Xarina,")}
                      className="text-body-s text-ink-muted hover:text-ink inline-flex min-h-11 items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp concierge
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="px-space-3 md:px-space-5 mx-auto max-w-screen-2xl">
        <div className="border-line gap-space-4 py-space-4 flex flex-col border-t md:flex-row md:items-end md:justify-between">
          <div className="gap-space-1 flex flex-col">
            <FooterRegion />
            <p className="text-caption text-ink-muted">
              © {new Date().getFullYear()} Xarina · Wearable statement dressing
            </p>
          </div>
          <ul aria-label="Payment and delivery partners" className="gap-space-2 flex flex-wrap">
            {PAYMENT_MARKS.map((m) => (
              <li key={m} className="label border-line text-ink-muted px-space-2 py-space-1 border">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

const TRUST = [
  { title: "Secure payments", body: "Card, bank transfer and USSD through trusted providers." },
  { title: "Tracked delivery", body: "Tracked delivery in Nigeria, the UK and worldwide." },
  { title: "Stylist concierge", body: "Sizing and fit advice on WhatsApp, straight from any design page." },
];

export function TrustStrip() {
  return (
    <section aria-label="Why shop with Xarina" className="border-line border-t">
      <ul className="gap-space-4 px-space-3 py-space-5 md:px-space-5 mx-auto grid max-w-screen-2xl md:grid-cols-3">
        {TRUST.map((t) => (
          <li key={t.title} className="gap-space-1 flex flex-col">
            <span className="font-display text-title">{t.title}</span>
            <span className="text-body-s text-ink-muted">{t.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
