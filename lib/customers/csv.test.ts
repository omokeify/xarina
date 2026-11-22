import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

// CRM-3: the export must open safely in a spreadsheet.
describe("csv", () => {
  it("leaves plain values alone and quotes commas, quotes and newlines", () => {
    expect(csvCell("Alice")).toBe("Alice");
    expect(csvCell("Adeyemi, Alice")).toBe('"Adeyemi, Alice"');
    expect(csvCell('She said "hi"')).toBe('"She said ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("writes empty for null and undefined, and plain text for numbers and booleans", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(3)).toBe("3");
    expect(csvCell(true)).toBe("true");
  });

  it("neutralises spreadsheet formulas", () => {
    for (const bad of ['=HYPERLINK("http://x")', "+2348091112222", "-1+1", "@SUM(A1)", "\tcmd"]) {
      expect(csvCell(bad).startsWith("'") || csvCell(bad).startsWith("\"'")).toBe(true);
    }
  });

  it("builds CRLF rows with a byte-order mark", () => {
    const csv = toCsv(["Email", "Name"], [["a@x.test", "Alice, A"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿Email,Name\r\na@x.test,"Alice, A"\r\n');
  });
});
