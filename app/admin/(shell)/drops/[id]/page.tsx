import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDropDetail, STATE_LABEL } from "@/lib/drops/admin";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteDrop } from "../delete-drop";
import { DropForm } from "../drop-form";
import { DropProductsForm } from "../drop-products-form";

export const metadata: Metadata = { title: "Edit drop" };

export default async function EditDropPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(["owner", "manager", "merchandiser"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_drop", { p_id: id });
  if (error) {
    if (error.code === "P0002" || error.code === "22P02") notFound();
    throw error;
  }
  const drop = adminDropDetail.parse(data);

  const [{ data: products }, { data: waitlist }] = await Promise.all([
    supabase.from("products").select("id, name").order("name"),
    supabase.from("waitlist_entries").select("product_id"),
  ]);
  const interest = new Map<string, number>();
  for (const w of waitlist ?? []) interest.set(w.product_id, (interest.get(w.product_id) ?? 0) + 1);
  const inDrop = new Set(drop.products.map((p) => p.product_id));

  return (
    <div className="gap-space-5 flex max-w-4xl flex-col">
      <header className="gap-space-2 flex flex-col">
        <Link href="/admin/drops" className="label text-ink-muted hover:text-ink inline-flex items-center gap-space-1">
          ← Back to Drops
        </Link>
        <div className="flex items-center gap-space-3">
          <h1 className="font-display text-display-m text-ink">{drop.name}</h1>
          <span className="label px-2 py-0.5 border border-line bg-surface-sunk text-ink">
            {drop.published ? STATE_LABEL[drop.state] : "Draft"}
          </span>
        </div>
        <p className="text-body-s text-ink-muted">
          Manage drop timeline, Privé window limits, and assigned designs.
        </p>
      </header>

      <section aria-labelledby="details" className="border border-line bg-surface-raised p-space-4 flex flex-col gap-space-3">
        <div className="border-b border-line pb-space-2">
          <h2 id="details" className="font-display text-title text-ink font-normal">
            Drop Parameters &amp; Windows
          </h2>
        </div>
        <DropForm
          drop={{
            id: drop.id,
            name: drop.name,
            slug: drop.slug,
            hero_storage_path: drop.hero_storage_path,
            hero_alt: drop.hero_alt,
            pitch: drop.pitch,
            vip_opens_at: drop.vip_opens_at,
            public_opens_at: drop.public_opens_at,
            closes_at: drop.closes_at,
            vip_limit_per_member: drop.vip_limit_per_member,
            on_close: drop.on_close,
            published: drop.published,
          }}
        />
      </section>

      <section aria-labelledby="designs" className="border border-line bg-surface-raised p-space-4 flex flex-col gap-space-3">
        <div className="border-b border-line pb-space-2">
          <h2 id="designs" className="font-display text-title text-ink font-normal">
            Assigned Designs &amp; Client Interest
          </h2>
        </div>
        <DropProductsForm
          dropId={drop.id}
          options={(products ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            interest: interest.get(p.id) ?? 0,
            inDrop: inDrop.has(p.id),
          }))}
        />
      </section>

      {staff.role === "owner" && (
        <section aria-labelledby="delete" className="border border-critical/30 bg-surface-sunk/30 p-space-4 flex flex-col gap-space-3">
          <div className="border-b border-critical/30 pb-space-2">
            <h2 id="delete" className="font-display text-title text-critical font-normal">
              Delete Drop
            </h2>
          </div>
          <DeleteDrop dropId={drop.id} dropName={drop.name} published={drop.published} />
        </section>
      )}
    </div>
  );
}
