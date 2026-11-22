import { z } from "zod";

// Shapes returned by public.admin_drops() and public.admin_drop(). Parsed at the
// boundary because the RPCs return untyped jsonb.
export const DROP_STATES = ["upcoming", "vip", "public", "closed"] as const;
export type DropState = (typeof DROP_STATES)[number];

export const adminDropRow = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  published: z.boolean(),
  vip_opens_at: z.string(),
  public_opens_at: z.string(),
  closes_at: z.string().nullable(),
  state: z.enum(DROP_STATES),
  product_count: z.number(),
  // WL-5: waitlist demand. Never orders or sales.
  interest_count: z.number(),
});
export const adminDropList = z.array(adminDropRow);

export const adminDropDetail = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  hero_storage_path: z.string().nullable(),
  hero_alt: z.string(),
  name: z.string(),
  pitch: z.string(),
  published: z.boolean(),
  vip_opens_at: z.string(),
  public_opens_at: z.string(),
  closes_at: z.string().nullable(),
  vip_limit_per_member: z.number().nullable(),
  on_close: z.enum(["move_to_available", "hide"]),
  state: z.enum(DROP_STATES),
  products: z.array(
    z.object({
      product_id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      interest_count: z.number(),
    }),
  ),
});
export type AdminDropDetail = z.infer<typeof adminDropDetail>;

export const priveMemberList = z.array(
  z.object({
    id: z.string().uuid(),
    email: z.string(),
    name: z.string().nullable(),
    is_vip: z.boolean(),
    vip_approved_at: z.string().nullable(),
    requested_at: z.string().nullable(),
    drop_alert_consent: z.boolean(),
  }),
);

export const STATE_LABEL: Record<DropState, string> = {
  upcoming: "Upcoming",
  vip: "Privé open",
  public: "Public",
  closed: "Closed",
};
