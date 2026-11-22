import { describe, expect, it } from "vitest";
import { createPaystackProvider, paystackSignature } from "./paystack";

const SECRET = "sk_test_secret";
const provider = createPaystackProvider(SECRET);
const body = JSON.stringify({
  event: "charge.success",
  data: { reference: "XA-1001-abc", amount: 17500000, currency: "NGN" },
});

describe("Paystack webhook verification (PAY-5, rule 2)", () => {
  it("accepts a correctly signed event and reads amount in minor units", () => {
    const event = provider.verifyWebhook(body, paystackSignature(body, SECRET));
    expect(event).toMatchObject({
      providerRef: "XA-1001-abc",
      amountMinor: 17500000,
      currency: "NGN",
      eventType: "charge.success",
      succeeded: true,
    });
  });

  it("rejects a missing signature", () => {
    expect(provider.verifyWebhook(body, null)).toBeNull();
  });

  it("rejects a signature made with another key", () => {
    expect(provider.verifyWebhook(body, paystackSignature(body, "other"))).toBeNull();
  });

  it("rejects a body changed after signing", () => {
    const sig = paystackSignature(body, SECRET);
    expect(provider.verifyWebhook(body.replace("17500000", "100"), sig)).toBeNull();
  });

  it("rejects a malformed signature without throwing", () => {
    expect(provider.verifyWebhook(body, "not-hex")).toBeNull();
  });

  it("does not treat other events as paid", () => {
    const failed = JSON.stringify({
      event: "charge.failed",
      data: { reference: "r", amount: 1, currency: "NGN" },
    });
    expect(provider.verifyWebhook(failed, paystackSignature(failed, SECRET))?.succeeded).toBe(false);
  });
});
