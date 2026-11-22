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
    <div className="gap-space-5 flex max-w-2xl flex-col">
      <Link href="/admin/products" className="label text-ink-muted hover:text-ink">
        Back to products
      </Link>
      <header className="gap-space-2 flex flex-col">
        <h1 className="font-display text-display-m">New product</h1>
        <p className="text-body-s text-ink-muted">
          Start with a name. It is saved as a draft; add photos, variants and prices next.
        </p>
      </header>
      <NewProductForm collections={collections ?? []} />
    </div>
  );
}
