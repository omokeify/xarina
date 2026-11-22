import { describe, expect, it } from "vitest";
import { formatMoney, minorToMajorInput, parseMajorToMinor } from "./money";

describe("money (rule 1: integer minor units)", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatMoney(8_500_000, "NGN")).toBe("₦85,000");
    expect(formatMoney(18_000, "GBP")).toBe("£180");
    expect(formatMoney(22_050, "USD")).toBe("$220.50");
  });
  it("parses staff input without float maths", () => {
    expect(parseMajorToMinor("85,000", "NGN")).toBe(8_500_000);
    expect(parseMajorToMinor("£180.5", "GBP")).toBe(18_050);
    expect(parseMajorToMinor("0.1", "USD")).toBe(10);
    expect(parseMajorToMinor("1.234", "USD")).toBeNull();
    expect(parseMajorToMinor("abc", "USD")).toBeNull();
  });
  it("round-trips to form input", () => {
    expect(minorToMajorInput(18_050, "GBP")).toBe("180.50");
    expect(minorToMajorInput(8_500_000, "NGN")).toBe("85000");
  });
});
