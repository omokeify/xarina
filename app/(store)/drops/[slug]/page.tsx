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
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center">
          {/* Mobile: Tall Portrait Fashion Photograph First */}
          <div className="md:hidden w-full aspect-[4/5] bg-surface-sunk relative overflow-hidden">
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

          {/* Left Column (Desktop) / Bottom Content (Mobile) */}
          <div className="px-space-4 py-space-6 sm:px-space-6 sm:py-space-7 md:px-space-7 lg:px-space-8 flex flex-col justify-center items-center md:items-start text-center md:text-left">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="label text-[10px] sm:text-[11px] tracking-[0.2em] text-ink-muted uppercase mb-3">
              <Link href="/drops" className="hover:text-ink">
                Drops
              </Link>
              <span aria-hidden className="px-2">
                /
              </span>
              <span className="text-ink">{drop.name}</span>
            </nav>

            {/* Headline */}
            <h1
              id="hero-heading"
              className="font-display italic text-[42px] sm:text-[52px] lg:text-[64px] leading-[1.0] text-ink font-normal tracking-tight"
            >
              {drop.name}
            </h1>

            {/* Thin Hairline Divider */}
            <div className="w-full max-w-md border-t border-line/60 my-4" />

            {/* Subtitle / Pitch */}
            {drop.pitch && (
              <p className="font-display italic text-title sm:text-[22px] leading-snug text-ink/90 max-w-md">
                {drop.pitch}
              </p>
            )}

            {/* Launch Date Badge */}
            <div className="mt-5 mb-5">
              <span className="inline-block bg-[#E3D3B0]/35 text-ink border border-accent/40 px-3.5 py-1.5 label text-[11px] tracking-[0.18em]">
                {launchBadgeText}
              </span>
            </div>

            {/* Boxed Countdown Timer */}
            {beforePublic && (
              <div className="mb-6">
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
              className="w-full max-w-sm h-12 bg-action text-on-action hover:opacity-90 label text-[12px] tracking-[0.2em] font-semibold shadow-none rounded-none"
            >
              <Link href={action.href}>{action.label.toUpperCase()}</Link>
            </Button>

            {/* Sub-caption */}
            {beforePublic && (
              <p className="font-display italic text-body-s text-ink-muted mt-2.5">
                <Link href="/prive" className="hover:text-ink transition-colors">
                  Xarina Privé members shop first.
                </Link>
              </p>
            )}
          </div>

          {/* Right Column (Desktop >= md): Tall Portrait Photograph */}
          <div className="hidden md:block w-full h-full min-h-[580px] lg:min-h-[720px] bg-surface-sunk relative overflow-hidden border-l border-line/60">
            {imagePath ? (
              <ProductImage
                path={imagePath}
                alt={imageAlt}
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
