import { Section } from "@react-email/components";
import type { MarketingSite } from "./layout";
import { LookRow, MarketingLayout } from "./marketing";
import { EmailActions, EmailButton, EmailHero, EmailText } from "./parts";
import { previewMarketingSite } from "./preview-data";

export type StylingProps = {
  site: MarketingSite;
  designName: string;
  /** Three looks: day, celebration, evening. */
  looks: { label: string; name: string; note: string; imageUrl?: string }[];
  shopUrl: string;
};

/** Sent after launch to sell Available Now pieces; also useful for buyers who want ideas. */
export default function Styling({ site, designName, looks, shopUrl }: StylingProps) {
  return (
    <MarketingLayout site={site} preview={`How to style ${designName} from day to evening.`}>
      <EmailHero eyebrow="The styling edit" title="One piece, three entrances." titleSize={48} top={16}>
        <EmailText>{designName}, styled for the moments it was made for.</EmailText>
      </EmailHero>
      <Section style={{ padding: "0 48px" }}>
        {looks.map((look, i) => (
          <div key={look.name} style={{ paddingBottom: 28 }}>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <LookRow
                  index={i + 1}
                  label={look.label}
                  name={look.name}
                  note={look.note}
                  imageUrl={look.imageUrl}
                  flip={i % 2 === 1}
                />
              </tbody>
            </table>
          </div>
        ))}
      </Section>
      <EmailActions top={4}>
        <EmailButton href={shopUrl}>{`Shop ${designName}`}</EmailButton>
      </EmailActions>
    </MarketingLayout>
  );
}

Styling.PreviewProps = {
  site: previewMarketingSite,
  designName: "The Atelier Dress",
  looks: [
    { label: "Day", name: "Quiet confidence", note: "Flat sandals, minimal gold, hair down." },
    { label: "Celebration", name: "Centre of the room", note: "Statement earrings, a structured clutch." },
    { label: "Evening", name: "After dark", note: "Heels, a bold lip, hair swept up." },
  ],
  shopUrl: "https://example.com/p/atelier-dress",
} satisfies StylingProps;
