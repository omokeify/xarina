import type { Currency } from "@/lib/money";
import type { MarketingSite } from "./layout";
import { MarketingLayout } from "./marketing";
import { toProduct, type ProductTile } from "./items";
import { EmailActions, EmailButton, EmailHero, EmailPhoto, EmailProductGrid, EmailText } from "./parts";
import { previewMarketingSite } from "./preview-data";

export type OccasionProps = {
  site: MarketingSite;
  /** e.g. "wedding season", "Eid", "Christmas". */
  occasion: string;
  imageUrl?: string;
  /** Last order date that still delivers in time, with the zone, preformatted. */
  orderBy: string;
  deliverBefore: string;
  zone: string;
  /** One sentence on what the season calls for. */
  intro: string;
  currency: Currency;
  /** Up to four pieces. */
  products: ProductTile[];
  shopUrl: string;
};

/** Sent 3 to 4 weeks before a big season, with a clear order-by date for delivery. */
export default function Occasion({
  site,
  occasion,
  imageUrl,
  orderBy,
  deliverBefore,
  zone,
  intro,
  currency,
  products,
  shopUrl,
}: OccasionProps) {
  return (
    <MarketingLayout
      site={site}
      preview={`Pieces for ${occasion}. Order by ${orderBy}.`}
      banner={`Order by ${orderBy} for delivery before ${deliverBefore} · ${zone}`}
    >
      <EmailPhoto src={imageUrl} alt={`The ${occasion} edit`} height={400} />
      <EmailHero
        eyebrow={`The ${occasion} edit`}
        title="Made to be noticed."
        titleSize={48}
        rule={false}
        top={imageUrl ? 40 : 24}
      >
        <EmailText>{intro}</EmailText>
      </EmailHero>
      <EmailProductGrid
        products={products.slice(0, 4).map((p) => toProduct(p, currency))}
        imageHeight={220}
      />
      <EmailActions top={4}>
        <EmailButton href={shopUrl}>Shop the edit</EmailButton>
      </EmailActions>
    </MarketingLayout>
  );
}

Occasion.PreviewProps = {
  site: previewMarketingSite,
  occasion: "Christmas",
  orderBy: "10 December",
  deliverBefore: "23 December",
  zone: "Lagos",
  intro: "The season calls for pieces that hold a room. These do.",
  currency: "NGN",
  products: [
    { name: "The Atelier Dress", priceMinor: 8500000 },
    { name: "The Arc Jacket", priceMinor: 12000000 },
    { name: "The Noir Skirt", priceMinor: 6500000 },
    { name: "The Halo Top", priceMinor: 4500000 },
  ],
  shopUrl: "https://example.com/shop",
} satisfies OccasionProps;
