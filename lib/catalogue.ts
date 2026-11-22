import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

// Storefront reads (SHOP, PDP, HOME). Data comes from SECURITY DEFINER
// functions, so raw stock_on_hand and reserved_public_qty never reach the
// browser. By user decision (2026-11-21) the product page shows exact
// purchasable units (variants[].available_qty, the same number checkout
// enforces) for Available Now designs only; for drop designs it is null and
// stock stays hidden. Add-to-cart and payment re-check on the server. Everything is
// fetched per request: drop state and availability must be fresh (DROP-2/3).
// Prices for all currencies are returned; the page shows the shopper's one.

const prices = z.object({
  NGN: z.number().int().nullable().optional(),
  GBP: z.number().int().nullable().optional(),
  USD: z.number().int().nullable().optional(),
});
export type Prices = z.infer<typeof prices>;

export const DROP_STATES = ["upcoming", "vip", "public", "closed"] as const;
const dropState = z.enum(DROP_STATES);
export type DropState = z.infer<typeof dropState>;

const listing = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  collection_slug: z.string().nullable(),
  collection_name: z.string().nullable(),
  cover_path: z.string().nullable(),
  cover_alt: z.string().nullable(),
  prices: prices.nullable(),
  drop_id: z.string().nullable(),
  drop_name: z.string().nullable(),
  drop_state: dropState.nullable(),
  vip_opens_at: z.string().nullable(),
  public_opens_at: z.string().nullable(),
  sold_out: z.boolean(),
  section: z.enum(["available", "upcoming"]),
  published_at: z.string().nullable(),
});
export type ProductListing = z.infer<typeof listing>;
/** Listing row shape, reused by other storefront reads (drop pages). */
export const listingSchema = listing;

const productDetail = z.object({
  product: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    fabric: z.string(),
    care: z.string(),
    fit_notes: z.string(),
    delivery_timing: z.string(),
    tagline: z.string().default(""),
    pricing_mode: z.enum(["fixed", "fx"]).catch("fixed"),
    collection: z.object({ slug: z.string(), name: z.string() }).nullable(),
  }),
  media: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["image", "video"]),
      storage_path: z.string().nullable(),
      mux_playback_id: z.string().nullable(),
      alt: z.string(),
      // Gallery presentation (migration 0005). Defaults keep older rows valid.
      label: z.string().default(""),
      focus: z.string().nullable().default(null), // CSS object-position, e.g. "50% 30%"
      zoom: z.coerce.number().min(1).max(3).default(1),
      effect: z.enum(["none", "pan"]).catch("none"),
      duration_sec: z.number().int().nullable().default(null),
    }),
  ),
  variants: z.array(
    z.object({
      id: z.string(),
      colour: z.string(),
      colour_hex: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .nullable()
        .catch(null),
      size: z.string(),
      sku: z.string(),
      available: z.boolean(),
      /** Sellable units — Available-now designs only; null for drop designs (stock stays hidden). */
      available_qty: z.number().int().min(0).nullable().default(null),
      prices: prices.nullable(),
    }),
  ),
  measurements: z.array(
    z.object({
      size: z.string(),
      bust_cm: z.number().nullable(),
      waist_cm: z.number().nullable(),
      hip_cm: z.number().nullable(),
      length_cm: z.number().nullable(),
    }),
  ),
  prices: prices.nullable(),
  drop: z
    .object({
      id: z.string(),
      name: z.string(),
      pitch: z.string(),
      state: dropState,
      vip_opens_at: z.string(),
      public_opens_at: z.string(),
      closes_at: z.string().nullable(),
      on_close: z.enum(["move_to_available", "hide"]),
      slug: z.string().optional(),
      vip_limit_per_member: z.number().int().nullable().default(null),
    })
    .nullable(),
  server_now: z.string(),
});
export type ProductDetail = z.infer<typeof productDetail>;

export type ProductLookup =
  { kind: "found"; detail: ProductDetail } | { kind: "redirect"; slug: string } | { kind: "missing" };

/** Deduped per request: the header menu and the page share one query. */
export const getStorefrontProducts = cache(async (): Promise<ProductListing[]> => {
  const { data, error } = await createPublicClient().rpc("storefront_products");
  if (error) throw error;
  return z.array(listing).parse(data ?? []);
});

export async function getProduct(slug: string): Promise<ProductLookup> {
  const { data, error } = await createPublicClient().rpc("storefront_product", { p_slug: slug });
  if (error) throw error;
  if (!data) return { kind: "missing" };
  const redirect = z.object({ redirect: z.string() }).safeParse(data);
  if (redirect.success) return { kind: "redirect", slug: redirect.data.redirect };
  return { kind: "found", detail: productDetail.parse(data) };
}

export async function getServerNow(): Promise<string> {
  const { data, error } = await createPublicClient().rpc("server_now");
  if (error) throw error;
  return z.string().parse(data);
}

export const getCollections = cache(async () => {
  const { data, error } = await createPublicClient().from("collections").select("slug, name").order("sort");
  if (error) throw error;
  return data;
});
