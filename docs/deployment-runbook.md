# Deployment, rollback and load-test runbook

Scope: the Next.js app on Vercel and the Supabase Cloud database (see `README.md` → Deployment notes and `docs/handover-checklist.md`). **Local Supabase is Postgres 17** (`supabase/config.toml`, `major_version = 17`); confirm the remote project runs the same major version before restoring a dump or comparing schemas.

## Before every deploy

- **Environment snapshot:** record the Production/Preview variable names from Vercel and a non-secret fingerprint of each value (never paste secrets into tickets). Compare against `.env.example`. Check in particular `NEXT_PUBLIC_SITE_URL`, Paystack webhook URL/secret, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CRON_SECRET` (must match Supabase Vault `cron_secret`, with `site_url` = production URL), Meta and PostHog keys. `RATE_LIMITS` must **not** be `off` in production (`off` is only for the local e2e server).
- **Migration version:** record the git SHA being deployed and the migrations applied to the target database (`supabase migration list --linked`, or the `supabase_migrations.schema_migrations` table). List any new files in `supabase/migrations/` and confirm each has a forward-only rollback plan.
- **Database backup:** take a fresh logical backup of the remote database before applying schema changes or deploying code that depends on them (`pg_dump` via the Supabase direct connection string). Record the timestamp and where the dump is stored; if point-in-time recovery is available on the project, record the pre-deploy time as well. Also record baseline row counts for `orders`, `payment_events`, variants and drop notifications so a restore can be verified.

## Rollback plan

**Code:** in Vercel → Deployments, choose the last healthy deployment and use Instant Rollback (or redeploy that SHA), keeping the same environment variables. A code rollback does not undo database changes.

**Pause a live sale if needed:** use the admin drop editor to move designs to Available Now or hide designs rather than deleting records (`docs/staff-guide.md`).

**Database:** prefer a **forward fix** — add a new migration under `supabase/migrations/` that restores the old behaviour and apply it through the normal migration path. Never edit or delete a migration that has already been applied. If a restore is unavoidable, restore the pre-deploy backup into a fresh database/project first, validate it, reconcile any paid orders/`payment_events` created after the backup, then switch connections; do not overwrite live data containing new paid orders without that reconciliation. After any schema change, regenerate `lib/supabase/database.types.ts` (`pnpm db:types`) and re-check the migration list against the deployed SHA.

### Verification after rollback

- [ ] Shop and `/p/[slug]` pages load; currency switcher shows expected fixed/FX prices (`20261120000302_fx_storefront_prices.sql`).
- [ ] Add-to-bag and checkout start succeed; stock is not oversold; drop state still comes from database time.
- [ ] A Paystack **test-key** webhook with a valid signature marks exactly one order paid and sends one order confirmation; invalid signatures and amount/currency mismatches are rejected.
- [ ] Meta receives a browser PageView only, and one Purchase from the paid webhook with `event_id` = order ID (`lib/analytics/`); PostHog shows pageview/add-to-cart/begin-checkout plus the server purchase.
- [ ] `/api/internal/drop-notifications` works with `Authorization: Bearer <CRON_SECRET>` and returns 401 without it; no duplicate notifications were sent.
- [ ] Resend sends to a test inbox with the verified `EMAIL_FROM`; no rate-limit errors; `RATE_LIMITS` is not `off`.
- [ ] No new 5xx in Vercel logs, DB connections/CPU normal, and no secrets in logs.

## Load-test / rehearsal plan

Rehearse on a preview/staging deployment with a seeded database and Paystack test keys, mirroring the rehearsal items in `docs/handover-checklist.md`. Do not send real customer mail or Meta conversions during a load test.

| Area | What to exercise |
|---|---|
| Shop | Concurrent browse, filters and currency switches; check TTFB/LCP and that no request 5xxs. |
| Product pages | Concurrent `/p/[slug]` loads with media; check old slugs still 301 and page speed on mobile-like connections. |
| Add to bag | Concurrent reservations on the same variant; confirm row locking prevents overselling, 15-minute expiry and the `release-expired-reservations` pg_cron job. |
| Checkout start | Concurrent checkout starts; confirm `can_purchase` is re-checked at payment start and public rate limits are on. |
| Paystack webhook | Replay signed `charge.success` events, including duplicates and bad signatures; confirm HMAC check, idempotency on `provider_ref`, amount/currency matching and one paid order per event. |
| Emails | Render/send all templates locally via `/api/dev/send-test-emails?to=...&only=...`; in rehearsal confirm waitlist, Privé invite and dispatch mail reaches a test inbox exactly once. Marketing templates still lack a real unsubscribe link (see `docs/email.md`) — do not send them to customers. |
| Cron notifications | Trigger `/api/internal/drop-notifications` with `CRON_SECRET` at VIP and public open; confirm consent re-check, single-use hashed access links and no duplicate sends. |
| Observability | Watch Vercel function duration/errors, Supabase CPU/connections/locks, Resend 429s and webhook latency throughout. |

**Pass criteria:** no 5xx on critical paths at the agreed target concurrency; no oversold variants; every valid webhook yields exactly one paid order, one confirmation email and one Purchase event per provider reference; invalid or mismatched webhooks are rejected; no duplicate notifications; rate limits stop repeated abuse from one address but do not block normal shoppers; product-page LCP meets the PRD mobile target (under 2.5 s in `docs/PRD.md`). **Fail** on any of these: pause the drop in admin, roll back code and/or apply a database forward fix, then investigate before retrying.
