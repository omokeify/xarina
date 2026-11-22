import { describe, expect, it } from "vitest";
import { dropSchema } from "./schema";

const base = {
  name: "Autumn Edit",
  slug: "",
  pitch: "",
  hero_alt: "",
  vip_opens_at: "2026-12-01T09:00:00.000Z",
  public_opens_at: "2026-12-02T09:00:00.000Z",
  closes_at: "",
  vip_limit_per_member: "",
  on_close: "move_to_available",
};

// DROP-1: VIP open, public open and an optional close, all in UTC.
describe("dropSchema", () => {
  it("accepts a valid drop and normalises optional fields", () => {
    const r = dropSchema.parse(base);
    expect(r.closes_at).toBeNull();
    expect(r.vip_limit_per_member).toBeNull();
    expect(r.published).toBe(false);
  });

  it("allows Privé and public to open together (no early window)", () => {
    expect(dropSchema.safeParse({ ...base, vip_opens_at: base.public_opens_at }).success).toBe(true);
  });

  it("rejects Privé opening after public", () => {
    const r = dropSchema.safeParse({ ...base, vip_opens_at: "2026-12-03T09:00:00.000Z" });
    expect(r.success).toBe(false);
  });

  it("rejects closing at or before public opening", () => {
    expect(dropSchema.safeParse({ ...base, closes_at: base.public_opens_at }).success).toBe(false);
    expect(dropSchema.safeParse({ ...base, closes_at: "2026-12-05T09:00:00.000Z" }).success).toBe(true);
  });

  it("parses the per-member limit (VIP-3) and rejects zero or fractions", () => {
    expect(dropSchema.parse({ ...base, vip_limit_per_member: "2" }).vip_limit_per_member).toBe(2);
    expect(dropSchema.safeParse({ ...base, vip_limit_per_member: "0" }).success).toBe(false);
    expect(dropSchema.safeParse({ ...base, vip_limit_per_member: "1.5" }).success).toBe(false);
  });

  it("accepts an empty slug (generated from the name) or a clean one, and lowercases", () => {
    expect(dropSchema.parse(base).slug).toBe("");
    expect(dropSchema.parse({ ...base, slug: " Autumn-Edit " }).slug).toBe("autumn-edit");
  });

  it("rejects a slug with spaces, symbols or double hyphens", () => {
    for (const slug of ["autumn edit", "autumn--edit", "-autumn", "autumn_edit", "autumn!"]) {
      expect(dropSchema.safeParse({ ...base, slug }).success, slug).toBe(false);
    }
  });

  it("rejects an unknown close behaviour and bad dates", () => {
    expect(dropSchema.safeParse({ ...base, on_close: "delete" }).success).toBe(false);
    expect(dropSchema.safeParse({ ...base, public_opens_at: "soon" }).success).toBe(false);
  });
});
