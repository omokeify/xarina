import { EmailLayout, type EmailSite } from "./layout";
import {
  EmailActions,
  EmailButton,
  EmailCard,
  EmailEyebrow,
  EmailHero,
  EmailNote,
  EmailRows,
  EmailStrong,
  EmailText,
} from "./parts";
import { previewSite } from "./preview-data";

export type StaffInvitationProps = {
  site: EmailSite;
  inviterName: string;
  role: string;
  /** What this role can do, from the PRD role list. */
  permissions: string;
  staffEmail: string;
  expiresOn: string;
  acceptUrl: string;
  /** Who to tell if the invite was not expected. */
  ownerEmail: string;
};

/** Sent when an Owner or Manager adds a staff member. A security email. */
export default function StaffInvitation({
  site,
  inviterName,
  role,
  permissions,
  staffEmail,
  expiresOn,
  acceptUrl,
  ownerEmail,
}: StaffInvitationProps) {
  return (
    <EmailLayout
      preview={`Accept by ${expiresOn} to set up your staff account.`}
      site={{ ...site, unsubscribeUrl: undefined, preferencesUrl: undefined }}
      nav="none"
      headerNote="Studio admin"
      reason="This is a security email for the Xarina admin."
    >
      <EmailHero title="You are invited to join the team.">
        <EmailText>
          {inviterName} has added you to the Xarina admin as <EmailStrong>{role}</EmailStrong>.
        </EmailText>
      </EmailHero>
      <EmailCard>
        <EmailEyebrow align="left">As {role} you can</EmailEyebrow>
        <EmailText align="left">{permissions}</EmailText>
        <EmailRows
          rows={[
            { label: "Your login email", value: staffEmail, divider: true },
            { label: "Invitation expires", value: expiresOn },
          ]}
        />
      </EmailCard>
      <EmailActions top={32}>
        <EmailButton href={acceptUrl}>Accept invitation</EmailButton>
        <EmailNote>
          You will sign in with a one-time code sent to this email. Never share codes or this link. Not
          expecting this? Ignore it, or tell {ownerEmail}.
        </EmailNote>
      </EmailActions>
    </EmailLayout>
  );
}

StaffInvitation.PreviewProps = {
  site: previewSite,
  inviterName: "Ada Obi",
  role: "Fulfilment",
  permissions: "View paid orders, update fulfilment status and add tracking.",
  staffEmail: "staff@example.com",
  expiresOn: "27 November 2026",
  acceptUrl: "https://example.com/admin/accept/token",
  ownerEmail: "owner@example.com",
} satisfies StaffInvitationProps;
