# Xarina — PRD & Technical Stack

Nov 20, 2026 · @fredy

## Overview

Xarina is a custom, mobile-first store for wearable statement dressing that turns social traffic into paid orders through scheduled limited drops, while keeping in-stock pieces one tap from checkout. It is built on Next.js and Supabase and run day to day by the Xarina team without a developer.

## Goals

- Convert ad clicks into paid orders: every ad lands on a permanent product URL that shows waitlist, countdown or Buy Now depending on the drop state.
- Run drops automatically: VIP and public opening times switch purchasing on with no manual step.
- Give Xarina Privé members verified early access that cannot be passed around by a shared password.
- Sell in NGN, GBP and USD with consistent display and charging.
- Let staff upload, price, stock and schedule without code.

## Success metrics

- Paid orders and revenue per drop, from payment records only.
- Ad-click to paid-order conversion rate per product link.
- Waitlist sign-ups per design, reported as interest and never as sales.
- Zero oversold variants per drop.
- Ad spend, CAC and ROAS on the reporting page.

## Non-goals for launch

Advanced segmentation, abandoned-checkout reminders, automated WhatsApp campaigns, reviews, referrals, loyalty schemes and full customer account areas. These sit in the post-launch backlog.

## Tech stack

One Next.js app (storefront + staff admin) on Vercel, with Supabase as the database, auth, storage and job runner. Payments sit behind a provider adapter so NGN, GBP and USD can be routed to the right processor.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript | SSR/ISR for fast product pages and good social link previews |
| UI | Tailwind CSS + shadcn/ui, Framer Motion | Nimara-style clean base, easy to restyle; subtle motion for an editorial feel |
| Database | Supabase Postgres | Relational stock, orders and drops; row locks prevent overselling |
| Auth | Supabase Auth (email magic link / OTP) | Verified Privé accounts and staff logins; no shared passwords |
| Authorisation | Postgres RLS + staff_roles table | Per-staff permissions enforced in the database |
| Files | Supabase Storage (images) | Product photography with Next/Image optimisation |
| Video | Mux (or Cloudflare Stream) | Adaptive, fast-starting movement videos on mobile data |
| Scheduled jobs | Supabase pg_cron + Edge Functions | Drop state changes, launch notifications, FX refresh |
| Payments | Paystack (NGN) + Flutterwave or Paystack international (GBP, USD) behind one PaymentProvider interface | Nigerian-registered business; final routing is an open decision |
| Email | Resend + React Email | Waitlist confirmation, Privé invites, drop alerts, order updates |
| Analytics | Meta Pixel + Meta Conversions API, GA4 or PostHog, UTM capture | Server-side purchase events, de-duplicated by event ID |
| WhatsApp | wa.me deep links with product context | Product-linked enquiries at launch; API campaigns later |
| Hosting | Vercel (app) + Supabase Cloud (data) | Low ops; accounts owned by Xarina |
| Tooling | pnpm, ESLint, Prettier, Zod, Vitest, Playwright | Typed validation and tests on checkout and drop timing |

Local development uses the Supabase CLI on Docker (`supabase start`), which runs fine on Windows with Docker Desktop.

## Users and roles

Three kinds of user: guest shoppers, approved Privé members and staff. Staff permissions are set per person, not shared logins.

| Role | Who | Can do |
|---|---|---|
| Guest shopper | Anyone from an ad or social link | Browse, join waitlists, guest checkout, request restock alerts |
| Privé member | Customer approved as VIP | Everything a guest can, plus buy during the VIP window via verified login or a single-use access link |
| Owner | Xarina founder(s) | All settings, staff management, payments config, reports, exports |
| Manager | Senior team | Products, drops, pricing, stock, orders, customers, Privé approvals |
| Merchandiser | Content team | Upload media, edit product copy, draft drops; cannot change prices or publish |
| Fulfilment | Dispatch team | View paid orders, update fulfilment status, add tracking |
| Support | Customer care | View customers and orders, add notes; no exports |

