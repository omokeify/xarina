import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { PageForm } from "./page-form";

export const metadata: Metadata = { title: "Edit info page" };

export default async function EditInfoPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff(["owner", "manager", "merchandiser"]);
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) notFound();

  const supabase = await createClient();
  const { data: page } = await supabase.from("pages").select("slug, title, body, published").eq("slug", slug).maybeSingle();
  if (!page) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-space-5">
      <Link href="/admin/content/pages" className="label text-ink-muted hover:text-ink">
        Back to info pages
      </Link>
      <header className="flex flex-col gap-space-2">
        <h1 className="font-display text-display-m">{page.title}</h1>
        <p className="text-body-s text-ink-muted">
          Shown at /{page.slug}
          {page.published && (
            <>
              {" · "}
              <Link href={`/${page.slug}`} className="underline underline-offset-4 hover:text-ink">
                View page
              </Link>
            </>
          )}
        </p>
      </header>
      <PageForm page={page} />
    </div>
  );
}
