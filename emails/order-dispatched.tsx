import { Section, Text } from "@react-email/components";
import { brandColour, LABEL_STYLE } from "./brand";
import { toItem, type OrderLine } from "./items";
import { EmailLayout, type EmailSite } from "./layout";
import {
  EmailActions,
  EmailButton,
  EmailCard,
  EmailHero,
  EmailItemRow,
  EmailLink,
  EmailPhoto,
  EmailRows,
  EmailStrong,
  EmailText,
} from "./parts";
import type { Currency } from "@/lib/money";
import { previewLine, previewSite } from "./preview-data";

export type OrderDispatchedProps = {
  site: EmailSite;
  firstName?: string;
  orderNumber: string;
  currency: Currency;
  items: OrderLine[];
  /** Preformatted, e.g. "4 to 6 December". */
  expectedDelivery?: string;
  courier: string;
  trackingNumber: string;
  trackingUrl: string;
  deliverToCity: string;
  imageUrl?: string;
  /** From the product page, for the first item. */
  careTip?: string;
};

/** Sent when staff mark an order dispatched and add tracking. */
export default function OrderDispatched(props: OrderDispatchedProps) {
  const { site, firstName, orderNumber, currency } = props;
  return (
    <EmailLayout
      preview={`Order ${orderNumber} has left our studio. Track it here.`}
      site={site}
      nav="orders"
      reason="This is a service email about your order."
    >
      <EmailPhoto src={props.imageUrl} alt="Your parcel" height={360} />
      <EmailHero
        eyebrow={`Order ${orderNumber} · Dispatched`}
        title="Your order is on its way."
        top={props.imageUrl ? 44 : 24}
      >
        <EmailText>
          {firstName ? `${firstName}, your` : "Your"} pieces have left our studio.
          {props.expectedDelivery && (
            <>
              {" "}
              Expected delivery: <EmailStrong>{props.expectedDelivery}</EmailStrong>.
            </>
          )}
        </EmailText>
      </EmailHero>
      <EmailCard>
        <EmailRows
          rows={[
            { label: "Courier", value: props.courier },
            {
              label: "Tracking number",
              value: <strong style={{ fontWeight: 600 }}>{props.trackingNumber}</strong>,
            },
            { label: "Delivering to", value: props.deliverToCity },
          ]}
        />
      </EmailCard>
      <EmailActions top={28}>
        <EmailButton href={props.trackingUrl}>Track your order</EmailButton>
      </EmailActions>
      <Section style={{ padding: "8px 48px 32px" }}>
        <Text style={{ ...LABEL_STYLE, margin: "0 0 16px", color: brandColour("ink-muted", "light") }}>
          In this parcel
        </Text>
        {props.items.map((line) => (
          <EmailItemRow
            key={`${line.name}-${line.colour}-${line.size}`}
            item={toItem(line, currency, { price: false })}
            thumb={64}
          />
        ))}
        <EmailText muted align="left">
          {props.careTip ? `Care tip: ${props.careTip} ` : ""}
          {site.whatsappUrl ? (
            <>
              Questions about your delivery? <EmailLink href={site.whatsappUrl}>WhatsApp us</EmailLink>.
            </>
          ) : null}
        </EmailText>
      </Section>
    </EmailLayout>
  );
}

OrderDispatched.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  orderNumber: "XR-1042",
  currency: "NGN",
  items: [previewLine],
  expectedDelivery: "4 to 6 December",
  courier: "DHL Express",
  trackingNumber: "1234567890",
  trackingUrl: "https://example.com/track/1234567890",
  deliverToCity: "Lagos, Nigeria",
  careTip: "Hand wash cold and dry flat in shade.",
} satisfies OrderDispatchedProps;