Customer-data export is limited to Owner and Manager.

## Functional requirements

Each requirement has an ID so Claude Code tasks and tests can reference it. Everything here is in scope for launch.

### Homepage

- **HOME-1** Hero features the current drop with full-bleed photo or muted autoplay video and one primary action: Join the Waitlist (before VIP opens) or Shop the Drop (once open).
- **HOME-2** Live countdown to the next opening time shown to the visitor (VIP time for signed-in Privé members, public time for everyone else).
- **HOME-3** Entry points to Available Now and to Xarina Privé (request access / sign in).
- **HOME-4** All hero content and featured drop are set in admin, not code.

### Shop

- **SHOP-1** Two clearly separated sections: Available Now and Upcoming Drops.
- **SHOP-2** Filter by design (collection/category) and availability (in stock, upcoming, sold out).
- **SHOP-3** Product cards show image, name, price in the selected currency and a state badge (Upcoming, Privé early access, Available, Sold Out).

### Product page

- **PDP-1** Permanent URL per design (`/p/[slug]`) that never changes after publishing; old slugs 301-redirect.
- **PDP-2** Gallery of photographs plus a short movement video.
- **PDP-3** Price, colours, sizes, measurements table, fit guidance, fabric, care and delivery timing.
- **PDP-4** Primary action follows drop state: Join the Waitlist + countdown → Privé Buy Now (members only) → Buy Now → Sold Out with optional restock request per variant.
- **PDP-5** Open Graph image, title and price tags for rich previews on Instagram, WhatsApp and X.
- **PDP-6** WhatsApp help button that pre-fills the product name, link and selected variant.

### Waitlists

- **WL-1** Capture email (required), name, phone (optional), preferred colour and size (optional) against the specific design.
- **WL-2** Separate, unticked checkbox for marketing consent; drop-alert consent recorded on its own.
- **WL-3** On-page confirmation plus a confirmation email.
- **WL-4** One entry per email per design; repeat sign-ups update preferences.
- **WL-5** Waitlist counts are labelled "interest" in all admin views and reports, never orders or sales.

### Drop scheduling

- **DROP-1** Each drop has a VIP opening time, a public opening time and an optional closing time, stored in UTC and shown in the visitor's local time.
- **DROP-2** Countdown is driven by server time, not the device clock.
- **DROP-3** Purchasing is enabled by checking the drop state server-side at add-to-cart and at payment initialisation, so it switches on exactly on time even if a page is open.
- **DROP-4** A scheduled job sends launch notifications to opted-in waitlisters at public open, and Privé invites at VIP open.

### Xarina Privé

- **VIP-1** Staff approve customers as Privé members in admin (single or bulk from a list).
- **VIP-2** Access is by verified email login (magic link/OTP) or a personal single-use access link tied to one customer, with an expiry.
- **VIP-3** Optional per-drop VIP purchase limit per member (e.g. 1 per design).
- **VIP-4** Optional reserved public quantity per variant that VIP sales cannot consume.
- **VIP-5** No shared site password anywhere.

### Checkout and payments

- **PAY-1** Guest checkout: email, phone, delivery address, shipping method, pay.
- **PAY-2** Payment in NGN, GBP and USD through the provider adapter; amount and currency fixed at checkout creation.
- **PAY-3** Delivery charge shown before payment, from shipping zone and currency.
- **PAY-4** Stock is reserved for 15 minutes when payment starts; released on failure or timeout.
- **PAY-5** An order is marked paid only after a verified provider webhook (signature checked, amount and currency matched); the browser redirect alone never confirms payment.
- **PAY-6** Confirmation page and email after successful payment.

### Currency management

- **CUR-1** Per product, staff choose fixed prices per currency or auto-conversion from a base price.
- **CUR-2** Adjustable exchange rates set by staff, with optional rounding rules (e.g. to the nearest £5 / ₦5,000).
- **CUR-3** Selected currency persists across the session; display, cart, checkout and charge always match.
- **CUR-4** Default currency from visitor country, changeable in the header.

