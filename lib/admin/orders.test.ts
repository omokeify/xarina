import { describe, expect, it } from "vitest";
import { canMove, cleanSearch, nextStatuses } from "./orders";

describe("order moves (INV-4)", () => {
  it("fulfilment can only ship: paid → processing/dispatched, dispatched → delivered", () => {
    expect(nextStatuses("fulfilment", "paid")).toEqual(["processing", "dispatched"]);
    expect(nextStatuses("fulfilment", "processing")).toEqual(["dispatched"]);
    expect(nextStatuses("fulfilment", "dispatched")).toEqual(["delivered"]);
    expect(canMove("fulfilment", "paid", "cancelled")).toBe(false);
    expect(canMove("fulfilment", "delivered", "refunded")).toBe(false);
  });

  it("owner and manager can also cancel and refund", () => {
    for (const role of ["owner", "manager"] as const) {
      expect(nextStatuses(role, "paid")).toEqual(["processing", "dispatched", "cancelled", "refunded"]);
      expect(canMove(role, "pending_payment", "cancelled")).toBe(true);
      expect(canMove(role, "delivered", "refunded")).toBe(true);
    }
  });

  it("support and merchandiser cannot change status", () => {
    expect(nextStatuses("support", "paid")).toEqual([]);
    expect(nextStatuses("merchandiser", "paid")).toEqual([]);
  });

  it("nobody can mark an order paid from the admin (rule 2)", () => {
    for (const role of ["owner", "manager", "fulfilment", "support"] as const) {
      expect(canMove(role, "pending_payment", "paid")).toBe(false);
    }
  });

  it("cancelled and refunded are final, and orders never go backwards", () => {
    expect(nextStatuses("owner", "cancelled")).toEqual([]);
    expect(nextStatuses("owner", "refunded")).toEqual([]);
    expect(canMove("owner", "dispatched", "processing")).toBe(false);
  });
});

describe("cleanSearch", () => {
  it("removes characters that are filter syntax", () => {
    expect(cleanSearch("a@b.com),status.eq.paid")).toBe("a@b.com status.eq.paid");
    expect(cleanSearch("  XA1001 ")).toBe("XA1001");
    expect(cleanSearch('"%*\\')).toBe("");
  });
});
