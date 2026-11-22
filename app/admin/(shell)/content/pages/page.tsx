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
    <div className="flex max-w-2xl flex-col gap-space-5">
      <Link href="/admin/content" className="label text-ink-muted hover:text-ink">
        Back to content
      </Link>
      <header className="flex flex-col gap-space-2">
        <h1 className="font-display text-display-m">Info pages</h1>
        <p className="text-body-s text-ink-muted">About, contact, FAQs, delivery, returns, privacy and terms.</p>
      </header>
      <ul className="flex flex-col">
        {pages.map((p) => (
          <li key={p.slug} className="border-b border-line">
            <Link
              href={`/admin/content/pages/${p.slug}`}
              className="flex min-h-11 items-center justify-between gap-space-3 py-space-3 hover:bg-surface-sunk"
            >
              <span className="flex flex-col">
                <span className="text-body">{p.title}</span>
                <span className="text-caption text-ink-muted">/{p.slug}</span>
              </span>
              <span className="label text-ink-muted">{p.published ? "Published" : "Hidden"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
