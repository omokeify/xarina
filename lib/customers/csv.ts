/**
 * One CSV cell. Quotes when needed, and neutralises spreadsheet formulas: a
 * value starting with = + - @ (or a tab or return) would run as a formula in
 * Excel or Sheets, so it is prefixed with an apostrophe.
 */
export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows to CSV text, CRLF line endings, with a UTF-8 byte-order mark so Excel reads accents. */
export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
