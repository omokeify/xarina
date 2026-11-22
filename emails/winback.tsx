import { Img, Section, Text } from "@react-email/components";
import type { Currency } from "@/lib/money";
import { brandColour, DISPLAY_FONT } from "./brand";
import type { MarketingSite } from "./layout";
import { MarketingLayout } from "./marketing";
import { toProduct, type ProductTile } from "./items";
import {
  EmailActions,
  EmailButton,
  EmailHero,
  EmailLink,
  EmailNote,
  EmailProductGrid,
  EmailStrong,
  EmailText,
} from "./parts";
import { previewMarketingSite } from "./preview-data";

export type WinbackProps = {
  site: MarketingSite;
  firstName?: string;
  lastPurchase?: string;
  newestDrop: { name: string; imageUrl?: string };
  currency: Currency;
  /** Up to two pieces: one available now, one coming. */
  products: ProductTile[];
  newUrl: string;
  /** Switch the recipient to drop alerts only. */
  dropAlertsOnlyUrl: string;
};

/** Sent once to past buyers with no order or click in about six months; then stop. */
export default function Winback({
  site,
  firstName,
  lastPurchase,
  newestDrop,
  currency,
  products,
  newUrl,
  dropAlertsOnlyUrl,
}: WinbackProps) {
  return (
    <MarketingLayout site={site} preview="Here is what is new at Xarina since your last visit.">
      <EmailHero
        eyebrow="Since you were last here"
        title={firstName ? `We have missed you, ${firstName}.` : "We have missed you."}
        titleSize={48}
      >
        <EmailText>
          {lastPurchase ? (
            <>
              You last wore Xarina with <EmailStrong>{lastPurchase}</EmailStrong>. Here is what has been made
              since.
            </>
          ) : (
            "Here is what has been made since."
          )}
        </EmailText>
      </EmailHero>
      <Section style={{ padding: "0 48px 16px", position: "relative" }}>
        {newestDrop.imageUrl && (
          <Img
            src={newestDrop.imageUrl}
            alt={newestDrop.name}
            width={504}
            height={340}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        )}
        <Text
          style={{
            margin: "12px 0 0",
            fontFamily: DISPLAY_FONT,
            fontSize: 26,
            lineHeight: "30px",
            color: brandColour("ink", "light"),
          }}
        >
          {newestDrop.name}
        </Text>
      </Section>
      <EmailProductGrid
        products={products.slice(0, 2).map((p) => toProduct(p, currency))}
        imageHeight={220}
      />
      <EmailActions top={8}>
        <EmailButton href={newUrl}>See what is new</EmailButton>
        <EmailNote>
          Prefer fewer emails? <EmailLink href={dropAlertsOnlyUrl}>Choose drop alerts only</EmailLink>.
        </EmailNote>
      </EmailActions>
    </MarketingLayout>
  );
}

Winback.PreviewProps = {
  site: previewMarketingSite,
  firstName: "Amara",
  lastPurchase: "The Atelier Dress",
  newestDrop: { name: "Autumn Edit" },
  currency: "NGN",
  products: [
    { name: "The Arc Jacket", priceMinor: 12000000, note: "Available now" },
    { name: "The Noir Skirt", note: "Coming 2 December" },
  ],
  newUrl: "https://example.com/shop",
  dropAlertsOnlyUrl: "https://example.com/preferences/token",
} satisfies WinbackProps;
