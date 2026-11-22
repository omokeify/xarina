# Xarina

A custom, mobile-first storefront for **wearable statement dressing**. Xarina turns social traffic into paid orders through scheduled limited drops, waitlists and verified Privé early access, while keeping in-stock pieces one tap from checkout.

The app includes both the customer storefront and the staff admin in one Next.js project. The full product spec lives in [`docs/PRD.md`](docs/PRD.md).

## What's in the box

- **Storefront** — homepage drop hero with countdown, Available Now, shop filters, permanent product pages (`/p/[slug]`), bag and guest checkout.
- **Drops** — VIP and public windows driven by database time, so purchasing switches on automatically at add-to-cart and payment start.
- **Xarina Privé** — approved members get early access via magic link/OTP or a single-use, expiring personal access link. No shared passwords.
- **Waitlists & alerts** — per-design interest capture, restock requests and opt-in drop notifications. Counts are labelled "interest", never sales.
- **Multi-currency** — NGN, GBP and USD with fixed or FX-based pricing; the selected currency carries through display, cart, checkout and charge.
- **Payments** — provider adapter with Paystack implemented for NGN. Orders are marked paid only by a verified webhook.
- **Admin** at `/admin` — products, variants, stock, prices, media, drops, orders, customers, Privé approvals, content pages, reports and audit log, with per-staff roles.
- **Analytics & email** — UTM capture, Meta Pixel + Conversions API, PostHog, and React Email templates sent through Resend.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4, shadcn/ui primitives; brand tokens in `docs/brand/` |
| Database | Supabase Postgres, Auth, Storage, pg_cron |
| Payments | Paystack behind a `PaymentProvider` interface |
| Email | Resend + React Email |
| Video | Mux |
| Validation / tests | Zod, Vitest, Playwright |
| Tooling | pnpm, ESLint, Prettier |
| Hosting | Vercel + Supabase Cloud |

## Getting started

Prerequisites: **Node.js**, **pnpm**, and **Docker Desktop** (for the local Supabase stack).

```bash
git clone https://github.com/omokeify/xarina.git
cd xarina
pnpm install
cp .env.example .env.local
```

Start Supabase (Docker must be running), then start the app:

```bash
pnpm db:start          # prints the local API URL and anon key
pnpm dev               # http://localhost:3000
```

Put the values printed by `supabase start` into `.env.local`. Schema changes go through migrations in `supabase/migrations/` — never edit the local database by hand. Seed data (products, variants, a drop, staff users) is in `supabase/seed.sql`.

All configuration is documented in [`.env.example`](.env.example). Secrets stay in `.env.local` and are never committed.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server with Turbopack |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, TypeScript check, Prettier |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm db:start` / `pnpm db:stop` | Start/stop local Supabase |
| `pnpm db:reset` | Reset the local database and seed storage buckets |
| `pnpm db:types` | Regenerate `lib/supabase/database.types.ts` from the local schema |
| `pnpm db:test` | Run Supabase database tests |
| `pnpm e2e:build` / `pnpm e2e:start` | Build and serve an isolated e2e server on port 3100 |

## Layout

```
app/                 Storefront, admin and API routes (App Router)
components/          UI and storefront components
emails/              React Email templates
lib/                 Server-side data access, payments, checkout, analytics, Supabase clients
supabase/            Migrations, seed data, storage seed media and SQL tests
e2e/                 Playwright specs and fixtures
tests/               Unit tests not colocated with source
docs/                PRD, brand system, staff guide and launch checklist
```

## Engineering rules

These are enforced in code and covered by tests:

- Money is stored as integer minor units (kobo, pence, cents) plus a currency code — never floats.
- An order is paid only via a verified webhook with a signature check and matching amount/currency; a browser redirect never confirms payment. Webhooks are idempotent.
- Stock is reserved and decremented inside one Postgres transaction with row locks; reservations expire after 15 minutes. No overselling.
- Drop state comes from database time, checked at add-to-cart and again at payment start.
- Privé access is a verified login or a single-use, hashed, expiring link — never a shared password.
- Every table has RLS; client code never sees the service-role key.
- Consent for marketing and drop alerts is separate, unticked by default and timestamped.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product requirements and requirement IDs (`DROP-3`, `PAY-5`, …)
- [`docs/brand/`](docs/brand/) — locked brand tokens, brand book and logo SVGs
- [`docs/staff-guide.md`](docs/staff-guide.md) — day-to-day admin use
- [`docs/email.md`](docs/email.md) — email templates and previewing
- [`docs/handover-checklist.md`](docs/handover-checklist.md) — launch/account handover

## Deployment notes

Deploy the app to Vercel and the database to Supabase Cloud. Set the variables from `.env.example` in Vercel, configure the Paystack webhook at `/api/webhooks/paystack`, and set the pg_cron job to call `/api/internal/drop-notifications` with `CRON_SECRET`. Never enable `RATE_LIMITS=off` in production. See the handover checklist before the first live drop.

Open decisions that still need a client answer: the GBP/USD payment provider, the drop model (stock vs preorder), Privé rules, launch countries/shipping, legal wording and notification channels. These are configurable rather than hard-coded.
