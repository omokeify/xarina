# CLAUDE.md — Xarina store

Custom ecommerce site for Xarina ("Wearable statement dressing"): limited fashion drops, waitlists, VIP early access (Xarina Privé), multi-currency checkout. Full spec: `docs/PRD.md`. Read it before starting any phase. Requirement IDs (e.g. `DROP-3`, `PAY-5`) come from the PRD; reference them in commits, tests and TODOs.

## How we work

- Build **one phase at a time** (PRD → "Build phases"). Finish, test and show me the result before starting the next phase.
- Ask before adding any dependency that isn't in the stack below.
- Keep changes small and explain what you changed at the end of each task.
- If the PRD is unclear or conflicts with itself, stop and ask. Don't guess on payments, stock or drop timing.
- Open decisions are listed at the end of the PRD. Don't hard-code an answer to one; make it configurable or ask.

## Stack (fixed)

- Next.js 15 (App Router) + TypeScript (strict), pnpm
- Tailwind CSS + shadcn/ui, Framer Motion (subtle only)
- Supabase: Postgres, Auth (magic link / OTP), Storage, Edge Functions, pg_cron
- Payments: `PaymentProvider` interface; Paystack implemented first (NGN). GBP/USD provider is TBD.
- Email: Resend + React Email
- Video: Mux
- Validation: Zod. Tests: Vitest (unit) + Playwright (checkout and drop flows)
- Hosting: Vercel + Supabase Cloud

## Local environment (Windows + Docker Desktop)

- Run Supabase locally with the Supabase CLI: `supabase start` (needs Docker Desktop running).
- All schema changes go through migrations in `supabase/migrations/`. Never edit the database by hand.
- Seed data lives in `supabase/seed.sql` (sample products, variants, a drop, staff users).
- Use cross-platform scripts (no bash-only commands in `package.json`).
- Secrets go in `.env.local` (never committed). Keep `.env.example` up to date.

## Non-negotiable rules

1. **Money** is stored as integer minor units (kobo, pence, cents) plus a currency code. Never use floats for money.
2. **An order is paid only via a verified webhook** (signature checked, amount and currency matched). Never mark an order paid from a browser redirect.
3. **Webhooks are idempotent**, keyed on the provider reference.
4. **No overselling.** Reserve and decrement stock inside one Postgres transaction (`SELECT … FOR UPDATE`) in a `SECURITY DEFINER` function. Reservations expire after 15 minutes.
5. **VIP and public sales share one stock pool**, minus any `reserved_public_qty`.
6. **Drop state comes from database time** (`now()`) compared with `vip_opens_at`, `public_opens_at` and `closes_at`. Never trust the browser clock. Check it at add-to-cart AND at payment start.
7. **Privé access** is a verified login or a single-use, hashed, expiring access link. Never a shared password.
8. **RLS on every table.** Anonymous users read only published catalogue data. Writes to stock, orders and drops go through server functions with the service role, never direct client writes.
9. **Waitlist numbers are "interest", never sales.** Label them that way everywhere.
10. **Meta Purchase events** fire only from the paid webhook, with `event_id` = order ID (Pixel + Conversions API de-duplication).
11. **Product URLs (`/p/[slug]`) are permanent.** If a slug changes, keep a 301 redirect from the old one.
12. **Consent:** marketing consent and drop-alert consent are separate, unticked by default and stored with a timestamp.

## Design

- The supplied mock-ups are a **layout reference only, not the branding**; the agreed layout is summarised in `docs/PRD.md`.
- **Brand is locked** in `docs/brand/` (from the Xarina design system): `tokens.json`, `BRAND.md` (brand book) and the logo SVGs. Follow it exactly; don't invent colours or fonts.
- Two themes as CSS variables:
  - **Ivory & Ink** (default): surface `#F4F0E8`, surface-raised `#FFFFFF`, surface-sunk `#E9E3D8`, ink `#1C1A17`, ink-muted `#5C564D`, line `#CFC6B8`, accent `#A88B5E`, action `#1C1A17`, on-action `#F4F0E8`, critical `#8A2B2B`.
  - **Privé · Noir & Champagne** (`[data-theme="prive"]`, for Privé pages and bands): surface `#121110`, surface-raised `#1C1A18`, surface-sunk `#2A2724`, ink `#F7F3EC`, ink-muted `#B5AD9F`, line `#3A3631`, accent/action `#E3D3B0`, on-action `#121110`, critical `#E59A8F`.
- Champagne (`accent`) is decoration only on light pages, never small text. Sold Out uses `ink-muted`, not red.
- Typography: **Cormorant Garamond** (display, drop names, wordmark: 600, caps, 0.4em tracking) + **Inter** (body, prices, forms; labels 12px/600/uppercase/0.22em). Load via `next/font/google`.
- Logo: custom a/A mark (`docs/brand/xarina-mark-*.svg`: ink, ivory, champagne). Use as an inline SVG component; min 16px tall; never on a photo without a solid band.
- Square corners (`radius-none`) everywhere; inputs 2px; avatars/swatches full round. No shadows: separate with space and hairlines.
- All colours, fonts and spacing live in design tokens (`tailwind.config` + CSS variables), so the palette is a one-file change.
- Mobile-first. Home order: announcement bar → wordmark header (tagline, currency switcher, bag) → drop hero (image, name, pitch, date, countdown, Join the Waitlist) → Available Now → Privé band → trust strip → footer.
- Quiet luxury: generous white space, full-bleed images, minimal UI chrome, sticky Buy/Join bar on mobile product pages. Keep it simple.

## Code conventions

- Server Components by default; client components only where interaction needs them.
- Data access in `lib/` (server-only); no Supabase service-role key in client code.
- Admin lives under `/admin`, guarded by staff role checks on the server and in RLS.
- Small, named components; no dead code; types generated from Supabase (`supabase gen types`).
- Write a test for every rule in "Non-negotiable rules" as it is implemented.