### Stock and orders

- **INV-1** Stock tracked per variant (design × colour × size).
- **INV-2** Overselling is prevented with a transactional decrement (`SELECT … FOR UPDATE`) inside a Postgres function.
- **INV-3** VIP and public sales draw from the same stock pool (minus any reserved public quantity).
- **INV-4** Order statuses: pending payment, paid, processing, dispatched, delivered, cancelled, refunded.
- **INV-5** Dispatch triggers a customer email with tracking link.

### Customer database

- **CRM-1** One customer record joining details, order history, VIP status, waitlists and consent preferences.
- **CRM-2** Search by name, email, phone; filter by VIP, waitlisted design, purchase history.
- **CRM-3** CSV export (Owner and Manager only), with an audit log entry.

### Team administration

- **ADM-1** Admin at `/admin`, staff login with individual accounts and roles.
- **ADM-2** Drag-and-drop image and video upload, reorderable gallery.
- **ADM-3** Product editor: copy, variants, prices per currency, stock, measurements, fit, fabric, care, delivery timing.
- **ADM-4** Drop editor: products in the drop, VIP time, public time, reserved quantities, preview of each state.
- **ADM-5** Orders board with status changes and tracking entry.
- **ADM-6** Content editor for homepage hero and info pages.
- **ADM-7** Audit log of price, stock and drop changes by staff member.

### Customer information pages

- **INFO-1** About Xarina, Contact/WhatsApp, FAQs, Delivery information, Returns policy, Privacy notice, Terms, all editable in admin.

## Drop lifecycle

A drop changes state by the clock alone: staff set two times, and the site switches from waitlist to Privé to public sale without anyone pressing a button.

Only the public-live state is open to everyone; Privé is open to approved members only, and sold-out applies per colour/size, not to the whole design.

### Timing rules

- State is computed from `vip_opens_at`, `public_opens_at` and `closes_at` against database time (`now()`), never the browser clock.
- Buying is allowed when the state is public, or the state is Privé and the shopper is an approved member with a verified session or valid access link.
- The check runs at add-to-cart and again when payment starts; a checkout started inside a valid window can finish after it ends.
- The waitlist form shows until public opening; after that, sold-out variants offer a restock request instead.
- The optional closing time ends the drop; what happens to unsold pieces (move to Available Now or hide) is a per-drop setting.

## Data model

About twenty core Supabase tables; money is stored as integer minor units (kobo, pence, cents) with a currency code, never floats.

| Table | Key fields | Notes |
|---|---|---|
| products | id, slug (unique, permanent), name, description, fabric, care, fit_notes, delivery_timing, status (draft/published), pricing_mode (fixed/fx) | One row per design |
| product_media | product_id, type (image/video), storage_path or mux_playback_id, alt, sort | Ordered gallery |
| variants | id, product_id, colour, size, sku, stock_on_hand, reserved_public_qty | Stock lives here |
| variant_prices | variant_id or product_id, currency (NGN/GBP/USD), amount_minor | Used when pricing_mode = fixed |
| fx_rates | base, quote, rate, rounding_rule, updated_by | Used when pricing_mode = fx |
| measurements | product_id, size, bust, waist, hip, length (cm) | Size chart per design |
| drops | id, name, vip_opens_at, public_opens_at, closes_at, vip_limit_per_member | Times in UTC |
| drop_products | drop_id, product_id | A design can be in one active drop |
| customers | id, auth_user_id (nullable), email (unique), name, phone, country, is_vip, vip_approved_at, marketing_consent, drop_alert_consent, consent_timestamps | Guests become customers on first waitlist or order |
| vip_access_links | customer_id, token_hash, drop_id, expires_at, used_at | Single-use, hashed tokens |
| waitlist_entries | customer_id, product_id, colour, size, source_utm, created_at | Unique (customer_id, product_id) |
| restock_requests | customer_id, variant_id, notified_at | Sold-out variant alerts |
| orders | id, number, customer_id, currency, subtotal_minor, shipping_minor, total_minor, status, channel (vip/public), provider, provider_ref, utm, paid_at | Paid only via webhook |
| order_items | order_id, variant_id, qty, unit_price_minor | Price snapshot at checkout |
| stock_reservations | variant_id, order_id, qty, expires_at | 15-minute holds |
| shipping_zones / shipping_rates | countries[], currency, amount_minor, eta_text | Delivery charges |
| staff / staff_roles | auth_user_id, role (owner/manager/merchandiser/fulfilment/support) | Admin access |
| audit_log | staff_id, action, entity, before, after, at | Price, stock, drop and export changes |
| pages | slug, title, body (rich text) | Info pages and homepage hero |
| ad_spend | date, channel, campaign, currency, amount_minor | Manual or imported, for CAC/ROAS |

