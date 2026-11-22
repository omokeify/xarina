# Xarina — staff guide

Working guide for the Xarina team running the store day to day. It describes what is in the admin UI today, not the wider plan in `docs/PRD.md`. If you cannot see a button described here, check your role below.

Two rules that shape everything else:

- **Interest is not sales.** Waitlist numbers are labelled _interest_ everywhere. Never report them as orders or revenue.
- **No shared passwords.** Staff sign in with their own email. Privé customers use a verified login or a personal access link, never a shared password.

## Sign in and sign out

1. Go to `/admin`. You will be redirected to `/admin/login`.
2. Enter your **work email** and choose **Email me a sign-in link**.
3. Open the link in the same browser. It takes you back to `/admin`.
4. Use **Sign out** in the admin header when you are done.

Notes:

- Links are single-use and expire. If you see “That sign-in link has expired or was already used”, request a new one.
- The form gives the same reply whether or not the address belongs to staff, so staff emails cannot be probed.
- The login page never creates an account. An owner must add you in **Staff** first.
- If you sign in but see “not found” for a section, your role does not include it (or your staff record has been deactivated). Sections are hidden, not advertised.

## What each role can do

| Role             | Can                                                                                                                                                                      | Cannot                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**        | Everything in admin: staff, settings, products, prices, stock, publishing, drops, Privé approvals, orders, customers, exports, content, reports, audit                   | Demote or deactivate themselves; remove the last active owner                                                                                                    |
| **Manager**      | Products, prices, stock, publishing, drops, Privé approvals, orders and status changes, customers and CSV exports, homepage and info pages, reports, ad spend, audit log | Staff, Settings and deleting drops; cannot remove their own access from Staff                                                                                    |
| **Merchandiser** | Draft products, copy, media, size charts, non-stock variant fields, draft drops and drop designs, info pages; can view homepage settings                                 | Prices, stock, publishing, deleting products, publishing drops, Privé, orders, customers, exports, reports, audit, staff, settings or changing homepage settings |
| **Fulfilment**   | View orders, move orders through shipping statuses, add courier and tracking                                                                                             | View or add order notes; view customers; export; change prices or catalogue; cancel or refund orders                                                             |
| **Support**      | View orders, see and add order notes, view and filter customers                                                                                                          | Change order status; export customers; edit catalogue, drops, reports, staff or settings                                                                         |

The left-hand nav and the admin home page show only the sections for your role. Server-side checks enforce the same rules, so a hidden form is not a workaround.

## Guardrails — read once, apply everywhere

- **Money.** Enter ordinary amounts in the form (`85000`, `85,000.50`, `5000`). The app converts them to integer minor units (kobo, pence, cents) and stores the currency code. Never send minor units into a price or spend field. Blank price = no price in that currency, or “use the design price” for a variant.
- **Paid means verified webhook.** An order becomes paid only when the payment provider confirms it. Never mark an order paid because a customer showed a receipt or a browser redirect. Do not report pending orders as sales.
- **Stock.** Stock is per colour/size variant. VIP and public buyers share one pool, minus any `Reserved for public` units. Reservations last 15 minutes. Do not edit stock to “make room” during a live checkout.
- **Drop timing.** Enter times in your own timezone; the form converts them to UTC. The drop state comes from database time (`now()`), not your computer clock or a shopper's clock. The list, orders and reports show UTC; shoppers see their local time.
- **Privé access.** Verified email login or a personal, single-use, expiring link. The raw link is shown once; only a hash is stored. There is no shared site password.
- **Consent.** Drop-alert and marketing consent are separate, unticked by default and stored with timestamps. Admin shows whether each was given and when; exports include both dates. Do not treat one consent as the other.
- **Exports.** Customer CSV export is Owner/Manager only. The export is written to the audit log before the file is sent; if that write fails, no file is sent. Handle the CSV as customer personal data.
- **Permanent URLs.** A published product's `/p/[slug]` address never changes. If you edit the web address, the old one keeps redirecting and no other product can take it. Treat drop `/drops/[slug]` addresses the same way.
- **Busy drops.** To stop scripts flooding the site, each visitor gets a limited number of waitlist, drop-alert, restock, Privé and checkout attempts in a short window. A real shopper who hits it sees "Too many attempts. Please wait a few minutes and try again." and can try again shortly; nothing needs resetting.
- **Tracking.** Meta Pixel/Conversions API and PostHog are configured through environment variables, not in admin; the keys are still pending. Purchase events come from the paid webhook, not from admin actions or the browser redirect.

