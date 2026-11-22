import { describe, expect, it } from "vitest";
import { DEFAULT_EARLY_ACCESS_HOURS, earlyAccessHours } from "./early-access";

describe("earlyAccessHours", () => {
  it("uses the shortest future drop window when drops are scheduled", () => {
    expect(
      earlyAccessHours(
        [
          { vip_opens_at: "2031-01-01T09:00:00Z", public_opens_at: "2031-01-03T09:00:00Z" },
          { vip_opens_at: "2031-02-01T09:00:00Z", public_opens_at: "2031-02-02T09:00:00Z" },
        ],
        "72",
      ),
    ).toBe(24);
  });

  it("ignores invalid or reversed windows", () => {
    expect(
      earlyAccessHours(
        [
          { vip_opens_at: "2031-01-02T09:00:00Z", public_opens_at: "2031-01-01T09:00:00Z" },
          { vip_opens_at: "not a date", public_opens_at: "2031-01-01T09:00:00Z" },
        ],
        "12",
      ),
    ).toBe(12);
  });

  it("falls back to the configured value, then the safe default", () => {
    expect(earlyAccessHours([], "12")).toBe(12);
    expect(earlyAccessHours([], "")).toBe(DEFAULT_EARLY_ACCESS_HOURS);
    expect(earlyAccessHours([], "9999")).toBe(DEFAULT_EARLY_ACCESS_HOURS);
    expect(earlyAccessHours([], 0)).toBe(DEFAULT_EARLY_ACCESS_HOURS);
  });
});
