import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { isCurrency } from "@/lib/money";
import type { PaymentProvider, VerifiedPaymentEvent } from "./types";

const API = "https://api.paystack.co";

const webhookSchema = z.object({
  event: z.string(),
  data: z.object({
    reference: z.string().min(1),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
  }),
});

const initializeSchema = z.object({
  status: z.literal(true),
  data: z.object({ authorization_url: z.string().url() }),
});

/** Paystack signs the raw body with HMAC SHA512 using the secret key. */
export function paystackSignature(rawBody: string, secretKey: string): string {
  return createHmac("sha512", secretKey).update(rawBody).digest("hex");
}

export function createPaystackProvider(secretKey: string): PaymentProvider {
  return {
    name: "paystack",

    async initialize(input) {
      const res = await fetch(`${API}/transaction/initialize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email,
          amount: input.amountMinor, // already minor units (kobo / pence / cents)
          currency: input.currency,
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        }),
      });
      const parsed = initializeSchema.safeParse(await res.json().catch(() => null));
      if (!res.ok || !parsed.success) throw new Error(`Paystack initialize failed (${res.status})`);
      return { redirectUrl: parsed.data.data.authorization_url };
    },

    verifyWebhook(rawBody, signature) {
      if (!signature) return null;
      const expected = Buffer.from(paystackSignature(rawBody, secretKey), "hex");
      const given = Buffer.from(signature, "hex");
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        return null;
      }
      const parsed = webhookSchema.safeParse(json);
      if (!parsed.success || !isCurrency(parsed.data.data.currency)) return null;

      const event: VerifiedPaymentEvent = {
        eventType: parsed.data.event,
        providerRef: parsed.data.data.reference,
        amountMinor: parsed.data.data.amount,
        currency: parsed.data.data.currency,
        succeeded: parsed.data.event === "charge.success",
        payload: json,
      };
      return event;
    },
  };
}
