import { Column, Img, Row, Section } from "@react-email/components";
import type { MarketingSite } from "./layout";
import { MarketingLayout } from "./marketing";
import { EmailActions, EmailButton, EmailEyebrow, EmailHeading, EmailPitch, EmailSteps } from "./parts";
import { previewMarketingSite } from "./preview-data";

export type StoryProps = {
  site: MarketingSite;
  designName: string;
  /** Issue number, e.g. "01". */
  issue: string;
  /** One-line pull quote from the designer. */
  quote: string;
  sketchUrl?: string;
  fabricUrl?: string;
  idea: string;
  fabric: string;
  making: string;
  designUrl: string;
};

/** Sent between teaser and launch, or after launch to sell remaining pieces. */
export default function Story({
  site,
  designName,
  issue,
  quote,
  sketchUrl,
  fabricUrl,
  idea,
  fabric,
  making,
  designUrl,
}: StoryProps) {
  return (
    <MarketingLayout site={site} preview="From first sketch to final drape.">
      <Section style={{ padding: "16px 48px 28px", textAlign: "left" }}>
        <EmailEyebrow align="left">{`Behind the design · No. ${issue}`}</EmailEyebrow>
        <EmailHeading align="left">{`How ${designName} came to be.`}</EmailHeading>
        <EmailPitch>{quote}</EmailPitch>
      </Section>
      {(sketchUrl || fabricUrl) && (
        <Section style={{ padding: "0 48px" }}>
          <Row>
            {[sketchUrl, fabricUrl].map((src, i) => (
              <Column key={i} style={{ width: "50%", padding: i === 0 ? "0 4px 0 0" : "0 0 0 4px" }}>
                {src && (
                  <Img
                    src={src}
                    alt={i === 0 ? "Sketch" : "Fabric"}
                    width={252}
                    height={300}
                    style={{ display: "block", width: "100%", height: 300, objectFit: "cover" }}
                  />
                )}
              </Column>
            ))}
          </Row>
        </Section>
      )}
      <div style={{ height: 20 }} />
      <EmailSteps
        items={[
          { title: "The idea", body: idea },
          { title: "The fabric", body: fabric },
          { title: "The making", body: making },
        ]}
      />
      <EmailActions>
        <EmailButton href={designUrl}>{`See ${designName}`}</EmailButton>
      </EmailActions>
    </MarketingLayout>
  );
}

Story.PreviewProps = {
  site: previewMarketingSite,
  designName: "The Atelier Dress",
  issue: "01",
  quote: "I wanted a dress that arrives before you do.",
  idea: "It began with a sketch of a single sweeping line, from shoulder to hem.",
  fabric: "A heavy crepe that holds its shape and moves when you do.",
  making: "Hand-finished seams and a hidden corset, about nine hours per piece.",
  designUrl: "https://example.com/p/atelier-dress",
} satisfies StoryProps;
