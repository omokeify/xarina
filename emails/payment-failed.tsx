import { Section, Text } from "@react-email/components";
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

export type PaymentFailedProps = {
  site: EmailSite;
  firstName?: string;
  currency: Currency;
  items: OrderLine[];
  totalMinor: number;
  /** Takes the customer back to pay for the same order. The pieces are not reserved. */
  retryUrl: string;
  /** Name of the payment provider, e.g. "Paystack". */
  providerName?: string;
  /** Working days a bank typically takes to reverse a failed payment. */
  reversalDays?: string;
};

/** Sent when the provider reports a failed or abandoned payment. critical colour is for payment failures only. */
export default function PaymentFailed({
  site,
  firstName,
  currency,
  items,
  totalMinor,
  retryUrl,
  providerName,
  reversalDays,
}: PaymentFailedProps) {
  const label = { ...LABEL_STYLE, margin: "0 0 10px", color: brandColour("ink-muted", "light") } as const;
  return (
    <EmailLayout
      preview="Your order is not confirmed yet. You can try again."
      site={site}
      nav="none"
      reason="This is a service email about your checkout."
    >
      <EmailHero eyebrow="Payment unsuccessful" critical title="Your payment did not go through.">
        <EmailText>
          {firstName ? `${firstName}, we` : "We"} could not confirm payment for your order, so it has not been
          placed and the pieces are not reserved for you.
        </EmailText>
      </EmailHero>
      <EmailCard>
        {items.map((line) => (
          <EmailItemRow
            key={`${line.name}-${line.colour}-${line.size}`}
            item={toItem(line, currency)}
            thumb={72}
          />
        ))}
        <EmailRows
          rows={[
            {
              label: "Total",
              value: `${currency} ${formatMoney(totalMinor, currency)}`,
              strong: true,
              divider: true,
            },
          ]}
        />
      </EmailCard>
      <EmailActions>
        <EmailButton href={retryUrl}>Try payment again</EmailButton>
        {site.whatsappUrl && (
          <>
            <EmailGap />
            <EmailButton variant="outline" href={site.whatsappUrl}>
              Get help on WhatsApp
            </EmailButton>
          </>
        )}
      </EmailActions>
      <Section style={{ padding: "0 48px 32px" }}>
        <Text style={label}>Common fixes</Text>
        <EmailText align="left">
          Check your card allows online or international payments, try bank transfer instead, or use another
          card.
        </EmailText>
        <EmailText muted align="left">
          If money left your account, it was not taken by Xarina for this order. Your bank
          {providerName ? ` or ${providerName}` : ""} reverses failed payments
          {reversalDays ? `, usually within ${reversalDays} working days` : ""}.
        </EmailText>
      </Section>
    </EmailLayout>
  );
}

PaymentFailed.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  currency: "NGN",
  items: [previewLine],
  totalMinor: 8500000,
  retryUrl: "https://example.com/checkout?order=XR-1042",
  providerName: "Paystack",
  reversalDays: "3 to 5",
} satisfies PaymentFailedProps;
