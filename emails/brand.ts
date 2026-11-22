import tokens from "@/docs/brand/tokens.json";

// Email clients ignore CSS variables, so templates take their colours from the
// locked brand tokens (docs/brand/tokens.json) at render time. No raw hex here.
export type EmailTheme = "light" | "dark";

type ColourToken = { name: string; value: { light: string; dark: string } };

export function brandColour(name: string, theme: EmailTheme): string {
  const token = (tokens.color.tokens as ColourToken[]).find((t) => t.name === name);
  if (!token) throw new Error(`Unknown brand colour token: ${name}`);
  return token.value[theme];
}

// Web fonts are unreliable in email, so fall back to system serif and sans.
export const DISPLAY_FONT = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
export const BODY_FONT = "Inter, Arial, Helvetica, sans-serif";

/** The a/A mark as a PNG (see app/email-assets/mark.png). Needs an absolute URL. */
export function markUrl(siteUrl: string, theme: EmailTheme): string {
  return `${siteUrl}/email-assets/mark.png?tone=${theme === "dark" ? "champagne" : "ink"}`;
}

/** Brand label style: 12px / 600 / uppercase / 0.22em. */
export const LABEL_STYLE = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
} as const;
