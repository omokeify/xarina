import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { metaPurchasePayload, sendMetaPurchase, type PaidOrder } from "./meta";

const order: PaidOrder = {
  id: "aaaaaaaa-0000-4000-a000-000000000001",
  email: " Buyer@Example.test ",
  phone: "+234 (801) 234-5678",
  currency: "NGN",
  total_minor: 8750050,
  utm: { utm_source: "meta", utm_campaign: "drop_1", secret: "ignore me" },
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("metaPurchasePayload", () => {
  it("uses the order ID as the de-duplication event_id", () => {
    const event = metaPurchasePayload(order, 1_700_000_000_000);
    expect(event.event_name).toBe("Purchase");
    expect(event.event_id).toBe(order.id);
    expect(event.event_time).toBe(1_700_000_000);
  });

  it("hashes normalised contact details", () => {
    const event = metaPurchasePayload(order);
    expect(event.user_data.em).toEqual([sha256("buyer@example.test")]);
    expect(event.user_data.ph).toEqual([sha256("2348012345678")]);
  });

  it("keeps money as an integer in storage and converts only at the API boundary", () => {
    const event = metaPurchasePayload(order);
    expect(event.custom_data.value).toBe(87500.5);
    expect(event.custom_data.currency).toBe("NGN");
  });

  it("copies only known campaign tags", () => {
    const event = metaPurchasePayload(order);
    expect(event.custom_data).toMatchObject({ utm_source: "meta", utm_campaign: "drop_1" });
    expect(event.custom_data.secret).toBeUndefined();
    expect(metaPurchasePayload({ ...order, phone: null }).user_data.ph).toBeUndefined();
  });
});

describe("sendMetaPurchase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.META_PIXEL_ID;
    delete process.env.META_CAPI_TOKEN;
  });

  it("does nothing when keys are not configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(sendMetaPurchase(order)).resolves.toBe("skipped");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
