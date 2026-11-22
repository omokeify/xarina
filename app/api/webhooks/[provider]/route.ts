import { NextResponse } from "next/server";
import { z } from "zod";
import { reportPaidOrder } from "@/lib/analytics/server";
import { OrderConfirmation } from "@/emails/order-confirmation";
import { loadOrderForEmail } from "@/lib/checkout/db";
import { createServiceClient } from "@/lib/checkout/service-client";
import { sendEmail } from "@/lib/email/client";
import { getEmailSite } from "@/lib/email/site";
import type { Currency } from "@/lib/money";
import { getProviderByName } from "@/lib/payments";
import { handlePaymentWebhook, type WebhookDb } from "@/lib/payments/handle-webhook";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const markPaidResult = z.enum(["paid", "already_paid", "duplicate", "unknown_order", "mismatch", "no_stock"]);

function serviceDb(): WebhookDb {
  const db = createServiceClient();
  return {
    async markOrderPaid(provider, event) {
      const { data, error } = await db.rpc("mark_order_paid", {
        p_provider: provider,
        p_provider_ref: event.providerRef,
        p_event_type: event.eventType,
        p_amount_minor: event.amountMinor,
        p_currency: event.currency,
        p_payload: event.payload,
      });
      if (error) throw new Error(error.message);
      return markPaidResult.parse(data);
    },
    async recordInvalidEvent(provider, rawBody) {
      // A bad-signature flood must not fill the audit table. Genuine paid
      // events never reach this path.
      if (await isRateLimited("webhookInvalid")) return;
      const { error } = await db.from("payment_events").insert({
        provider,
        provider_ref: "invalid",
        event_type: "invalid_signature",
        payload: { raw: rawBody.slice(0, 10_000) },
        signature_valid: false,
      });
      if (error) console.error("invalid payment webhook audit failed", error.message);
    },
  };
}

// The signature is checked over the exact bytes received, so read the raw text.
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: name } = await params;
  const provider = getProviderByName(name);
  if (!provider) return NextResponse.json({ error: "unknown_provider" }, { status: 404 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  try {
    const outcome = await handlePaymentWebhook(provider, rawBody, signature, serviceDb(), async (event) => {
      // PAY-6. Runs once, on the "paid" result only. The order is already paid and
      // committed, so an email problem is logged and never fails the webhook.
      try {
        const order = await loadOrderForEmail(event.providerRef);
        const a = order.shipping_address;
        const result = await sendEmail({
          to: order.email,
          subject: `Your Xarina order ${order.number}`,
          react: OrderConfirmation({
            site: getEmailSite(),
            orderNumber: order.number,
            currency: order.currency as Currency,
            items: order.order_items.map((i) => ({
              name: i.product_name,
              colour: i.colour,
              size: i.size,
              qty: i.qty,
              unitPriceMinor: i.unit_price_minor,
            })),
            subtotalMinor: order.subtotal_minor,
            shippingMinor: order.shipping_minor,
            totalMinor: order.total_minor,
            deliverTo: [a?.name, a?.line1, a?.line2, a?.city, a?.region, a?.postcode, a?.country]
              .filter(Boolean)
              .join(", "),
          }),
        });
        if (result.status === "failed") console.error("order confirmation email failed", result.error);
      } catch (error) {
        console.error("order confirmation email failed", error);
      }

      // Rule 10: this is the only place a Purchase is reported. A broken
      // tracking destination is logged and never fails a paid webhook.
      try {
        await reportPaidOrder(event.providerRef);
      } catch (error) {
        console.error("paid order tracking failed", error);
      }
    });
    return NextResponse.json({ result: outcome.result }, { status: outcome.status });
  } catch (error) {
    console.error("payment webhook failed", error);
    // 500 makes the provider retry; mark_order_paid is idempotent so a retry is safe.
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
