# Membership model — what exists, and what needs a decision

This document confirms the membership model the site actually implements, records the
Privé admin hardening added in Phase 6, and proposes explicit loyalty/tier rules for
Xarina to confirm. **No loyalty engine has been built.** The PRD lists loyalty schemes
and full customer account areas as post-launch non-goals (`docs/PRD.md`, "Non-goals
for launch"), so the proposals below are a decision request, not shipped behaviour.

## 1. The model as built today

### One membership state, not a tier ladder

| Concept                              | Where it lives                                                   | Meaning                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `customers.is_vip`                   | `public.customers`                                               | The single membership flag. `true` = approved Privé member. There is no silver/gold/platinum column, tier table, subscription or points balance. |
| `vip_approved_at`, `vip_approved_by` | `public.customers`                                               | When the member was approved and which staff member did it. Written by `admin_set_vip`; now shown in admin.                                      |
| `prive_requested_at`                 | `public.customers`                                               | First time the customer asked for access. A request grants nothing. There is no separate `prive_requests` table.                                 |
| Consents                             | `marketing_consent`, `drop_alert_consent` (+ timestamps/sources) | Kept separate from membership. Approving someone does not opt them into either.                                                                  |
| Access links                         | `public.vip_access_links`                                        | SHA-256 hash only, single-use, expiring, tied to one customer and optionally one drop. Now also revocable.                                       |
| Sessions                             | `public.prive_sessions`                                          | Created by redeeming a link or by verified Supabase email login; re-checks `is_vip` on every request, so revocation is immediate.                |
| Order channel                        | `orders.channel` (`vip`/`public`)                                | Records whether an order used the Privé window. Shown on order details and in reports.                                                           |

### Business rules already encoded as data (not hard-coded)

- **Who qualifies:** anyone may submit a request at `/prive`; only Owner/Manager can approve
  (VIP-1, enforced in `admin_set_vip` and `can.approvePrive`).
- **How early:** each drop has `vip_opens_at` and `public_opens_at`. The gap is the early
  window; there is no global "48 hours" rule in the purchasing logic.
- **Per-member limit:** `drops.vip_limit_per_member`, optional, per design per drop (VIP-3).
- **Reserved public stock:** `variants.reserved_public_qty`, optional; VIP sales cannot
  consume it (VIP-4).
- **No shared password:** magic-link sign-in or a personal single-use link only (VIP-5).

### What staff can do now

- `/admin/drops/prive` (Owner/Manager): see requests with phone numbers, approve or bulk
  approve by email, revoke members, issue single-use links with a chosen drop and expiry.
- A new member receives the `PriveWelcome` email on approval. Delivery is best-effort: if
  Resend is not configured or fails, the approval still succeeds and the error is logged.
  The early-access hours in that email are derived from the shortest future drop window,
  falling back to `PRIVE_EARLY_ACCESS_HOURS` (default 48). It is informational; the drop's
  own times remain authoritative.
- Access link history lists every link for a member with issuer, expiry, usage and state
  (Active / Used / Expired / Revoked). An unused link can be revoked on its own. Revoking
  a link does not revoke the member, and does not end a session already created from it.
- `/admin/orders/[id]` (Owner/Manager/Support) has a **Membership** section: tier, client
  since, approval date/approver, and access-requested date.
- Customers list/detail/filter/CSV include Privé status; the audit log records approvals,
  revocations, link issuance and link revocation.

### What is deliberately absent

No loyalty points, spend tiers, referral credits, paid subscriptions, member-only pricing,
a self-service account area, automated upgrade/downgrade, or expiry of membership itself.
A member stays a member until staff revoke them.

## 2. Privé rules — confirmed by Xarina

Confirmed 2026-11-22. The implementation is data-driven, so these are stored as
per-drop/data values rather than hard-coded rules. The open "Privé rules" items in
`docs/PRD.md` and `docs/handover-checklist.md` are now resolved.

| #   | Decision              | Confirmed answer                                                                     | Where it is applied                                                                                           |
| --- | --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| P1  | Who qualifies         | Anyone may request; Owner/Manager approve manually. No phone-verification gate.      | `admin_set_vip`, `can.approvePrive`                                                                           |
| P2  | How many hours early  | House standard **48 h**, overridable per drop.                                       | `PRIVE_EARLY_ACCESS_HOURS=48` welcome-email fallback; each drop's own times stay authoritative for purchasing |
| P3  | Per-member limit      | **1 per design per drop** by default.                                                | `drops.vip_limit_per_member` — set to 1 when creating a drop                                                  |
| P4  | Reserved public stock | **None** by default.                                                                 | `variants.reserved_public_qty` stays 0 unless a drop explicitly needs a reserve                               |
| P5  | Welcome email         | Sent on approval, best-effort. Final From address and sign-in URL needed at go-live. | `emails/prive-welcome.tsx`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`                                              |
| P6  | Membership expiry     | **Permanent until staff revoke.** No expiry date, no re-approval job.                | `customers.is_vip`                                                                                            |
| P7  | Revocation scope      | Revoking a member blocks all future access; existing sessions die on next check.     | `prive_session_customer`, link redemption                                                                     |

## 3. Loyalty / tier proposal (post-launch — not selected for launch)

Xarina confirmed on 2026-11-22 to **keep the single Privé state for now** and leave the
spend-tier ladder in the post-launch backlog. Nothing below is implemented; it is retained
as a design starting point if the decision changes.

If Xarina wants a tier ladder later, the safest evolution is to **derive tiers from paid
orders**, not from a hand-edited flag, and keep Privé as the access gate rather than the
spend tier. A suggested shape:

| Tier    | Qualification (proposed)                                           | Benefit (proposed)                                    |
| ------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Client  | Any customer                                                       | Public drops, waitlist, standard emails               |
| Privé   | Approved by staff (unchanged)                                      | Early access, personal links, per-member allocation   |
| Atelier | Privé + ₦X settled spend in trailing 12 months, or N paid orders   | Longer early window, higher per-member limit          |
| Maison  | Privé + ₦Y settled spend in trailing 12 months, or invitation only | First allocation, private preview, concierge WhatsApp |

Rules to agree before any of this is built:

1. **Source of truth:** settled `orders` with `status` paid/processing/dispatched/delivered;
   pending, cancelled and refunded never count. Refunds must remove the qualifying spend.
2. **Calculation:** nightly materialised view or refreshed table, not a request-time query;
   store the computed tier and the period it was computed for.
3. **Currency:** normalise to one reporting currency with the existing `fx_rates`; never
   compare kobo, pence and cents directly.
4. **Windows:** trailing 12 months vs lifetime is a business choice. Annual resets need an
   explicit re-qualification date and a downgrade email.
5. **No points ledger yet:** points introduce expiry, adjustments, fraud and accounting.
   Start with spend thresholds; add points only if marketing runs a specific promotion.
6. **No self-service tier changes:** all tier changes must be audited like VIP approvals.
7. **Customer account area:** a later phase; until then staff remain the interface.

**Status: P1–P4 and P6–P7 confirmed and implemented; P5 needs final email config at
go-live. Spend tiers are a post-launch idea only — nothing in this section is built.**
