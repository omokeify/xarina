-- Xarina local seed data. SAMPLE DATA ONLY: names, prices, rates and copy are
-- placeholders for development, not real Xarina content.
-- Loaded by `supabase db reset` after migrations.

-- ---------------------------------------------------------------------------
-- Staff: auth users (email confirmed) + staff rows. Sign in with a magic link;
-- emails arrive in the local mail inbox (`supabase status` shows its URL).
-- ---------------------------------------------------------------------------
with new_staff (id, email, name, role) as (
  values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'owner@xarina.test',   'Olu Owner',      'owner'::public.staff_role),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'manager@xarina.test', 'Mia Manager',    'manager'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'merch@xarina.test',   'Mo Merch',       'merchandiser'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'fulfil@xarina.test',  'Femi Fulfilment','fulfilment'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'support@xarina.test', 'Sade Support',   'support')
),
users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  select
    '00000000-0000-0000-0000-000000000000', s.id, 'authenticated', 'authenticated', s.email, '', now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('name', s.name), now(), now(),
    '', '', '', '', '', '', '', ''
  from new_staff s
  returning id, email
),
identities as (
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', now(), now(), now()
  from users u
  returning user_id
)
insert into public.staff (auth_user_id, email, name, role)
select s.id, s.email, s.name, s.role
from new_staff s
join identities i on i.user_id = s.id;

-- ---------------------------------------------------------------------------
-- Catalogue: the xarina-remote concept catalogue (src/data/xarinaData.ts).
-- SAMPLE DATA for the look of the store; staff edit or delete it in admin.
-- Fixed roles used by supabase/tests and e2e: ...001 + ...002 in Drop 04
-- (upcoming), ...003 Available Now, ...004 Available Now with sold-out sizes
-- (UK 6 / XS, UK 14 / XL), ...005 the only draft, ...013 fully sold out.
-- The concept marks four designs as FX-priced; they are seeded with the
-- concept's own fixed prices instead (FX display is not wired up yet).
-- ---------------------------------------------------------------------------
insert into public.collections (id, slug, name, sort) values
  ('10000000-0000-4000-a000-000000000001', 'dresses', 'Dresses', 1),
  ('10000000-0000-4000-a000-000000000002', 'kaftans', 'Kaftans', 2),
  ('10000000-0000-4000-a000-000000000003', 'evening-sets', 'Evening Sets', 3),
  ('10000000-0000-4000-a000-000000000004', 'jewellery', 'Jewellery', 4);

