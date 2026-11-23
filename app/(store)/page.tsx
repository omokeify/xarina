import Link from "next/link";
import { KeyRound, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/store/countdown";
import { ProductCard } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { AvailableCarousel } from "@/components/store/available-carousel";
import { PriveShowcase } from "@/components/store/prive-showcase";
import { AboutFeature } from "@/components/store/about-feature";
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
      <AvailableNow products={available.length > 0 ? available : products} />
      <PriveShowcase />
      <AboutFeature image={editorial} />
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
      ? { label: "JOIN THE WAITLIST", href: single ? `/p/${single.slug}#waitlist` : `${dropHref}#designs` }
      : { label: "SHOP THE DROP", href: single ? `/p/${single.slug}` : `${dropHref}#designs` };
  const cover = drop.products.find((p) => p.cover_path);
  const media = hero.media;
  const imagePath =
    media?.type === "image" && media.storage_path
      ? media.storage_path
      : cover?.cover_path ?? null;
  const imageAlt = media?.alt || cover?.cover_alt || drop.name;

  const targetDate = prive && drop.state === "upcoming" ? drop.vip_opens_at : drop.public_opens_at;
  const dateObj = new Date(targetDate);
  const formattedDate = dateObj
    .toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })
    .toUpperCase();

  const launchBadgeText =
    drop.state === "vip"
      ? `PRIVÉ WINDOW OPEN · PUBLIC: ${formattedDate}`
      : drop.state === "public"
        ? "NOW LIVE"
        : `PUBLIC LAUNCH · ${formattedDate}`;

  return (
    <section aria-labelledby="hero-heading" className="bg-surface text-ink">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Mobile: Well-Fitted Portrait Photograph / Video Card First */}
        <div className="md:hidden w-full flex justify-center">
          <div className="relative w-full max-w-[420px] aspect-[4/5] bg-surface-sunk overflow-hidden border border-line/50 shadow-xs">
            {imagePath ? (
              <ProductImage
                path={imagePath}
                alt={imageAlt}
                sizes="100vw"
                priority
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface-sunk" />
            )}
            <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between pointer-events-none">
              <span className="label text-[9.5px] tracking-[0.2em] text-ink/75 bg-surface/85 backdrop-blur-xs px-2 py-1 uppercase border border-line/40">
                Movement video
              </span>
              <Link
                href={single ? `/p/${single.slug}` : `${dropHref}#designs`}
                aria-label="View movement reel"
                className="size-10 rounded-full border border-ink bg-surface/90 text-ink flex items-center justify-center hover:bg-surface transition-colors cursor-pointer pointer-events-auto shadow-sm"
              >
                <Play aria-hidden className="size-3.5 ml-0.5 fill-current" />
              </Link>
            </div>
          </div>
        </div>

        {/* Left Column (Desktop) / Bottom Content (Mobile) */}
        <div className="flex flex-col justify-center items-start text-left max-w-xl">
          {/* Top Kicker from mockup */}
          <p className="label text-[11px] sm:text-[12px] tracking-[0.24em] text-ink-muted uppercase font-semibold mb-3">
            The Next Drop · Limited Release
          </p>

          {/* Headline (e.g. Drop name) */}
          <h1
            id="hero-heading"
            className="font-display italic text-[42px] sm:text-[52px] lg:text-[64px] leading-[1.05] text-ink font-normal tracking-tight"
          >
            {hero.headline || drop.name}
          </h1>

          {/* Gold Accent Rule from mockup */}
          <div className="w-12 h-[2px] bg-accent my-3.5 sm:my-4" />

          {/* One-Line Pitch from mockup */}
          <p className="font-display italic text-[20px] sm:text-[23px] leading-snug text-ink/90 max-w-lg">
            {hero.pitch || drop.pitch || "Two layers. One unforgettable entrance."}
          </p>

          {/* One-Sentence Description from mockup */}
          <p className="text-body-s sm:text-body text-ink-muted leading-relaxed mt-2.5 max-w-lg">
            Pink chiffon floating over yellow duchesse satin. A limited release designed for after-dark statement dressing.
          </p>

          {/* Launch Date (Styled with the signature Shop Now gold hairline frame) */}
          <div className="mt-6 mb-3 sm:mb-4">
            <span className="border border-accent/60 bg-transparent px-4 sm:px-5 py-2 label text-[10.5px] sm:text-[11px] tracking-[0.22em] font-medium text-ink uppercase inline-flex items-center select-none">
              {launchBadgeText}
            </span>
          </div>

          {/* Boxed Countdown Timer with middle-dot separators */}
          {beforePublic && (
            <div className="mb-6 sm:mb-7">
              <Countdown
                to={targetDate}
                serverNow={serverNow}
                variant="boxed"
              />
            </div>
          )}

          {/* Action Button: JOIN THE WAITLIST or SHOP THE DROP */}
          <Button
            asChild
            className="h-12 bg-action text-on-action hover:opacity-90 label text-[11.5px] sm:text-[12px] tracking-[0.2em] font-semibold px-8 shadow-none rounded-none w-full sm:w-auto"
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>

          {/* Sub-caption from mockup */}
          {beforePublic && (
            <p className="font-display italic text-body-s text-ink-muted mt-3 sm:mt-3.5">
              Xarina Privé members shop first.{" "}
              <Link href="/prive" className="underline underline-offset-4 hover:text-ink transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {/* Right Column (Desktop >= md): Well-Fitted Framed Photograph / Video */}
        <div className="hidden md:flex items-center justify-center lg:justify-end w-full">
          <div className="relative w-full max-w-[520px] aspect-[4/5] bg-surface-sunk overflow-hidden border border-line/50 shadow-xs">
            {imagePath ? (
              <ProductImage
                path={imagePath}
                alt={imageAlt}
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface-sunk" />
            )}

            {/* Mockup Overlay: Caption bottom-left + Circular Play Button bottom-right */}
            <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between pointer-events-none">
              <span className="label text-[10px] sm:text-[11px] tracking-[0.22em] text-ink/75 bg-surface/85 backdrop-blur-xs px-2.5 py-1 uppercase border border-line/40">
                Campaign photograph or movement video
              </span>
              <Link
                href={single ? `/p/${single.slug}` : `${dropHref}#designs`}
                aria-label="View movement reel"
                className="size-11 sm:size-12 rounded-full border border-ink bg-surface/90 text-ink flex items-center justify-center hover:bg-surface transition-colors cursor-pointer pointer-events-auto shadow-sm"
              >
                <Play aria-hidden className="size-4 ml-0.5 fill-current" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuietHero({ hero }: { hero: HeroSettings }) {
  const media = hero.media;
  const imagePath = media?.type === "image" && media.storage_path ? media.storage_path : null;
  return (
    <section aria-labelledby="hero-heading" className="bg-surface text-ink">
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center">
        <div className="px-space-4 py-space-6 sm:px-space-6 sm:py-space-7 md:px-space-7 lg:px-space-8 flex flex-col justify-center items-center md:items-start text-center md:text-left">
          <h1
            id="hero-heading"
            className="font-display italic text-[44px] sm:text-[54px] lg:text-[68px] leading-[1.0] text-ink font-normal tracking-tight"
          >
            {hero.headline || "Wearable Statement Dressing"}
          </h1>
          <div className="w-full max-w-md border-t border-line/60 my-4" />
          <p className="font-display italic text-title sm:text-[22px] leading-snug text-ink/90 max-w-md">
            {hero.pitch || "Quiet luxury crafted for unforgettable entrances."}
          </p>
          <div className="pt-6">
            <Button asChild className="w-full max-w-sm h-12 bg-action text-on-action hover:opacity-90 label text-[12px] tracking-[0.2em] font-semibold shadow-none rounded-none">
              <Link href="/shop">SHOP AVAILABLE NOW</Link>
            </Button>
          </div>
        </div>
        <div className="w-full min-h-[440px] md:min-h-[640px] bg-surface-sunk relative overflow-hidden border-l border-line/60">
          {imagePath ? (
            <ProductImage
              path={imagePath}
              alt={media?.alt || "Xarina atelier"}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-surface-sunk" />
          )}
        </div>
      </div>
    </section>
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
    <section aria-labelledby="available-heading" className="bg-surface border-b border-line pt-8 sm:pt-12">
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
