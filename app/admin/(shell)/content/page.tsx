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
    <div className="flex max-w-2xl flex-col gap-space-5">
      <header className="flex flex-col gap-space-2">
        <h1 className="font-display text-display-m">Homepage</h1>
        <p className="text-body-s text-ink-muted">
          The hero, announcement bar and WhatsApp number on the storefront.{" "}
          <Link href="/admin/content/pages" className="text-ink underline underline-offset-4">
            Edit info pages
          </Link>{" "}
          (about, contact, FAQs, delivery, returns, privacy, terms).
        </p>
      </header>
      {!canEdit && (
        <p role="note" className="border-y border-line py-space-3 text-body-s text-ink-muted">
          Only owners and managers can change the homepage. You can view the current settings.
        </p>
      )}
      <HomepageForm
        settings={settings}
        drops={drops ?? []}
        mediaUrl={settings.hero.media?.storage_path ? productMediaUrl(settings.hero.media.storage_path) : null}
        canEdit={canEdit}
      />
    </div>
  );
}
