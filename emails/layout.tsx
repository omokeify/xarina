import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { BODY_FONT, brandColour, DISPLAY_FONT, LABEL_STYLE, markUrl, type EmailTheme } from "./brand";

/** Site-wide details for the header and footer. Anything undefined is left out. */
export type EmailSite = {
  /** Absolute origin, e.g. https://xarina.com. Needed for the logo image. */
  siteUrl: string;
  instagramUrl?: string;
  whatsappUrl?: string;
  /** Postal address line shown in the footer. */
  businessAddress?: string;
  /** Per-recipient links. Marketing emails require unsubscribeUrl (rule 12). */
  unsubscribeUrl?: string;
  preferencesUrl?: string;
};

export type FooterNav = "social" | "orders" | "none";

/**
 * Shared frame for every Xarina email. `dark` is Privé (Noir & Champagne),
 * `light` is Ivory & Ink. Voice: short, warm, no exclamation marks or emoji.
 * Layout is table-based (react-email) so it holds up in Gmail and Outlook.
 */
export function EmailLayout({
  theme = "light",
  preview,
  site,
  brand = "Xarina",
  markSize = 34,
  headerNote,
  banner,
  tagline,
  nav = "social",
  reason,
  children,
}: {
  theme?: EmailTheme;
  preview: string;
  site: EmailSite;
  /** Wordmark text. "Xarina Privé" on member emails. */
  brand?: "Xarina" | "Xarina Privé";
  /** Mark height follows the 340:360 aspect of the a/A mark. */
  markSize?: number;
  /** Small label under the wordmark, e.g. "Studio admin". */
  headerNote?: string;
  /** Full-width ink band under the header, e.g. an order-by date. */
  banner?: React.ReactNode;
  /** Defaults to the brand tagline; Privé uses "First access. Exceptional pieces." */
  tagline?: string;
  nav?: FooterNav;
  /** Why the recipient got this, e.g. "You joined the waitlist for X." */
  reason: string;
  children: React.ReactNode;
}) {
  const c = (name: string) => brandColour(name, theme);
  const dark = theme === "dark";
  const line = tagline ?? (dark ? "First access. Exceptional pieces." : "Wearable statement dressing.");
  const markWidth = markSize;
  const markHeight = Math.round((markSize * 270) / 256);

  const navLinks: { label: string; href?: string }[] =
    nav === "social"
      ? [
          { label: "Instagram", href: site.instagramUrl },
          { label: "WhatsApp", href: site.whatsappUrl },
          { label: "FAQs", href: `${site.siteUrl}/faqs` },
        ]
      : nav === "orders"
        ? [
            { label: "Delivery", href: `${site.siteUrl}/delivery` },
            { label: "Returns", href: `${site.siteUrl}/returns` },
            { label: "FAQs", href: `${site.siteUrl}/faqs` },
          ]
        : [];
  const shownNav = navLinks.filter((l): l is { label: string; href: string } => Boolean(l.href));

  const linkStyle = { color: c(dark ? "accent" : "ink"), textDecoration: "none" } as const;
  const smallLink = { color: c(dark ? "accent" : "ink"), textDecoration: "underline" } as const;

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        {/* Email HTML is not a Next.js page, so the pages/_document font rule does not apply. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&display=swap"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: c("surface"), color: c("ink"), fontFamily: BODY_FONT }}>
        <Container style={{ width: "100%", maxWidth: 600, margin: "0 auto", backgroundColor: c("surface") }}>
          <Section style={{ textAlign: "center", padding: `${dark ? 40 : 32}px 0 24px` }}>
            <Img
              src={markUrl(site.siteUrl, theme)}
              alt="Xarina"
              width={markWidth}
              height={markHeight}
              style={{ display: "block", margin: "0 auto 12px" }}
            />
            <Text
              style={{
                margin: 0,
                fontFamily: DISPLAY_FONT,
                fontSize: 20,
                lineHeight: "24px",
                fontWeight: 600,
                letterSpacing: "0.4em",
                paddingLeft: "0.4em",
                textTransform: "uppercase",
                color: c(dark ? "accent" : "ink"),
              }}
            >
              {brand}
            </Text>
            {headerNote && (
              <Text style={{ ...LABEL_STYLE, margin: "12px 0 0", fontSize: 11, color: c("ink-muted") }}>
                {headerNote}
              </Text>
            )}
          </Section>

          {banner && (
            <Section
              style={{
                backgroundColor: brandColour("ink", "light"),
                padding: "12px 16px",
                textAlign: "center",
              }}
            >
              <Text style={{ ...LABEL_STYLE, margin: 0, color: brandColour("on-action", "light") }}>
                {banner}
              </Text>
            </Section>
          )}

          {children}

          <Section style={{ margin: "0 48px", padding: "28px 0 40px", textAlign: "center" }}>
            <Hr style={{ borderColor: c("line"), margin: "0 0 28px" }} />
            <Text
              style={{
                margin: "0 0 12px",
                fontFamily: DISPLAY_FONT,
                fontStyle: "italic",
                fontSize: 18,
                lineHeight: "24px",
                color: c(dark ? "accent" : "ink"),
              }}
            >
              {line}
            </Text>
            {shownNav.length > 0 && (
              <Text style={{ ...LABEL_STYLE, margin: "0 0 12px", letterSpacing: "0.18em" }}>
                {shownNav.map((l, i) => (
                  <span key={l.label}>
                    {i > 0 && <span style={{ padding: "0 8px" }}>·</span>}
                    <Link href={l.href} style={linkStyle}>
                      {l.label}
                    </Link>
                  </span>
                ))}
              </Text>
            )}
            <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: c("ink-muted") }}>
              {reason}
              {(site.preferencesUrl || site.unsubscribeUrl) && (
                <>
                  <br />
                  {site.preferencesUrl && (
                    <Link href={site.preferencesUrl} style={smallLink}>
                      Email preferences
                    </Link>
                  )}
                  {site.preferencesUrl && site.unsubscribeUrl && " · "}
                  {site.unsubscribeUrl && (
                    <Link href={site.unsubscribeUrl} style={smallLink}>
                      Unsubscribe
                    </Link>
                  )}
                </>
              )}
              {site.businessAddress && (
                <>
                  <br />
                  Xarina · {site.businessAddress}
                </>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Marketing emails must carry an unsubscribe link (rule 12). Use this site type for them. */
export type MarketingSite = EmailSite & { unsubscribeUrl: string };