---

## Products

**Who:** Owner, Manager, Merchandiser. Prices, stock, publishing and deletion are Owner/Manager only.

### Create a design

- [ ] **Products → New product**.
- [ ] Enter **Name**. **Web address** is generated from the name; edit it before publishing if needed. Format: lowercase letters, numbers and single hyphens.
- [ ] Choose a **Collection** or leave **No collection**.
- [ ] **Create draft**. You land on the product editor.

Drafts are visible to staff only. A new design starts as a draft.

### Edit details

- [ ] Open **Products**, filter by **All / Draft / Published**, and choose the design.
- [ ] In **Details**, fill in **Name**, **Web address**, **Collection**, **Description**, **Fabric**, **Care**, **Fit guidance** and **Delivery timing** (for example, “Ships in 3–5 working days”).
- [ ] Owner/Manager only: set **Status** to **Draft** or **Published**, then **Save details**. Published designs appear in the shop; drop designs also follow their drop's times.
- [ ] If you change the web address after publishing, the form warns you. The old address keeps redirecting permanently.

### Add photos and video

- [ ] In **Photos and video**, drag photos into the drop zone or choose **Choose photos**. JPG, PNG, WebP or AVIF, up to 8 MB each.
- [ ] Describe every photo in **Describe photo N (required)** before uploading. Alt text is mandatory.
- [ ] The first gallery item is the cover image in the shop. Drag items or use the up/down arrows to reorder; the order saves automatically.
- [ ] Open **View settings** on an item to set **Caption**, **Focus (across, down)** like `50% 40%`, **Zoom (1 to 3)**, and for photos an **Effect** of _Still_ or _Movement reel (slow pan)_ with a reel length in seconds. Choose **Save view**.
- [ ] Edit an item's description and move focus off the field to save it. Use the bin icon to delete an item; deletion asks for confirmation.
- [ ] For **Movement video**, choose a file and describe it, then **Upload video**. This needs Mux keys; if they are not configured the page says so and photos still work. The video appears in the shop when Mux finishes processing (`processing` → `ready`). A failed video should be deleted and re-uploaded.

### Add variants and stock

- [ ] In **Variants**, enter comma-separated **Colours** and **Sizes**, then **Add combinations**. Existing colour/size pairs are skipped; suggested SKUs are filled in.
- [ ] Check each row: **Colour**, **Swatch** hex (for example `#1C1A17`, optional), **Size**, **SKU**, and for Owner/Manager **Stock** and **Reserved for public**.
- [ ] **Reserved for public** is stock Privé sales cannot use. Keep it within stock and leave it at `0` unless a drop needs it.
- [ ] **Save variants**. Each colour and size combination and each SKU must be unique. Merchandisers can save colour/size/SKU/swatch but do not see the stock columns.

### Set prices — Owner/Manager only

- [ ] Choose the **Pricing method** first, then **Save pricing method**:
  - **Fixed prices per currency**: you type the NGN, GBP and USD prices yourself (the grid below).
  - **Exchange rate from one base price**: choose a base currency and enter one price; the other currencies are converted with the rates and rounding in **Settings**. Shoppers see and pay exactly the converted amount. A currency with no rate in Settings isn't sold.
- [ ] For fixed pricing, in **Prices**, fill the **Design price** for NGN, GBP and USD. Blank means “not sold in this currency”. Enter major amounts; the form shows whole amounts without trailing `.00`.
- [ ] Only use **Set a different price for a variant** when one colour/size costs more or less. Blank variant cells use the design price. Save new variants before pricing them.
- [ ] **Save prices**. Every price change is recorded in the audit log.
- [ ] On exchange-rate pricing the fixed prices are kept but not used, so switching back to fixed restores them.

### Size chart

