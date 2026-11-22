import { describe, expect, it } from "vitest";
import { hashToken, newToken } from "./tokens";

// Rule 7: Privé access is a single-use, hashed, expiring link, never a shared password.
describe("access tokens", () => {
  it("are long, URL-safe and unique", () => {
    const a = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(a);
  });

  it("hash to a stable 64-char SHA-256 hex that never contains the token", () => {
    const t = newToken();
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(h);
    expect(h).not.toContain(t);
  });

  it("matches a known SHA-256 vector", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
