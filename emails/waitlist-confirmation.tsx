import { Section } from "@react-email/components";
import { EmailLayout, type EmailSite } from "./layout";
import { EmailActions, EmailButton, EmailHero, EmailPhoto, EmailRows, EmailStrong, EmailText } from "./parts";
import { previewSite } from "./preview-data";

export type WaitlistConfirmationProps = {
  site: EmailSite;
  firstName?: string;
  productName: string;
  productUrl: string;
  imageUrl?: string;
  /** Preformatted in WAT, e.g. "2 December 2026 at 09:00 WAT". Omit if the drop has no date yet. */
  opensAt?: string;
  colour?: string;
  size?: string;
  dropAlerts: boolean;
};

/** WL-3: confirmation after joining the waitlist. Waitlist numbers are interest, never sales (rule 9). */
export default function WaitlistConfirmation({
  site,
  firstName,
  productName,
  productUrl,
  imageUrl,
  opensAt,
  colour,
  size,
  dropAlerts,
}: WaitlistConfirmationProps) {
  const rows = [
    colour && { label: "Preferred colour", value: colour },
    size && { label: "Preferred size", value: size },
  ].filter((r): r is { label: string; value: string } => Boolean(r));

  return (
    <EmailLayout
      preview={
        dropAlerts ? "We will email you the moment it opens." : `You are on the waitlist for ${productName}.`
      }
      site={site}
      reason={`You received this because you joined the waitlist for ${productName}.`}
    >
      <EmailPhoto src={imageUrl} alt={productName} height={520} />
      <EmailHero
        eyebrow="Waitlist confirmed"
        title={firstName ? `You are on the list, ${firstName}.` : "You are on the list."}
        top={imageUrl ? 40 : 24}
      >
        <EmailText>
          {dropAlerts ? (
            <>
              We will email you the moment <EmailStrong>{productName}</EmailStrong> opens
              {opensAt ? (
                <>
                  {" "}
                  on <EmailStrong>{opensAt}</EmailStrong>
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              You have joined the waitlist for <EmailStrong>{productName}</EmailStrong>. You did not ask for
              drop alerts, so we will not email you when it opens. You can change that by joining the waitlist
              again.
            </>
          )}
        </EmailText>
      </EmailHero>
      {rows.length > 0 && (
        <Section style={{ padding: "0 48px" }}>
          <EmailRows rows={rows} boxed />
        </Section>
      )}
      <EmailActions>
        <EmailButton href={productUrl}>View the piece</EmailButton>
        <EmailText muted>
          <br />
          Joining the waitlist does not reserve a piece. Pieces are limited and sell in order of payment when
          the drop opens.
        </EmailText>
      </EmailActions>
    </EmailLayout>
  );
}

WaitlistConfirmation.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  productName: "The Atelier Dress",
  productUrl: "https://example.com/p/atelier-dress",
  opensAt: "2 December 2026 at 09:00 WAT",
  colour: "Ivory",
  size: "M",
  dropAlerts: true,
} satisfies WaitlistConfirmationProps;
