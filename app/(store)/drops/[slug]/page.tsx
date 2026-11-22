import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/store/countdown";
import { DropCard, DROP_STATE_LABEL } from "@/components/store/drop-card";
import { HeroFrame } from "@/components/store/hero-frame";
import { LocalTime } from "@/components/store/local-time";
import { ProductCard } from "@/components/store/product-card";
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

  // Countdown target (DROP-1/2, HOME-2): Privé members count to VIP opening.
  const countdown =
    drop.state === "upcoming"
      ? prive
        ? { to: drop.vip_opens_at, label: "Privé opens in" }
        : { to: drop.public_opens_at, label: "Public drop opens in" }
      : drop.state === "vip"
        ? { to: drop.public_opens_at, label: "Opens to everyone in" }
        : drop.state === "public" && drop.closes_at
          ? { to: drop.closes_at, label: "Closes in" }
          : null;

  // One primary action. Purchase is re-checked on the server (DROP-3).
  const canShop = drop.state === "public" || (drop.state === "vip" && prive);
  const action =
    drop.state === "closed"
      ? { label: "Shop available now", href: "/shop#available" }
      : canShop
        ? { label: "Shop the drop", href: "#designs" }
        : { label: "Join the waitlist", href: "#designs" };

  return (
    <>
      <HeroFrame
        media={media}
        theme="prive"
        countdown={
          countdown && <Countdown to={countdown.to} serverNow={server_now} label={countdown.label} />
        }
      >
        <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
          <Link href="/drops" className="hover:text-ink">
            Drops
          </Link>
          <span aria-hidden className="px-space-2">
            /
          </span>
          <span className="text-ink">{drop.name}</span>
        </nav>
        <p className="label text-ink-muted">{DROP_STATE_LABEL[drop.state]}</p>
        <h1 id="hero-heading" className="font-display text-display-l md:text-display-xl">
          {drop.name}
        </h1>
        {drop.pitch && <p className="text-body text-ink-muted max-w-xl">{drop.pitch}</p>}
        <div className="gap-space-3 pt-space-2 sm:gap-space-4 flex flex-col sm:flex-row sm:items-center">
          <Button asChild className="whitespace-nowrap sm:w-auto">
            <Link href={action.href}>{action.label}</Link>
          </Button>
          {drop.state !== "closed" && drop.state !== "public" && !prive && (
            <Link
              href="/prive"
              className="text-body-s text-ink inline-flex min-h-11 items-center whitespace-nowrap underline underline-offset-4"
            >
              Privé members shop first.
            </Link>
          )}
        </div>
      </HeroFrame>

      <Timeline drop={drop} />

      <section
        id="designs"
        aria-labelledby="designs-heading"
        className="border-line scroll-mt-space-7 border-b"
      >
        <div className="px-space-3 py-space-6 md:px-space-5 mx-auto max-w-screen-2xl">
          <div className="mb-space-5 gap-space-1 flex flex-col">
            <p className="label text-ink-muted">
              {drop.state === "upcoming" || (drop.state === "vip" && !prive)
                ? "Choose a design to join its waitlist"
                : drop.state === "closed"
                  ? "From the archive"
                  : "Limited, numbered pieces"}
            </p>
            <h2 id="designs-heading" className="font-display text-display-m">
              The designs
            </h2>
            {products.length > 0 && (
              <p className="text-caption text-ink-muted tabular-nums">
                {products.length} {products.length === 1 ? "design" : "designs"}
              </p>
            )}
          </div>
          {products.length > 0 ? (
            <ul className="gap-x-space-3 gap-y-space-5 md:gap-x-space-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 2} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-ink-muted">
              This drop has closed and its designs are no longer available.{" "}
              <Link href="/shop#available" className="text-ink underline underline-offset-4">
                Shop available now
              </Link>
            </p>
          )}
        </div>
      </section>

      {drop.state !== "closed" && <PriveNote isMember={prive} limit={drop.vip_limit_per_member} />}

      {others.length > 0 && (
        <section aria-labelledby="more-drops-heading" className="border-line border-b">
          <div className="px-space-3 py-space-6 md:px-space-5 mx-auto max-w-screen-2xl">
            <div className="mb-space-5 gap-space-3 flex items-end justify-between">
              <h2 id="more-drops-heading" className="font-display text-display-m">
                More drops
              </h2>
              <Link
                href="/drops"
                className="text-body-s text-ink-muted hover:text-ink min-h-11 content-center underline underline-offset-4"
              >
                All drops
              </Link>
            </div>
            <ul className="gap-x-space-4 gap-y-space-6 grid md:grid-cols-2">
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
    <section aria-labelledby="timeline-heading" className="border-line border-b">
      <div className="px-space-3 py-space-5 md:px-space-5 mx-auto max-w-screen-2xl">
        <h2 id="timeline-heading" className="label text-ink-muted mb-space-4">
          Drop schedule
        </h2>
        <ol className="gap-space-4 grid md:grid-cols-3">
          {shown.map((s) => (
            <li key={s.key} className="border-line gap-space-1 pt-space-3 flex flex-col border-t-2">
              <span className={cn("label", s.reached ? "text-ink" : "text-ink-muted")}>
                {s.reached && (
                  <span
                    aria-hidden
                    className="bg-accent mr-space-2 inline-block size-1.5 rounded-full align-middle"
                  />
                )}
                {s.label}
                {s.reached && <span className="sr-only"> (done)</span>}
              </span>
              <span className="font-display text-title">
                <LocalTime iso={s.iso} />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Noir note on how Privé early access works for this drop (VIP-3 limit when set). */
function PriveNote({ isMember, limit }: { isMember: boolean; limit: number | null }) {
  return (
    <section data-theme="prive" aria-labelledby="drop-prive-heading" className="bg-surface text-ink">
      <div className="gap-space-4 px-space-3 py-space-6 md:px-space-5 mx-auto flex max-w-screen-2xl flex-col md:flex-row md:items-center md:justify-between">
        <div className="gap-space-2 flex max-w-xl flex-col">
          <p className="label text-accent gap-space-2 inline-flex items-center">
            <KeyRound aria-hidden className="size-4" />
            Members-only early access
          </p>
          <h2 id="drop-prive-heading" className="font-display text-display-m">
            Xarina Privé shops first
          </h2>
          <p className="text-body-s text-ink-muted">
            Privé members can buy during the early-access window, before the drop opens to everyone.
            {limit ? ` Up to ${limit} ${limit === 1 ? "piece" : "pieces"} per member.` : ""}
          </p>
        </div>
        <Button asChild className="whitespace-nowrap md:w-auto">
          <Link href="/prive">{isMember ? "Enter Privé" : "Verify or request access"}</Link>
        </Button>
      </div>
    </section>
  );
}
