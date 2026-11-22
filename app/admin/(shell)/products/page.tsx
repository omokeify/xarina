import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { productMediaUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const FILTERS = [
  { value: undefined, label: "All Designs" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
] as const;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; deleted?: string }>;
}) {
  await requireStaff(["owner", "manager", "merchandiser"]);
  const { status: raw, deleted } = await searchParams;
  const status = raw === "draft" || raw === "published" ? raw : undefined;

  const supabase = await createClient();
  const { data: products, error } = await supabase.rpc("admin_products", status ? { p_status: status } : {});
  if (error) throw error;

  return (
    <div className="gap-8 flex flex-col">
      <header className="gap-3 flex flex-wrap items-end justify-between">
        <div className="gap-1 flex flex-col">
          <p className="label text-accent">
            Garment Studio · Master Catalogue
          </p>
          <h1 className="font-display text-display-m">Catalogue &amp; Stock</h1>
          <p className="text-body-s text-ink-muted">
            Manage individual silhouettes, fabrics, sizing tables, and stock allocations. Drafts remain staff-only.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/products/new">+ Add New Design</Link>
        </Button>
      </header>

      {deleted && (
        <div role="status" className="bg-surface-sunk border border-line px-4 py-3 text-body-s text-ink">
          Design record was deleted successfully.
        </div>
      )}

      <nav aria-label="Filter products" className="gap-6 border-line flex border-b">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/products?status=${f.value}` : "/admin/products"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "py-3 border-b-2 label transition-colors",
                active ? "border-ink text-ink font-semibold" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {products.length === 0 ? (
        <div className="border border-line bg-surface-raised p-12 text-center">
          <p className="text-body-s text-ink-muted">
            {status ? `No ${status} products found.` : "No products added yet. Create your first design."}
          </p>
        </div>
      ) : (
        <div className="border border-line bg-surface-raised overflow-hidden">
          <ul className="divide-y divide-line">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="px-6 py-4 hover:bg-surface-sunk/30 transition-colors grid grid-cols-[64px_1fr] md:grid-cols-[64px_2fr_1fr_1fr_1fr] gap-4 items-center"
                >
                  <div className="bg-surface-sunk aspect-[3/4] w-16 overflow-hidden border border-line/60 shrink-0">
                    {p.cover_path ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                      <img
                        src={productMediaUrl(p.cover_path)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span aria-hidden="true" className="w-full h-full block bg-surface-sunk" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-display text-title text-ink font-medium">{p.name}</span>
                    <span className="text-caption text-ink-muted md:hidden">
                      {statusLabel(p.status)} · {p.variant_count} variants{p.sold_out ? " · Sold out" : ""}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <span
                      className={`inline-flex px-2.5 py-0.5 label border ${
                        p.status === "published"
                          ? "bg-action text-on-action border-action"
                          : "bg-surface-sunk text-ink-muted border-line"
                      }`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <span className="text-body-s text-ink-muted hidden md:block">
                    {p.collection_name ?? "No Collection"}
                  </span>
                  <span className="text-body-s text-ink font-medium tabular-nums hidden md:block">
                    {p.variant_count} variants{p.sold_out ? " · Sold out" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  return status === "published" ? "Published" : "Draft";
}
