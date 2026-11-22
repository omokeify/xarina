# Email setup and runbook

All mail is sent through Resend by `sendEmail` in `lib/email/client.ts`. React Email templates live in `emails/`; every template is registered in `emails/registry.ts` (`EMAIL_TEMPLATES`, keyed by name), which is the list used by the test-send route and `lib/email/templates.test.ts`.

## Configuration

Copy `.env.example` to `.env.local` (and set the same values in Vercel from `.env.example`):

- `RESEND_API_KEY` — Resend API key. Without it and `EMAIL_FROM`, `sendEmail` skips sends in development and fails in production.
- `EMAIL_FROM` — sending address. For real customers this must be on a domain **verified in Resend** (SPF/DKIM). `Xarina <onboarding@resend.dev>` is for local testing only: Resend delivers messages from that address to the account owner's email, not to arbitrary customers.
- `EMAIL_REPLY_TO` — reply-to address; receives replies, including requests to stop drop alerts.
- Optional footers: `EMAIL_INSTAGRAM_URL`, `EMAIL_WHATSAPP_URL`, `EMAIL_BUSINESS_ADDRESS`. `NEXT_PUBLIC_SITE_URL` should be publicly reachable (a deployed URL or tunnel), otherwise public logo/footer images will not load in mail clients.

`lib/email/site.ts` (`getEmailSite`) supplies the site-wide footer details; per-recipient links are added by the caller.

## Sending test templates locally

With `pnpm dev` and a Resend key configured, open:

- `http://localhost:3000/api/dev/send-test-emails?to=you@example.com` — every registered template
- `http://localhost:3000/api/dev/send-test-emails?to=you@example.com&only=Teaser,Welcome` — a comma-separated subset of names from `EMAIL_TEMPLATES`

The route (`app/api/dev/send-test-emails/route.ts`) is GET, development-only (404 in production), requires a valid `?to=` email, sends subjects `[Test] <TemplateName>`, and returns JSON mapping each template name to its send result. It fills templates from their `PreviewProps` and waits ~600 ms between sends for Resend's default 2 requests/second limit. Preview links are samples from `emails/preview-data.ts` (e.g. `https://example.com/unsubscribe/token`), so the route does **not** verify production recipient links.

To check scheduled mail instead, trigger `/api/internal/drop-notifications` with `Authorization: Bearer <CRON_SECRET>`; pg_cron calls it every minute and it re-checks drop-alert consent before sending (`app/api/internal/drop-notifications/route.ts`).

## Transactional vs marketing

- **Marketing** (requires marketing consent and an unsubscribe link): `AbandonedCheckout`, `Teaser`, `Story`, `Styling`, `Occasion`, `Welcome`, `Winback` — the `MARKETING` list in `lib/email/templates.test.ts`. They use `MarketingLayout` / `MarketingSite` (`emails/marketing.tsx`, `emails/layout.tsx`), whose type requires `unsubscribeUrl` at render time.
- **Transactional / service mail**: everything else in the registry — waitlist confirmation, Privé access and invites, drop-live and restock alerts, order confirmation/dispatch/cancel/delivery, payment failure, preorder update, sign-in code and staff invitation. These do not require an unsubscribe link in the current templates.

**Known gap:** no production path currently generates a per-recipient `unsubscribeUrl` (or `preferencesUrl`), and there is no unsubscribe endpoint. The only URLs are samples in `emails/preview-data.ts`; callers use `getEmailSite()` without those links (for example `lib/waitlist/actions.ts`, `app/api/webhooks/[provider]/route.ts` and the cron route above). Do not send marketing templates to real customers until recipient-specific links and an unsubscribe handler are wired. The dev route can still render them for design review.
