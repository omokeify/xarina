import "server-only";
import { z } from "zod";
import { isCurrency, type Currency } from "@/lib/money";
import { createServiceClient } from "./service-client";
import type { CartLine } from "./cart-lines";
import type { CheckoutDb } from "./start-checkout";

const orderRow = z.object({
  id: z.string(),
  number: z.string(),
  total_minor: z.number(),
  currency: z.string().refine(isCurrency),
  email: z.string(),
});

/** Checkout operations backed by the SECURITY DEFINER functions (service role only). */
export function createCheckoutDb(): CheckoutDb {
  const db = createServiceClient();
  return {
    async createCheckout(input) {
      const { data, error } = await db.rpc("create_checkout", {
        p_items: input.items.map((i) => ({ variant_id: i.variantId, qty: i.qty })),
        p_currency: input.currency,
        p_email: input.email,
        p_phone: input.phone,
        p_address: input.address,
        p_shipping_rate_id: input.shippingRateId,
        p_prive_customer_id: input.priveCustomerId,
        p_utm: input.utm,
      });
      // error.message is the stable code raised by the function, e.g. "out_of_stock".
      if (error) throw new Error(error.message);
      return z.string().parse(data);
    },
    async getOrder(orderId) {
      const { data, error } = await db
        .from("orders")
        .select("id, number, total_minor, currency, email")
        .eq("id", orderId)
        .single();
      if (error) throw new Error(error.message);
      const row = orderRow.parse(data);
      return {
        id: row.id,
        number: row.number,
        totalMinor: row.total_minor,
        currency: row.currency as Currency,
        email: row.email,
      };
    },
    async attachPaymentRef(orderId, provider, reference) {
      const { error } = await db.rpc("attach_payment_ref", {
        p_order_id: orderId,
        p_provider: provider,
        p_provider_ref: reference,
      });
      if (error) throw new Error(error.message);
    },
    async releaseOrder(orderId) {
      await db.rpc("release_order", { p_order_id: orderId });
    },
  };
}

/** Add-to-cart gate (DROP-3). Throws Error(code) when the item can't be bought now. */
export async function assertCanAddToCart(variantId: string, qty: number, priveCustomerId: string | null) {
  const { error } = await createServiceClient().rpc("check_add_to_cart", {
    p_variant_id: variantId,
    p_qty: qty,
    p_prive_customer_id: priveCustomerId,
  });
  if (error) throw new Error(error.message);
}

export type CartDetail = {
  variantId: string;
  qty: number;
  productName: string;
  productSlug: string;
  colour: string;
  size: string;
  /** First product image in the media bucket, or null while photography is missing. */
  imagePath: string | null;
  /** Null when no price is set in this currency: the line can't be bought. */
  unitPriceMinor: number | null;
};

const mediaRows = z
  .array(z.object({ type: z.string(), storage_path: z.string().nullable(), sort: z.number() }))
  .default([]);

type MediaRow = z.infer<typeof mediaRows>[number];

/** The cover: first image by sort order. */
function firstImagePath(media: MediaRow[]): string | null {
  return (
    [...media].filter((m) => m.type === "image" && m.storage_path).sort((a, b) => a.sort - b.sort)[0]
      ?.storage_path ?? null
  );
}

const variantRow = z.object({
  id: z.string(),
  colour: z.string(),
  size: z.string(),
  products: z.object({
    name: z.string(),
    slug: z.string(),
    status: z.string(),
    product_media: mediaRows,
  }),
});

/** Names and prices for display. Priced by the database, never from the cookie. */
export async function loadCartDetails(lines: CartLine[], currency: Currency): Promise<CartDetail[]> {
  if (lines.length === 0) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("variants")
    .select("id, colour, size, products!inner(name, slug, status, product_media(type, storage_path, sort))")
    .in(
      "id",
      lines.map((l) => l.variantId),
    );
  if (error) throw new Error(error.message);
  const rows = z
    .array(variantRow)
    .parse(data)
    .filter((r) => r.products.status === "published");

  return Promise.all(
    lines.flatMap((line) => {
      const row = rows.find((r) => r.id === line.variantId);
      if (!row) return [];
      return [
        (async (): Promise<CartDetail> => {
          const { data: price } = await db.rpc("variant_price_minor", {
            p_variant_id: line.variantId,
            p_currency: currency,
          });
          return {
            variantId: line.variantId,
            qty: line.qty,
            productName: row.products.name,
            productSlug: row.products.slug,
            colour: row.colour,
            size: row.size,
            imagePath: firstImagePath(row.products.product_media),
            unitPriceMinor: typeof price === "number" ? price : null,
          };
        })(),
      ];
    }),
  );
}

export type ShippingOption = {
  id: string;
  name: string;
  zoneName: string;
  countries: string[];
  amountMinor: number;
  etaText: string;
};

