import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/store/countdown";
import { DropCard, DROP_STATE_LABEL } from "@/components/store/drop-card";
import { ProductImage } from "@/components/store/product-image";
import { LocalTime } from "@/components/store/local-time";
import { ProductCard } from "@/components/store/product-card";
import { PriveShowcase } from "@/components/store/prive-showcase";
import { getDrop, getDrops, type DropPage } from "@/lib/drops-public";
import { isPriveMember } from "@/lib/prive/session";
import { publicEnv } from "@/lib/env";
import { productMediaUrl } from "@/lib/supabase/media-url";
import { cn } from "@/lib/utils";

// Drop state and countdown must be fresh on every visit (DROP-2).
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** Drop URLs are permanent: an old slug redirects (308) to the current one. Closed drops stay as an archive. */
const load = cache(async (slug: string): Promise<DropPage> => {
  const result = await getDrop(slug);
  if (result.kind === "redirect") permanentRedirect(`/drops/${result.slug}`);
  if (result.kind === "missing") notFound();
  return result.page;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { drop } = await load((await params).slug);
  const url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/drops/${drop.slug}`;
  const description = drop.pitch || "A limited, numbered Xarina drop.";
  return {
    title: drop.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "Xarina",
      title: drop.name,
      description,
      images: drop.hero ? [{ url: productMediaUrl(drop.hero.storage_path), alt: drop.hero.alt }] : undefined,
    },
    twitter: { card: drop.hero ? "summary_large_image" : "summary", title: drop.name, description },
  };
}

export default async function DropPageView({ params }: Params) {
  const { slug } = await params;
  const [{ drop, products, server_now }, prive, all] = await Promise.all([
    load(slug),
    isPriveMember(),
    getDrops(),
  ]);
  const others = all.filter((d) => d.id !== drop.id && d.state !== "closed").slice(0, 2);
  const cover = products.find((p) => p.cover_path);
  const media = drop.hero
    ? { kind: "image" as const, path: drop.hero.storage_path, alt: drop.hero.alt || drop.name }
    : cover?.cover_path
      ? { kind: "image" as const, path: cover.cover_path, alt: cover.cover_alt ?? cover.name }
      : null;

  const beforePublic = drop.state === "upcoming" || drop.state === "vip";
  const canShop = drop.state === "public" || (drop.state === "vip" && prive);
  const action =
    drop.state === "closed"
      ? { label: "Shop available now", href: "/shop#available" }
      : canShop
        ? { label: "Shop the drop", href: "#designs" }
        : { label: "Join the waitlist", href: "#designs" };

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

  const imagePath = media?.path ?? null;
  const imageAlt = media?.alt ?? drop.name;

  return (
    <>
      <section aria-labelledby="hero-heading" className="border-b border-line bg-surface text-ink">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Mobile: Well-Fitted Portrait Fashion Photograph First */}
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
            </div>
          </div>

          {/* Left Column (Desktop) / Bottom Content (Mobile) */}
          <div className="flex flex-col justify-center items-start text-left max-w-xl">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="label text-[10px] sm:text-[11px] tracking-[0.2em] text-ink-muted uppercase mb-2">
              <Link href="/drops" className="hover:text-ink">
                Drops
              </Link>
              <span aria-hidden className="px-2">
                /
              </span>
              <span className="text-ink">{drop.name}</span>
            </nav>

            {/* Top Kicker matching homepage */}
            <p className="label text-[11px] sm:text-[12px] tracking-[0.24em] text-ink-muted uppercase font-semibold mb-3">
              The Next Drop · Limited Release
            </p>

            {/* Headline */}
            <h1
              id="hero-heading"
              className="font-display italic text-[42px] sm:text-[52px] lg:text-[64px] leading-[1.05] text-ink font-normal tracking-tight"
            >
              {drop.name}
            </h1>

            {/* Gold Accent Rule matching homepage */}
            <div className="w-12 h-[2px] bg-accent my-3.5 sm:my-4" />

            {/* Subtitle / Pitch */}
            {drop.pitch && (
              <p className="font-display italic text-[20px] sm:text-[23px] leading-snug text-ink/90 max-w-lg">
                {drop.pitch}
              </p>
            )}

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
                  serverNow={server_now}
                  variant="boxed"
                />
              </div>
            )}

            {/* Call to Action Button */}
            <Button
              asChild
              className="h-12 bg-action text-on-action hover:opacity-90 label text-[11.5px] sm:text-[12px] tracking-[0.2em] font-semibold px-8 shadow-none rounded-none w-full sm:w-auto"
            >
              <Link href={action.href}>{action.label.toUpperCase()}</Link>
            </Button>

            {/* Sub-caption */}
            {beforePublic && (
              <p className="font-display italic text-body-s text-ink-muted mt-3 sm:mt-3.5">
                Xarina Privé members shop first.{" "}
                <Link href="/prive" className="underline underline-offset-4 hover:text-ink transition-colors">
                  Sign in
                </Link>
              </p>
            )}
          </div>

          {/* Right Column (Desktop >= md): Well-Fitted Framed Photograph */}
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
            </div>
          </div>
        </div>
      </section>

      <Timeline drop={drop} />

      <section
        id="designs"
        aria-labelledby="designs-heading"
        className="border-line scroll-mt-space-7 border-b bg-surface py-12 sm:py-16"
      >
        <div className="px-space-4 sm:px-space-6 md:px-space-8 mx-auto max-w-screen-2xl">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-4 w-full mb-2">
              <div className="h-px bg-line/80 flex-1 max-w-[60px] sm:max-w-[140px]" />
              <h2 id="designs-heading" className="font-display italic text-[34px] sm:text-[44px] text-ink font-normal tracking-tight">
                The Designs
              </h2>
              <div className="h-px bg-line/80 flex-1 max-w-[60px] sm:max-w-[140px]" />
            </div>
            <p className="font-display italic text-body-s sm:text-title text-ink-muted">
              {drop.state === "upcoming" || (drop.state === "vip" && !prive)
                ? "Choose a design to join its waitlist"
                : drop.state === "closed"
                  ? "From the archive"
                  : "Limited, numbered pieces"}
            </p>
            {products.length > 0 && (
              <p className="label text-[11px] tracking-[0.22em] text-accent mt-2 font-semibold">
                {products.length} {products.length === 1 ? "NUMBERED PIECE" : "NUMBERED PIECES"}
              </p>
            )}
          </div>
          {products.length > 0 ? (
            <ul className="gap-x-space-4 gap-y-space-6 md:gap-x-space-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 2} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center font-display italic text-title text-ink-muted py-8">
              This drop has closed and its designs are no longer available.{" "}
              <Link href="/shop#available" className="text-ink underline underline-offset-4 hover:text-accent transition-colors">
                Shop available now
              </Link>
            </p>
          )}
        </div>
      </section>

      {drop.state !== "closed" && <PriveShowcase />}

      {others.length > 0 && (
        <section aria-labelledby="more-drops-heading" className="border-line border-b bg-surface py-12 sm:py-16">
          <div className="px-space-4 sm:px-space-6 md:px-space-8 mx-auto max-w-screen-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-accent" />
                <h2 id="more-drops-heading" className="font-display italic text-[28px] sm:text-[34px] text-ink font-normal tracking-tight">
                  More Drops
                </h2>
              </div>
              <Link
                href="/drops"
                className="label text-[11px] tracking-[0.22em] text-ink hover:text-accent underline underline-offset-4 transition-colors font-semibold"
              >
                ALL DROPS →
              </Link>
            </div>
            <ul className="gap-x-space-6 gap-y-space-8 grid md:grid-cols-2">
              {others.map((d) => (
                <li key={d.id}>
                  <DropCard drop={d} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

/** DROP-1: the drop's schedule in the visitor's local time, with the current step marked. */
function Timeline({ drop }: { drop: DropPage["drop"] }) {
  const steps = [
    {
      key: "vip",
      label: "Privé early access opens",
      iso: drop.vip_opens_at,
      reached: drop.state !== "upcoming",
    },
    {
      key: "public",
      label: "Opens to everyone",
      iso: drop.public_opens_at,
      reached: drop.state === "public" || drop.state === "closed",
    },
    ...(drop.closes_at
      ? [{ key: "closed", label: "Drop closes", iso: drop.closes_at, reached: drop.state === "closed" }]
      : []),
  ];
  // VIP may open together with public (no early window): show one step then.
  const shown = drop.vip_opens_at === drop.public_opens_at ? steps.filter((s) => s.key !== "vip") : steps;

  return (
    <section aria-labelledby="timeline-heading" className="border-line border-b bg-surface py-8 sm:py-10">
      <div className="px-space-4 sm:px-space-6 md:px-space-8 mx-auto max-w-screen-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-6 h-px bg-accent" />
          <h2 id="timeline-heading" className="label text-accent text-[11px] tracking-[0.22em] uppercase font-semibold">
            Drop Schedule (Local Time)
          </h2>
        </div>
        <ol className="gap-space-6 grid md:grid-cols-3">
          {shown.map((s) => (
            <li key={s.key} className={cn("gap-space-1 pt-space-3 flex flex-col border-t-2 transition-colors", s.reached ? "border-accent" : "border-line")}>
              <span className={cn("label text-[11px] tracking-[0.18em] uppercase", s.reached ? "text-accent font-semibold" : "text-ink-muted")}>
                {s.reached && (
                  <span
                    aria-hidden
                    className="bg-accent mr-space-2 inline-block size-2 rounded-full align-middle shadow-xs"
                  />
                )}
                {s.label}
                {s.reached && <span className="sr-only"> (done)</span>}
              </span>
              <span className="font-display italic text-[22px] sm:text-[26px] text-ink mt-1">
                <LocalTime iso={s.iso} />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
