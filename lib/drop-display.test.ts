import { describe, expect, it } from "vitest";
import { badgeFor, countdownParts, primaryAction, type DropInfo } from "./drop-display";

const drop = (
  state: NonNullable<DropInfo>["state"],
  on_close: "move_to_available" | "hide" = "move_to_available",
) => ({
  state,
  vip_opens_at: "2026-12-01T18:00:00Z",
  public_opens_at: "2026-12-02T18:00:00Z",
  on_close,
});

describe("PDP-4 primary action follows drop state", () => {
  it("upcoming: waitlist with countdown to PUBLIC time for everyone (HOME-2)", () => {
    expect(primaryAction(drop("upcoming"), true)).toEqual({
      kind: "waitlist",
      countdownTo: "2026-12-02T18:00:00Z",
      countdownLabel: "Opens in",
    });
  });
  it("upcoming: Privé members count down to VIP time", () => {
    expect(primaryAction(drop("upcoming"), true, true)).toMatchObject({
      countdownTo: "2026-12-01T18:00:00Z",
    });
  });
  it("vip window: non-members cannot buy", () => {
    expect(primaryAction(drop("vip"), true).kind).toBe("prive");
  });
  it("vip window: members can buy", () => {
    expect(primaryAction(drop("vip"), true, true).kind).toBe("buy");
  });
  it("public: buy when the variant has stock, sold out otherwise", () => {
    expect(primaryAction(drop("public"), true).kind).toBe("buy");
    expect(primaryAction(drop("public"), false).kind).toBe("sold_out");
  });
  it("no drop behaves like public (Available Now)", () => {
    expect(primaryAction(null, true).kind).toBe("buy");
  });
  it("closed drop follows its on_close setting", () => {
    expect(primaryAction(drop("closed", "move_to_available"), true).kind).toBe("buy");
    expect(primaryAction(drop("closed", "hide"), true).kind).toBe("unavailable");
  });
});

describe("SHOP-3 badges", () => {
  it("maps state and stock", () => {
    expect(badgeFor("upcoming", false)).toBe("Upcoming");
    expect(badgeFor("vip", false)).toBe("Privé");
    expect(badgeFor("public", false)).toBe("Available");
    expect(badgeFor(null, false)).toBe("Available");
    expect(badgeFor(null, true)).toBe("Sold out");
  });
});

describe("countdown", () => {
  it("splits and clamps", () => {
    expect(countdownParts(90_061_000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1, done: false });
    expect(countdownParts(-5).done).toBe(true);
  });
});
