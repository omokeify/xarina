import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { DropState, ProductListing } from "@/lib/catalogue";

export type FeaturedDrop = {
  id: string;
  name: string;
  pitch: string;
  state: DropState;
  vip_opens_at: string;
  public_opens_at: string;
  products: ProductListing[];
};

/**
 * HOME-1/4: the drop chosen in admin (site_settings.hero.featured_drop_id),
 * else the next drop that hasn't opened to the public yet. Closed drops are
 * never featured.
 */
export async function getFeaturedDrop(
  featuredId: string | null,
  products: ProductListing[],
): Promise<FeaturedDrop | null> {
  const candidates = [
    featuredId,
    products
      .filter((p) => p.drop_id && p.public_opens_at)
      .sort((a, b) => Date.parse(a.public_opens_at!) - Date.parse(b.public_opens_at!))[0]?.drop_id ?? null,
  ].filter((id): id is string => Boolean(id));

  const supabase = createPublicClient();
  for (const id of candidates) {
    const [{ data: drop }, { data: state }] = await Promise.all([
      supabase.from("drops").select("id, name, pitch, vip_opens_at, public_opens_at").eq("id", id).maybeSingle(),
      supabase.rpc("drop_state", { p_drop_id: id }),
    ]);
    if (!drop || !state || state === "closed") continue;
    return { ...drop, state: state as DropState, products: products.filter((p) => p.drop_id === id) };
  }
  return null;
}
