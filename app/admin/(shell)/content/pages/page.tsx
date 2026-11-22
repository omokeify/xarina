import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";

export const metadata: Metadata = { title: "Info pages" };

// INFO-1: the shop's information pages, edited in admin (ADM-6).
const ORDER = ["about", "contact", "faq", "delivery", "returns", "privacy", "terms"];

export default async function InfoPagesList() {
  await requireStaff(["owner", "manager", "merchandiser"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("pages").select("slug, title, published, updated_at");
  if (error) throw error;
  const rank = (s: string) => (ORDER.includes(s) ? ORDER.indexOf(s) : ORDER.length);
  const pages = (data ?? []).sort((a, b) => rank(a.slug) - rank(b.slug) || a.title.localeCompare(b.title));

  return (
    <div className="gap-space-5 flex max-w-3xl flex-col">
      <Link href="/admin/content" className="label text-ink-muted hover:text-ink inline-flex items-center gap-space-1">
        ← Back to Content
      </Link>
      <header className="gap-space-2 flex flex-col">
        <p className="label text-accent">Storefront Editorial</p>
        <h1 className="font-display text-display-m text-ink">Maison &amp; Info Pages</h1>
        <p className="text-body-s text-ink-muted">Manage policy, provenance, FAQ, and boutique customer service editorial.</p>
      </header>
      <div className="border border-line bg-surface-raised overflow-hidden">
        <ul className="divide-line divide-y">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/admin/content/pages/${p.slug}`}
                className="flex items-center justify-between p-space-3 hover:bg-surface-sunk/30 transition-colors"
              >
                <span className="flex flex-col gap-space-1">
                  <span className="text-body font-medium text-ink">{p.title}</span>
                  <span className="text-caption text-ink-muted">/{p.slug}</span>
                </span>
                <span
                  className={`label px-2 py-0.5 border ${
                    p.published
                      ? "border-line bg-surface-sunk text-ink"
                      : "border-line bg-surface-sunk text-ink-muted"
                  }`}
                >
                  {p.published ? "Published" : "Hidden"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