insert into public.products (id, slug, name, tagline, description, fabric, care, fit_notes, delivery_timing, status, pricing_mode, collection_id, published_at) values
  ('20000000-0000-4000-a000-000000000001', 'solaris-draped-satin-mini', 'Solaris Draped Satin Mini',
   'Liquid burnt-crimson heavy satin with sculptural batwing sleeves.',
   'Engineered to command every room without effort. Cut on the bias from luminous heavy Italian satin in incandescent crimson, the Solaris Mini balances a clean mock collar with sweeping batwing sleeves and an adjustable wrapped waist tie.',
   '100% Heavyweight Italian Silk-Blend Duchesse Satin', 'Specialist dry clean only. Steam on low from reverse side. Store on padded satin hanger.',
   'Fluid through the bodice and sleeves; gently draped wrap fit at the hips. Model is 178 cm wearing UK 8 / S.', 'Drop 04 dispatches within 48 hours of launch via Lagos Express or worldwide DHL.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000001', now() - interval '13 days'),
  ('20000000-0000-4000-a000-000000000002', 'kora-crimson-feather-cape-mini', 'Kora Crimson Feather Cape Mini',
   'Draped crimson satin mini dress framed with dense tonal ostrich plumes.',
   'High-impact evening geometry from Drop 04. Pleated crimson duchesse satin hugs the torso while split floor-grazing cape panels and an asymmetric feathered hem move like liquid flame.',
   'Double-Faced Silk Satin with Hand-Sewn Dyed Ostrich Feather Trim', 'Specialist couture dry clean only.',
   'Fitted bodice and skirt; open draped cape over arms. Model is 178 cm wearing UK 8 / S.', 'Drop 04 — scheduled launch dispatch within 48 hours.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000001', now() - interval '12 days'),
  ('20000000-0000-4000-a000-000000000003', 'noir-draped-cape-mini', 'Noir Draped Cape Mini',
   'Sheer silk georgette cape bodice paired with a crystal-beaded fringe skirt.',
   'Quietly seductive after-dark dressing. An asymmetric whisper-light silk chiffon cape floats over a fitted midnight sequin wrap mini finished with hand-knotted glass bead fringes.',
   '100% Silk Georgette Upper; Hand-Beaded Sequin Skirt with Silk Crepe Lining', 'Specialist dry clean only. Do not iron directly on beaded fringe.',
   'Relaxed cape shoulders with a sleek sculpted skirt. Model is 177 cm wearing UK 8 / S.', 'In stock — ships within 24 hours.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000001', now() - interval '11 days'),
  ('20000000-0000-4000-a000-000000000004', 'zaria-sequin-fringe-mini', 'Zaria 3D Sequin Fringe Mini',
   'Iridescent emerald-cobalt three-dimensional sequins with floor-sweeping silk fringe.',
   'A fitted architectural mini dress where a sharp mock neckline meets dramatic floor-grazing black silk fringes. Hand-applied iridescent sequins shift from deep emerald to sapphire under evening lights, creating hypnotic motion with every step.',
   'Hand-embroidered 3D Iridescent Sequins over Silk Tulle; 100% Viscose Silk Fringe', 'Specialist couture dry clean only. Store flat in breathable Xarina cotton garment cover.',
   'Close tailored bodice with generous fringed sleeves. Take your usual size. Model wears UK 8 / S.', 'Ready to dispatch from Lagos & London hubs within 24 hours.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000001', now() - interval '10 days'),
  ('20000000-0000-4000-a000-000000000005', 'atelier-draft-sample', 'Atelier draft sample',
   '',
   'Staff-only draft: an example of an unpublished design, also used by tests. Safe to delete.',
   '', '',
   '', '',
   'draft', 'fixed', '10000000-0000-4000-a000-000000000001', null),
  ('20000000-0000-4000-a000-000000000006', 'ikoyi-ostrich-feather-kaftan', 'Ikoyi Feather Cady Kaftan',
   'Floor-length liquid black cady gown with choker collar and ostrich-feather cuffs.',
   'An unmistakable Xarina Privé statement. Draped in fluid heavyweight Italian cady with an architectural choker neckline, clean front leg slit, and opulent plumes of ethically sourced black ostrich feathers crowning the kimono sleeves.',
   '78% Acetate, 22% Viscose Heavy Cady; Ethically Sourced Ostrich Feather Cuffs', 'Specialist dry clean only. Steam vertically avoiding direct heat on feathers.',
   'Fluid column silhouette engineered for effortless grace.', 'Drop 05 Privé orders dispatch 48 hours after confirmation.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000002', now() - interval '8 days'),
  ('20000000-0000-4000-a000-000000000007', 'adele-iridescent-tulle-kaftan', 'Adele Iridescent Tulle Kaftan',
   'Sheer embroidered emerald-and-silver sequined tulle floor kaftan with waist cord.',
   'Cut in airy sheer black tulle hand-embroidered with botanical emerald, teal, and silver sequins. Includes a detachable tonal silk crepe slip and beaded waist tie so you can style it cinched or flowing.',
   'Embroidered Polyamide Tulle with 100% Silk Crepe De Chine Under-Slip', 'Specialist dry clean only. Remove beaded waist tie before cleaning.',
   'Generous kaftan cut; cinches gracefully at the waist.', 'In stock — ships within 24 hours worldwide.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000002', now() - interval '7 days'),
  ('20000000-0000-4000-a000-000000000008', 'alaba-ivory-fringe-kaftan', 'Alaba Ivory Fringe Kaftan',
   'Signature one-shoulder heavyweight ivory crepe kaftan with diagonal silk fringe.',
   'Our quintessential wearable statement. Draped from a single sculpted shoulder in warm ivory crepe, finishing in a sweeping diagonal hem of hand-combed tonal silk fringe that moves effortlessly from sunset cocktails to black-tie evenings.',
   'Heavyweight Italian Cady Crepe; Long Tonal Viscose-Silk Fringe', 'Dry clean only. Steam gently vertically to preserve fringe fall.',
   'One Size — engineered to drape cleanly across UK 6 to UK 18.', 'In stock — immediate dispatch from Lagos & London.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000002', now() - interval '6 days'),
  ('20000000-0000-4000-a000-000000000009', 'vesper-oxblood-cowl-gown', 'Vesper Oxblood Cowl-Back Gown',
   'Micro-sequined oxblood column gown with open draped back and 18k gold chains.',
   'Part of the Drop 05 Atelier Privé Edit. Restrained boat neckline at front, plunging liquid cowl back draped with four detachable 18k gold-plated brass chains.',
   'Micro-Sequined Stretch Mesh; Pure Silk Satin Lining; 18k Gold-Plated Back Chains', 'Detach gold chains before specialist dry cleaning.',
   'Bias-cut column fit. Model is 179 cm wearing UK 8 / S.', 'Drop 05 Privé Early Access — dispatches in 48 hours.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000003', now() - interval '5 days'),
  ('20000000-0000-4000-a000-000000000010', 'celeste-midnight-feather-gown', 'Celeste Midnight Feather Gown',
   'Hand-beaded midnight navy column gown with sculpted ostrich feather shoulders and train.',
   'Built for black-tie entrances. Geometric tonal beading elongates the silhouette from collar to floor, crowned with architectural midnight ostrich plumes at the shoulders and sweeping mermaid hem.',
   'Hand-Beaded Midnight Tulle over Silk Satin; Ethically Sourced Ostrich Feathers', 'Specialist couture dry clean only.',
   'Structured column silhouette. True to UK sizing.', 'Drop 04 — limited numbered run.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000003', now() - interval '4 days'),
  ('20000000-0000-4000-a000-000000000011', 'ora-hammered-gold-cuff', 'Ora Hammered Gold Cuff',
   'Hand-forged wide 18k gold-plated architectural brass cuff.',
   'Each Ora Cuff is individually hand-beaten so no two facets catch light the same way. Designed to stack cleanly over bare skin or sleek satin sleeves.',
   '3-Micron 18k Yellow Gold-Plated Solid Brass (Nickel-Free)', 'Wipe with dry polishing cloth after wear. Avoid direct perfume spray.',
   'Open-back malleable cuff: fits wrist circumferences 14.5 cm to 18.5 cm; 5.5 cm high.', 'In stock — ships in signature Xarina linen pouch and ivory presentation box.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000004', now() - interval '3 days'),
  ('20000000-0000-4000-a000-000000000012', 'sola-sculpted-drop-earrings', 'Sola Sculpted Drop Earrings',
   'Organic molten 18k gold-plated brass statement drop earrings.',
   'Lightweight hollow-cast sculptural drops with a hand-hammered liquid gold luster. Finishes both minimalist ivory crepe and heavily beaded eveningwear.',
   '18k Yellow Gold-Plated Italian Brass; Hypoallergenic Titanium Posts', 'Store in individual compartments of your Xarina suede pouch.',
   '7.2 cm drop; 14 g per earring with cushioned disc backs.', 'In stock — dispatches within 24 hours.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000004', now() - interval '2 days'),
  ('20000000-0000-4000-a000-000000000013', 'sahara-copper-fringe-kaftan', 'Sahara Copper Fringe Kaftan',
   'Molten copper sequined chiffon kaftan with 35 cm sweeping silk fringe.',
   'Archived limited edition that sold out during Drop 03. Request a restock alert to hear first if an atelier archive piece returns.',
   'Copper Paillettes on Sheer Silk Chiffon; Silk Slip Lining', 'Specialist dry clean only.',
   'One Size billowing kaftan silhouette.', 'Currently sold out — request a restock alert.',
   'published', 'fixed', '10000000-0000-4000-a000-000000000002', now() - interval '1 days');