### Security rules (RLS)

- Public (anon) can read published products, media, prices, active drops and pages only.
- Customers can read only their own customer row, waitlists and orders.
- All writes to stock, orders and drop state go through `SECURITY DEFINER` Postgres functions or Edge Functions using the service role, never direct client writes.
- Staff access is checked with an `is_staff(role)` helper in every admin policy.

## Integrations, notifications and reporting

Payment webhooks are the single source of truth for sales; every other system reads from the orders table.

| Integration | Used for | Implementation |
|---|---|---|
| Paystack | NGN card, bank transfer, USSD | Initialise transaction server-side, verify via webhook (HMAC SHA512 signature) |
| GBP / USD processor | International cards | Flutterwave or Paystack international, same PaymentProvider interface; decided before Phase 3 |
| Resend | Transactional and drop email | React Email templates; per-email consent check before any drop alert |
| Meta Pixel + Conversions API | Ad optimisation | Browser Purchase and server CAPI event share one event_id (the order ID) so Meta de-duplicates; fired only from the paid webhook |
| GA4 or PostHog | Site analytics, funnels | Page views, add-to-cart, begin-checkout, purchase |
| UTM capture | Attribution | First-touch UTMs stored in a cookie, copied onto waitlist entries and orders |
| Mux | Product video | Upload from admin, playback ID stored on product_media |
| WhatsApp | Pre-purchase help | `wa.me/<number>?text=` with product name, link and variant |
| Courier tracking | Dispatch | Tracking URL field on the order; carrier API later |

### Notification emails

1. Waitlist confirmation (immediately).
2. Privé invite with access link (at VIP open, or when staff approve).
3. Drop is live (at public open, opted-in waitlisters only).
4. Order confirmation (on paid webhook).
5. Order dispatched with tracking.
6. Restock alert (when a sold-out variant gets stock).

### Reporting page (admin)

- Paid orders and revenue per day, per drop and per currency (from orders where status ≥ paid).
- Waitlist interest per design, shown on a separate panel labelled "interest, not sales".
- Ad spend, CAC (spend ÷ new paying customers) and ROAS (revenue ÷ spend) by date range, with a note that ad attribution is approximate.

## Design direction and non-functional requirements

The look is quiet luxury: the clothes are loud, the interface is not. The supplied mock-ups are a layout reference only, not the branding: keep their structure, make it feel more editorial, and avoid anything complicated.

### Design direction

