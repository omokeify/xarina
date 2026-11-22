import { describe, expect, it } from "vitest";
import { parseFilters, toQuery, toRpcArgs } from "./filters";

const UUID = "30000000-0000-4000-a000-000000000001";

// CRM-2: search and filters live in the URL.
describe("customer filters", () => {
  it("defaults to everything on page 1", () => {
    expect(parseFilters({})).toEqual({ q: "", prive: null, design: null, purchased: null, page: 1 });
  });

  it("reads each filter", () => {
    const f = parseFilters({ q: " alice ", prive: "yes", design: UUID, purchased: "no", page: "3" });
    expect(f).toEqual({ q: "alice", prive: true, design: UUID, purchased: false, page: 3 });
  });

  it("ignores junk instead of failing", () => {
    const f = parseFilters({ prive: "maybe", design: "not-a-uuid", purchased: ["yes", "no"], page: "-4" });
    expect(f).toEqual({ q: "", prive: null, design: null, purchased: true, page: 1 });
  });

  it("maps to the database arguments, leaving unset filters out", () => {
    expect(toRpcArgs(parseFilters({ q: "mensah", prive: "no" }))).toEqual({
      p_search: "mensah",
      p_vip: false,
      p_product_id: undefined,
      p_purchased: undefined,
    });
  });

  it("round-trips through the query string", () => {
    const f = parseFilters({ q: "a b", prive: "yes", design: UUID, purchased: "yes", page: "2" });
    expect(parseFilters(Object.fromEntries(new URLSearchParams(toQuery(f))))).toEqual(f);
  });
});
