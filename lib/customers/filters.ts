import { z } from "zod";

// Search and filters for the customer list (CRM-2), read from the page URL so a
// filtered view can be bookmarked and exported exactly as shown.
export const PAGE_SIZE = 50;

const yesNo = z
  .enum(["yes", "no"])
  .optional()
  .catch(undefined)
  .transform((v) => (v === undefined ? null : v === "yes"));

const schema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  prive: yesNo,
  design: z.string().uuid().optional().catch(undefined),
  purchased: yesNo,
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type CustomerFilters = {
  q: string;
  /** true = Privé members, false = not, null = any. */
  prive: boolean | null;
  design: string | null;
  /** true = has a paid order, false = none, null = any. */
  purchased: boolean | null;
  page: number;
};

/** Unknown or malformed values are ignored rather than failing the page. */
export function parseFilters(params: Record<string, string | string[] | undefined>): CustomerFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const parsed = schema.parse({
    q: first(params.q),
    prive: first(params.prive),
    design: first(params.design),
    purchased: first(params.purchased),
    page: first(params.page),
  });
  return {
    q: parsed.q ?? "",
    prive: parsed.prive,
    design: parsed.design ?? null,
    purchased: parsed.purchased,
    page: parsed.page,
  };
}

/** Arguments for public.admin_customers / admin_customers_export. */
export function toRpcArgs(f: CustomerFilters) {
  return {
    p_search: f.q || undefined,
    p_vip: f.prive ?? undefined,
    p_product_id: f.design ?? undefined,
    p_purchased: f.purchased ?? undefined,
  };
}

/** Query string for the current filters (page left out), for links and the export. */
export function toQuery(f: Partial<CustomerFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.prive != null) p.set("prive", f.prive ? "yes" : "no");
  if (f.design) p.set("design", f.design);
  if (f.purchased != null) p.set("purchased", f.purchased ? "yes" : "no");
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p.toString();
}
