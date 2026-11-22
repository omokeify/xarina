import { Column, Row, Section, Text } from "@react-email/components";
import { formatMoney, type Currency } from "@/lib/money";
import { brandColour, LABEL_STYLE } from "./brand";
import { toItem, type OrderLine } from "./items";
import { EmailLayout, type EmailSite } from "./layout";
import {
  EmailActions,
  EmailButton,
  EmailCard,
  EmailGap,
  EmailHero,
  EmailItemRow,
  EmailRows,
  EmailText,
} from "./parts";
import { previewLine, previewSite } from "./preview-data";

export type OrderConfirmationProps = {
  site: EmailSite;
  firstName?: string;
  orderNumber: string;
  currency: Currency;
  items: OrderLine[];
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  /** Delivery zone label, e.g. "Lagos". */
  deliveryZone?: string;
  deliverTo: string;
  /** e.g. "3 to 5 working days". */
  dispatchTiming?: string;
  /** e.g. "Card" or "Bank transfer". */
  paidWith?: string;
  /** Preformatted payment date. */
  paidOn?: string;
  orderUrl?: string;
};

/** PAY-6: sent only after the verified paid webhook (rule 2). Voice: short, no exclamation marks. */
export function OrderConfirmation(props: OrderConfirmationProps) {
  const { site, currency, firstName, orderNumber } = props;
  const label = { ...LABEL_STYLE, margin: "0 0 8px", color: brandColour("ink-muted", "light") } as const;
  const body = { margin: 0, fontSize: 14, lineHeight: "22px", color: brandColour("ink", "light") } as const;
  return (
    <EmailLayout
      preview="Thank you. Your payment was successful."
      site={site}
      nav="orders"
      reason="This is a service email about your order."
    >
      <EmailHero
        eyebrow={`Order ${orderNumber} · Paid`}
        title={firstName ? `Thank you, ${firstName}.` : "Thank you."}
      >
        <EmailText>
          Your payment was successful and your order is confirmed. We will email you again when it is on its
          way.
        </EmailText>
      </EmailHero>

      <EmailCard>
        {props.items.map((line, i) => (
          <EmailItemRow
            key={`${line.name}-${line.colour}-${line.size}`}
            item={toItem(line, currency)}
            divider={i > 0}
          />
        ))}
        <EmailGap size={4} />
        <EmailRows
          rows={[
            { label: "Subtotal", value: formatMoney(props.subtotalMinor, currency) },
            {
              label: props.deliveryZone ? `Delivery · ${props.deliveryZone}` : "Delivery",
              value: formatMoney(props.shippingMinor, currency),
            },
            {
              label: "Total paid",
              value: `${currency} ${formatMoney(props.totalMinor, currency)}`,
              strong: true,
              divider: true,
            },
          ]}
        />
      </EmailCard>

      <Section style={{ padding: "32px 48px" }}>
        <Row>
          <Column style={{ width: "50%", verticalAlign: "top", paddingRight: 12 }}>
            <Text style={label}>Delivering to</Text>
            <Text style={body}>{props.deliverTo}</Text>
          </Column>
          <Column style={{ width: "50%", verticalAlign: "top", paddingLeft: 12 }}>
            <Text style={label}>Delivery</Text>
            <Text style={body}>
              {props.dispatchTiming
                ? `Dispatches within ${props.dispatchTiming}.`
                : "We will confirm dispatch by email."}
              {props.paidWith && props.paidOn && (
                <>
                  <br />
                  Paid by {props.paidWith} on {props.paidOn}.
                </>
              )}
            </Text>
          </Column>
        </Row>
      </Section>

      <EmailActions top={0}>
        <EmailButton href={props.orderUrl ?? `${site.siteUrl}/shop`}>
          {props.orderUrl ? "View your order" : "Continue shopping"}
        </EmailButton>
        {site.whatsappUrl && (
          <>
            <EmailGap />
            <EmailButton variant="outline" href={site.whatsappUrl}>
              Questions? WhatsApp us
            </EmailButton>
          </>
        )}
      </EmailActions>
    </EmailLayout>
  );
}

OrderConfirmation.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  orderNumber: "XR-1042",
  currency: "NGN",
  items: [
    previewLine,
    { ...previewLine, name: "The Arc Jacket", colour: "Noir", size: "S", unitPriceMinor: 12000000 },
  ],
  subtotalMinor: 20500000,
  shippingMinor: 500000,
  totalMinor: 21000000,
  deliveryZone: "Lagos",
  deliverTo: "Amara Okafor, 12 Admiralty Way, Lekki, Lagos, Nigeria",
  dispatchTiming: "3 working days",
  paidWith: "Card",
  paidOn: "20 November 2026",
  orderUrl: "https://example.com/orders/XR-1042",
} satisfies OrderConfirmationProps;

export default OrderConfirmation;
