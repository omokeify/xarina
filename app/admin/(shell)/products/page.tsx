import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { productMediaUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
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
    <div className="gap-space-5 flex flex-col">
      <header className="gap-space-3 flex flex-wrap items-end justify-between">
        <div className="gap-space-2 flex flex-col">
          <h1 className="font-display text-display-m">Products</h1>
          <p className="text-body-s text-ink-muted">
            One entry per design. Drafts are visible to staff only.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </header>

      {deleted && (
        <p role="status" className="border-line py-space-3 text-body-s border-y">
          Product deleted.
        </p>
      )}

      <nav aria-label="Filter products" className="gap-space-4 border-line flex border-b">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/products?status=${f.value}` : "/admin/products"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "label -mb-px inline-flex min-h-11 items-center border-b-2 border-transparent",
                active ? "border-ink text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {products.length === 0 ? (
        <p className="py-space-5 text-body-s text-ink-muted">
          {status ? `No ${status} products.` : "No products yet. Add your first design."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {products.map((p) => (
            <li key={p.id} className="border-line border-b">
              <Link
                href={`/admin/products/${p.id}`}
                className="gap-space-3 py-space-3 hover:bg-surface-sunk grid grid-cols-[56px_1fr] items-center md:grid-cols-[56px_2fr_1fr_1fr_1fr]"
              >
                {p.cover_path ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                  <img
                    src={productMediaUrl(p.cover_path)}
                    alt=""
                    className="bg-surface-sunk aspect-[4/5] w-14 object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="bg-surface-sunk aspect-[4/5] w-14" />
                )}
                <span className="gap-space-1 flex flex-col">
                  <span className="text-body">{p.name}</span>
                  <span className="text-caption text-ink-muted md:hidden">
                    {statusLabel(p.status)} · {p.variant_count} variants{p.sold_out ? " · Sold out" : ""}
                  </span>
                </span>
                <span className="text-body-s hidden md:block">{statusLabel(p.status)}</span>
                <span className="text-body-s text-ink-muted hidden md:block">
                  {p.collection_name ?? "No collection"}
                </span>
                <span className="text-body-s text-ink-muted hidden md:block">
                  {p.variant_count} variants{p.sold_out ? " · Sold out" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  return status === "published" ? "Published" : "Draft";
}
