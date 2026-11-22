import { z } from "zod";

// Shapes returned by public.admin_customers, admin_customer and
// admin_customers_export. Parsed at the boundary because the RPCs return jsonb.

export const customerList = z.object({
  total: z.number(),
  rows: z.array(
    z.object({
      id: z.string().uuid(),
      email: z.string(),
      name: z.string().nullable(),
      phone: z.string().nullable(),
      is_vip: z.boolean(),
      created_at: z.string(),
      paid_orders: z.number(),
      // Waitlist sign-ups are interest, never orders or sales (rule 9).
      interest_count: z.number(),
    }),
  ),
});

const consent = z.object({ given: z.boolean(), at: z.string().nullable(), source: z.string().nullable() });

export const customerRecord = z.object({
  customer: z.object({
    id: z.string().uuid(),
    email: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    country: z.string().nullable(),
    created_at: z.string(),
    is_vip: z.boolean(),
    vip_approved_at: z.string().nullable(),
    prive_requested_at: z.string().nullable(),
    all_drops_alerts: z.boolean(),
  }),
  consents: z.object({ marketing: consent, drop_alerts: consent }),
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      number: z.string(),
      status: z.string(),
      channel: z.string(),
      currency: z.enum(["NGN", "GBP", "USD"]),
      total_minor: z.number(),
      paid_at: z.string(),
    }),
  ),
  waitlist: z.array(
    z.object({
      product_id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      colour: z.string().nullable(),
      size: z.string().nullable(),
      joined_at: z.string(),
    }),
  ),
});

export const customerExport = z.array(
  z.object({
    email: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    country: z.string().nullable(),
    is_vip: z.boolean(),
    marketing_consent: z.boolean(),
    marketing_consent_at: z.string().nullable(),
    drop_alert_consent: z.boolean(),
    drop_alert_consent_at: z.string().nullable(),
    paid_orders: z.number(),
    interest_count: z.number(),
    created_at: z.string(),
  }),
);
