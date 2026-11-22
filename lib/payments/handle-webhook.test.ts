import { describe, expect, it, vi } from "vitest";
import { handlePaymentWebhook, type WebhookDb } from "./handle-webhook";
import { createPaystackProvider, paystackSignature } from "./paystack";

const SECRET = "sk_test_secret";
const provider = createPaystackProvider(SECRET);
const body = JSON.stringify({
  event: "charge.success",
  data: { reference: "XA-1001-abc", amount: 500, currency: "NGN" },
});

function fakeDb(result: Awaited<ReturnType<WebhookDb["markOrderPaid"]>> = "paid") {
  return {
    markOrderPaid: vi.fn().mockResolvedValue(result),
    recordInvalidEvent: vi.fn().mockResolvedValue(undefined),
  } satisfies WebhookDb;
}

describe("handlePaymentWebhook (PAY-5, rule 2)", () => {
  it("never marks paid on a bad signature, and keeps the delivery for audit", async () => {
    const db = fakeDb();
    const out = await handlePaymentWebhook(provider, body, "deadbeef", db);
    expect(out.status).toBe(401);
    expect(db.markOrderPaid).not.toHaveBeenCalled();
    expect(db.recordInvalidEvent).toHaveBeenCalledWith("paystack", body);
  });

  it("marks paid on a verified success and runs the paid hook once", async () => {
    const db = fakeDb("paid");
    const onPaid = vi.fn().mockResolvedValue(undefined);
    const out = await handlePaymentWebhook(provider, body, paystackSignature(body, SECRET), db, onPaid);
    expect(out).toEqual({ status: 200, result: "paid" });
    expect(db.markOrderPaid).toHaveBeenCalledWith(
      "paystack",
      expect.objectContaining({ providerRef: "XA-1001-abc", amountMinor: 500, currency: "NGN" }),
    );
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it("a replayed webhook acknowledges without side effects (rule 3)", async () => {
    const onPaid = vi.fn();
    const out = await handlePaymentWebhook(
      provider,
      body,
      paystackSignature(body, SECRET),
      fakeDb("duplicate"),
      onPaid,
    );
    expect(out).toEqual({ status: 200, result: "duplicate" });
    expect(onPaid).not.toHaveBeenCalled();
  });

  it("an amount mismatch is acknowledged but triggers nothing", async () => {
    const onPaid = vi.fn();
    const out = await handlePaymentWebhook(
      provider,
      body,
      paystackSignature(body, SECRET),
      fakeDb("mismatch"),
      onPaid,
    );
    expect(out.result).toBe("mismatch");
    expect(onPaid).not.toHaveBeenCalled();
  });

  it("ignores non-success events", async () => {
    const failed = JSON.stringify({
      event: "charge.failed",
      data: { reference: "r", amount: 1, currency: "NGN" },
    });
    const db = fakeDb();
    const out = await handlePaymentWebhook(provider, failed, paystackSignature(failed, SECRET), db);
    expect(out).toEqual({ status: 200, result: "ignored" });
    expect(db.markOrderPaid).not.toHaveBeenCalled();
  });
});
