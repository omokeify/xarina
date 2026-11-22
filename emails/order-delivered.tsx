import { Section, Text } from "@react-email/components";
import { brandColour, DISPLAY_FONT, LABEL_STYLE } from "./brand";
import { EmailLayout, type EmailSite } from "./layout";
import { EmailButton, EmailCard, EmailHero, EmailLink, EmailPhoto, EmailStrong, EmailText } from "./parts";
import { previewSite } from "./preview-data";

export type OrderDeliveredProps = {
  site: EmailSite;
  firstName?: string;
  orderNumber: string;
  deliveredOn: string;
  imageUrl?: string;
  /** Name of the first design in the order. */
  designName: string;
  /** Fabric and care text from the product page. */
  careText: string;
  /** Instagram handle without the @. */
  instagramHandle?: string;
  /** Days after delivery during which problems can be reported. */
  supportWindowDays?: number;
};

/** Sent when the order is marked delivered. */
export default function OrderDelivered({
  site,
  firstName,
  orderNumber,
  deliveredOn,
  imageUrl,
  designName,
  careText,
  instagramHandle,
  supportWindowDays,
}: OrderDeliveredProps) {
  return (
    <EmailLayout
      preview="Your Xarina order has arrived, plus how to care for it."
      site={site}
      nav="orders"
      reason="This is a service email about your order."
    >
      <EmailPhoto src={imageUrl} alt="Your order" height={440} />
      <EmailHero
        eyebrow={`Order ${orderNumber} · Delivered`}
        title={firstName ? `Wear it well, ${firstName}.` : "Wear it well."}
        titleSize={48}
        top={imageUrl ? 44 : 24}
      >
        <EmailText>Your order arrived on {deliveredOn}. We hope it makes every entrance.</EmailText>
      </EmailHero>
      <EmailCard>
        <Text style={{ ...LABEL_STYLE, margin: "0 0 10px", color: brandColour("ink-muted", "light") }}>
          Caring for {designName}
        </Text>
        <Text style={{ margin: 0, fontSize: 14, lineHeight: "22px", color: brandColour("ink", "light") }}>
          {careText}
        </Text>
      </EmailCard>
      <Section style={{ padding: "32px 48px", textAlign: "center" }}>
        {instagramHandle && (
          <>
            <Text style={{ margin: "0 0 14px", fontFamily: DISPLAY_FONT, fontSize: 26, lineHeight: "31px" }}>
              Share your look
            </Text>
            <EmailText muted>
              Tag <EmailStrong>@{instagramHandle}</EmailStrong> when you wear it. We love seeing Xarina out in
              the world.
            </EmailText>
            {site.instagramUrl && (
              <EmailButton variant="outline" href={site.instagramUrl}>
                Follow on Instagram
              </EmailButton>
            )}
          </>
        )}
        {site.whatsappUrl && (
          <EmailText muted>
            <br />
            Something not right with your order? <EmailLink href={site.whatsappUrl}>WhatsApp us</EmailLink>
            {supportWindowDays ? ` within ${supportWindowDays} days of delivery` : ""}.
          </EmailText>
        )}
      </Section>
    </EmailLayout>
  );
}

OrderDelivered.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  orderNumber: "XR-1042",
  deliveredOn: "5 December 2026",
  designName: "The Atelier Dress",
  careText: "Hand wash cold, dry flat in shade, steam on low.",
  instagramHandle: "xarina",
  supportWindowDays: 7,
} satisfies OrderDeliveredProps;
