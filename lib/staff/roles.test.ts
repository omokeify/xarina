import { describe, expect, it } from "vitest";
import { can, sectionsFor } from "./roles";

const hrefs = (role: Parameters<typeof sectionsFor>[0]) => sectionsFor(role).map((s) => s.href);

describe("admin sections per role (PRD › Users and roles)", () => {
  it("owner sees everything including staff and settings", () => {
    expect(hrefs("owner")).toEqual(
      expect.arrayContaining(["/admin/staff", "/admin/settings", "/admin/reports", "/admin/analytics"]),
    );
  });
  it("merchandiser gets products, drops and content but not orders or customers", () => {
    expect(hrefs("merchandiser")).toEqual(["/admin", "/admin/products", "/admin/drops", "/admin/content"]);
  });
  it("fulfilment only sees orders", () => {
    expect(hrefs("fulfilment")).toEqual(["/admin", "/admin/orders"]);
  });
  it("support sees orders and customers, not reports", () => {
    expect(hrefs("support")).toEqual(["/admin", "/admin/orders", "/admin/customers"]);
  });
});

describe("fine-grained permissions", () => {
  it("only owner and manager can export customers (CRM-3)", () => {
    expect(
      ["owner", "manager", "merchandiser", "fulfilment", "support"].filter((r) =>
        can.exportCustomers(r as never),
      ),
    ).toEqual(["owner", "manager"]);
  });
  it("merchandiser cannot change prices or publish", () => {
    expect(can.changePrices("merchandiser")).toBe(false);
    expect(can.publish("merchandiser")).toBe(false);
  });
  it("only owner and manager can approve Privé members (VIP-1)", () => {
    expect(
      ["owner", "manager", "merchandiser", "fulfilment", "support"].filter((r) =>
        can.approvePrive(r as never),
      ),
    ).toEqual(["owner", "manager"]);
  });
});
