import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/store/countdown";
import { ProductCard } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { HeroFrame as SharedHeroFrame, type HeroMedia } from "@/components/store/hero-frame";
import { AvailableCarousel } from "@/components/store/available-carousel";
import { TrustStrip } from "@/components/store/site-chrome";
import { getServerNow, getStorefrontProducts, type ProductListing } from "@/lib/catalogue";
import { getFeaturedDrop, type FeaturedDrop } from "@/lib/featured-drop";
import { getSiteSettings, type HeroSettings } from "@/lib/site-settings";
import { getDrops } from "@/lib/drops-public";
import { isPriveMember } from "@/lib/prive/session";

// Drop state and countdown must be fresh on every visit (DROP-2).
export const dynamic = "force-dynamic";

/**
 * Homepage, concept layout (BRAND.md › Approved exceptions): hero → Upcoming
 * drops → Available Now → Privé band → numbered-runs band → trust strip.
 * Every image and name comes from the catalogue.
 */
export default async function HomePage() {
  const [settings, products, serverNow, prive, drops] = await Promise.all([
    getSiteSettings(),
    getStorefrontProducts(),
    getServerNow(),
    isPriveMember(),
    getDrops(),
  ]);
  const drop = await getFeaturedDrop(settings.hero.featured_drop_id, products);
  const featuredSlug = drop ? drops.find((d) => d.id === drop.id)?.slug : undefined;
  const available = products.filter((p) => p.section === "available");
  const upcoming = products.filter((p) => p.section === "upcoming");
  const withCover = (list: ProductListing[]) => list.filter((p) => p.cover_path);

  // Upcoming 2-up: a Privé-window design and an upcoming one when both exist.
  const vipPick = upcoming.find((p) => p.drop_state === "vip");
  const upcomingPick = upcoming.find((p) => p.drop_state === "upcoming" && p.id !== vipPick?.id);
  const upcomingPair = [vipPick, upcomingPick].filter((p): p is ProductListing => Boolean(p));
  if (upcomingPair.length < 2) {
    for (const p of upcoming) if (upcomingPair.length < 2 && !upcomingPair.includes(p)) upcomingPair.push(p);
  }

  const tile = withCover(available).find((p) => p.collection_slug) ?? withCover(available)[0];
  const priveImage =
    withCover(upcoming).find((p) => p.drop_state === "vip") ?? withCover(drop?.products ?? [])[0];
  const editorial =
    withCover(products).find(
      (p) => ![tile?.id, priveImage?.id, ...upcomingPair.map((u) => u.id)].includes(p.id),
    ) ?? withCover(products)[0];

  return (
    <>
      {drop ? (
        <DropHero
          drop={drop}
          hero={settings.hero}
          serverNow={serverNow}
          prive={prive}
          dropHref={featuredSlug ? `/drops/${featuredSlug}` : "/drops"}
        />
      ) : (
        <QuietHero hero={settings.hero} />
      )}
      {upcomingPair.length > 0 && <UpcomingDrops products={upcomingPair} />}
      {available.length > 0 && <AvailableNow products={available} />}
      <PriveDiptych
        isMember={prive}
        tile={tile ?? null}
        image={priveImage ?? null}
        openDropName={vipPick?.drop_name ?? null}
      />
      <NumberedRuns image={editorial ?? null} />
      <TrustStrip />
    </>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

function DropHero({
  drop,
  hero,
  serverNow,
  prive,
  dropHref,
}: {
  drop: FeaturedDrop;
  hero: HeroSettings;
  serverNow: string;
  prive: boolean;
  /** The featured drop's own page. */
  dropHref: string;
}) {
  const beforePublic = drop.state === "upcoming" || drop.state === "vip";
  const single = drop.products.length === 1 ? drop.products[0] : null;
  // HOME-1: one primary action. Waitlists are per design (WL-1).
  const action =
    drop.state === "upcoming"
      ? { label: "Join the waitlist", href: single ? `/p/${single.slug}#waitlist` : `${dropHref}#designs` }
      : { label: "Shop the drop", href: single ? `/p/${single.slug}` : `${dropHref}#designs` };
  const cover = drop.products.find((p) => p.cover_path);
  const kicker =
    drop.state === "vip"
      ? "Privé early access open"
      : drop.state === "public"
        ? "Limited drop, live now"
        : "Scheduled limited drop";

  return (
    <HeroFrame
      hero={hero}
      fallbackPath={cover?.cover_path ?? null}
      fallbackAlt={cover?.cover_alt || drop.name}
      countdown={
        beforePublic && (
          <Countdown
            // HOME-2: Privé members count down to VIP opening, everyone else to public.
            to={prive && drop.state === "upcoming" ? drop.vip_opens_at : drop.public_opens_at}
            serverNow={serverNow}
            label={
              prive && drop.state === "upcoming"
                ? "Privé opens in"
                : drop.state === "vip"
                  ? "Opens to everyone in"
                  : "Public drop opens in"
            }
          />
        )
      }
    >
      <p className="label text-ink-muted">{kicker}</p>
      <h1 id="hero-heading" className="font-display text-display-l md:text-display-xl">
        {hero.headline || drop.name}
      </h1>
      {(hero.pitch || drop.pitch) && (
        <p className="text-body text-ink-muted max-w-xl">{hero.pitch || drop.pitch}</p>
      )}
      <div className="gap-space-3 pt-space-2 sm:gap-space-4 flex flex-col sm:flex-row sm:items-center">
        <Button asChild className="whitespace-nowrap sm:w-auto">
          <Link href={action.href}>{action.label}</Link>
        </Button>
        {beforePublic && (
          <Link
            href="/prive"
            className="text-body-s text-ink inline-flex min-h-11 items-center whitespace-nowrap underline underline-offset-4"
          >
            Privé members shop first.
          </Link>
        )}
      </div>
    </HeroFrame>
  );
}

function QuietHero({ hero }: { hero: HeroSettings }) {
  return (
    <HeroFrame hero={hero} fallbackPath={null} fallbackAlt="Xarina" countdown={null}>
      <h1 id="hero-heading" className="font-display text-display-l md:text-display-xl">
        {hero.headline || "Wearable statement dressing"}
      </h1>
      {hero.pitch && <p className="text-body text-ink-muted max-w-xl">{hero.pitch}</p>}
      <div className="pt-space-2">
        <Button asChild>
          <Link href="/shop">Shop now</Link>
        </Button>
      </div>
    </HeroFrame>
  );
}

/** Homepage hero media from site settings (HOME-4), else the drop's first cover. */
function HeroFrame({
  hero,
  fallbackPath,
  fallbackAlt,
  countdown,
  children,
}: {
  hero: HeroSettings;
  fallbackPath: string | null;
  fallbackAlt: string;
  countdown: React.ReactNode;
  children: React.ReactNode;
}) {
  const m = hero.media;
  const media: HeroMedia =
    m?.type === "video" && m.mux_playback_id
      ? { kind: "video", playbackId: m.mux_playback_id, alt: m.alt || fallbackAlt }
      : m?.type === "image" && m.storage_path
        ? { kind: "image", path: m.storage_path, alt: m.alt || fallbackAlt }
        : !m && fallbackPath
          ? { kind: "image", path: fallbackPath, alt: fallbackAlt }
          : null;
  return (
    <SharedHeroFrame media={media} theme={hero.theme} countdown={countdown}>
      {children}
    </SharedHeroFrame>
  );
}

/* ── Upcoming drops ───────────────────────────────────────────────────── */

function UpcomingDrops({ products }: { products: ProductListing[] }) {
  return (
    <section aria-labelledby="upcoming-heading" className="border-line border-b">
      <div className="gap-space-2 px-space-3 pt-space-6 pb-space-5 mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="label text-ink-muted">Limited numbered runs · Priority allocation</p>
        <h2 id="upcoming-heading" className="font-display text-display-m">
          Upcoming drops: join the waitlist
        </h2>
        <p className="text-body-s text-ink-muted max-w-lg">
          Register your interest in a numbered design. Waitlist members hear the moment Privé and public
          orders open.
        </p>
      </div>
      <div className="px-space-3 pb-space-6 mx-auto max-w-3xl">
        <ul className="gap-space-5 grid sm:grid-cols-2">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
        <div className="border-line mt-space-5 pt-space-4 border-t text-center">
          <Link
            href="/drops"
            className="label text-ink inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          >
            Explore all upcoming drops →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Available now ────────────────────────────────────────────────────── */

function AvailableNow({ products }: { products: ProductListing[] }) {
  return (
    <section aria-labelledby="available-heading" className="bg-surface-sunk">
      <div className="gap-space-3 px-space-3 pt-space-5 pb-space-4 md:px-space-5 mx-auto flex max-w-screen-2xl items-end justify-between">
        <div className="gap-space-1 flex flex-col">
          <p className="label text-ink-muted">Ready to dispatch</p>
          <h2 id="available-heading" className="font-display text-display-m">
            Available now
          </h2>
        </div>
        <Link
          href="/shop#available"
          className="text-body-s text-ink min-h-11 content-center underline underline-offset-4"
        >
          View all available now
        </Link>
      </div>
      <AvailableCarousel products={products} />
    </section>
  );
}

/* ── Privé band ───────────────────────────────────────────────────────── */

type ImagePick = Pick<
  ProductListing,
  "id" | "name" | "cover_path" | "cover_alt" | "collection_slug" | "collection_name"
> | null;

/**
 * Privé band (HOME-3), concept diptych: a collection photo tile with its caption
 * link, and the Privé invitation over a Noir scrim on a second photo. The mark is
 * not used here (never on a photo, BRAND.md › Logo); the key icon stands in.
 */
function PriveDiptych({
  isMember,
  tile,
  image,
  openDropName,
}: {
  isMember: boolean;
  tile: ImagePick;
  image: ImagePick;
  openDropName: string | null;
}) {
  return (
    <section
      data-theme="prive"
      aria-labelledby="prive-heading"
      className="bg-surface text-ink grid lg:grid-cols-2"
    >
      {tile?.cover_path && (
        <Link
          href={tile.collection_slug ? `/shop?design=${tile.collection_slug}` : "/shop#available"}
          className="group relative block aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[640px]"
        >
          <ProductImage
            path={tile.cover_path}
            alt={tile.cover_alt ?? tile.name}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0 aspect-auto h-full"
          />
          <span className="from-surface/90 px-space-4 pt-space-7 pb-space-4 absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t to-transparent">
            <span className="bg-surface/90 gap-space-1 px-space-3 py-space-2 flex flex-col self-start">
              <span className="label text-ink-muted">
                Available now{tile.collection_name ? ` · ${tile.collection_name}` : ""}
              </span>
              <span className="text-body-s text-ink underline-offset-4 group-hover:underline">
                Shop {tile.collection_name ?? "available now"}
              </span>
            </span>
          </span>
        </Link>
      )}
      <div className="relative flex min-h-[560px] items-center overflow-hidden lg:min-h-[640px]">
        {image?.cover_path && (
          <>
            <ProductImage
              path={image.cover_path}
              alt={image.cover_alt ?? image.name}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="absolute inset-0 aspect-auto h-full"
            />
            <div
              aria-hidden
              className="from-surface/95 via-surface/85 to-surface/25 absolute inset-0 bg-gradient-to-r via-60%"
            />
          </>
        )}
        <div className="gap-space-4 px-space-4 py-space-6 md:px-space-6 relative flex max-w-xl flex-col items-start">
          <p className="label gap-space-2 text-accent inline-flex items-center">
            <KeyRound aria-hidden className="size-4" />
            Members-only early access
          </p>
          <h2 id="prive-heading" className="font-display text-display-m md:text-display-l">
            Xarina Privé
          </h2>
          <p className="text-body text-ink-muted">
            Verified early access to numbered drops before public release. No shared passwords: sign in with
            your email or a single-use invitation link.
          </p>
          {openDropName && (
            <p className="text-body-s text-ink">
              Open now for Privé members: <span className="font-display text-title">{openDropName}</span>
            </p>
          )}
          <div className="gap-space-4 flex flex-col sm:flex-row sm:items-center">
            <Button asChild className="whitespace-nowrap sm:w-auto">
              <Link href="/prive">{isMember ? "Enter Privé" : "Verify or request access"}</Link>
            </Button>
            <Link
              href="/shop#upcoming"
              className="text-body-s text-ink inline-flex min-h-11 items-center whitespace-nowrap underline underline-offset-4"
            >
              Preview upcoming drops
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Numbered runs ────────────────────────────────────────────────────── */

/** Noir editorial band (concept). Edition sizes are a product fact, never a sales count (rule 9). */
function NumberedRuns({ image }: { image: ImagePick }) {
  return (
    <section
      data-theme="prive"
      aria-labelledby="runs-heading"
      className="border-line bg-surface text-ink border-t"
    >
      <div className="gap-space-6 px-space-3 py-space-6 md:px-space-5 md:py-space-7 mx-auto grid max-w-screen-2xl items-center lg:grid-cols-2">
        {image?.cover_path && (
          <figure className="border-line relative border">
            <ProductImage
              path={image.cover_path}
              alt={image.cover_alt ?? image.name}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3]"
            />
            <figcaption className="label bg-surface text-ink-muted bottom-space-3 left-space-3 px-space-3 py-space-1 absolute">
              {image.name}
            </figcaption>
          </figure>
        )}
        <div className="gap-space-4 flex max-w-xl flex-col items-start">
          <p className="label text-accent">Atelier discipline · Numbered editions</p>
          <h2 id="runs-heading" className="font-display text-display-m md:text-display-l">
            Strictly 25 to 50 numbered runs. Zero deadstock.
          </h2>
          <p className="text-body text-ink-muted">
            Every Xarina garment is cut on the bias and numbered at completion. We never overproduce. Once an
            edition closes, its pattern is archived to protect the rarity of your entrance.
          </p>
          <div className="gap-space-4 pt-space-2 flex flex-col sm:flex-row sm:items-center">
            <Button asChild className="whitespace-nowrap sm:w-auto">
              <Link href="/prive">Request a Privé invitation</Link>
            </Button>
            <Link
              href="/delivery"
              className="text-body-s text-ink inline-flex min-h-11 items-center whitespace-nowrap underline underline-offset-4"
            >
              Delivery information
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
