import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { NewProductForm } from "./new-product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireStaff(["owner", "manager", "merchandiser"]);
  const supabase = await createClient();
  const { data: collections } = await supabase.from("collections").select("id, name").order("sort");

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/admin/products" className="label text-ink-muted hover:text-ink inline-flex items-center gap-1.5">
        ← Back to Catalogue
      </Link>
      <header className="flex flex-col gap-1">
        <p className="label text-accent">Design Creation</p>
        <h1 className="font-display text-display-m text-ink">Create New Garment</h1>
        <p className="text-body-s text-ink-muted">
          Register design title and silhouette collection. Media, variants, and pricing tiers are configured in the next step.
        </p>
      </header>
      <div className="border border-line bg-surface-raised p-6 sm:p-8">
        <NewProductForm collections={collections ?? []} />
      </div>
    </div>
  );
}