-- Old slugs keep redirecting (PDP-1, rule 11).
insert into public.product_slug_history (old_slug, product_id) values
  ('holiday-satin-mini', '20000000-0000-4000-a000-000000000001'),
  ('disco-dragon-dress-multicolor', '20000000-0000-4000-a000-000000000004');

-- Variants (INV-1). reserved_public_qty = units Privé sales cannot use (VIP-4).
insert into public.variants (product_id, colour, colour_hex, size, sku, stock_on_hand, reserved_public_qty, sort) values
  ('20000000-0000-4000-a000-000000000001', 'Burnt Crimson', '#8E2318', 'UK 6 / XS', 'XAR-D4-SL-06', 4, 2, 0),
  ('20000000-0000-4000-a000-000000000001', 'Burnt Crimson', '#8E2318', 'UK 8 / S', 'XAR-D4-SL-08', 6, 2, 1),
  ('20000000-0000-4000-a000-000000000001', 'Burnt Crimson', '#8E2318', 'UK 10 / M', 'XAR-D4-SL-10', 7, 3, 2),
  ('20000000-0000-4000-a000-000000000001', 'Burnt Crimson', '#8E2318', 'UK 12 / L', 'XAR-D4-SL-12', 4, 1, 3),
  ('20000000-0000-4000-a000-000000000002', 'Deep Crimson', '#8C1420', 'UK 6 / XS', 'XAR-D4-KR-06', 3, 1, 0),
  ('20000000-0000-4000-a000-000000000002', 'Deep Crimson', '#8C1420', 'UK 8 / S', 'XAR-D4-KR-08', 5, 2, 1),
  ('20000000-0000-4000-a000-000000000002', 'Deep Crimson', '#8C1420', 'UK 10 / M', 'XAR-D4-KR-10', 4, 2, 2),
  ('20000000-0000-4000-a000-000000000003', 'Obsidian Black', '#161514', 'UK 6 / XS', 'XAR-AN-NR-06', 3, 0, 0),
  ('20000000-0000-4000-a000-000000000003', 'Obsidian Black', '#161514', 'UK 8 / S', 'XAR-AN-NR-08', 6, 0, 1),
  ('20000000-0000-4000-a000-000000000003', 'Obsidian Black', '#161514', 'UK 10 / M', 'XAR-AN-NR-10', 5, 0, 2),
  ('20000000-0000-4000-a000-000000000003', 'Obsidian Black', '#161514', 'UK 12 / L', 'XAR-AN-NR-12', 2, 0, 3),
  ('20000000-0000-4000-a000-000000000004', 'Emerald Iridescent', '#15584A', 'UK 6 / XS', 'XAR-AN-ZR-06', 0, 0, 0),
  ('20000000-0000-4000-a000-000000000004', 'Emerald Iridescent', '#15584A', 'UK 8 / S', 'XAR-AN-ZR-08', 5, 0, 1),
  ('20000000-0000-4000-a000-000000000004', 'Emerald Iridescent', '#15584A', 'UK 10 / M', 'XAR-AN-ZR-10', 4, 0, 2),
  ('20000000-0000-4000-a000-000000000004', 'Emerald Iridescent', '#15584A', 'UK 12 / L', 'XAR-AN-ZR-12', 3, 0, 3),
  ('20000000-0000-4000-a000-000000000004', 'Emerald Iridescent', '#15584A', 'UK 14 / XL', 'XAR-AN-ZR-14', 0, 0, 4),
  ('20000000-0000-4000-a000-000000000005', 'Black', null, 'UK 10 / M', 'XAR-DRAFT-10', 2, 0, 0),
  ('20000000-0000-4000-a000-000000000006', 'Jet Noir', '#111111', 'UK 8 / S', 'XAR-D5-IK-08', 5, 2, 0),
  ('20000000-0000-4000-a000-000000000006', 'Jet Noir', '#111111', 'UK 10 / M', 'XAR-D5-IK-10', 4, 2, 1),
  ('20000000-0000-4000-a000-000000000006', 'Jet Noir', '#111111', 'UK 12 / L', 'XAR-D5-IK-12', 3, 1, 2),
  ('20000000-0000-4000-a000-000000000007', 'Peacock Emerald', '#194D43', 'One Size', 'XAR-AN-AD-OS', 7, 0, 0),
  ('20000000-0000-4000-a000-000000000008', 'Warm Ivory', '#EAE3D4', 'One Size', 'XAR-AN-AL-OS', 9, 0, 0),
  ('20000000-0000-4000-a000-000000000009', 'Deep Oxblood', '#46131C', 'UK 8 / S', 'XAR-D5-VS-08', 4, 2, 0),
  ('20000000-0000-4000-a000-000000000009', 'Deep Oxblood', '#46131C', 'UK 10 / M', 'XAR-D5-VS-10', 3, 1, 1),
  ('20000000-0000-4000-a000-000000000009', 'Deep Oxblood', '#46131C', 'UK 12 / L', 'XAR-D5-VS-12', 0, 0, 2),
  ('20000000-0000-4000-a000-000000000010', 'Midnight Navy', '#18243E', 'UK 8 / S', 'XAR-D4-CL-08', 3, 1, 0),
  ('20000000-0000-4000-a000-000000000010', 'Midnight Navy', '#18243E', 'UK 10 / M', 'XAR-D4-CL-10', 3, 1, 1),
  ('20000000-0000-4000-a000-000000000011', 'Hammered Gold', '#C59A45', 'One Size', 'XAR-AN-OR-OS', 11, 0, 0),
  ('20000000-0000-4000-a000-000000000012', 'Hammered Gold', '#C59A45', 'One Size', 'XAR-AN-SL-OS', 14, 0, 0),
  ('20000000-0000-4000-a000-000000000013', 'Burnt Copper', '#A64A23', 'One Size', 'XAR-AN-SH-OS', 0, 0, 0);

