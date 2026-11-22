import { EmailLayout, type EmailSite } from "./layout";
import {
  EmailActions,
  EmailButton,
  EmailCountdown,
  EmailHero,
  EmailPhoto,
  EmailStrong,
  EmailText,
} from "./parts";
import { previewSite } from "./preview-data";

export type PriveEarlyAccessProps = {
  site: EmailSite;
  firstName?: string;
  dropName: string;
  pitch?: string;
  imageUrl?: string;
  /** Preformatted in WAT. Omit when the email is sent at the moment Privé opens: the copy then says "now". */
  vipOpensAt?: string;
  publicOpensAt: string;
  /** Personal single-use access link (rule 7). */
  accessUrl: string;
  /** Preformatted, e.g. "4 December 2026". */
  linkExpiresOn?: string;
  /** Purchase limit per design per member. Omit if there is none. */
  limitPerMember?: number;
  /** Time until public opening, computed by the sender. Omit to hide the countdown. */
  countdown?: { days: string; hours: string; minutes: string };
};

/** DROP-4: Privé invite at VIP open. */
export default function PriveEarlyAccess(props: PriveEarlyAccessProps) {
  const {
    site,
    firstName,
    dropName,
    pitch,
    imageUrl,
    vipOpensAt,
    publicOpensAt,
    accessUrl,
    linkExpiresOn,
    limitPerMember,
    countdown,
  } = props;
  return (
    <EmailLayout
      theme="dark"
      brand="Xarina Privé"
      markSize={40}
      preview="Your personal early-access link is inside."
      site={site}
      reason="You received this as a Xarina Privé member who asked for drop alerts."
    >
      <EmailPhoto theme="dark" src={imageUrl} alt={dropName} height={460} inset={32} />
      <EmailHero
        theme="dark"
        eyebrow="Members only · Early access"
        title={`${dropName} opens for you first.`}
        top={imageUrl ? 48 : 24}
      >
        <EmailText theme="dark">
          {firstName ? `${firstName}, as` : "As"} a Xarina Privé member you can shop the drop{" "}
          {vipOpensAt ? (
            <>
              from <EmailStrong>{vipOpensAt}</EmailStrong>
            </>
          ) : (
            <EmailStrong>now</EmailStrong>
          )}
          , before it opens to everyone on {publicOpensAt}.
        </EmailText>
        {pitch && (
          <EmailText theme="dark" muted>
            {pitch}
          </EmailText>
        )}
        {countdown && (
          <EmailCountdown
            theme="dark"
            units={[
              { value: countdown.days, label: "DAYS" },
              { value: countdown.hours, label: "HRS" },
              { value: countdown.minutes, label: "MIN" },
            ]}
          />
        )}
      </EmailHero>
      <EmailActions top={0}>
        <EmailButton theme="dark" href={accessUrl}>
          Enter Privé
        </EmailButton>
        <EmailText theme="dark" muted>
          <br />
          This link is personal to you and works once
          {linkExpiresOn ? ` and expires on ${linkExpiresOn}` : ""}. Please do not forward it.
          {limitPerMember ? ` Limit ${limitPerMember} per design per member.` : ""}
        </EmailText>
      </EmailActions>
    </EmailLayout>
  );
}

PriveEarlyAccess.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  dropName: "Autumn Edit",
  pitch: "Sculpted silhouettes, made to make an entrance.",
  vipOpensAt: "2 December 2026 at 09:00 WAT",
  publicOpensAt: "4 December 2026 at 09:00 WAT",
  accessUrl: "https://example.com/access/token",
  linkExpiresOn: "4 December 2026",
  limitPerMember: 2,
  countdown: { days: "02", hours: "14", minutes: "30" },
} satisfies PriveEarlyAccessProps;
