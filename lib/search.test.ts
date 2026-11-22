import { describe, expect, it } from "vitest";
import { matchesQuery, normaliseQuery } from "./search";

const dress = { name: "Àdùnní Wrap Dress", collection_name: "Occasion" };

describe("storefront search", () => {
  it("normalises accents, case and punctuation", () => {
    expect(normaliseQuery("  ÀDÙNNÍ--wrap! ")).toBe("adunni wrap");
  });
  it("matches every word against name and collection", () => {
    expect(matchesQuery(dress, "wrap")).toBe(true);
    expect(matchesQuery(dress, "adunni occasion")).toBe(true);
    expect(matchesQuery(dress, "wrap skirt")).toBe(false);
  });
  it("matches nothing for an empty query", () => {
    expect(matchesQuery(dress, "   ")).toBe(false);
    expect(matchesQuery({ name: "Top", collection_name: null }, "top")).toBe(true);
  });
});
