import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminDropDetail, STATE_LABEL } from "@/lib/drops/admin";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";
import { DropForm } from "../drop-form";
import { DropProductsForm } from "../drop-products-form";

export const metadata: Metadata = { title: "Edit drop" };

export default async function EditDropPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["owner", "manager", "merchandiser"]);
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
    <div className="gap-space-6 flex flex-col">
      <header className="gap-space-2 flex flex-col">
        <h1 className="font-display text-display-m">{drop.name}</h1>
        <p className="label text-ink-muted">{drop.published ? STATE_LABEL[drop.state] : "Draft"}</p>
      </header>

      <section aria-labelledby="details" className="gap-space-4 flex flex-col">
        <h2 id="details" className="font-display text-title">
          Details
        </h2>
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

      <section aria-labelledby="designs" className="gap-space-4 flex flex-col">
        <h2 id="designs" className="font-display text-title">
          Designs
        </h2>
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
    </div>
  );
}
