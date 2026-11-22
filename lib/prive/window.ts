import "server-only";
import { getServerNow, getStorefrontProducts, type ProductListing } from "@/lib/catalogue";
import { createPublicClient } from "@/lib/supabase/public";

export type PriveWindow = {
  dropId: string;
  name: string;
  pitch: string;
  /** "vip" while the Privé window is open, "upcoming" before it. */
  state: "vip" | "upcoming";
  vipOpensAt: string;
  publicOpensAt: string;
  /** VIP-3: per-member limit per design, null when there is none. */
  limitPerMember: number | null;
  products: ProductListing[];
  serverNow: string;
};

/**
 * The drop a Privé member should see: the one whose Privé window is open now,
 * otherwise the next one to open. State comes from the database (rule 6).
 */
export async function getPriveWindow(): Promise<PriveWindow | null> {
  const listing = await getStorefrontProducts();
  const candidates = listing.filter(
    (p): p is ProductListing & { drop_id: string; vip_opens_at: string; public_opens_at: string } =>
      p.drop_id != null &&
      p.vip_opens_at != null &&
      p.public_opens_at != null &&
      (p.drop_state === "vip" || p.drop_state === "upcoming"),
  );
  if (candidates.length === 0) return null;

  const open = candidates.filter((p) => p.drop_state === "vip");
  const pool = open.length > 0 ? open : candidates;
  const first = [...pool].sort((a, b) => Date.parse(a.vip_opens_at) - Date.parse(b.vip_opens_at))[0];

  const [{ data: drop }, serverNow] = await Promise.all([
    createPublicClient()
      .from("drops")
      .select("name, pitch, vip_limit_per_member")
      .eq("id", first.drop_id)
      .maybeSingle(),
    getServerNow(),
  ]);

  return {
    dropId: first.drop_id,
    name: drop?.name ?? first.drop_name ?? "Xarina Privé",
    pitch: drop?.pitch ?? "",
    state: first.drop_state === "vip" ? "vip" : "upcoming",
    vipOpensAt: first.vip_opens_at,
    publicOpensAt: first.public_opens_at,
    limitPerMember: drop?.vip_limit_per_member ?? null,
    products: candidates.filter((p) => p.drop_id === first.drop_id),
    serverNow,
  };
}
