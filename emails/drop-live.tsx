import { Section } from "@react-email/components";
import { formatMoney, type Currency } from "@/lib/money";
import { EmailLayout, type EmailSite } from "./layout";
import {
  EmailActions,
  EmailButton,
  EmailEyebrow,
  EmailHeading,
  EmailNote,
  EmailPhoto,
  EmailPitch,
  EmailProductGrid,
} from "./parts";
import type { ProductTile } from "./items";
import { previewSite } from "./preview-data";

export type DropLiveProps = {
  site: EmailSite;
  dropName: string;
  pitch?: string;
  imageUrl?: string;
  shopUrl: string;
  currency?: Currency;
  /** Up to two featured designs. */
  products?: ProductTile[];
};

/** DROP-4: launch alert at public open. */
export default function DropLive({
  site,
  dropName,
  pitch,
  imageUrl,
  shopUrl,
  currency = "NGN",
  products = [],
}: DropLiveProps) {
  return (
    <EmailLayout
      preview="The pieces you waited for are available now."
      site={site}
      reason={`You received this because you asked to hear when ${dropName} opens.`}
    >
      <EmailPhoto src={imageUrl} alt={dropName} height={460} />
      <Section style={{ padding: `${imageUrl ? 44 : 24}px 48px 32px`, textAlign: "center" }}>
        <EmailEyebrow>Now available</EmailEyebrow>
        <EmailHeading size={52}>{`${dropName} is live.`}</EmailHeading>
        {pitch && <EmailPitch>{pitch}</EmailPitch>}
        <EmailButton href={shopUrl}>Shop the drop</EmailButton>
      </Section>
      {products.length > 0 && (
        <EmailProductGrid
          products={products.slice(0, 2).map((p) => ({
            name: p.name,
            price: p.priceMinor === undefined ? undefined : formatMoney(p.priceMinor, currency),
            imageUrl: p.imageUrl,
            href: p.href,
          }))}
        />
      )}
      <EmailActions top={0}>
        <EmailNote>
          Pieces are limited and sell in order of payment. Being on the waitlist does not hold stock.
        </EmailNote>
      </EmailActions>
    </EmailLayout>
  );
}

DropLive.PreviewProps = {
  site: previewSite,
  dropName: "Autumn Edit",
  pitch: "Sculpted silhouettes, made to make an entrance.",
  shopUrl: "https://example.com/shop",
  products: [
    { name: "The Atelier Dress", priceMinor: 8500000 },
    { name: "The Arc Jacket", priceMinor: 12000000 },
  ],
} satisfies DropLiveProps;
