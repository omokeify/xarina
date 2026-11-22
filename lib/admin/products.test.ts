import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify, splitList, suggestSku } from "./products";

describe("slugify (PDP-1)", () => {
  it("makes lowercase hyphenated slugs", () => {
    expect(slugify("  The Àdùnní Dress! ")).toBe("the-adunni-dress");
    expect(slugify("Two -- Piece   Set")).toBe("two-piece-set");
  });
  it("always matches the slug pattern or is empty", () => {
    for (const s of ["Hello", "  ", "##", "Ankara 2026 / Drop"]) {
      const slug = slugify(s);
      expect(slug === "" || SLUG_PATTERN.test(slug)).toBe(true);
    }
  });
});

describe("splitList", () => {
  it("trims, drops blanks and case-insensitive repeats", () => {
    expect(splitList("Black, ivory ,, Black ,IVORY,Red")).toEqual(["Black", "ivory", "Red"]);
  });
});

describe("suggestSku", () => {
  it("joins slug, colour and size in capitals", () => {
    expect(suggestSku("sunset-dress", "Black", "M")).toBe("SUNSET-DRESS-BLA-M");
    expect(suggestSku("set", "Off white", "UK 10")).toBe("SET-OFF-UK-10");
  });
});