- [ ] In **Size chart**, add one row per size with **Bust (cm)**, **Waist (cm)**, **Hip (cm)** and **Length (cm)**.
- [ ] The page offers **Add rows for …** for any variant sizes that have no chart row. **Save size chart** when done.

### Delete a product — Owner/Manager only

- [ ] In **Delete product**, read the warning. This removes variants, prices, size chart, media rows and files, and drop links. Past orders keep their own copy of the name and price. A published product disappears from the shop and old links stop working.
- [ ] Type the product name exactly, then **Delete product**. The button only enables on an exact match.
- [ ] If someone is checking out with it, the delete is refused. Try again after the 15-minute reservation expires.

---

## Drops

**Who:** Owner, Manager, Merchandiser. Publishing and Privé are Owner/Manager only.

### Create or edit a drop

- [ ] **Drops → New drop**, or open an existing drop from the list.
- [ ] Fill **Name** and **Web address** (`xarina.com/drops/[slug]`). The address follows the name until you edit it; an edited drop slug keeps redirecting from the old one.
- [ ] Add a short **Pitch**.
- [ ] Optional **Hero image**: JPG, PNG, WebP or AVIF up to 8 MB, plus **Describe the image** if you upload one. Tick **Remove this image** to clear it.
- [ ] Set **Privé opens**, **Public opens** and optional **Closes**. You type local date/time; the hidden field stores UTC. Privé cannot open after public; closing must be after public opening.
- [ ] Optional **Privé limit per member, per design** — a whole number of at least 1.
- [ ] Choose **When the drop closes**: _Move designs to Available Now_ or _Hide designs_.
- [ ] Owner/Manager only: tick **Published**. Unpublished drops are staff-only. The header shows the current state (Upcoming, Privé open, Public, Closed) from server time.
- [ ] **Create drop** or **Save drop**.

The drop list shows times in UTC, `/drops/[slug]`, state, design count and **interest** count. Interest is waitlist sign-ups, not orders.

### Delete a drop — Owner only

- [ ] Open the drop → **Delete drop** at the bottom of the editor.
- [ ] Read the warning: the drop, its designs, waitlist interest, notifications, access links and old addresses are removed. The designs stay in Products.
- [ ] Type the drop name exactly, then **Delete drop**. The button only enables on an exact match.
- [ ] A drop with orders cannot be deleted; unpublish it instead so past sales keep their drop attribution in Reports. The deletion is recorded in the audit log.

### Add designs to a drop

- [ ] Open the drop → **Designs**.
- [ ] Tick the designs to include. The list shows each design's **interest** count. A design can be in only one open drop.
- [ ] **Save designs**.

Reserved public quantity is set on the product variant, not in the drop editor.

### Privé approvals and access links

**Who:** Owner/Manager only, from **Drops → Privé members**.

- [ ] **Approve by email:** paste one or more emails separated by newlines, commas or semicolons, then **Approve members**. The reply says how many new members were approved.
- [ ] **Requests** are customers who asked for access and are not yet members. Use **Approve** on a row to approve one person.
- [ ] **Members** can be **Revoke**d. This ends their Privé access; it does not delete the customer.
- [ ] To give a member a link, use **Drop** (_Any drop_ or an open drop), **Expires (days)** (1–30, default 3) and **Create link**.
- [ ] **Copy the link immediately.** It is shown once; only a hash is stored. It is single-use and expires. There is no shared password and no screen listing or revoking individual links — revoke the member instead.

---

## Orders and fulfilment

**Who:** Owner, Manager, Fulfilment, Support. Only Owner/Manager/Fulfilment can change status. Only Owner/Manager/Support can see and add notes.

### Find an order

- [ ] **Orders** → filter by **Status** and/or search **Order number or email** → **Filter**.
- [ ] The board is newest first and shows the order number, customer, UTC date, total in order currency, channel (Privé where relevant) and status.
- [ ] Open a row for pieces, quantities, price snapshot, contact, delivery address, provider reference and courier/tracking.
- [ ] The header shows the piece/unit count and when the order was last updated.

### Read the full order record

