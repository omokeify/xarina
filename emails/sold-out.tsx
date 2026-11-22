import { EmailLayout, type EmailSite } from "./layout";
import { EmailBand, EmailButton, EmailEyebrow, EmailHero, EmailPhoto, EmailText } from "./parts";
import { previewSite } from "./preview-data";

export type SoldOutProps = {
  site: EmailSite;
  firstName?: string;
  dropName: string;
  imageUrl?: string;
  restockAlertUrl: string;
  shopUrl: string;
};

/** Sent when every variant of a design sells out, to waitlisters who did not buy it. Sold Out is ink-muted, never red. */
export default function SoldOut({
  site,
  firstName,
  dropName,
  imageUrl,
  restockAlertUrl,
  shopUrl,
}: SoldOutProps) {
  return (
    <EmailLayout
      preview="Thank you for the love. Here is how to be first next time."
      site={site}
      reason={`You received this because you joined the waitlist for ${dropName}.`}
    >
      <EmailPhoto src={imageUrl} alt={dropName} height={420} />
      <EmailHero eyebrow="Sold out" title={`${dropName} found its people.`} top={imageUrl ? 44 : 24}>
        <EmailText>
          Every piece has gone. Thank you for waiting with us{firstName ? `, ${firstName}` : ""}. If we
          restock a size or colour, you can be the first to know.
        </EmailText>
        <EmailButton href={restockAlertUrl}>Request a restock alert</EmailButton>
      </EmailHero>
      <EmailBand>
        <EmailEyebrow>Available now</EmailEyebrow>
        <EmailText>Pieces you can wear this week.</EmailText>
        <EmailButton variant="link" href={shopUrl}>
          Shop available pieces
        </EmailButton>
      </EmailBand>
    </EmailLayout>
  );
}

SoldOut.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  dropName: "Autumn Edit",
  restockAlertUrl: "https://example.com/p/atelier-dress#restock",
  shopUrl: "https://example.com/shop",
} satisfies SoldOutProps;
