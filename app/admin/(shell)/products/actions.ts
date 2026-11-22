"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { can } from "@/lib/staff/roles";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { publicEnv } from "@/lib/env";
import { getMux } from "@/lib/admin/mux";
import {
  FOCUS_PATTERN,
  HEX_PATTERN,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  SLUG_PATTERN,
  slugify,
  type AdminProduct,
} from "@/lib/admin/products";
import type { Json } from "@/lib/supabase/database.types";

// Catalogue editors (PRD › Users and roles). Prices, stock and publishing are
// narrowed further below and enforced again in the database.
const EDITORS = ["owner", "manager", "merchandiser"] as const;
const ADMINS = ["owner", "manager"] as const;

export type ActionState = { status: "idle" | "saved" | "error"; message?: string };

type PgError = { code?: string; message?: string } | null;

/** Turn a database error into a short message for staff. */
function explain(error: PgError, fallback = "Couldn't save. Try again."): ActionState {
  switch (error?.code) {
    case "42501":
      return { status: "error", message: "You don't have permission to change that." };
    case "23505":
      return {
        status: "error",
        message: /slug/i.test(error.message ?? "")
          ? "That web address is already used by another product, now or in the past."
          : /sku/i.test(error.message ?? "")
            ? "Each SKU must be unique."
            : "Each colour and size combination must be unique.",
      };
    case "22023":
    case "55006":
      return { status: "error", message: error.message };
    default:
      return { status: "error", message: fallback };
  }
}

/** Refresh every storefront page that shows this product. */
function revalidateProduct(...slugs: (string | null | undefined)[]) {
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/p/${slug}`);
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/products");
}

async function productSlug(productId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  return data?.slug ?? null;
}

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().max(max);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
const createSchema = z.object({
  name: text(120).min(1, "Give the product a name"),
  slug: text(80),
  collection_id: z.union([z.literal(""), uuid]).transform((v) => v || null),
});

export async function createProduct(_: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(EDITORS);
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!SLUG_PATTERN.test(slug))
    return { status: "error", message: "Use letters and numbers in the web address" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ name: parsed.data.name, slug, collection_id: parsed.data.collection_id, status: "draft" })
    .select("id")
    .single();
  if (error || !data) return explain(error);

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}`);
}

// ---------------------------------------------------------------------------
// Details: copy, collection, slug, status
// ---------------------------------------------------------------------------
const detailsSchema = z.object({
  name: text(120).min(1, "Give the product a name"),
  slug: text(80).regex(SLUG_PATTERN, "Web address: lowercase letters, numbers and single hyphens"),
  collection_id: z.union([z.literal(""), uuid]).transform((v) => v || null),
  description: text(4000),
  fabric: text(500),
  care: text(500),
  fit_notes: text(1000),
  delivery_timing: text(300),
  status: z.enum(["draft", "published"]).optional(),
});

export async function saveDetails(productId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff(EDITORS);
  if (!uuid.safeParse(productId).success) return { status: "error", message: "Unknown product" };
  const parsed = detailsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const { status, ...fields } = parsed.data;
  const oldSlug = await productSlug(productId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update(can.publish(staff.role) && status ? { ...fields, status } : fields)
    .eq("id", productId);
  if (error) return explain(error);

  revalidateProduct(oldSlug, fields.slug);
  revalidatePath(`/admin/products/${productId}`);
  return { status: "saved" };
}

// ---------------------------------------------------------------------------
// Variants (stock fields only for owner/manager; the RPC re-checks)
// ---------------------------------------------------------------------------
const count = z.coerce.number().int().min(0).max(1_000_000);
const variantsSchema = z.array(
  z.object({
    id: uuid.optional(),
    colour: text(60).min(1, "Every variant needs a colour"),
    colour_hex: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || HEX_PATTERN.test(v),
        "Swatch colours are a # followed by six digits or letters A to F",
      ),
    size: text(20).min(1, "Every variant needs a size"),
    sku: text(60).min(1, "Every variant needs a SKU"),
    sort: z.number().int(),
    stock_on_hand: count.optional(),
    reserved_public_qty: count.optional(),
  }),
);

