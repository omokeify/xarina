import "server-only";
import { Resend } from "resend";

export type SendResult =
  { status: "sent"; id: string } | { status: "skipped" } | { status: "failed"; error: string };

let client: Resend | null = null;

/**
 * Send one email through Resend. Shared by every feature (waitlist, Privé,
 * orders). With no RESEND_API_KEY it skips in development so local flows work,
 * and fails loudly in production so a missing key is never silent.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  react: React.ReactElement;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") return { status: "failed", error: "Email is not configured" };
    console.info(`[email] skipped "${input.subject}" to ${input.to} (RESEND_API_KEY / EMAIL_FROM not set)`);
    return { status: "skipped" };
  }

  client ??= new Resend(key);
  const { data, error } = await client.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    react: input.react,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
  });
  if (error || !data) return { status: "failed", error: error?.message ?? "Unknown email error" };
  return { status: "sent", id: data.id };
}
