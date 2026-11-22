import "server-only";
import { z } from "zod";
import { PostHog } from "posthog-node";
import { createServiceClient } from "@/lib/admin/service-client";
import { EVENTS } from "./events";
import { sendMetaPurchase, type PaidOrder } from "./meta";

const paidOrderRow = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().nullable(),
  currency: z.enum(["NGN", "GBP", "USD"]),
  total_minor: z.coerce.number(),
  utm: z.record(z.string(), z.unknown()).nullable(),
});

async function loadPaidOrder(providerRef: string): Promise<PaidOrder> {
  const { data, error } = await createServiceClient()
    .from("orders")
    .select("id, email, phone, currency, total_minor, utm")
    .eq("provider_ref", providerRef)
    .single();
  if (error) throw new Error(error.message);
  return paidOrderRow.parse(data);
}

/**
 * Rule 10: analytics Purchase is reported only from the verified, paid webhook.
 * The order ID is the event_id on Meta, so a retry or a browser redirect can
 * never create a second sale. No-op when no tracking keys are configured.
 */
export async function reportPaidOrder(providerRef: string): Promise<void> {
  const order = await loadPaidOrder(providerRef);
  const jobs: Promise<unknown>[] = [sendMetaPurchase(order)];

  const key = process.env.POSTHOG_PROJECT_KEY;
  if (key) {
    const posthog = new PostHog(key, { host: process.env.POSTHOG_HOST || "https://us.i.posthog.com" });
    posthog.capture({
      distinctId: order.email,
      event: EVENTS.purchase,
      properties: {
        event_id: order.id,
        order_id: order.id,
        revenue: order.total_minor / 100,
        currency: order.currency,
        ...(order.utm ?? {}),
      },
    });
    jobs.push(posthog.shutdown(5000));
  }

  await Promise.all(jobs);
}
