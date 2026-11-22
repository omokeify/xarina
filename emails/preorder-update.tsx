import { Section } from "@react-email/components";
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
  EmailText,
  EmailTimeline,
} from "./parts";
import type { Currency } from "@/lib/money";
import { previewLine, previewSite } from "./preview-data";

export type PreorderUpdateProps = {
  site: EmailSite;
  firstName?: string;
  orderNumber: string;
  currency: Currency;
  item: OrderLine;
  paidOn: string;
  /** Which stage the order is at. */
  stage: "production" | "quality_check" | "dispatch";
  /** Optional note from the studio for the current stage. */
  studioNote?: string;
  qualityCheckBy?: string;
  dispatchBy: string;
  orderUrl: string;
};

/** Only if Xarina sells preorders (open decision): sent at each stage change or when the dispatch date moves. */
export default function PreorderUpdate(props: PreorderUpdateProps) {
  const { site, firstName, orderNumber, currency, item, stage } = props;
  const order = ["production", "quality_check", "dispatch"] as const;
  const at = order.indexOf(stage);
  const state = (i: number) => (i < at ? "done" : i === at ? "current" : "upcoming");
  return (
    <EmailLayout
      preview={`Your piece is in production. Expected dispatch: ${props.dispatchBy}.`}
      site={site}
      nav="none"
      reason="This is a service email about your order."
    >
      <EmailHero eyebrow={`Preorder ${orderNumber}`} title="Your piece is being made.">
        <EmailText>
          {firstName ? `${firstName}, here` : "Here"} is where your preorder is. We will keep you posted until
          it is on its way.
        </EmailText>
      </EmailHero>
      <EmailCard>
        <EmailTimeline
          stages={[
            { title: "Order placed and paid", note: props.paidOn, state: "done" },
            {
              title: "In production",
              note: [
                at === 0 ? "Now" : state(0) === "done" ? "Complete" : "",
                at === 0 ? props.studioNote : "",
              ]
                .filter(Boolean)
                .join(" · "),
              state: state(0),
            },
            {
              title: "Quality check",
              note:
                at === 1
                  ? ["Now", props.studioNote].filter(Boolean).join(" · ")
                  : state(1) === "done"
                    ? "Complete"
                    : `Expected ${props.qualityCheckBy ?? props.dispatchBy}`,
              state: state(1),
            },
            { title: "Dispatch", note: at === 2 ? "Now" : `Expected ${props.dispatchBy}`, state: state(2) },
          ]}
        />
      </EmailCard>
      <Section style={{ padding: "24px 48px 8px" }}>
        <EmailItemRow item={toItem(item, currency, { price: false })} thumb={64} />
      </Section>
      <EmailActions>
        <EmailButton href={props.orderUrl}>View your order</EmailButton>
        <EmailNote>
          If the dispatch date changes, we will tell you straight away.
          {site.whatsappUrl && (
            <>
              {" "}
              Questions? <EmailLink href={site.whatsappUrl}>WhatsApp us</EmailLink>.
            </>
          )}
        </EmailNote>
      </EmailActions>
    </EmailLayout>
  );
}

PreorderUpdate.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  orderNumber: "XR-1042",
  currency: "NGN",
  item: previewLine,
  paidOn: "20 November 2026",
  stage: "production",
  studioNote: "Hand-finishing has started",
  qualityCheckBy: "1 December 2026",
  dispatchBy: "3 December 2026",
  orderUrl: "https://example.com/orders/XR-1042",
} satisfies PreorderUpdateProps;
