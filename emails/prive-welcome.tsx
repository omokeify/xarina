import { EmailLayout, type EmailSite } from "./layout";
import { EmailActions, EmailButton, EmailHero, EmailSteps, EmailText } from "./parts";
import { previewSite } from "./preview-data";

export type PriveWelcomeProps = {
  site: EmailSite;
  firstName?: string;
  /** Hours of early access before the public launch. Configurable, not hard-coded. */
  earlyAccessHours: number;
  /** The address the sign-in code is sent to. */
  email: string;
  signInUrl: string;
};

/** Sent when staff approve a customer as a Privé member. */
export default function PriveWelcome({
  site,
  firstName,
  earlyAccessHours,
  email,
  signInUrl,
}: PriveWelcomeProps) {
  return (
    <EmailLayout
      theme="dark"
      brand="Xarina Privé"
      markSize={64}
      nav="none"
      preview="You now shop every drop before it opens to the public."
      site={{ ...site, unsubscribeUrl: undefined }}
      reason="You received this because your Xarina Privé membership was approved."
    >
      <EmailHero
        theme="dark"
        title={firstName ? `Welcome, ${firstName}.` : "Welcome."}
        titleSize={48}
        top={16}
      >
        <EmailText theme="dark">
          You are now a member of Xarina Privé, our inner circle for first access to every drop.
        </EmailText>
      </EmailHero>
      <EmailSteps
        theme="dark"
        ruled
        items={[
          {
            title: "Shop before everyone else",
            body: `Each drop opens to Privé ${earlyAccessHours} hours before the public launch.`,
          },
          {
            title: "Your own access link",
            body: "Before each drop we email you a personal link. It works once and only for you.",
          },
          {
            title: "Sign in with your email",
            body: `No password to remember: we send a code to ${email} whenever you sign in.`,
          },
        ]}
      />
      <EmailActions top={36}>
        <EmailButton theme="dark" href={signInUrl}>
          Sign in to Privé
        </EmailButton>
      </EmailActions>
    </EmailLayout>
  );
}

PriveWelcome.PreviewProps = {
  site: previewSite,
  firstName: "Amara",
  earlyAccessHours: 48,
  email: "amara@example.com",
  signInUrl: "https://example.com/prive/sign-in",
} satisfies PriveWelcomeProps;
