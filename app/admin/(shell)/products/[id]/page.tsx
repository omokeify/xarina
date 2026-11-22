import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { productMediaUrl } from "@/lib/supabase/public";
import { muxConfigured } from "@/lib/admin/mux";
import type { AdminProduct } from "@/lib/admin/products";
import { Section } from "../_components/form-parts";
import { DetailsForm } from "./details-form";
import { MediaManager } from "./media-manager";
import { VariantsEditor } from "./variants-editor";
import { PricesEditor } from "./prices-editor";
import { MeasurementsEditor } from "./measurements-editor";
import { DeleteProduct } from "./delete-product";
import { PricingModeForm } from "./pricing-mode-form";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["owner", "manager", "merchandiser"]);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data, error }, { data: collections }] = await Promise.all([
    supabase.rpc("admin_product", { p_id: id }),
    supabase.from("collections").select("id, name").order("sort"),
  ]);
  if (error) throw error;
  if (!data) notFound();
  const product = data as unknown as AdminProduct;
  const p = product.product;

  return (
    <div className="space-y-8 max-w-4xl">
      <Link href="/admin/products" className="label text-ink-muted hover:text-ink inline-flex items-center gap-1.5">
        ← Back to Catalogue
      </Link>
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-display-m text-ink">{p.name}</h1>
          <span
            className={`label px-2 py-0.5 border ${
              p.status === "published"
                ? "border-action bg-action text-on-action"
                : "border-line bg-surface-sunk text-ink-muted"
            }`}
          >
            {p.status === "published" ? "Published" : "Draft"}
          </span>
          {product.drops.length > 0 && (
            <span className="label px-2 py-0.5 border border-accent/40 bg-accent/10 text-ink">
              In Drop: {product.drops.map((d) => d.name).join(", ")}
            </span>
          )}
        </div>
        <p className="text-body-s text-ink-muted">
          Web slug: /p/{p.slug}
          {p.status === "published" && (
            <>
              {" · "}
              <Link href={`/p/${p.slug}`} className="hover:text-ink underline underline-offset-4 text-accent">
                View in storefront
              </Link>
            </>
          )}
        </p>
      </header>

      <Section title="Details" id="details">
        <DetailsForm product={p} collections={collections ?? []} canPublish={product.can.publish} />
      </Section>

      <Section
        title="Photos and video"
        id="media"
        description="The first item is the cover image in the shop. Drag to reorder, or use the arrow buttons."
      >
        <MediaManager
          productId={p.id}
          media={product.media.map((m) => ({
            ...m,
            url: m.storage_path ? productMediaUrl(m.storage_path) : null,
          }))}
          muxReady={muxConfigured()}
        />
      </Section>

      <Section
        title="Variants"
        id="variants"
        description={
          product.can.change_stock
            ? "One row per colour and size. Reserved for public: units Privé sales cannot use."
            : "One row per colour and size. Owners and managers set stock."
        }
      >
        <VariantsEditor
          productId={p.id}
          productSlug={p.slug}
          variants={product.variants}
          canStock={product.can.change_stock}
        />
      </Section>

      {product.can.change_prices && (
        <Section
          title="Prices"
          id="prices"
          description="Choose fixed prices per currency or one base price converted with exchange rates. With fixed prices, override a variant only when it costs more or less."
        >
          <PricingModeForm
            productId={p.id}
            mode={p.pricing_mode}
            baseCurrency={p.base_currency}
            baseAmountMinor={p.base_amount_minor}
          />
          <PricesEditor
            productId={p.id}
            variants={product.variants}
            prices={product.prices}
            pricingMode={p.pricing_mode}
          />
        </Section>
      )}

      <Section title="Size chart" id="measurements" description="Garment measurements in centimetres.">
        <MeasurementsEditor
          productId={p.id}
          rows={product.measurements}
          sizes={[...new Set(product.variants.map((v) => v.size))]}
        />
      </Section>

      {product.can.publish && (
        <Section title="Delete product" id="delete">
          <DeleteProduct productId={p.id} productName={p.name} published={p.status === "published"} />
        </Section>
      )}
    </div>
  );
}