-- Fixed prices per design (variant_id null), in minor units (rule 1).
insert into public.variant_prices (product_id, variant_id, currency, amount_minor) values
  ('20000000-0000-4000-a000-000000000001', null, 'NGN', 42000000),
  ('20000000-0000-4000-a000-000000000001', null, 'GBP', 24500),
  ('20000000-0000-4000-a000-000000000001', null, 'USD', 31000),
  ('20000000-0000-4000-a000-000000000002', null, 'NGN', 61500000),
  ('20000000-0000-4000-a000-000000000002', null, 'GBP', 35500),
  ('20000000-0000-4000-a000-000000000002', null, 'USD', 45000),
  ('20000000-0000-4000-a000-000000000003', null, 'NGN', 49500000),
  ('20000000-0000-4000-a000-000000000003', null, 'GBP', 28500),
  ('20000000-0000-4000-a000-000000000003', null, 'USD', 36000),
  ('20000000-0000-4000-a000-000000000004', null, 'NGN', 68500000),
  ('20000000-0000-4000-a000-000000000004', null, 'GBP', 39500),
  ('20000000-0000-4000-a000-000000000004', null, 'USD', 49500),
  ('20000000-0000-4000-a000-000000000005', null, 'NGN', 50000000),
  ('20000000-0000-4000-a000-000000000005', null, 'GBP', 29000),
  ('20000000-0000-4000-a000-000000000005', null, 'USD', 37000),
  ('20000000-0000-4000-a000-000000000006', null, 'NGN', 74000000),
  ('20000000-0000-4000-a000-000000000006', null, 'GBP', 42500),
  ('20000000-0000-4000-a000-000000000006', null, 'USD', 54000),
  ('20000000-0000-4000-a000-000000000007', null, 'NGN', 66000000),
  ('20000000-0000-4000-a000-000000000007', null, 'GBP', 38000),
  ('20000000-0000-4000-a000-000000000007', null, 'USD', 48000),
  ('20000000-0000-4000-a000-000000000008', null, 'NGN', 44000000),
  ('20000000-0000-4000-a000-000000000008', null, 'GBP', 25500),
  ('20000000-0000-4000-a000-000000000008', null, 'USD', 32500),
  ('20000000-0000-4000-a000-000000000009', null, 'NGN', 78500000),
  ('20000000-0000-4000-a000-000000000009', null, 'GBP', 45000),
  ('20000000-0000-4000-a000-000000000009', null, 'USD', 57500),
  ('20000000-0000-4000-a000-000000000010', null, 'NGN', 89000000),
  ('20000000-0000-4000-a000-000000000010', null, 'GBP', 51500),
  ('20000000-0000-4000-a000-000000000010', null, 'USD', 65000),
  ('20000000-0000-4000-a000-000000000011', null, 'NGN', 18500000),
  ('20000000-0000-4000-a000-000000000011', null, 'GBP', 11000),
  ('20000000-0000-4000-a000-000000000011', null, 'USD', 14000),
  ('20000000-0000-4000-a000-000000000012', null, 'NGN', 14500000),
  ('20000000-0000-4000-a000-000000000012', null, 'GBP', 8500),
  ('20000000-0000-4000-a000-000000000012', null, 'USD', 11000),
  ('20000000-0000-4000-a000-000000000013', null, 'NGN', 72000000),
  ('20000000-0000-4000-a000-000000000013', null, 'GBP', 41500),
  ('20000000-0000-4000-a000-000000000013', null, 'USD', 52500);