- [ ] **Order Progress** is a timeline of Placed → Payment confirmed → Processing → Dispatched → Delivered (or Cancelled/Refunded). Dates come from the payment confirmation and status changes; an en dash means that step hasn't happened.
- [ ] **Source & Attribution** shows the sales channel, the linked drop (or "Available now") and the first-touch campaign values recorded at checkout, when present.
- [ ] Owner/Manager/Support can open **View client profile** beside the customer email to check VIP status, other orders and consents.
- [ ] **Payment Events** (Owner/Manager only) lists every webhook for the payment reference, including rejected deliveries and signature validity. **View raw payload** shows the stored event for debugging.
- [ ] **Order Activity** (Owner/Manager only) lists status changes with the staff member who made them and UTC time. Fulfilment and Support do not see these two sections.

Statuses: **Pending payment, Paid, Processing, Dispatched, Delivered, Cancelled, Refunded**. Pending payment is not a sale. Paid is set by the verified webhook, never by staff.

### Move an order along

- [ ] Open the order → **Update status** → choose an allowed **Change status to** value.
- [ ] Fulfilment moves: Paid → Processing or Dispatched; Processing → Dispatched; Dispatched → Delivered.
- [ ] Owner/Manager can also cancel pending/paid/processing orders and record refunds from paid/processing/dispatched/delivered. Cancelling and refunding ask for confirmation.
- [ ] For **Dispatched**, fill **Courier**, **Tracking number** and **Tracking link** (`https://…`), then **Dispatch and email customer**. The customer gets the tracking email. If the email fails, the reply tells you to send the tracking link yourself.
- [ ] For **Refunded**, the admin only records the refund. Send the money back from the payment provider's dashboard.

Support can read orders and leave notes, but cannot change status. Fulfilment cannot see order notes.

### Add a note

- [ ] Open an order → **Notes** → **Add a note** → **Save note**. Notes show the author and UTC time. Maximum 2,000 characters.

---

## Customers

**Who:** Owner, Manager, Support. Export is Owner/Manager only.

### Find a customer

- [ ] **Customers** → search **name, email or phone**, and filter by **Privé** (members / not members), **Waitlisted design**, and **Has purchased** → **Apply**. **Clear** resets the form.
- [ ] The list is 50 per page, with Previous/Next. Each row shows Privé status, paid order count and **interest** count.

### Read a customer record

- [ ] Open a customer for **Details**, **Privé** status/approval date, and **Consent**.
- [ ] Consent rows read _Given on [date] ([source])_ or _Not given_, separately for **Drop alerts** and **Marketing emails**. These are recorded at capture; there is no admin form to change consent here.
- [ ] **Paid orders** lists real paid orders with channel, status and total. **Waitlist interest** lists designs the customer asked about — explicitly “Not orders.”
- [ ] Privé membership is managed in **Drops → Privé members**, linked from the record.

### Export CSV — Owner/Manager

- [ ] Set the filters you want on **Customers**. The **Export CSV** button carries them across.
- [ ] The file exports all matching customers, not just the current page: email, name, phone, country, Privé member, both consent flags and dates, paid orders, waitlist interest and customer-since date.
- [ ] The export is audited before download. Treat the file as personal data and do not share it outside Xarina.

---

## Reports — Owner/Manager

- [ ] **Reports** → set **From** and **To** dates → **Show**. Default is the last 30 days ending today; dates are UTC.
- [ ] **Summary** shows paid orders, revenue, new paying customers, ad spend, CAC and ROAS per currency. Currencies are never converted into one another.
- [ ] **Sales by drop** and **Sales by day** use paid orders only. “Available now (no drop)” is a valid row.
- [ ] **Waitlist interest** is a separate panel: _Interest, not sales. Sign-ups are not orders and may not convert._
- [ ] **Ad spend** is entered by hand: **Date**, **Channel**, optional **Campaign**, **Currency**, **Amount spent** (major units) → **Add spend**. **Remove** deletes a row. CAC and ROAS use this spend; ad attribution is approximate.

---

## Content

**Who:** Merchandiser can edit info pages and view homepage settings. Owner/Manager can edit both.

### Homepage

