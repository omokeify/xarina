import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MessageCircle } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import { createPublicClient } from "@/lib/supabase/public";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

// INFO-1: About, FAQs, Delivery, Returns, Privacy, Terms — text edited in admin
// (pages table, ADM-6). Static routes such as /shop and /cart take precedence.
// Body is plain text with blank lines between paragraphs. Layout follows the
// concept: tabs across all published info pages, then the text and a
// WhatsApp contact button.

const getPage = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const { data, error } = await createPublicClient()
    .from("pages")
    .select("slug, title, body, updated_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
});

// Tab order for the standard pages; any other published page follows.
const ORDER = ["about", "faq", "delivery", "returns", "privacy", "terms", "contact"];

const getPageList = cache(async () => {
  const { data, error } = await createPublicClient()
    .from("pages")
    .select("slug, title")
    .eq("published", true);
  if (error) throw error;
  const rank = (slug: string) => (ORDER.includes(slug) ? ORDER.indexOf(slug) : ORDER.length);
  return (data ?? []).sort((a, b) => rank(a.slug) - rank(b.slug) || a.title.localeCompare(b.title));
});

export const revalidate = 300;

type Params = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await getPage((await params).page);
  return page ? { title: page.title } : {};
}

export default async function InfoPage({ params }: Params) {
  const [page, pages, settings] = await Promise.all([
    getPage((await params).page),
    getPageList(),
    getSiteSettings(),
  ]);
  if (!page) notFound();
  const whatsapp = settings.whatsapp.number;

  const kicker =
    page.slug === "about"
      ? "Maison & Story"
      : page.slug === "faq" || page.slug === "delivery" || page.slug === "returns"
        ? "Client Care"
        : "Maison & Legal";

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-20 flex flex-col text-ink">
      {pages.length > 1 && (
        <nav aria-label="Information pages" className="border-b border-line mb-8 sm:mb-12">
          <ul className="flex flex-wrap items-center gap-x-3.5 sm:gap-x-5 md:gap-x-6 gap-y-2 py-1">
            {pages.map((p) => (
              <li key={p.slug} className="shrink-0">
                <Link
                  href={`/${p.slug}`}
                  aria-current={p.slug === page.slug ? "page" : undefined}
                  className={cn(
                    "inline-block py-2 text-[10.5px] sm:text-[11.5px] tracking-[0.16em] uppercase font-semibold transition-colors border-b-2 -mb-[1px]",
                    p.slug === page.slug
                      ? "border-accent text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Header matching Homepage editorial typography */}
      <header className="flex flex-col items-start text-left">
        <p className="label text-ink-muted text-[11px] sm:text-[12px] tracking-[0.24em] uppercase font-semibold mb-2 sm:mb-3">
          {kicker}
        </p>
        <h1 className="font-display italic text-[36px] sm:text-[44px] md:text-[52px] leading-[1.08] text-ink font-normal tracking-tight">
          {page.title}
        </h1>
        {/* Warm Champagne Gold Accent Bar */}
        <div className="w-12 h-[2px] bg-accent my-4 sm:my-5" />
      </header>

      {/* Atelier image for About page */}
      {page.slug === "about" && (
        <div className="w-full aspect-[16/9] sm:aspect-[2/1] bg-surface-sunk relative overflow-hidden border border-line/60 shadow-xs mb-8 sm:mb-10">
          <ProductImage
            path="products/20000000-0000-4000-a000-000000000012/cover.jpg"
            alt="Xarina atelier craftsmanship and sculptural detail"
            sizes="(min-width: 1024px) 768px, 100vw"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Editorial Body Copy */}
      <div className="space-y-5 text-ink leading-relaxed">
        {page.body.split(/\n{2,}/).map((para, i) => {
          const isLead = i === 0 && para.length < 120;
          return isLead ? (
            <p
              key={i}
              className="font-display italic text-[20px] sm:text-[23px] text-accent leading-snug font-normal mb-3"
            >
              {para}
            </p>
          ) : (
            <p
              key={i}
              className="text-body text-ink-muted leading-[1.8] sm:leading-[1.85] font-normal whitespace-pre-line"
            >
              {para}
            </p>
          );
        })}
      </div>

      <p className="font-display italic text-[13px] sm:text-[14px] text-ink-muted/80 mt-10 pt-4 border-t border-line/40">
        Last updated{" "}
        {new Date(page.updated_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* Luxury Action Bar */}
      <div className="border-t border-line mt-10 sm:mt-12 pt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        {whatsapp && (
          <a
            href={whatsappLink(whatsapp, `Hello Xarina, I have a question about ${page.title}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 bg-accent hover:bg-accent/90 text-on-action label text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold py-3.5 px-6 transition-colors shadow-sm"
          >
            <MessageCircle aria-hidden className="size-4" />
            <span>CONTACT US ON WHATSAPP</span>
          </a>
        )}
        <Link
          href="/shop"
          className="label text-ink-muted hover:text-ink transition-colors text-[11px] sm:text-[12px] tracking-[0.22em] font-medium underline underline-offset-8"
        >
          BACK TO SHOP →
        </Link>
      </div>
    </article>
  );
}
