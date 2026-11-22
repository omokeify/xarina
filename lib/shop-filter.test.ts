import { describe, expect, it } from "vitest";
import { matchesFilter } from "./shop-filter";

const p = (collection_slug: string | null, section: "available" | "upcoming", sold_out: boolean) => ({
  collection_slug,
  section,
  sold_out,
});

describe("SHOP-2 filters", () => {
  it("filters by design", () => {
    expect(matchesFilter(p("gowns", "available", false), "gowns", undefined)).toBe(true);
    expect(matchesFilter(p("sets", "available", false), "gowns", undefined)).toBe(false);
  });
  it("filters by availability", () => {
    expect(matchesFilter(p(null, "upcoming", false), undefined, "upcoming")).toBe(true);
    expect(matchesFilter(p(null, "available", false), undefined, "in-stock")).toBe(true);
    expect(matchesFilter(p(null, "available", true), undefined, "in-stock")).toBe(false);
    expect(matchesFilter(p(null, "available", true), undefined, "sold-out")).toBe(true);
    // An upcoming design is never "sold out" before it opens.
    expect(matchesFilter(p(null, "upcoming", true), undefined, "sold-out")).toBe(false);
  });
});
