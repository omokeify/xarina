import { describe, expect, it } from "vitest";
import { cac, roas } from "./report-ratios";

describe("reporting ratios (PRD › Reporting page)", () => {
  it("CAC divides spend by new paying customers, in minor units", () => {
    expect(cac(300_000, 3)).toBe(100_000);
    expect(cac(100, 3)).toBe(33);
  });
  it("CAC is unknown without spend or without new customers", () => {
    expect(cac(0, 3)).toBeNull();
    expect(cac(300_000, 0)).toBeNull();
  });
  it("ROAS divides revenue by spend, to two decimals", () => {
    expect(roas(1_900, 300)).toBe(6.33);
    expect(roas(0, 300)).toBe(0);
  });
  it("ROAS is unknown without spend", () => {
    expect(roas(1_900, 0)).toBeNull();
  });
});
