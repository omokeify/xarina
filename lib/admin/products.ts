// Shared types and helpers for the admin product editor (ADM-2, ADM-3).
// Pure module: safe to import from client components and unit tests.

import type { Currency } from "@/lib/money";

export type MediaStatus = "processing" | "ready" | "errored";

export type AdminVariant = {
  id: string;
  colour: string;
  colour_hex: string | null;
  size: string;
  sku: string;
  sort: number;
  stock_on_hand: number;
  reserved_public_qty: number;
  sellable: number;
};

export type AdminPrice = { variant_id: string | null; currency: Currency; amount_minor: number };

export type AdminMedia = {
  id: string;
  type: "image" | "video";
  storage_path: string | null;
  mux_playback_id: string | null;
  alt: string;
  sort: number;
  status: MediaStatus;
  /** Gallery caption, e.g. "Full silhouette". */
  label: string;
  /** CSS object-position, e.g. "50% 56%". */
  focus: string | null;
  zoom: number;
  /** "pan" shows a still image as a slow movement view. */
  effect: "none" | "pan";
  duration_sec: number | null;
};

export const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const FOCUS_PATTERN = /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;

export type AdminMeasurement = {
  size: string;
  bust_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  length_cm: number | null;
  sort: number;
};

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  fabric: string;
  care: string;
  fit_notes: string;
  delivery_timing: string;
  status: "draft" | "published";
  pricing_mode: "fixed" | "fx";
  /** FX pricing only: the price in its base currency (minor units); null when fixed. */
  base_currency: "NGN" | "GBP" | "USD" | null;
  base_amount_minor: number | null;
  collection_id: string | null;
  published_at: string | null;
  updated_at: string;
};

/** Shape returned by public.admin_product(). */
export type AdminProduct = {
  product: AdminProductRow;
  variants: AdminVariant[];
  prices: AdminPrice[];
  media: AdminMedia[];
  measurements: AdminMeasurement[];
  drops: { id: string; name: string; state: string }[];
  can: { publish: boolean; change_prices: boolean; change_stock: boolean };
};

/** URL-safe slug: lowercase ASCII letters, digits and single hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** SKU for a generated variant, e.g. ("Sunset Dress", "Black", "M") → "SUNSET-DRESS-BLA-M". */
export function suggestSku(productSlug: string, colour: string, size: string): string {
  const part = (s: string) =>
    s
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return [part(productSlug), part(colour).slice(0, 3), part(size)].filter(Boolean).join("-");
}

/** Split "Black, Ivory ,  Red" into ["Black", "Ivory", "Red"], dropping blanks and repeats. */
export function splitList(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const v = raw.trim();
    const key = v.toLowerCase();
    if (v && !seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