export async function saveVariants(productId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff(EDITORS);
  let rows: unknown;
  try {
    rows = JSON.parse(String(form.get("variants") ?? "[]"));
  } catch {
    return { status: "error", message: "Couldn't read the variants. Reload and try again." };
  }
  const parsed = variantsSchema.safeParse(rows);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const canStock = can.publish(staff.role);
  const payload = parsed.data.map(({ stock_on_hand, reserved_public_qty, ...v }) =>
    canStock ? { ...v, stock_on_hand, reserved_public_qty } : v,
  );

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_variants", {
    p_product_id: productId,
    p_variants: payload as Json,
  });
  if (error) return explain(error);

  revalidateProduct(await productSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "saved" };
}

// ---------------------------------------------------------------------------
// Prices (owner/manager). Staff type major amounts; stored as minor units.
// ---------------------------------------------------------------------------
const pricesSchema = z.array(
  z.object({
    variant_id: uuid.nullable(),
    currency: z.enum(CURRENCIES),
    amount: z.string().trim().max(20),
  }),
);

export async function savePrices(productId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  let rows: unknown;
  try {
    rows = JSON.parse(String(form.get("prices") ?? "[]"));
  } catch {
    return { status: "error", message: "Couldn't read the prices. Reload and try again." };
  }
  const parsed = pricesSchema.safeParse(rows);
  if (!parsed.success) return { status: "error", message: "Check the prices" };

  const payload: { variant_id: string | null; currency: string; amount_minor: number }[] = [];
  for (const row of parsed.data) {
    if (row.amount === "") continue; // blank = no price (or "use the design price" for a variant)
    const minor = parseMajorToMinor(row.amount, row.currency);
    if (minor === null)
      return { status: "error", message: `"${row.amount}" isn't a valid ${row.currency} amount` };
    payload.push({ variant_id: row.variant_id, currency: row.currency, amount_minor: minor });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_prices", {
    p_product_id: productId,
    p_prices: payload as Json,
  });
  if (error) return explain(error);

  revalidateProduct(await productSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "saved" };
}

// ---------------------------------------------------------------------------
// Pricing method (CUR-1): fixed prices per currency, or one base price
// converted with the exchange rates in Settings. Owner/manager only; the
// database refuses anyone else and audits the change (ADM-7).
// ---------------------------------------------------------------------------
const pricingSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("fixed") }),
  z.object({ mode: z.literal("fx"), base_currency: z.enum(CURRENCIES), base_amount: z.string().trim() }),
]);

export async function savePricingMode(
  productId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireStaff(ADMINS);
  const parsed = pricingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: "Choose a pricing method" };

  let update: {
    pricing_mode: "fixed" | "fx";
    base_currency: (typeof CURRENCIES)[number] | null;
    base_amount_minor: number | null;
  };
  if (parsed.data.mode === "fixed") {
    update = { pricing_mode: "fixed", base_currency: null, base_amount_minor: null };
  } else {
    const minor = parseMajorToMinor(parsed.data.base_amount, parsed.data.base_currency); // rule 1
    if (minor === null || minor <= 0) {
      return {
        status: "error",
        message: `Enter the base price in ${parsed.data.base_currency}, e.g. 185000`,
      };
    }
    update = { pricing_mode: "fx", base_currency: parsed.data.base_currency, base_amount_minor: minor };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(update).eq("id", productId);
  if (error) return explain(error);

  revalidateProduct(await productSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "saved" };
}

// ---------------------------------------------------------------------------
// Measurements (size chart, cm)
// ---------------------------------------------------------------------------
const cm = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine(
    (v) => v === null || (Number.isFinite(v) && v > 0 && v < 1000),
    "Measurements are in cm, e.g. 92.5",
  );
const measurementsSchema = z.array(
  z.object({
    size: text(20).min(1, "Every row needs a size"),
    bust_cm: cm,
    waist_cm: cm,
    hip_cm: cm,
    length_cm: cm,
  }),
);

export async function saveMeasurements(
  productId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireStaff(EDITORS);
  let rows: unknown;
  try {
    rows = JSON.parse(String(form.get("measurements") ?? "[]"));
  } catch {
    return { status: "error", message: "Couldn't read the size chart. Reload and try again." };
  }
  const parsed = measurementsSchema.safeParse(rows);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_measurements", {
    p_product_id: productId,
    p_rows: parsed.data.map((r, i) => ({ ...r, sort: i })) as Json,
  });
  if (error) return explain(error);

  revalidateProduct(await productSlug(productId));
  return { status: "saved" };
}

