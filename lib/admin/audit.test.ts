import { describe, expect, it } from "vitest";
import { actionLabel, changeLines } from "./audit";

describe("audit log summaries (ADM-7)", () => {
  it("labels known actions and falls back to the raw code", () => {
    expect(actionLabel("variant.stock")).toBe("Changed stock");
    expect(actionLabel("something.new")).toBe("something.new");
  });

  it("lists only fields that changed, skipping timestamps", () => {
    expect(
      changeLines(
        { sku: "A-1", stock_on_hand: 5, updated_at: "x" },
        { sku: "A-1", stock_on_hand: 7, updated_at: "y" },
      ),
    ).toEqual(["stock on hand: 5 → 7"]);
  });

  it("lists recorded values for creations and deletions", () => {
    expect(changeLines(null, { email: "a@xarina.test", role: "support" })).toEqual(["email: a@xarina.test", "role: support"]);
    expect(changeLines({ name: "Gone" }, null)).toEqual(["name: Gone"]);
  });

  it("shows empty values as none", () => {
    expect(changeLines({ closes_at: null }, { closes_at: "2026-12-01" })).toEqual(["closes at: none → 2026-12-01"]);
  });
});