The source of truth for tokens, type, logo and voice is the Xarina design system: [docs/brand/](brand/BRAND.md) (`tokens.json`, `BRAND.md`, `xarina-mark-*.svg`), copied from the live design system artifact (https://claude.ai/artifact/GLB46C7x5XCPhn4x8pzw7k). Where this section and the design system differ, the design system wins.

- **Typography:** Cormorant Garamond for display and the XARINA wordmark, Inter for UI and body (both Google Fonts). Locked in the Xarina design system.
- **Palette:** Ivory & Ink for the main site (ivory `#F4F0E8`, ink `#1C1A17`, muted `#5C564D`, hairline `#CFC6B8`) and Noir & Champagne for Xarina Privé (noir `#121110`, champagne `#E3D3B0`). Champagne is decoration only on light pages. Logo: a custom flared letter that reads as a and A. All values live in the Xarina design system's tokens.
- **Layout reference (from mock-ups):** announcement bar → wordmark header with tagline, currency switcher and bag → drop hero (image, drop name, one-line pitch, launch date, countdown, Join the Waitlist, "Privé members shop first") → Available Now row → Privé band → trust strip (secure payments, delivery, contact) → footer. Mobile stacks the hero; desktop splits it text-left, image-right.
- **Layout:** full-bleed imagery, generous white space, large product photos, minimal chrome; sticky Buy/Join bar on mobile product pages.
- **Motion:** soft image fades and a smooth countdown; autoplay video muted, looping and tap-to-sound.
- **Components:** built with shadcn/ui primitives and a small design-token file so the theme can change in one place.

### Performance

- Product pages load fast on Nigerian 4G: target LCP under 2.5 s on mobile and good Core Web Vitals.
- ISR for product and shop pages; drop state and stock fetched fresh.
- Images served as AVIF/WebP at responsive sizes; video via adaptive streaming.

### Reliability under drop traffic

- Stock decrement and order creation in one Postgres transaction.
- Idempotent webhook handler keyed on provider reference.
- Rate limiting on waitlist and checkout endpoints.
- Load-test a simulated drop before the first launch.

### Security and privacy

- No card data touches our servers (provider-hosted payment).
- Access-link tokens stored hashed, single use, with expiry.
- Consent stored with timestamp and source; privacy notice covers NDPA (Nigeria) and UK GDPR.
- Staff accounts require email verification; owner can revoke access instantly.

### Accessibility

- WCAG 2.1 AA colour contrast, keyboard-navigable checkout, alt text required on upload, captions optional on video.

## Build phases and open decisions

Build in six phases, each ending with something testable; give Claude Code one phase at a time with this PRD in the repo as `docs/PRD.md`.

1. **Foundation** — Next.js + Tailwind + shadcn/ui scaffold, design tokens, Supabase project and local Docker setup, migrations for all tables, RLS policies, seed data, staff auth and /admin shell.
2. **Catalogue** — product, variant, media (Storage + Mux) and price management in admin; shop page; product page with permanent slugs, OG tags, size chart and WhatsApp button (HOME, SHOP, PDP, ADM-2/3).
3. **Currency and checkout** — currency switcher, fixed/FX pricing, shipping zones, cart, stock reservations, payment adapter with Paystack first, paid-webhook order flow, confirmation email (CUR, PAY, INV-1–3).
4. **Drops, waitlists and Privé** — drop editor, server-time countdown, state-driven Buy button, waitlist capture and emails, VIP approval, magic-link and access-link entry, pg_cron launch jobs (DROP, WL, VIP).
5. **Operations** — orders board, dispatch emails, customer database with search/export, audit log, info pages editor, reporting page (INV-4/5, CRM, ADM-5–7, INFO).
6. **Tracking and launch** — Meta Pixel + CAPI with de-duplication, analytics, UTM capture, load test of a simulated drop, staff training, handover of all accounts to Xarina.

### Decisions needed from Xarina before Phase 3

- [ ] Drop model: ready stock, preorder or both (preorders need production and dispatch dates on the product).
- [ ] Privé rules: who qualifies, how many hours early, per-member limits, reserved public stock.
- [ ] Currency approach: fixed prices or FX-based; which currencies are settled into which bank accounts.
- [ ] Payment provider(s) for GBP and USD, confirmed against business registration and payout needs.
- [ ] Launch countries, shipping charges and how international duties are handled.
- [ ] Notifications: email only at launch, or email plus WhatsApp with consent.
- [ ] Final delivery and returns wording, including the no-return policy, checked for each market.
- [ ] Account ownership: domain, Vercel, Supabase, payment, Meta and email accounts all registered to Xarina.
