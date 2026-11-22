import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <article className="px-space-3 py-space-6 md:px-space-5 mx-auto flex max-w-3xl flex-col">
      {pages.length > 1 && (
        <nav aria-label="Information pages" className="border-line mb-space-5 border-b">
          <ul className="gap-x-space-4 flex flex-wrap">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  aria-current={p.slug === page.slug ? "page" : undefined}
                  className={cn(
                    "text-body-s inline-flex min-h-11 items-center border-b-2",
                    p.slug === page.slug
                      ? "border-ink text-ink"
                      : "text-ink-muted hover:text-ink border-transparent",
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <header className="gap-space-2 flex flex-col">
        <p className="label text-ink-muted">Xarina information</p>
        <h1 className="font-display text-display-m md:text-display-l">{page.title}</h1>
      </header>

      <div className="border-line mt-space-5 pt-space-5 gap-space-4 text-body flex flex-col border-t">
        {page.body.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>

      <p className="text-caption text-ink-muted mt-space-4">
        Last updated{" "}
        {new Date(page.updated_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="border-line mt-space-6 pt-space-5 gap-space-4 flex flex-col border-t sm:flex-row sm:items-center sm:justify-between">
        {whatsapp && (
          <Button asChild>
            <a
              href={whatsappLink(whatsapp, `Hello Xarina, I have a question about ${page.title}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden className="size-4" />
              Contact us on WhatsApp
            </a>
          </Button>
        )}
        <Link
          href="/shop"
          className="text-body-s text-ink-muted hover:text-ink min-h-11 content-center underline underline-offset-4"
        >
          Back to the shop
        </Link>
      </div>
    </article>
  );
}
