import { describe, expect, it } from "vitest";
import { orderAttribution, orderTimeline, paymentEventLabel } from "./order-detail";

describe("orderTimeline", () => {
  const created = "2026-11-20T10:00:00.000Z";

  it("shows a pending order waiting for payment", () => {
    const steps = orderTimeline({ createdAt: created, paidAt: null, status: "pending_payment" });
    expect(steps).toHaveLength(5);
    expect(steps[0]).toEqual({ label: "Order placed", at: created, state: "done" });
    expect(steps[1]).toMatchObject({ label: "Payment confirmed", state: "current" });
    expect(steps.slice(2).every((s) => s.state === "todo")).toBe(true);
  });

  it("uses paid_at for the payment step", () => {
    const paid = "2026-11-20T10:05:00.000Z";
    const steps = orderTimeline({ createdAt: created, paidAt: paid, status: "paid" });
    expect(steps[1]).toEqual({ label: "Payment confirmed", at: paid, state: "current" });
    expect(steps[2].state).toBe("todo");
  });

  it("uses the earliest audit time for each fulfilled step", () => {
    const steps = orderTimeline({
      createdAt: created,
      paidAt: "2026-11-20T10:05:00.000Z",
      status: "dispatched",
      statusChanges: [
        { to: "dispatched", at: "2026-11-21T09:00:00.000Z" },
        { to: "processing", at: "2026-11-20T12:00:00.000Z" },
        { to: "dispatched", at: "2026-11-21T15:00:00.000Z" },
      ],
    });
    expect(steps[2]).toMatchObject({ label: "Processing", at: "2026-11-20T12:00:00.000Z", state: "done" });
    expect(steps[3]).toMatchObject({ label: "Dispatched", at: "2026-11-21T09:00:00.000Z", state: "current" });
    expect(steps[4].state).toBe("todo");
  });

  it("marks unfinished steps skipped on a cancelled order", () => {
    const steps = orderTimeline({
      createdAt: created,
      paidAt: null,
      status: "cancelled",
      statusChanges: [{ to: "cancelled", at: "2026-11-20T11:00:00.000Z" }],
    });
    expect(steps[1].state).toBe("skipped");
    expect(steps.at(-1)).toEqual({
      label: "Cancelled",
      at: "2026-11-20T11:00:00.000Z",
      state: "current",
    });
  });

  it("still places the current step when audit history is unavailable", () => {
    const steps = orderTimeline({
      createdAt: created,
      paidAt: "2026-11-20T10:05:00.000Z",
      status: "processing",
    });
    expect(steps[2]).toMatchObject({ label: "Processing", state: "current" });
    expect(steps[3].state).toBe("todo");
  });
});

describe("paymentEventLabel", () => {
  it("names known events and rejected deliveries", () => {
    expect(paymentEventLabel("charge.success")).toBe("Payment confirmed");
    expect(paymentEventLabel("charge.success:mismatch")).toBe("Amount or currency mismatch");
    expect(paymentEventLabel("invalid_signature")).toBe("Invalid signature");
    expect(paymentEventLabel("charge.refunded:no_stock")).toBe("Charge refunded · no stock");
  });
});

describe("orderAttribution", () => {
  it("reads only the five attribution keys", () => {
    expect(orderAttribution({ utm_source: "meta", utm_campaign: "drop_1", secret: "ignore" })).toEqual({
      utm_source: "meta",
      utm_campaign: "drop_1",
    });
  });

  it("returns null for missing or invalid data", () => {
    expect(orderAttribution(null)).toBeNull();
    expect(orderAttribution("utm_source=meta")).toBeNull();
    expect(orderAttribution({ ref: "XA123" })).toBeNull();
  });
});