// ---------------------------------------------------------------------------
// Media (ADM-2): images in Storage, video via Mux direct upload
// ---------------------------------------------------------------------------
export async function uploadImages(productId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(EDITORS);
  if (!uuid.safeParse(productId).success) return { status: "error", message: "Unknown product" };
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const alts = form.getAll("alts").map((a) => String(a).trim());
  if (files.length === 0) return { status: "error", message: "Choose at least one image" };
  if (alts.length !== files.length || alts.some((a) => a.length === 0)) {
    return { status: "error", message: "Describe every image (alt text) before uploading" };
  }
  for (const f of files) {
    if (!IMAGE_TYPES[f.type]) return { status: "error", message: `${f.name}: use JPG, PNG, WebP or AVIF` };
    if (f.size > MAX_IMAGE_BYTES)
      return { status: "error", message: `${f.name}: images must be 8 MB or smaller` };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("product_media")
    .select("sort")
    .eq("product_id", productId)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  let sort = (last?.sort ?? -1) + 1;

  for (const [i, file] of files.entries()) {
    const path = `products/${productId}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
    const { error: upErr } = await supabase.storage
      .from("product-media")
      .upload(path, file, { contentType: file.type });
    if (upErr) return { status: "error", message: `${file.name} didn't upload. Try again.` };
    const { error } = await supabase
      .from("product_media")
      .insert({ product_id: productId, type: "image", storage_path: path, alt: alts[i]!, sort: sort++ });
    if (error) {
      await supabase.storage.from("product-media").remove([path]);
      return explain(error);
    }
  }

  revalidateProduct(await productSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "saved", message: files.length === 1 ? "Image added." : `${files.length} images added.` };
}

export async function updateMediaAlt(productId: string, mediaId: string, alt: string): Promise<ActionState> {
  await requireStaff(EDITORS);
  const value = alt.trim();
  if (!value) return { status: "error", message: "Alt text can't be empty" };
  if (value.length > 300) return { status: "error", message: "Keep alt text under 300 characters" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_media")
    .update({ alt: value })
    .eq("id", mediaId)
    .eq("product_id", productId);
  if (error) return explain(error);
  revalidateProduct(await productSlug(productId));
  return { status: "saved" };
}

// Gallery view settings (PDP-2): caption, crop focus, zoom and the pan effect.
const displaySchema = z.object({
  label: text(60),
  focus: z
    .string()
    .trim()
    .refine((v) => v === "" || FOCUS_PATTERN.test(v), "Focus looks like 50% 40% (across, down)")
    .transform((v) => v || null),
  zoom: z.coerce.number().min(1, "Zoom is 1 to 3").max(3, "Zoom is 1 to 3"),
  effect: z.enum(["none", "pan"]),
  duration_sec: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 600),
      "Duration is whole seconds, 1 to 600",
    ),
});

export async function updateMediaDisplay(
  productId: string,
  mediaId: string,
  values: { label: string; focus: string; zoom: string; effect: string; duration_sec: string },
): Promise<ActionState> {
  await requireStaff(EDITORS);
  const parsed = displaySchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_media")
    .update({
      ...v,
      zoom: Math.round(v.zoom * 100) / 100,
      duration_sec: v.effect === "pan" ? v.duration_sec : null,
    })
    .eq("id", mediaId)
    .eq("product_id", productId);
  if (error) return explain(error, "Couldn't save the view. Only photos can use the pan effect.");
  revalidateProduct(await productSlug(productId));
  return { status: "saved" };
}

export async function deleteMedia(productId: string, mediaId: string): Promise<ActionState> {
  await requireStaff(EDITORS);
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("product_media")
    .select("id, type, storage_path, mux_asset_id")
    .eq("id", mediaId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!media) return { status: "error", message: "That item is already gone" };

  const { error } = await supabase.from("product_media").delete().eq("id", mediaId);
  if (error) return explain(error);
  if (media.storage_path) {
    // Several gallery views (full, pan, close-up) can share one file: keep it while any view uses it.
    const { count: stillUsed } = await supabase
      .from("product_media")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", media.storage_path);
    if (!stillUsed) await supabase.storage.from("product-media").remove([media.storage_path]);
  }
  if (media.mux_asset_id) {
    // Best effort: the row is gone either way.
    await getMux()
      ?.video.assets.delete(media.mux_asset_id)
      .catch(() => undefined);
  }

  revalidateProduct(await productSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "saved" };
}

