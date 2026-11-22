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
    phone: z.string().nullable(),
    is_vip: z.boolean(),
    vip_approved_at: z.string().nullable(),
    vip_approved_by: z.string().uuid().nullable(),
    approved_by_name: z.string().nullable(),
    requested_at: z.string().nullable(),
    drop_alert_consent: z.boolean(),
  }),
);

/** Access links issued to members, with the joined drop and staff names. */
export const priveAccessLinkList = z.array(
  z.object({
    id: z.string().uuid(),
    customer_id: z.string().uuid(),
    drop_id: z.string().uuid().nullable(),
    drop: z.object({ name: z.string() }).nullable(),
    created_at: z.string(),
    expires_at: z.string(),
    used_at: z.string().nullable(),
    revoked_at: z.string().nullable(),
    created_by: z.string().uuid().nullable(),
    staff: z.object({ name: z.string() }).nullable(),
  }),
);

export const STATE_LABEL: Record<DropState, string> = {
  upcoming: "Upcoming",
  vip: "Privé open",
  public: "Public",
  closed: "Closed",
};
