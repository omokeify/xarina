import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { DROP_STATES, listingSchema } from "@/lib/catalogue";

// Drop pages (/drops, /drops/[slug]). Data comes from SECURITY DEFINER read
// functions: published drops only, state from database time (rule 6), no
// stock counts. Fetched per request so state is always fresh (DROP-2).

const hero = z.object({ storage_path: z.string(), alt: z.string().default("") }).nullable();
const state = z.enum(DROP_STATES);

const summary = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  pitch: z.string(),
  state,
  vip_opens_at: z.string(),
  public_opens_at: z.string(),
  closes_at: z.string().nullable(),
  hero,
  design_count: z.number().int(),
  cover_path: z.string().nullable(),
});
export type DropSummary = z.infer<typeof summary>;

const page = z.object({
  drop: summary.omit({ design_count: true, cover_path: true }).extend({
    vip_limit_per_member: z.number().int().nullable(),
    on_close: z.enum(["move_to_available", "hide"]),
  }),
  products: z.array(listingSchema),
  server_now: z.string(),
});
export type DropPage = z.infer<typeof page>;

export type DropLookup =
  { kind: "found"; page: DropPage } | { kind: "redirect"; slug: string } | { kind: "missing" };

/** Every published drop, newest public opening first. Deduped per request. */
export const getDrops = cache(async (): Promise<DropSummary[]> => {
  const { data, error } = await createPublicClient().rpc("storefront_drops");
  if (error) throw error;
  return z.array(summary).parse(data ?? []);
});

export async function getDrop(slug: string): Promise<DropLookup> {
  const { data, error } = await createPublicClient().rpc("storefront_drop", { p_slug: slug });
  if (error) throw error;
  if (!data) return { kind: "missing" };
  const redirect = z.object({ redirect: z.string() }).safeParse(data);
  if (redirect.success) return { kind: "redirect", slug: redirect.data.redirect };
  return { kind: "found", page: page.parse(data) };
}

/** Image for a drop card or hero: the drop's own hero, else its first design's cover. */
export function dropImage(d: Pick<DropSummary, "hero" | "cover_path" | "name">) {
  if (d.hero) return { path: d.hero.storage_path, alt: d.hero.alt || d.name };
  return { path: d.cover_path, alt: d.name };
}