export async function reorderMedia(productId: string, ids: string[]): Promise<ActionState> {
  await requireStaff(EDITORS);
  if (!z.array(uuid).safeParse(ids).success) return { status: "error", message: "Couldn't reorder" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reorder_media", { p_product_id: productId, p_ids: ids });
  if (error) return explain(error, "Couldn't reorder. Reload and try again.");
  revalidateProduct(await productSlug(productId));
  return { status: "saved" };
}

/**
 * Start a Mux direct upload. The browser then PUTs the file straight to Mux;
 * the webhook (app/api/mux/webhook) marks the row ready with its playback id.
 */
export async function createVideoUpload(
  productId: string,
  alt: string,
): Promise<{ status: "ok"; uploadUrl: string } | { status: "error"; message: string }> {
  await requireStaff(EDITORS);
  const mux = getMux();
  if (!mux) return { status: "error", message: "Video upload needs Mux keys" };
  const description = alt.trim();
  if (!description) return { status: "error", message: "Describe the video (alt text) before uploading" };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("product_media")
    .select("sort")
    .eq("product_id", productId)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: row, error } = await supabase
    .from("product_media")
    .insert({
      product_id: productId,
      type: "video",
      status: "processing",
      alt: description,
      sort: (last?.sort ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !row)
    return { status: "error", message: explain(error).message ?? "Couldn't start the upload" };

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: publicEnv.NEXT_PUBLIC_SITE_URL,
      new_asset_settings: { playback_policies: ["public"], passthrough: row.id },
    });
    if (!upload.url) throw new Error("Mux returned no upload URL");
    await supabase.from("product_media").update({ mux_upload_id: upload.id }).eq("id", row.id);
    revalidatePath(`/admin/products/${productId}`);
    return { status: "ok", uploadUrl: upload.url };
  } catch {
    await supabase.from("product_media").delete().eq("id", row.id);
    return { status: "error", message: "Mux didn't accept the upload. Check the Mux keys and try again." };
  }
}

/** Reload helper for client components after a direct upload finishes. */
export async function refreshProduct(productId: string): Promise<AdminProduct | null> {
  await requireStaff(EDITORS);
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_product", { p_id: productId });
  return (data as AdminProduct | null) ?? null;
}

// ---------------------------------------------------------------------------
// Delete a product (owner/manager). Its variants, prices, size chart, media
// rows and drop links go with it (FK cascade); orders keep their snapshot.
// The products_audit trigger records who deleted it (ADM-7).
// ---------------------------------------------------------------------------
export async function deleteProduct(productId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  if (!uuid.safeParse(productId).success) return { status: "error", message: "Unknown product" };

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, slug, name")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { status: "error", message: "That product is already gone" };
  if (String(form.get("confirm") ?? "").trim() !== product.name) {
    return { status: "error", message: `Type the product name exactly (${product.name}) to confirm` };
  }

  // Never delete stock that a shopper is paying for right now (rule 4).
  const { count: openHolds } = await supabase
    .from("stock_reservations")
    .select("id, variants!inner(product_id)", { count: "exact", head: true })
    .eq("variants.product_id", productId)
    .is("released_at", null)
    .gt("expires_at", new Date().toISOString());
  if ((openHolds ?? 0) > 0) {
    return {
      status: "error",
      message: "A shopper is checking out with this product. Try again in 15 minutes.",
    };
  }

  const { data: media } = await supabase
    .from("product_media")
    .select("storage_path, mux_asset_id")
    .eq("product_id", productId);

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return explain(error, "Couldn't delete the product. Try again.");

  // Files are removed after the row, so a failed delete never leaves a product without photos.
  const paths = (media ?? []).map((m) => m.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length) await supabase.storage.from("product-media").remove(paths);
  const mux = getMux();
  for (const m of media ?? []) {
    if (m.mux_asset_id) await mux?.video.assets.delete(m.mux_asset_id).catch(() => undefined);
  }

  revalidateProduct(product.slug);
  redirect("/admin/products?deleted=1");
}
