import { createHash } from "node:crypto";
import type { Currency } from "@/lib/money";

/** The order snapshot needed for a Meta Purchase event. */
export type PaidOrder = {
  id: string;
  email: string;
  phone: string | null;
  currency: Currency;
  total_minor: number;
  utm: Record<string, unknown> | null;
};

export type MetaPurchaseEvent = {
  event_name: "Purchase";
  event_time: number;
  /** Rule 10: the order ID is the single event_id Meta uses to de-duplicate. */
  event_id: string;
  action_source: "website";
  user_data: { em: string[]; ph?: string[] };
  custom_data: Record<string, unknown>;
  event_source_url?: string;
};

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Meta expects digits only, without separators or a leading plus. */
function normalisePhone(phone: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length > 0 ? digits : null;
}

export function metaPurchasePayload(order: PaidOrder, nowMs = Date.now()): MetaPurchaseEvent {
  const user_data: MetaPurchaseEvent["user_data"] = {
    em: [hash(order.email.trim().toLowerCase())],
  };
  const phone = normalisePhone(order.phone);
  if (phone) user_data.ph = [hash(phone)];

  const custom_data: Record<string, unknown> = {
    // Analytics boundary only: storage and payment always use integer minor units.
    value: order.total_minor / 100,
    currency: order.currency,
  };
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const value = order.utm?.[key];
    if (typeof value === "string") custom_data[key] = value;
  }

  return {
    event_name: "Purchase",
    event_time: Math.floor(nowMs / 1000),
    event_id: order.id,
    action_source: "website",
    user_data,
    custom_data,
  };
}

/** No-op without keys, so local development never calls Meta. */
export async function sendMetaPurchase(order: PaidOrder): Promise<"sent" | "skipped"> {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !/^\d+$/.test(pixelId) || !token) return "skipped";

  const version = process.env.META_GRAPH_API_VERSION || "v27.0";
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const event = metaPurchasePayload(order);
  if (site) event.event_source_url = `${site.replace(/\/$/, "")}/checkout/confirmation`;
  const body = { data: [event], access_token: token };

  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${pixelId}/events`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) {
    throw new Error(`Meta CAPI failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
  }
  return "sent";
}
