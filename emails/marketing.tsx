import { Column, Img, Row, Section, Text } from "@react-email/components";
import { Fragment } from "react";
import { brandColour, DISPLAY_FONT, LABEL_STYLE } from "./brand";
import { EmailLayout, type MarketingSite } from "./layout";

/**
 * Marketing emails need marketing consent and an unsubscribe link (rule 12).
 * `MarketingSite` makes `unsubscribeUrl` required, so a marketing template cannot be rendered without one.
 */
export function MarketingLayout({
  site,
  preview,
  banner,
  children,
}: {
  site: MarketingSite;
  preview: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <EmailLayout
      preview={preview}
      site={site}
      banner={banner}
      reason="You received this because you subscribed to Xarina news."
    >
      {children}
    </EmailLayout>
  );
}

/** Tall dark image block with optional overlay line, used by the teaser. */
export function DarkHeroImage({
  src,
  alt,
  height,
  caption,
}: {
  src?: string;
  alt: string;
  height: number;
  caption?: string;
}) {
  const ink = brandColour("ink", "light");
  if (!src) {
    return caption ? (
      <Section style={{ backgroundColor: ink, padding: "48px 0", textAlign: "center" }}>
        <Text
          style={{
            margin: 0,
            fontFamily: DISPLAY_FONT,
            fontStyle: "italic",
            fontSize: 26,
            color: brandColour("on-action", "light"),
          }}
        >
          {caption}
        </Text>
      </Section>
    ) : null;
  }
  return (
    <Section style={{ backgroundColor: ink }}>
      <Img
        src={src}
        alt={alt}
        width={600}
        height={height}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
      {caption && (
        <Text
          style={{
            margin: 0,
            padding: "16px 0 24px",
            textAlign: "center",
            fontFamily: DISPLAY_FONT,
            fontStyle: "italic",
            fontSize: 26,
            color: brandColour("on-action", "light"),
          }}
        >
          {caption}
        </Text>
      )}
    </Section>
  );
}

/** One styled look: image beside a label, name and note. `flip` swaps sides. */
export function LookRow({
  index,
  label,
  name,
  note,
  imageUrl,
  flip,
}: {
  index: number;
  label: string;
  name: string;
  note: string;
  imageUrl?: string;
  flip?: boolean;
}) {
  const image = (
    <Column
      key="img"
      style={{ width: "50%", verticalAlign: "middle", padding: flip ? "0 0 0 10px" : "0 10px 0 0" }}
    >
      {imageUrl && (
        <Img
          src={imageUrl}
          alt={name}
          width={252}
          height={260}
          style={{ display: "block", width: "100%", height: 260, objectFit: "cover" }}
        />
      )}
    </Column>
  );
  const text = (
    <Column
      key="txt"
      style={{ width: "50%", verticalAlign: "middle", padding: flip ? "0 10px 0 0" : "0 0 0 10px" }}
    >
      <Text
        style={{ ...LABEL_STYLE, margin: 0, color: brandColour("ink-muted", "light") }}
      >{`${String(index).padStart(2, "0")} · ${label}`}</Text>
      <Text style={{ margin: "6px 0", fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: "28px" }}>
        {name}
      </Text>
      <Text style={{ margin: 0, fontSize: 14, lineHeight: "22px", color: brandColour("ink-muted", "light") }}>
        {note}
      </Text>
    </Column>
  );
  return (
    <Row>
      <Fragment>{flip ? [text, image] : [image, text]}</Fragment>
    </Row>
  );
}
