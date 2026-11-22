import { describe, expect, it } from "vitest";
import { clientIp, limitsEnabled, LIMITS } from "./rate-limit-rules";

const headers = (h: Record<string, string>) => (name: string) => h[name] ?? null;

describe("rate limit rules", () => {
  it("uses the first x-forwarded-for address", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("falls back to x-real-ip, then to a shared 'unknown' bucket", () => {
    expect(clientIp(headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(headers({}))).toBe("unknown");
  });
  it("ignores absurdly long header values", () => {
    expect(clientIp(headers({ "x-forwarded-for": "x".repeat(200) }))).toBe("unknown");
  });
  it("is off in development and when RATE_LIMITS=off", () => {
    expect(limitsEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(limitsEnabled({ NODE_ENV: "production", RATE_LIMITS: "off" })).toBe(false);
    expect(limitsEnabled({ NODE_ENV: "production" })).toBe(true);
  });
  it("every limit allows several honest attempts", () => {
    for (const rule of Object.values(LIMITS)) expect(rule.limit).toBeGreaterThanOrEqual(5);
  });
});