-- Size charts (cm). Jewellery has fit notes instead.
insert into public.measurements (product_id, size, bust_cm, waist_cm, hip_cm, length_cm, sort) values
  ('20000000-0000-4000-a000-000000000001', 'UK 6 / XS', 82, 64, 90, 86, 0),
  ('20000000-0000-4000-a000-000000000001', 'UK 8 / S', 86, 68, 94, 88, 1),
  ('20000000-0000-4000-a000-000000000001', 'UK 10 / M', 90, 72, 98, 90, 2),
  ('20000000-0000-4000-a000-000000000001', 'UK 12 / L', 96, 78, 104, 92, 3),
  ('20000000-0000-4000-a000-000000000001', 'UK 14 / XL', 102, 84, 110, 94, 4),
  ('20000000-0000-4000-a000-000000000002', 'UK 6 / XS', 82, 64, 90, 86, 0),
  ('20000000-0000-4000-a000-000000000002', 'UK 8 / S', 86, 68, 94, 88, 1),
  ('20000000-0000-4000-a000-000000000002', 'UK 10 / M', 90, 72, 98, 90, 2),
  ('20000000-0000-4000-a000-000000000002', 'UK 12 / L', 96, 78, 104, 92, 3),
  ('20000000-0000-4000-a000-000000000002', 'UK 14 / XL', 102, 84, 110, 94, 4),
  ('20000000-0000-4000-a000-000000000003', 'UK 6 / XS', 82, 64, 90, 86, 0),
  ('20000000-0000-4000-a000-000000000003', 'UK 8 / S', 86, 68, 94, 88, 1),
  ('20000000-0000-4000-a000-000000000003', 'UK 10 / M', 90, 72, 98, 90, 2),
  ('20000000-0000-4000-a000-000000000003', 'UK 12 / L', 96, 78, 104, 92, 3),
  ('20000000-0000-4000-a000-000000000003', 'UK 14 / XL', 102, 84, 110, 94, 4),
  ('20000000-0000-4000-a000-000000000004', 'UK 6 / XS', 82, 64, 90, 86, 0),
  ('20000000-0000-4000-a000-000000000004', 'UK 8 / S', 86, 68, 94, 88, 1),
  ('20000000-0000-4000-a000-000000000004', 'UK 10 / M', 90, 72, 98, 90, 2),
  ('20000000-0000-4000-a000-000000000004', 'UK 12 / L', 96, 78, 104, 92, 3),
  ('20000000-0000-4000-a000-000000000004', 'UK 14 / XL', 102, 84, 110, 94, 4),
  ('20000000-0000-4000-a000-000000000006', 'UK 6 / XS', 82, 64, 90, 86, 0),
  ('20000000-0000-4000-a000-000000000006', 'UK 8 / S', 86, 68, 94, 88, 1),
  ('20000000-0000-4000-a000-000000000006', 'UK 10 / M', 90, 72, 98, 90, 2),
  ('20000000-0000-4000-a000-000000000006', 'UK 12 / L', 96, 78, 104, 92, 3),
  ('20000000-0000-4000-a000-000000000006', 'UK 14 / XL', 102, 84, 110, 94, 4),
  ('20000000-0000-4000-a000-000000000007', 'One Size', 126, 124, 130, 144, 0),
  ('20000000-0000-4000-a000-000000000008', 'One Size', 126, 124, 130, 144, 0),
  ('20000000-0000-4000-a000-000000000009', 'UK 6 / XS', 82, 64, 90, 86, 0),
  ('20000000-0000-4000-a000-000000000009', 'UK 8 / S', 86, 68, 94, 88, 1),
  ('20000000-0000-4000-a000-000000000009', 'UK 10 / M', 90, 72, 98, 90, 2),
  ('20000000-0000-4000-a000-000000000009', 'UK 12 / L', 96, 78, 104, 92, 3),
  ('20000000-0000-4000-a000-000000000009', 'UK 14 / XL', 102, 84, 110, 94, 4),
  ('20000000-0000-4000-a000-000000000010', 'UK 6 / XS', 82, 64, 90, 86, 0),
  ('20000000-0000-4000-a000-000000000010', 'UK 8 / S', 86, 68, 94, 88, 1),
  ('20000000-0000-4000-a000-000000000010', 'UK 10 / M', 90, 72, 98, 90, 2),
  ('20000000-0000-4000-a000-000000000010', 'UK 12 / L', 96, 78, 104, 92, 3),
  ('20000000-0000-4000-a000-000000000010', 'UK 14 / XL', 102, 84, 110, 94, 4),
  ('20000000-0000-4000-a000-000000000013', 'One Size', 126, 124, 130, 144, 0);

