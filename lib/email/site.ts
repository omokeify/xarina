import "server-only";
import { publicEnv } from "@/lib/env";
import type { EmailSite } from "@/emails/layout";

/**
 * Site-wide details every email footer needs. Social links and the postal
 * address are optional: a footer simply leaves out whatever is not configured,
 * so no template ever ships a placeholder. Per-recipient links (unsubscribe,
 * preferences) are added by the caller.
 */
export function getEmailSite(extra: Pick<EmailSite, "unsubscribeUrl" | "preferencesUrl"> = {}): EmailSite {
  return {
    siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    instagramUrl: process.env.EMAIL_INSTAGRAM_URL || undefined,
    whatsappUrl: process.env.EMAIL_WHATSAPP_URL || undefined,
    businessAddress: process.env.EMAIL_BUSINESS_ADDRESS || undefined,
    ...extra,
  };
}