- [ ] **Content → Homepage**.
- [ ] **Hero:** choose a **Featured drop** or leave **Automatic (next drop)**; set **Headline** and **One-line pitch** if you do not want the drop's defaults.
- [ ] Choose **Hero style**: _Ivory & Ink_ (everyday) or _Noir & Champagne_ (Privé/evening campaign).
- [ ] Optionally upload a **Hero image** (JPG/PNG/WebP/AVIF, 8 MB max) with **Image description (alt text)**, or tick **Remove the hero image**. Without your own image, the drop's first product photo is used.
- [ ] **Announcement bar:** tick **Show the announcement bar**, add **Text** and an optional **Link** (a site path like `/shop` or a full `https://` address).
- [ ] **WhatsApp:** set the international number, e.g. `+2348012345678`. Every “Ask us on WhatsApp” link uses it.
- [ ] **Save homepage**. Merchandisers see the form disabled with a note that only owners and managers can change it.

### Info pages

- [ ] **Content → Info pages** lists About, Contact, FAQs, Delivery, Returns, Privacy and Terms, marked **Published** or **Hidden**.
- [ ] Open a page to edit **Title** and **Text**. Text is plain text — a blank line starts a new paragraph. There is no rich-text editor.
- [ ] Tick **Published (shown in the shop and footer)** when the copy is ready, then **Save page**.

---

## Settings — Owner only

**Who:** Owner only. Changes apply to new checkouts immediately and are recorded in the audit log.

- [ ] **Exchange rates:** choose **From** and **To** currencies, enter **Rate** (how much of the “To” currency one unit of “From” buys), and optional **Round to nearest** in the “To” currency. **Add rate** or **Save rate**. Delete with **Delete** after confirmation. A currency pair can have only one rate.
- [ ] **Shipping zones:** enter a **Zone name** and **Countries** as two-letter codes (`NG, GB`). Leave countries blank for the rest of the world. **Add zone** / **Save zone**. Deleting a zone deletes its charges; past orders keep their own totals.
- [ ] **Delivery charges:** inside a zone, set **Charge name**, **Currency**, **Charge** (major units; `0` = free), **Delivery time**, and tick **Offer this charge at checkout**. **Add charge** / **Save charge**. Shoppers only see charges in their selected currency.

Payment processor keys and GBP/USD routing are configured outside admin, not here.

---

## Audit log — Owner/Manager

- [ ] **Audit log** shows the latest 300 entries, newest first, with date/time, action, staff member, entity and a short _field: old → new_ summary.
- [ ] Filter by **Products**, **Stock**, **Drops**, **Privé**, **Exports** or **Staff**.
- [ ] It records product and price changes, stock changes, drop and drop-design changes, Privé approvals/revokes/links, staff changes and customer exports. Entries made by the system show “System”.

---

## Staff — Owner only

- [ ] **Staff → Add someone**: enter **Name**, **Work email** and **Role**, then **Add**. The person signs in at `/admin/login` with that email; no password or shared login is created.
- [ ] In **Team**, change a person's **Role**, tick/untick **Active**, and **Save**. Deactivating ends their admin access immediately. Changes are audited.
- [ ] You cannot change your own role or deactivate yourself. If the email has no login yet, the system creates one and the person verifies it on first sign-in.

Roles: Owner, Manager, Merchandiser, Fulfilment, Support — see the table above.

---

## Current limitations — plainly stated

These are gaps between the PRD and the UI as it exists today. Work around them or ask an owner; do not assume a hidden control exists.

- No **drop-state preview** in the drop editor. The list and drop header show the current state only.
- No admin screen to **create collections**. Products can only choose from existing collections.
- Info pages are **plain text**, not rich text.
- No admin UI for **Meta/Pixel/CAPI or analytics keys**; Phase 6 tracking keys are still pending.
- No admin UI for **payment provider keys or GBP/USD provider choice**.
- No list or per-link revocation for **Privé access links**; only the member can be revoked.
- The **Orders** board shows the latest 100 orders with status/search filters; there is no date-range report there. Use **Reports** for totals.
- **Audit log** shows the latest 300 entries. **Customers** shows 50 per page.
