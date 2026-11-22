import { formatMoney, type Currency } from "@/lib/money";
import { EmailLayout, type MarketingSite } from "./layout";
import { EmailActions, EmailButton, EmailCard, EmailHero, EmailLink, EmailNote, EmailPhoto } from "./parts";
import { Column, Row, Text } from "@react-email/components";
import { brandColour, DISPLAY_FONT } from "./brand";
import { previewMarketingSite } from "./preview-data";
import type { OrderLine } from "./items";

export type AbandonedCheckoutProps = {
  site: MarketingSite;
  firstName?: string;
  currency: Currency;
  /** First bag line is shown; the rest are summarised. */
  items: OrderLine[];
  bagUrl: string;
  sizeGuideUrl?: string;
};

/**
 * Sent once, 1 to 3 hours after checkout was started and not paid. Marketing:
 * only to customers with marketing consent (rule 12), so the caller must pass an unsubscribe link.
 */
export default function AbandonedCheckout({
  site,
  firstName,
  currency,
  items,
  bagUrl,
  sizeGuideUrl,
}: AbandonedCheckoutProps) {
  const first = items[0];
  const more = items.length - 1;
  return (
    <EmailLayout
      preview="Your bag is saved. Pieces are not held, so do not wait too long."
      site={site}
      reason="You received this because you started a checkout and agreed to hear from Xarina."
    >
      <EmailHero eyebrow="Your bag" title="You left something beautiful behind.">
        <p style={{ margin: 0, fontSize: 16, lineHeight: "26px" }}>
          {firstName ? `${firstName}, your` : "Your"} bag is saved. Complete your order whenever you are
          ready, while your size is still available.
        </p>
      </EmailHero>
      {first && (
        <EmailCard>
          <EmailPhoto src={first.imageUrl} alt={first.name} height={380} inset={0} />
          <Row>
            <Column style={{ paddingTop: 20, verticalAlign: "baseline" }}>
              <Text
                style={{
                  margin: 0,
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 600,
                  fontSize: 22,
                  lineHeight: "26px",
                  color: brandColour("ink", "light"),
                }}
              >
                {first.name}
              </Text>
              <Text style={{ margin: "4px 0 0", fontSize: 14, color: brandColour("ink-muted", "light") }}>
                {first.colour} · Size {first.size}
                {more > 0 ? ` · plus ${more} more` : ""}
              </Text>
            </Column>
            <Column
              align="right"
              style={{ paddingTop: 20, fontSize: 15, verticalAlign: "baseline", textAlign: "right" }}
            >
              {formatMoney(first.unitPriceMinor * first.qty, currency)}
            </Column>
          </Row>
        </EmailCard>
      )}
      <EmailActions>
        <EmailButton href={bagUrl}>Return to your bag</EmailButton>
        <EmailNote>
          {sizeGuideUrl && (
            <>
              Unsure about fit? <EmailLink href={sizeGuideUrl}>See the size guide</EmailLink>
              {site.whatsappUrl ? " or " : ". "}
            </>
          )}
          {site.whatsappUrl && <EmailLink href={site.whatsappUrl}>ask us on WhatsApp</EmailLink>}
          {site.whatsappUrl && ". "}
          Pieces are limited and are not held in your bag.
        </EmailNote>
      </EmailActions>
    </EmailLayout>
  );
}

AbandonedCheckout.PreviewProps = {
  site: previewMarketingSite,
  firstName: "Amara",
  currency: "NGN",
  items: [{ name: "The Atelier Dress", colour: "Ivory", size: "M", qty: 1, unitPriceMinor: 8500000 }],
  bagUrl: "https://example.com/cart",
  sizeGuideUrl: "https://example.com/size-guide",
} satisfies AbandonedCheckoutProps;
