import { Section, Text } from "@react-email/components";
import { brandColour, DISPLAY_FONT } from "./brand";
import { EmailLayout, type EmailSite } from "./layout";
import { EmailActions, EmailButton, EmailHero, EmailText } from "./parts";
import { previewSite } from "./preview-data";

export type SignInCodeProps = {
  site: EmailSite;
  /** The one-time code. Never log it. */
  code: string;
  expiresInMinutes: number;
  /** One-tap sign-in link carrying the same token. */
  signInUrl: string;
};

/** Magic-link / OTP email for Privé members and staff. A security email, so no marketing footer. */
export default function SignInCode({ site, code, expiresInMinutes, signInUrl }: SignInCodeProps) {
  return (
    <EmailLayout
      preview={`Use it within ${expiresInMinutes} minutes. Used by Privé members and staff.`}
      site={{ ...site, unsubscribeUrl: undefined, preferencesUrl: undefined }}
      nav="none"
      reason="This is a security email for your Xarina account."
    >
      <EmailHero title="Your sign-in code" titleSize={42}>
        <EmailText>
          Enter this code on the Xarina sign-in page. It expires in {expiresInMinutes} minutes.
        </EmailText>
        <Section
          style={{
            backgroundColor: brandColour("surface-raised", "light"),
            border: `1px solid ${brandColour("line", "light")}`,
            padding: "28px 0",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          <Text
            style={{
              margin: 0,
              fontFamily: DISPLAY_FONT,
              fontWeight: 600,
              fontSize: 52,
              lineHeight: "56px",
              letterSpacing: "0.3em",
              paddingLeft: "0.3em",
              color: brandColour("ink", "light"),
            }}
          >
            {code}
          </Text>
        </Section>
        <EmailText muted>Or sign in with one tap:</EmailText>
        <EmailButton href={signInUrl}>Sign in to Xarina</EmailButton>
      </EmailHero>
      <EmailActions top={0}>
        <EmailText muted>
          Did not ask for this? You can ignore this email. Nobody can sign in without the code. Never share
          it, including with anyone claiming to be from Xarina.
        </EmailText>
      </EmailActions>
    </EmailLayout>
  );
}

SignInCode.PreviewProps = {
  site: previewSite,
  code: "123456",
  expiresInMinutes: 10,
  signInUrl: "https://example.com/auth/confirm?token=abc",
} satisfies SignInCodeProps;
