import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { getSiteSettings } from "@/lib/site-settings";
import { productMediaUrl } from "@/lib/supabase/public";
import { HomepageForm } from "./homepage-form";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const staff = await requireStaff(["owner", "manager", "merchandiser"]);
  const canEdit = staff.role === "owner" || staff.role === "manager";
  const supabase = await createClient();
  const [settings, { data: drops }] = await Promise.all([
    getSiteSettings(),
    supabase.from("drops").select("id, name, public_opens_at").order("public_opens_at", { ascending: false }),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="label text-accent">
          Hero Editorial &amp; Customer Care Copy
        </p>
        <h1 className="font-display text-display-m">Storefront Content</h1>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-1">
          <p className="text-body-s text-ink-muted">
            Configure full-bleed hero media, editable announcement bar, and WhatsApp concierge styling.
          </p>
          <Link
            href="/admin/content/pages"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line bg-surface-raised label text-ink hover:border-ink transition-colors"
          >
            <span>Edit Maison Pages (About, FAQs, Delivery...)</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {!canEdit && (
        <div role="note" className="border border-line bg-surface-sunk p-4 text-body-s text-ink-muted">
          Only staff members with owner or manager roles can publish homepage modifications. You are viewing in read-only mode.
        </div>
      )}

      <div className="border border-line bg-surface-raised p-6 md:p-8">
        <HomepageForm
          settings={settings}
          drops={drops ?? []}
          mediaUrl={settings.hero.media?.storage_path ? productMediaUrl(settings.hero.media.storage_path) : null}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
