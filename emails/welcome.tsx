import type { MarketingSite } from "./layout";
import { EmailLayout } from "./layout";
import { EmailActions, EmailButton, EmailGap, EmailHero, EmailPhoto, EmailSteps, EmailText } from "./parts";
import { previewMarketingSite } from "./preview-data";

export type WelcomeProps = {
  site: MarketingSite;
  firstName?: string;
  imageUrl?: string;
  /** Where Xarina delivers, in a few words, e.g. "locally and internationally". */
  deliveryReach: string;
  upcomingUrl: string;
  shopUrl: string;
};

/** Sent immediately after someone subscribes without joining a specific waitlist. */
export default function Welcome({
  site,
  firstName,
  imageUrl,
  deliveryReach,
  upcomingUrl,
  shopUrl,
}: WelcomeProps) {
  return (
    <EmailLayout
      preview="How our drops work, and how to be first."
      site={site}
      markSize={56}
      reason="You received this because you subscribed to Xarina news."
    >
      <EmailPhoto src={imageUrl} alt="Xarina" height={380} />
      <EmailHero
        title={firstName ? `Welcome, ${firstName}.` : "Welcome."}
        titleSize={48}
        top={imageUrl ? 44 : 16}
      >
        <EmailText>
          Xarina makes wearable statement pieces, released in small, limited drops. Here is how it works.
        </EmailText>
      </EmailHero>
      <EmailSteps
        ruled
        numeralSize={26}
        items={[
          {
            title: "We release in drops",
            body: "Each design is made in limited numbers and announced here first.",
          },
          {
            title: "Join the waitlist for what you love",
            body: "You will get an email the moment it opens.",
          },
          {
            title: "Shop what is available any time",
            body: `Pieces in stock are ready to order now, delivered ${deliveryReach}.`,
          },
        ]}
      />
      <EmailActions top={32}>
        <EmailButton href={upcomingUrl}>See upcoming drops</EmailButton>
        <EmailGap />
        <EmailButton variant="outline" href={shopUrl}>
          Shop available now
        </EmailButton>
      </EmailActions>
    </EmailLayout>
  );
}

Welcome.PreviewProps = {
  site: previewMarketingSite,
  firstName: "Amara",
  deliveryReach: "locally and internationally",
  upcomingUrl: "https://example.com/drops",
  shopUrl: "https://example.com/shop",
} satisfies WelcomeProps;