const rateRow = z.object({
  id: z.string(),
  name: z.string(),
  amount_minor: z.number(),
  eta_text: z.string(),
  shipping_zones: z.object({ name: z.string(), countries: z.array(z.string()) }),
});

/** PAY-3: delivery options and charges for a currency, from the rate table. */
export async function loadShippingOptions(currency: Currency): Promise<ShippingOption[]> {
  const { data, error } = await createServiceClient()
    .from("shipping_rates")
    .select("id, name, amount_minor, eta_text, shipping_zones!inner(name, countries)")
    .eq("currency", currency)
    .eq("active", true)
    .order("sort");
  if (error) throw new Error(error.message);
  return z
    .array(rateRow)
    .parse(data)
    .map((r) => ({
      id: r.id,
      name: r.name,
      zoneName: r.shipping_zones.name,
      countries: r.shipping_zones.countries,
      amountMinor: r.amount_minor,
      etaText: r.eta_text,
    }));
}

const orderPageRow = z.object({
  number: z.string(),
  status: z.string(),
  email: z.string(),
  currency: z.string().refine(isCurrency),
  subtotal_minor: z.number(),
  shipping_minor: z.number(),
  total_minor: z.number(),
  shipping_address: z.record(z.string(), z.unknown()).nullable(),
  order_items: z.array(
    z.object({
      variant_id: z.string().nullable(),
      product_name: z.string(),
      colour: z.string(),
      size: z.string(),
      sku: z.string(),
      qty: z.number(),
      unit_price_minor: z.number(),
    }),
  ),
});

const variantCoverRow = z.object({
  id: z.string(),
  products: z.object({ product_media: mediaRows }),
});

/**
 * Order details by provider reference, for the confirmation page. The reference is
 * unguessable. Items come from the order snapshot, with a cover image looked up
 * best-effort (a deleted variant simply shows no image).
 */
export async function loadOrderByReference(reference: string) {
  const db = createServiceClient();
  const { data } = await db
    .from("orders")
    .select(
      "number, status, email, currency, subtotal_minor, shipping_minor, total_minor, shipping_address, order_items(variant_id, product_name, colour, size, sku, qty, unit_price_minor)",
    )
    .eq("provider_ref", reference)
    .maybeSingle();
  if (!data) return null;
  const order = orderPageRow.parse(data);

  const variantIds = order.order_items.flatMap((i) => (i.variant_id ? [i.variant_id] : []));
  const covers = new Map<string, string | null>();
  if (variantIds.length > 0) {
    const { data: rows } = await db
      .from("variants")
      .select("id, products!inner(product_media(type, storage_path, sort))")
      .in("id", variantIds);
    for (const row of z.array(variantCoverRow).parse(rows ?? [])) {
      covers.set(row.id, firstImagePath(row.products.product_media));
    }
  }

  const a = order.shipping_address ?? {};
  const text = (key: string) => (typeof a[key] === "string" ? (a[key] as string) : "");
  return {
    number: order.number,
    status: order.status,
    email: order.email,
    currency: order.currency as Currency,
    subtotalMinor: order.subtotal_minor,
    shippingMinor: order.shipping_minor,
    totalMinor: order.total_minor,
    deliverTo: {
      name: text("name"),
      lines: [
        text("line1"),
        text("line2"),
        [text("city"), text("postcode")].filter(Boolean).join(" "),
        text("country"),
      ].filter(Boolean),
    },
    items: order.order_items.map((i) => ({
      productName: i.product_name,
      colour: i.colour,
      size: i.size,
      sku: i.sku,
      qty: i.qty,
      unitPriceMinor: i.unit_price_minor,
      imagePath: i.variant_id ? (covers.get(i.variant_id) ?? null) : null,
    })),
  };
}

const emailOrderRow = z.object({
  number: z.string(),
  email: z.string(),
  currency: z.string().refine(isCurrency),
  subtotal_minor: z.number(),
  shipping_minor: z.number(),
  total_minor: z.number(),
  shipping_address: z
    .object({
      name: z.string().optional(),
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
    })
    .nullable(),
  order_items: z.array(
    z.object({
      product_name: z.string(),
      colour: z.string(),
      size: z.string(),
      qty: z.number(),
      unit_price_minor: z.number(),
    }),
  ),
});

/** Everything the confirmation email needs, from the order snapshot (PAY-6). */
export async function loadOrderForEmail(providerRef: string) {
  const { data, error } = await createServiceClient()
    .from("orders")
    .select(
      "number, email, currency, subtotal_minor, shipping_minor, total_minor, shipping_address, order_items(product_name, colour, size, qty, unit_price_minor)",
    )
    .eq("provider_ref", providerRef)
    .single();
  if (error) throw new Error(error.message);
  return emailOrderRow.parse(data);
}
