import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import tokens from "@/docs/brand/tokens.json";

// Email clients (Gmail, Outlook) don't render SVG, so the a/A mark is served as
// a PNG. Same path as docs/brand/xarina-mark-*.svg. `tone` picks the brand
// colour: ink on Ivory & Ink emails, champagne on Privé emails.
const MARK_PATH =
  "M 165 62 L 265 62 C 305 150 322 265 345 352 C 352 378 366 390 395 397 L 392 404 C 350 412 312 412 285 410 C 276 350 262 300 252 262 C 250 310 238 365 226 408 C 190 412 130 410 105 392 C 80 378 70 340 88 300 C 110 250 150 180 172 110 C 176 90 172 72 165 62 Z M 202 98 C 212 150 218 230 222 290 C 224 330 205 352 182 352 C 150 350 140 320 150 290 C 162 245 185 170 202 98 Z";

type ColourToken = { name: string; value: { light: string; dark: string } };
const colour = (name: string, theme: "light" | "dark") =>
  (tokens.color.tokens as ColourToken[]).find((t) => t.name === name)!.value[theme];

export function GET(request: NextRequest) {
  const tone = request.nextUrl.searchParams.get("tone") === "champagne" ? "champagne" : "ink";
  const fill = tone === "champagne" ? colour("accent", "dark") : colour("ink", "light");
  // 4x the largest size used in emails (64px wide), so it stays sharp on retina screens.
  return new ImageResponse(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="50 40 370 390" width={256} height={270}>
      <path fillRule="evenodd" fill={fill} d={MARK_PATH} />
    </svg>,
    { width: 256, height: 270, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
