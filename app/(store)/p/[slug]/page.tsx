import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import Link from "next/link";
import { getProduct, getStorefrontProducts, type ProductDetail } from "@/lib/catalogue";
import { getDrops } from "@/lib/drops-public";
import { getSiteSettings } from "@/lib/site-settings";
import { isPriveMember } from "@/lib/prive/session";
import { publicEnv } from "@/lib/env";
import { productMediaUrl } from "@/lib/supabase/public";
import { DEFAULT_CURRENCY, formatMoney, MINOR_PER_MAJOR } from "@/lib/money";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { SizeChart } from "@/components/store/size-chart";
import { WaitlistForm } from "@/components/store/waitlist-form";
import { WaitlistDialog } from "@/components/store/waitlist-dialog";
import { ProductCard } from "@/components/store/product-card";
import { CopyLink } from "@/components/store/copy-link";
import { Minus, Plus } from "lucide-react";

// Drop state and availability are always fresh (DROP-2/3).
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/**
 * PDP-1: /p/[slug] is permanent. An old slug redirects permanently (308, the
 * method-preserving equivalent of 301 that Next.js uses) to the current one.
 */
const load = cache(async (slug: string): Promise<ProductDetail> => {
  const result = await getProduct(slug);
  if (result.kind === "redirect") permanentRedirect(`/p/${result.slug}`);
  if (result.kind === "missing") notFound();
  return result.detail;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { product, media, prices } = await load(slug);
  const url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${product.slug}`;
  const image = media.find((m) => m.type === "image" && m.storage_path);
  const amount = prices?.[DEFAULT_CURRENCY];
  const description =
    [amount != null ? formatMoney(amount, DEFAULT_CURRENCY) : null, product.description.split("\n")[0]]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 200) || "Wearable statement dressing.";

  // PDP-5: rich previews on Instagram, WhatsApp and X.
  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "Xarina",
      title: product.name,
      description,
      images: image ? [{ url: productMediaUrl(image.storage_path!), alt: image.alt }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: product.name, description },
    other:
      amount != null
        ? {
            "product:price:amount": (amount / MINOR_PER_MAJOR[DEFAULT_CURRENCY]).toFixed(2),
            "product:price:currency": DEFAULT_CURRENCY,
          }
        : {},
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [detail, settings, prive, catalogue, drops] = await Promise.all([
    load(slug),
    getSiteSettings(),
    isPriveMember(),
    getStorefrontProducts(),
    getDrops(),
  ]);
  const { product, drop, variants, measurements } = detail;
  const showWaitlist = drop != null && (drop.state === "upcoming" || drop.state === "vip");
  const productUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${product.slug}`;
  const dropSlug = drop ? drops.find((d) => d.id === drop.id)?.slug : undefined;
  const cover = detail.media.find((m) => m.type === "image" && m.storage_path);
  const related = catalogue.filter((p) => p.id !== product.id).slice(0, 4);
  const kicker =
    drop?.state === "upcoming"
      ? "Upcoming drop"
      : drop?.state === "vip"
        ? "Xarina Privé early access"
        : drop?.state === "public"
          ? "Drop live now"
          : "Available now";

  const details = [
    { title: "Fit guidance", body: product.fit_notes },
    { title: "Fabric & care", body: [product.fabric, product.care].filter((t) => t.trim()).join("\n\n") },
    { title: "Delivery timing", body: product.delivery_timing },
  ].filter((d) => d.body.trim());

  return (
    <>
      <article className="pb-space-7 mx-auto max-w-screen-2xl md:grid md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] md:items-start md:pb-0">
        <ProductGallery media={detail.media} name={product.name} />

        <div className="gap-space-5 px-space-3 py-space-5 md:px-space-6 md:py-space-6 flex flex-col">
          <header className="gap-space-2 flex flex-col">
            <div className="mb-space-2 gap-space-2 flex flex-wrap items-center justify-between">
              <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
                <Link href="/shop" className="hover:text-ink">
                  Shop
                </Link>
                <span aria-hidden className="px-space-2">
                  /
                </span>
                <Link href={dropSlug ? `/drops/${dropSlug}` : "/shop#available"} className="hover:text-ink">
                  {drop ? drop.name : "Available now"}
                </Link>
              </nav>
              <CopyLink url={productUrl} label={`/p/${product.slug}`} />
            </div>
            <p className="label text-ink-muted">{kicker}</p>
            <h1 className="font-display text-display-m">{product.name}</h1>
            {(product.tagline || product.collection) && (
              <p className="text-body-s text-ink-muted">{product.tagline || product.collection?.name}</p>
            )}
          </header>

          <ProductPurchase
            detail={detail}
            isPriveMember={prive}
            whatsappNumber={settings.whatsapp.number}
            productUrl={productUrl}
            description={product.description}
          />

          <div className="border-line border-t">
            {measurements.length > 0 && (
              <Disclosure id="measurements" title="Measurements table (cm)" open>
                <SizeChart rows={measurements} />
              </Disclosure>
            )}
            {details.map((d) => (
              <Disclosure key={d.title} title={d.title}>
                <p className="text-body-s text-ink-muted whitespace-pre-line">{d.body}</p>
              </Disclosure>
            ))}
          </div>
        </div>
      </article>

      {showWaitlist && (
        <WaitlistDialog label={`Join the waitlist for ${product.name}`}>
          <WaitlistForm
            framed={false}
            productId={product.id}
            colours={[...new Set(variants.map((v) => v.colour))]}
            sizes={[...new Set(variants.map((v) => v.size))]}
            product={{
              name: product.name,
              tagline: drop?.name ?? product.collection?.name ?? null,
              coverPath: cover?.storage_path ?? null,
              coverAlt: cover?.alt ?? null,
            }}
          />
        </WaitlistDialog>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="border-line border-t">
          <div className="px-space-3 py-space-6 md:px-space-5 mx-auto max-w-screen-2xl">
            <div className="mb-space-5 gap-space-3 flex items-end justify-between">
              <h2 id="related-heading" className="font-display text-display-m">
                More from Xarina
              </h2>
              <Link
                href="/shop"
                className="text-body-s text-ink-muted hover:text-ink min-h-11 content-center underline underline-offset-4"
              >
                View full catalogue
              </Link>
            </div>
            <ul className="gap-x-space-3 gap-y-space-5 md:gap-x-space-4 grid grid-cols-2 md:grid-cols-4">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

function Disclosure({
  id,
  title,
  open = false,
  children,
}: {
  id?: string;
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={open} className="group border-line scroll-mt-space-7 border-b">
      <summary className="text-body-s text-ink flex min-h-12 cursor-pointer list-none items-center justify-between">
        {title}
        <Plus aria-hidden className="size-4 group-open:hidden" />
        <Minus aria-hidden className="hidden size-4 group-open:block" />
      </summary>
      <div className="pb-space-4">{children}</div>
    </details>
  );
}
