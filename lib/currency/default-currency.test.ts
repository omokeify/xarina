import { describe, expect, it } from "vitest";
import { pickInitialCurrency } from "./default-currency";

describe("pickInitialCurrency (CUR-3, CUR-4)", () => {
  it("a saved choice beats the country", () => {
    expect(pickInitialCurrency("GBP", "NG")).toBe("GBP");
  });
  it("ignores an invalid cookie", () => {
    expect(pickInitialCurrency("EUR", "NG")).toBe("NGN");
  });
  it("maps country to currency", () => {
    expect(pickInitialCurrency(undefined, "NG")).toBe("NGN");
    expect(pickInitialCurrency(undefined, "gb")).toBe("GBP");
    expect(pickInitialCurrency(undefined, "US")).toBe("USD");
    expect(pickInitialCurrency(undefined, "FR")).toBe("USD");
  });
  it("falls back to the default with no signal", () => {
    expect(pickInitialCurrency(undefined, null)).toBe("NGN");
  });
});
