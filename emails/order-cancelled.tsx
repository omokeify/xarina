import { Section, Text } from "@react-email/components";
import { formatMoney, type Currency } from "@/lib/money";
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
  EmailNote,
  EmailRows,
  EmailText,
} from "./parts";
import { previewLine, previewSite } from "./preview-data";

export type OrderCancelledProps = {
  site: EmailSite;
  firstName?: string;
  orderNumber: string;
  currency: Currency;
  items: OrderLine[];
  refundMinor: number;
  /** Why it was cancelled, in plain words, e.g. "as you requested". */
  reason: string;
  /** e.g. "Card ending 4242" or "Bank account". */
  refundedTo: string;
  issuedOn: string;
  /** e.g. "5 to 10". */
  expectedWorkingDays: string;
  shopUrl: string;
};

/** Sent when staff cancel a paid order and the refund is issued. */
export default function OrderCancelled(props: OrderCancelledProps) {
  const { site, firstName, orderNumber, currency } = props;
  return (
    <EmailLayout
      preview={`Your refund of ${currency} ${formatMoney(props.refundMinor, currency)} is on its way.`}
      site={site}
      nav="none"
      reason="This is a service email about your order."
    >
      <EmailHero eyebrow={`Order ${orderNumber} · Cancelled`} title="Your order has been cancelled.">
        <EmailText>
          {firstName ? `${firstName}, ` : ""}
          {props.reason}. We are sorry for any disappointment. Your full payment is being returned.
        </EmailText>
      </EmailHero>
      <EmailCard>
        <EmailRows
          rows={[
            {
              label: "Refund amount",
              value: (
                <strong
                  style={{ fontWeight: 600 }}
                >{`${currency} ${formatMoney(props.refundMinor, currency)}`}</strong>
              ),
            },
            { label: "Refunded to", value: props.refundedTo },
            { label: "Issued on", value: props.issuedOn },
            { label: "Expected in your account", value: `Within ${props.expectedWorkingDays} working days` },
          ]}
        />
      </EmailCard>
      <Section style={{ padding: "24px 48px 8px" }}>
        <Text style={{ ...LABEL_STYLE, margin: "0 0 16px", color: brandColour("ink-muted", "light") }}>
          Cancelled items
        </Text>
        {props.items.map((line) => (
          <EmailItemRow
            key={`${line.name}-${line.colour}-${line.size}`}
            item={toItem(line, currency)}
            thumb={64}
          />
        ))}
      </Section>
      <EmailActions>
        <EmailButton href={props.shopUrl}>Shop available pieces</EmailButton>
        <EmailNote>
          Have not received your refund in the time above?
          {site.whatsappUrl && (
            <>
              {" "}
              <EmailLink href={site.whatsappUrl}>WhatsApp us</EmailLink> with your order number.
            </>
          )}
        </EmailNote>
      </EmailActions>
    </EmailLayout>
  );
}

OrderCancelled.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  orderNumber: "XR-1042",
  currency: "NGN",
  items: [previewLine],
  refundMinor: 8500000,
  reason: "as you requested",
  refundedTo: "Card ending 4242",
  issuedOn: "21 November 2026",
  expectedWorkingDays: "5 to 10",
  shopUrl: "https://example.com/shop",
} satisfies OrderCancelledProps;