-- Sample photos: AI-generated in Google AI Studio for the xarina-remote concept
-- (its vite.config.ts calls them "generate_image output"). Not Xarina photography
-- and not real Xarina products: replace before launch. Files live in
-- supabase/seed-media and are uploaded by `supabase seed buckets` (pnpm db:reset).
-- Like the concept, most designs show three views of one photo: full, a slow
-- 'movement reel' pan, and a zoomed close-up. Views share one file; deleting a
-- view keeps the file while another view still uses it.
insert into public.product_media (product_id, type, storage_path, alt, label, focus, zoom, effect, duration_sec, sort) values
  ('20000000-0000-4000-a000-000000000001', 'image', 'products/20000000-0000-4000-a000-000000000001/cover.jpg', 'Solaris Draped Satin Mini, campaign look', 'Editorial view', '66% 34%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000001', 'image', 'products/20000000-0000-4000-a000-000000000001/cover.jpg', 'Solaris Draped Satin Mini, movement view', 'Movement reel', '62% 38%', 1, 'pan', 9, 1),
  ('20000000-0000-4000-a000-000000000001', 'image', 'products/20000000-0000-4000-a000-000000000001/cover.jpg', 'Solaris satin drape, close-up', 'Satin detail', '68% 30%', 1.65, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000002', 'image', 'products/20000000-0000-4000-a000-000000000002/cover.jpg', 'Kora Crimson Feather Cape Mini, front view', 'Full silhouette', '50% 14%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000002', 'image', 'products/20000000-0000-4000-a000-000000000002/cover.jpg', 'Kora Crimson Feather Cape Mini, movement view', 'Movement reel', '50% 45%', 1, 'pan', 9, 1),
  ('20000000-0000-4000-a000-000000000002', 'image', 'products/20000000-0000-4000-a000-000000000002/cover.jpg', 'Kora ostrich feather trim, close-up', 'Ostrich plumes', '50% 56%', 1.75, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000003', 'image', 'products/20000000-0000-4000-a000-000000000003/cover.jpg', 'Noir Draped Cape Mini, full look', 'Full silhouette', '50% 14%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000003', 'image', 'products/20000000-0000-4000-a000-000000000003/cover.jpg', 'Noir Draped Cape Mini, movement view', 'Movement reel', '50% 35%', 1, 'pan', 8, 1),
  ('20000000-0000-4000-a000-000000000003', 'image', 'products/20000000-0000-4000-a000-000000000003/cover.jpg', 'Noir beaded fringe, close-up', 'Beaded fringe', '50% 52%', 1.8, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000004', 'image', 'products/20000000-0000-4000-a000-000000000004/cover.jpg', 'Zaria 3D Sequin Fringe Mini, studio front view', 'Full silhouette', '50% 16%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000004', 'image', 'products/20000000-0000-4000-a000-000000000004/cover.jpg', 'Zaria fringe, movement view', 'Movement reel', '50% 42%', 1, 'pan', 11, 1),
  ('20000000-0000-4000-a000-000000000004', 'image', 'products/20000000-0000-4000-a000-000000000004/cover.jpg', 'Zaria sequined bodice, close-up', 'Sequin texture', '50% 24%', 1.75, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000004', 'image', 'products/20000000-0000-4000-a000-000000000004/cover.jpg', 'Zaria silk fringe, close-up', 'Floor fringe', '50% 68%', 1.65, 'none', null, 3),
  ('20000000-0000-4000-a000-000000000006', 'image', 'products/20000000-0000-4000-a000-000000000006/cover.jpg', 'Ikoyi Feather Cady Kaftan, full silhouette', 'Full silhouette', '50% 14%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000006', 'image', 'products/20000000-0000-4000-a000-000000000006/cover.jpg', 'Ikoyi feather cuffs, movement view', 'Movement reel', '50% 40%', 1, 'pan', 10, 1),
  ('20000000-0000-4000-a000-000000000006', 'image', 'products/20000000-0000-4000-a000-000000000006/cover.jpg', 'Ikoyi ostrich feather cuffs, close-up', 'Feather cuffs', '50% 38%', 1.75, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000007', 'image', 'products/20000000-0000-4000-a000-000000000007/cover.jpg', 'Adele Iridescent Tulle Kaftan, full look', 'Full silhouette', '50% 12%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000007', 'image', 'products/20000000-0000-4000-a000-000000000007/cover.jpg', 'Adele Tulle Kaftan, movement view', 'Movement reel', '50% 34%', 1, 'pan', 10, 1),
  ('20000000-0000-4000-a000-000000000007', 'image', 'products/20000000-0000-4000-a000-000000000007/cover.jpg', 'Adele sequin embroidery, close-up', 'Botanical sequins', '50% 26%', 1.8, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000008', 'image', 'products/20000000-0000-4000-a000-000000000008/cover.jpg', 'Alaba Ivory Fringe Kaftan, full studio view', 'Full silhouette', '50% 14%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000008', 'image', 'products/20000000-0000-4000-a000-000000000008/cover.jpg', 'Alaba Ivory Fringe Kaftan, movement view', 'Movement reel', '50% 50%', 1, 'pan', 9, 1),
  ('20000000-0000-4000-a000-000000000008', 'image', 'products/20000000-0000-4000-a000-000000000008/cover.jpg', 'Alaba silk fringe hem, close-up', 'Diagonal fringe', '50% 72%', 1.7, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000009', 'image', 'products/20000000-0000-4000-a000-000000000009/cover.jpg', 'Vesper Oxblood Cowl-Back Gown, back view with gold chains', 'Open-back chains', '62% 35%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000009', 'image', 'products/20000000-0000-4000-a000-000000000009/cover.jpg', 'Vesper gown, movement view', 'Movement reel', '64% 38%', 1, 'pan', 11, 1),
  ('20000000-0000-4000-a000-000000000009', 'image', 'products/20000000-0000-4000-a000-000000000009/cover.jpg', 'Vesper gold chain back, close-up', 'Gold drapery', '65% 28%', 1.85, 'none', null, 2),
  ('20000000-0000-4000-a000-000000000010', 'image', 'products/20000000-0000-4000-a000-000000000010/cover.jpg', 'Celeste Midnight Feather Gown, studio portrait', 'Full silhouette', '50% 15%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000010', 'image', 'products/20000000-0000-4000-a000-000000000010/cover.jpg', 'Celeste feather shoulders, close-up', 'Shoulder plumes', '50% 25%', 1.75, 'none', null, 1),
  ('20000000-0000-4000-a000-000000000011', 'image', 'products/20000000-0000-4000-a000-000000000011/cover.jpg', 'Ora Hammered Gold Cuff, editorial still life', 'Editorial still life', '50% 50%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000011', 'image', 'products/20000000-0000-4000-a000-000000000011/pairing.jpg', 'Ora cuff styled with the Sola drop earrings', 'Suite pairing', '50% 50%', 1, 'none', null, 1),
  ('20000000-0000-4000-a000-000000000012', 'image', 'products/20000000-0000-4000-a000-000000000012/cover.jpg', 'Sola Sculpted Drop Earrings on travertine', 'Studio still life', '50% 50%', 1, 'none', null, 0),
  ('20000000-0000-4000-a000-000000000013', 'image', 'products/20000000-0000-4000-a000-000000000013/cover.jpg', 'Sahara Copper Fringe Kaftan, editorial look', 'Campaign look', '50% 35%', 1, 'none', null, 0);

-- ---------------------------------------------------------------------------
-- Drops: times relative to now() so countdowns and the Privé window work after
-- every reset. Drop 04 is upcoming (VIP in ~2h); Drop 05 is in its Privé window.
-- ---------------------------------------------------------------------------
insert into public.drops (id, slug, name, pitch, hero_storage_path, hero_alt, vip_opens_at, public_opens_at, closes_at, vip_limit_per_member, on_close, published) values
  ('30000000-0000-4000-a000-000000000001', 'drop-04-nocturne', 'Drop 04 — Nocturne in Crimson',
   'Sculpted liquid satin, ostrich-feather trims, and three-dimensional sequins crafted in strictly numbered runs.',
   'hero/holiday-edit.jpg', 'Model reclining on a rug in a burnt-crimson draped satin dress with a mock neck and gold jewellery',
   now() + interval '2 hours 18 minutes', now() + interval '26 hours 18 minutes', now() + interval '10 days', 1, 'move_to_available', true),
  ('30000000-0000-4000-a000-000000000002', 'drop-05-prive-edit', 'Drop 05 — Atelier Privé Edit',
   'Open now exclusively for verified Xarina Privé members before public release.',
   -- Own copy of the Vesper photo, so deleting that product never breaks the drop page.
   'drops/drop-05-prive-edit.jpg', 'Back view of an oxblood cowl-back gown draped with gold chains',
   now() - interval '3 hours', now() + interval '19 hours 42 minutes', now() + interval '14 days', 1, 'move_to_available', true);

insert into public.drop_products (drop_id, product_id, sort) values
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 1),
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000002', 2),
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000010', 3),
  ('30000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000006', 1),
  ('30000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000009', 2);

-- ---------------------------------------------------------------------------
-- Shipping (PAY-3): the concept's zones and rates as PLACEHOLDERS. Launch
-- countries and charges are an open decision (PRD). Lagos courier is a rate
-- inside the Nigeria zone, since zones are matched by country code.
-- ---------------------------------------------------------------------------
insert into public.shipping_zones (id, name, countries, sort) values
  ('40000000-0000-4000-a000-000000000001', 'Nigeria', '{NG}', 1),
  ('40000000-0000-4000-a000-000000000002', 'United Kingdom', '{GB}', 2),
  ('40000000-0000-4000-a000-000000000003', 'United States & international', '{}', 3);

insert into public.shipping_rates (zone_id, name, currency, amount_minor, eta_text, sort) values
  ('40000000-0000-4000-a000-000000000001', 'Lagos express courier', 'NGN', 1000000, 'Same day or next business day', 1),
  ('40000000-0000-4000-a000-000000000001', 'Lagos express courier', 'GBP',     500, 'Same day or next business day', 2),
  ('40000000-0000-4000-a000-000000000001', 'Lagos express courier', 'USD',     700, 'Same day or next business day', 3),
  ('40000000-0000-4000-a000-000000000001', 'Nigeria nationwide (DHL / GIGL)', 'NGN', 2500000, '2–3 business days', 4),
  ('40000000-0000-4000-a000-000000000001', 'Nigeria nationwide (DHL / GIGL)', 'GBP',    1500, '2–3 business days', 5),
  ('40000000-0000-4000-a000-000000000001', 'Nigeria nationwide (DHL / GIGL)', 'USD',    1800, '2–3 business days', 6),
  ('40000000-0000-4000-a000-000000000002', 'DHL Express', 'NGN', 6500000, '3–4 business days, tracked', 1),
  ('40000000-0000-4000-a000-000000000002', 'DHL Express', 'GBP',    3000, '3–4 business days, tracked', 2),
  ('40000000-0000-4000-a000-000000000002', 'DHL Express', 'USD',    3800, '3–4 business days, tracked', 3),
  ('40000000-0000-4000-a000-000000000003', 'DHL Express', 'NGN', 8000000, '3–5 business days, insured', 1),
  ('40000000-0000-4000-a000-000000000003', 'DHL Express', 'GBP',    3800, '3–5 business days, insured', 2),
  ('40000000-0000-4000-a000-000000000003', 'DHL Express', 'USD',    4500, '3–5 business days, insured', 3);

-- Placeholder FX rates from the concept (₦2,050 per £1, ₦1,620 per $1; round to
-- £5 / $5 / ₦5,000). Only used by pricing_mode = 'fx'.
insert into public.fx_rates (base, quote, rate, rounding_increment_minor) values
  ('GBP', 'NGN', 2050.00000000, 500000),
  ('USD', 'NGN', 1620.00000000, 500000),
  ('NGN', 'GBP', 0.00048780, 500),
  ('NGN', 'USD', 0.00061728, 500);

-- ---------------------------------------------------------------------------
-- Info pages (INFO-1): placeholder text until Xarina supplies final wording.
-- ---------------------------------------------------------------------------
-- Page copy from the xarina-remote concept. SAMPLE TEXT: the delivery, returns, privacy and terms
-- wording states policies that are open PRD decisions and needs business and legal sign-off
-- before launch. Staff edit all of it in Admin -> Content (ADM-6).
insert into public.pages (slug, title, body, published) values
  ('about', 'About Xarina', $p$Quiet luxury chrome. Unapologetic statement silhouettes.

Xarina is a Lagos-and-London statement dressing house built for women who move effortlessly between continents, salons, and late-night celebrations. We release strictly numbered drops alongside a tightly curated edit of ready-to-ship icons.

Every silhouette — from hand-combed silk fringe kaftans to three-dimensional sequined minis and hand-beaten gold cuffs — is engineered for movement, proportion, and tactile permanence.

We publish permanent product pages, transparent sizing in centimetres, and verified drop schedules so every piece is acquired with calm certainty rather than chaos.$p$, true),
  ('delivery', 'Delivery', $p$Insured Lagos express courier and DHL Express worldwide.

Lagos Express Courier: Same-day or next business day delivery across Victoria Island, Ikoyi, Lekki, and Mainland Lagos.

Nigeria Nationwide: 2–3 business days via tracked air courier to Abuja, Port Harcourt, and major cities.

United Kingdom, United States & International: 3–5 business days via DHL Express with end-to-end tracking dispatched automatically by email.

Every checkout reserves your exact size and colour for 15 minutes while payment is completed, guaranteeing zero overselling during limited drops.$p$, true),
  ('returns', 'Returns', $p$Clear policy across Lagos, UK, and international orders.

Available Now pieces may be returned or exchanged unworn with original Xarina security ribbons attached within 14 days of delivery.

Numbered Limited Drop pieces are produced in strictly small batches and are eligible for size exchange (subject to remaining stock) or store credit within 7 days of delivery.

For sizing advice before purchase, tap the WhatsApp Help button on any product page to speak directly with a Xarina stylist.$p$, true),
  ('faq', 'FAQs', $p$Drops, Xarina Privé, sizing, and multi-currency payments.

How does Xarina Privé work? Privé members are individually approved by our team and enter early-access windows using a verified email sign-in link or a single-use personal access link. We never use shared site passwords.

Which currencies can I pay in? Switch seamlessly between NGN (₦), GBP (£), and USD ($) in the header. Your display price, bag total, and payment charge always match.

What happens when a drop launches? Countdown clocks are synchronized to server time. The moment VIP or Public opening arrives, Waitlist automatically transitions to Buy Now without needing to refresh.$p$, true),
  ('privacy', 'Privacy Notice', $p$Transparent consent and zero card-data storage.

Xarina complies with the Nigeria Data Protection Act (NDPA) and UK General Data Protection Regulation (UK GDPR).

Waitlist drop-alert consent and marketing consent are always collected separately with an unticked marketing checkbox and full timestamp records.

Card details never touch Xarina servers. All payments are processed by PCI-DSS certified payment providers and confirmed only by signed payment notifications.$p$, true),
  ('terms', 'Terms', $p$Drop allocations, payment verification, and authenticity.

Orders are confirmed only once your payment has been verified by our payment provider, for the exact amount and currency of your checkout.

During Privé early access, per-member quantity limits may apply per design to ensure fair access across our community, alongside reserved public stock allocations.

All designs, photography, and movement reels are intellectual property of Xarina.$p$, true),
  ('contact',  'Contact us',            '[Placeholder: how to reach Xarina. The WhatsApp number is set in Admin -> Content.]', true);

-- ---------------------------------------------------------------------------
-- Site settings (HOME-4)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  -- Sample hero image: AI-generated for the xarina-remote concept (see product media
  -- note above). Not Xarina photography; replace before launch (HOME-4).
  ('hero', jsonb_build_object(
     'featured_drop_id', '30000000-0000-4000-a000-000000000001',
     'media', jsonb_build_object('type', 'image', 'storage_path', 'hero/holiday-edit.jpg',
       'alt', 'Evening campaign look from the Xarina holiday edit'),
     'headline', null,
     'pitch', null,
     -- The concept's dark hero. Staff switch it in Admin -> Content (Hero style).
     'theme', 'prive')),
  ('announcement_bar', jsonb_build_object('enabled', true, 'text', 'Drop 05 Atelier Privé is open for verified members · Worldwide delivery in NGN, GBP and USD', 'href', '/prive')),
  ('whatsapp', jsonb_build_object('number', '+2340000000000'));  -- fake placeholder number
