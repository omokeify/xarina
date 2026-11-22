import type { MarketingSite } from "./layout";
import { DarkHeroImage, MarketingLayout } from "./marketing";
import { EmailButton, EmailHero, EmailNote, EmailActions, EmailText } from "./parts";
import { previewMarketingSite } from "./preview-data";

export type TeaserProps = {
  site: MarketingSite;
  dropName: string;
  imageUrl?: string;
  /** Preformatted launch date, e.g. "2 December". */
  opensOn: string;
  /** Preformatted time in WAT. */
  opensAtTime: string;
  /** Two sentences on the idea behind the drop. */
  story: string;
  waitlistUrl: string;
};

/** Sent 7 to 14 days before a drop to subscribers with marketing consent. Drives waitlist sign-ups. */
export default function Teaser({
  site,
  dropName,
  imageUrl,
  opensOn,
  opensAtTime,
  story,
  waitlistUrl,
}: TeaserProps) {
  return (
    <MarketingLayout site={site} preview={`A first look at ${dropName}, before anyone else.`}>
      <DarkHeroImage src={imageUrl} alt={dropName} height={620} caption={`Coming ${opensOn}`} />
      <EmailHero eyebrow="A first look" title={dropName} titleSize={50} top={44}>
        <EmailText>{story}</EmailText>
      </EmailHero>
      <EmailActions top={0}>
        <EmailButton href={waitlistUrl}>Join the waitlist</EmailButton>
        <EmailNote>
          Waitlisters hear first when it opens on {opensOn} at {opensAtTime}. Xarina Privé members shop
          earlier.
        </EmailNote>
      </EmailActions>
    </MarketingLayout>
  );
}

Teaser.PreviewProps = {
  site: previewMarketingSite,
  dropName: "Autumn Edit",
  opensOn: "2 December",
  opensAtTime: "09:00 WAT",
  story: "Sculpted silhouettes in deep ivory and noir, made for the long evenings of the season.",
  waitlistUrl: "https://example.com/p/atelier-dress",
} satisfies TeaserProps;
