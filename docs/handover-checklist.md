# Xarina — launch handover checklist

Working document for Phase 6. Nothing here is complete until a named Xarina person has access and has confirmed it by signing in. Keep this file in the repo; fill in the blanks before the first live drop.

**Principle:** every account, domain and payment/email identity is registered to Xarina, not to an individual or an agency. Use individual staff accounts (never a shared login) and store secrets in a password manager that Xarina controls.

## 1. Accounts and ownership

| Item                                       | Owner (name) | Login/account email | Confirmed |
| ------------------------------------------ | ------------ | ------------------- | --------- |
| Domain (registrar)                         |              |                     | [ ]       |
| DNS/hosting account                        |              |                     | [ ]       |
| Vercel project                             |              |                     | [ ]       |
| Supabase project (Cloud)                   |              |                     | [ ]       |
| Paystack business account                  |              |                     | [ ]       |
| Meta Business Manager / ad account / Pixel |              |                     | [ ]       |
| Resend account + sending domain            |              |                     | [ ]       |
| Mux account (product video)                |              |                     | [ ]       |
| Staff email accounts + password manager    |              |                     | [ ]       |

- [ ] Domain registered in Xarina's name; auto-renew on; recovery email is a Xarina-controlled inbox.
- [ ] Vercel, Supabase, Paystack, Meta, Resend and Mux use Xarina-owned emails and billing details.
- [ ] 2FA enabled on every account above; recovery codes stored with Xarina.
- [ ] No shared passwords: each staff member has their own login (`/admin` uses individual accounts; Privé uses magic links or personal access links).
- [ ] External collaborators/agencies have the minimum access needed and a documented offboarding step.

## 2. Secrets and configuration

- [ ] All variables from `.env.example` set in Vercel (Production **and** Preview as needed).
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (server only)
  - [ ] `PAYSTACK_SECRET_KEY` (test key for rehearsal, live key only at go-live)
  - [ ] `PAYMENT_PROVIDER_GBP` / `PAYMENT_PROVIDER_USD` once the provider is chosen
  - [ ] `RESEND_API_KEY`, `EMAIL_FROM` (verified domain), `EMAIL_REPLY_TO`
  - [ ] `CRON_SECRET` — same value in Supabase Vault as `cron_secret`, and `site_url` set to the production URL
  - [ ] `RATE_LIMITS` **not** set to `off` in Production (anti-abuse limits on waitlist, drop alerts, restock, Privé and checkout start; `off` is only for the local e2e server)
  - [ ] `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET` if video is used
  - [ ] `META_PIXEL_ID` (public), `META_CAPI_TOKEN` (secret), optional `META_GRAPH_API_VERSION`
  - [ ] `POSTHOG_PROJECT_KEY` and `POSTHOG_HOST` (US or EU Cloud region)
- [ ] No secret is committed to the repo; `.env.local` stays local and `.env.example` contains placeholders only.
- [ ] Supabase Auth redirect URLs include the production domain and `/auth/callback`.
- [ ] Resend sending domain verified with SPF/DKIM; reply-to monitored.

## 3. Webhooks and scheduled jobs

- [ ] Paystack webhook URL set to `https://<domain>/api/webhooks/paystack`; secret matches `PAYSTACK_SECRET_KEY`.
- [ ] Mux webhook URL set to `https://<domain>/api/mux/webhook` (if video is used).
- [ ] pg_cron job calls `/api/internal/drop-notifications` with `CRON_SECRET`; run it once in production and confirm a test notification.
- [ ] Meta Pixel and Conversions API connected; a paid test order shows **one** Purchase, sent from the webhook with event_id = order ID. The browser sends PageView only.
- [ ] PostHog project connected; page view, add-to-bag, checkout started and purchase events verified in a test order (all are no-ops until `POSTHOG_PROJECT_KEY` is set).
- [ ] Ad-campaign tags: visit a storefront link with `?utm_source=...&utm_campaign=...`, confirm the `xarina_utm` cookie, then check the campaign is stored on a test waitlist entry and test order. The first tagged visit wins for 30 days; later ad clicks do not overwrite it.

## 4. Client decisions still open

These are settings in the PRD, not hard-coded. Resolve and record the answers here before launch:

- [ ] **GBP/USD provider** chosen and configured (NGN is Paystack; GBP/USD checkout cannot take payment until this is set).
- [ ] **Drop model**: ready stock, preorder, or both (preorders need production and dispatch dates on the product).
- [ ] **Privé rules**: who qualifies, how many hours early, per-member limit, reserved public quantity.
- [ ] **Launch countries**, shipping charges and how international duties are handled.
- [ ] **Final delivery and returns wording**, including the no-returns policy, checked per market and published in `/admin` content pages.
- [ ] **Notifications** at launch: email only, or email plus WhatsApp with consent.
- [ ] **Consent/privacy text** covers NDPA (Nigeria) and UK GDPR.
- [ ] **Account ownership** confirmed (section 1).

## 5. Data and content readiness

- [ ] Production migrations applied; `pnpm db:types` regenerated from the production schema.
- [ ] RLS enabled on every table; staff roles assigned per person; owner role held by at least two Xarina people.
- [ ] Products, variants, prices, media, size charts and delivery timing entered and proof-read.
- [ ] Info pages filled: About, Contact/WhatsApp, FAQs, Delivery, Returns, Privacy, Terms.
- [ ] Homepage hero and featured drop set in admin.
- [ ] Waitlist counts are labelled "interest", never sales, in all staff views and reports.
- [ ] Test order paid with a Paystack test key, shown in admin, and confirmed in the chosen analytics/Meta account.
- [ ] Test waitlist, Privé invite and dispatch email received (not just recorded).

## 6. Launch-day runbook and recurring costs

- [ ] Staff trained using `docs/staff-guide.md`; each role can complete their own task without a developer.
- [ ] Rehearsal drop completed: VIP window, public window, waitlist, sold-out variant, restock request.
- [ ] Load test of a simulated drop completed; rate limits verified (repeat sign-ups from one address show "Too many attempts…", real shoppers are unaffected).
- [ ] Rollback plan written: how to pause a drop, disable checkout, and revert a bad deploy.

Record actual invoices and who pays them (check current prices before signing up):

| Service                   | Plan/tier | Billing cycle | Paid by | Cost | Next renewal |
| ------------------------- | --------- | ------------- | ------- | ---- | ------------ |
| Domain                    |           |               |         |      |              |
| Vercel                    |           |               |         |      |              |
| Supabase                  |           |               |         |      |              |
| Paystack                  |           |               |         |      |              |
| Meta ads (budget)         |           |               |         |      |              |
| Resend                    |           |               |         |      |              |
| Mux                       |           |               |         |      |              |
| Analytics (GA4 / PostHog) |           |               |         |      |              |

- [ ] Billing contact and card/account of record belong to Xarina; invoices accessible to the owner.
- [ ] Calendar reminders set for renewals and for the post-launch review of ad spend, CAC and ROAS.
