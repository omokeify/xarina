import { Column, Img, Row, Section } from "@react-email/components";
import { formatMoney, type Currency } from "@/lib/money";
import { brandColour } from "./brand";
import { EmailLayout, type EmailSite } from "./layout";
import {
  EmailActions,
  EmailButton,
  EmailEyebrow,
  EmailHeading,
  EmailLink,
  EmailNote,
  EmailStrong,
  EmailText,
} from "./parts";
import { previewSite } from "./preview-data";

export type RestockProps = {
  site: EmailSite;
  productName: string;
  productUrl: string;
  imageUrl?: string;
  colour: string;
  size: string;
  priceMinor: number;
  currency: Currency;
};

/** WL restock alert: only to people who asked for this design in this size or colour. */
export default function Restock({
  site,
  productName,
  productUrl,
  imageUrl,
  colour,
  size,
  priceMinor,
  currency,
}: RestockProps) {
  return (
    <EmailLayout
      preview="You asked us to tell you. Stock is limited."
      site={site}
      reason={`You received this because you asked for a restock alert on ${productName}.`}
    >
      <Section>
        <Row>
          {imageUrl && (
            <Column style={{ width: 300, verticalAlign: "middle" }}>
              <Img
                src={imageUrl}
                alt={productName}
                width={300}
                height={420}
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </Column>
          )}
          <Column style={{ padding: 32, verticalAlign: "middle", textAlign: "left" }}>
            <EmailEyebrow align="left">Back in stock</EmailEyebrow>
            <EmailHeading size={38} align="left">{`${productName} is back.`}</EmailHeading>
            <div
              style={{
                width: 48,
                borderTop: `2px solid ${brandColour("accent", "light")}`,
                margin: "0 0 16px",
              }}
            />
            <EmailText align="left">
              Now available in <EmailStrong>{colour}</EmailStrong>, size <EmailStrong>{size}</EmailStrong>.
            </EmailText>
            <EmailText align="left" muted>
              {formatMoney(priceMinor, currency)}
            </EmailText>
          </Column>
        </Row>
      </Section>
      <EmailActions top={40}>
        <EmailButton href={productUrl}>Shop now</EmailButton>
        <EmailNote>
          Restocked quantities are small and are not held for anyone.
          {site.whatsappUrl && (
            <>
              {" "}
              Need help with sizing? <EmailLink href={site.whatsappUrl}>Message us on WhatsApp</EmailLink>.
            </>
          )}
        </EmailNote>
      </EmailActions>
    </EmailLayout>
  );
}

Restock.PreviewProps = {
  site: previewSite,
  productName: "The Atelier Dress",
  productUrl: "https://example.com/p/atelier-dress",
  colour: "Ivory",
  size: "M",
  priceMinor: 8500000,
  currency: "NGN",
} satisfies RestockProps;
