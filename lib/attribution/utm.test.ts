import { describe, expect, it } from "vitest";
import { captureFromVisit, cookieValue, decodeAttribution, encodeAttribution, parseAttribution } from "./utm";

describe("parseAttribution", () => {
  it("keeps only UTM params from the query string", () => {
    expect(
      parseAttribution("?utm_source=meta&utm_medium=paid_social&utm_campaign=drop_1&ref=XA123&design=coat"),
    ).toEqual({
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "drop_1",
    });
  });

  it("trims values and ignores empty or missing ones", () => {
    expect(parseAttribution("?utm_source=%20meta%20&utm_term=")).toEqual({ utm_source: "meta" });
    expect(parseAttribution("?ref=XA123")).toBeNull();
  });

  it("rejects oversized values instead of writing junk to the cookie", () => {
    expect(parseAttribution(`?utm_source=${"x".repeat(201)}`)).toBeNull();
  });
});

describe("cookie encoding", () => {
  const original = { utm_source: "meta", utm_campaign: "50% off / autumn" };

  it("round-trips both raw and Next-decoded cookie values", () => {
    const json = encodeAttribution(original);
    expect(decodeAttribution(json)).toEqual(original);
    expect(decodeAttribution(encodeURIComponent(json))).toEqual(original);
  });

  it("rejects malformed cookies, unknown keys and empty objects", () => {
    expect(decodeAttribution(undefined)).toBeNull();
    expect(decodeAttribution("not json")).toBeNull();
    expect(decodeAttribution('{"utm_source":"meta","password":"oops"}')).toBeNull();
    expect(decodeAttribution("{}")).toBeNull();
  });

  it("reads cookie values that contain '=' characters", () => {
    const json = encodeAttribution(original);
    expect(cookieValue(`other=1; xarina_utm=${encodeURIComponent(json)}; theme=dark`, "xarina_utm")).toBe(
      encodeURIComponent(json),
    );
  });
});

describe("captureFromVisit (first touch)", () => {
  it("saves UTMs when no cookie exists", () => {
    expect(captureFromVisit("?utm_source=meta")).toEqual({ utm_source: "meta" });
  });

  it("never overwrites a valid saved campaign", () => {
    const saved = encodeURIComponent(encodeAttribution({ utm_source: "first" }));
    expect(captureFromVisit("?utm_source=second", saved)).toBeNull();
  });

  it("ignores a broken cookie and captures the current visit", () => {
    expect(captureFromVisit("?utm_source=meta", "garbage")).toEqual({ utm_source: "meta" });
  });

  it("does nothing when the visit has no UTMs", () => {
    expect(captureFromVisit("?ref=XA123")).toBeNull();
  });
});
