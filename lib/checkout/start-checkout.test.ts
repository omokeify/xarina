import { describe, expect, it, vi } from "vitest";
import { startCheckout, type CheckoutDb, type CheckoutInput } from "./start-checkout";
import type { PaymentProvider } from "@/lib/payments/types";

const input: CheckoutInput = {
  items: [{ variantId: "11111111-1111-4111-8111-111111111111", qty: 1 }],
  currency: "NGN",
  email: "a@b.test",
  phone: "+234",
  address: { name: "A", line1: "1 Road", city: "Lagos", country: "NG" },
  shippingRateId: "22222222-2222-4222-8222-222222222222",
  priveCustomerId: null,
  utm: null,
};

function setup(initialize: PaymentProvider["initialize"]) {
  const calls: string[] = [];
  const db: CheckoutDb = {
    createCheckout: vi.fn(async () => (calls.push("create"), "order-1")),
    getOrder: vi.fn(async () => ({
      id: "order-1",
      number: "XA1001",
      totalMinor: 17500000,
      currency: "NGN" as const,
      email: "a@b.test",
    })),
    attachPaymentRef: vi.fn(async () => void calls.push("attach")),
    releaseOrder: vi.fn(async () => void calls.push("release")),
  };
  const provider: PaymentProvider = {
    name: "paystack",
    initialize: vi.fn(async (i) => (calls.push("initialize"), initialize(i))),
    verifyWebhook: () => null,
  };
  return { db, provider, calls };
}

describe("startCheckout (PAY-2, PAY-4)", () => {
  it("charges the database total, and stores the reference before calling the provider", async () => {
    const { db, provider, calls } = setup(async () => ({ redirectUrl: "https://pay.test/x" }));
    const out = await startCheckout(db, provider, input, "https://xarina.test");
    expect(out).toEqual({ redirectUrl: "https://pay.test/x", orderId: "order-1" });
    expect(calls).toEqual(["create", "attach", "initialize"]);
    expect(provider.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: 17500000, currency: "NGN" }),
    );
  });

  it("releases the stock hold when the provider fails", async () => {
    const { db, provider, calls } = setup(async () => {
      throw new Error("provider down");
    });
    await expect(startCheckout(db, provider, input, "https://xarina.test")).rejects.toThrow("provider down");
    expect(calls).toEqual(["create", "attach", "initialize", "release"]);
  });

  it("creates nothing at the provider if the order can't be created (e.g. sold out)", async () => {
    const { db, provider } = setup(async () => ({ redirectUrl: "x" }));
    db.createCheckout = vi.fn(async () => {
      throw new Error("out_of_stock");
    });
    await expect(startCheckout(db, provider, input, "https://xarina.test")).rejects.toThrow("out_of_stock");
    expect(provider.initialize).not.toHaveBeenCalled();
    expect(db.releaseOrder).not.toHaveBeenCalled();
  });
});
