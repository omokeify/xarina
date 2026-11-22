-- Phase 4 tests: drop state and purchase gating (rule 6, DROP-1/3), Privé access
-- (rule 7, VIP-1..5), waitlist consent (rules 9, 12; WL-1..5), RLS (rule 8).
-- Self-contained: creates its own staff, designs and drops.
begin;
create extension if not exists pgtap with schema extensions;

select plan(47);

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
  ('f0000000-0000-4000-a000-000000000001', 'p4-owner@xarina.test'),
  ('f0000000-0000-4000-a000-000000000002', 'p4-support@xarina.test');
insert into public.staff (auth_user_id, email, name, role) values
  ('f0000000-0000-4000-a000-000000000001', 'p4-owner@xarina.test', 'P4 Owner', 'owner'),
  ('f0000000-0000-4000-a000-000000000002', 'p4-support@xarina.test', 'P4 Support', 'support');

insert into public.products (id, slug, name, status) values
  ('f1000000-0000-4000-a000-000000000001', 'p4-upcoming', 'P4 Upcoming', 'published'),
  ('f1000000-0000-4000-a000-000000000002', 'p4-vip', 'P4 Vip', 'published'),
  ('f1000000-0000-4000-a000-000000000003', 'p4-public', 'P4 Public', 'published'),
  ('f1000000-0000-4000-a000-000000000004', 'p4-closed-hide', 'P4 Closed Hide', 'published'),
  ('f1000000-0000-4000-a000-000000000005', 'p4-closed-move', 'P4 Closed Move', 'published'),
  ('f1000000-0000-4000-a000-000000000006', 'p4-plain', 'P4 Plain', 'published'),
  ('f1000000-0000-4000-a000-000000000007', 'p4-draft', 'P4 Draft', 'draft');
insert into public.variants (id, product_id, colour, size, sku, stock_on_hand) values
  ('f2000000-0000-4000-a000-000000000001', 'f1000000-0000-4000-a000-000000000002', 'Ink', 'M', 'P4-VIP-M', 5);

-- Timings are relative to database now() so the test never depends on the date.
insert into public.drops (id, name, vip_opens_at, public_opens_at, closes_at, vip_limit_per_member, on_close, published) values
  ('f3000000-0000-4000-a000-000000000001', 'Upcoming', now() + interval '2 days', now() + interval '3 days', null, null, 'move_to_available', true),
  ('f3000000-0000-4000-a000-000000000002', 'Vip window', now() - interval '1 hour', now() + interval '1 day', null, 1, 'move_to_available', true),
  ('f3000000-0000-4000-a000-000000000003', 'Public', now() - interval '2 days', now() - interval '1 day', null, null, 'move_to_available', true),
  ('f3000000-0000-4000-a000-000000000004', 'Closed hide', now() - interval '4 days', now() - interval '3 days', now() - interval '1 day', null, 'hide', true),
  ('f3000000-0000-4000-a000-000000000005', 'Closed move', now() - interval '4 days', now() - interval '3 days', now() - interval '1 day', null, 'move_to_available', true);
insert into public.drop_products (drop_id, product_id) values
  ('f3000000-0000-4000-a000-000000000001', 'f1000000-0000-4000-a000-000000000001'),
  ('f3000000-0000-4000-a000-000000000002', 'f1000000-0000-4000-a000-000000000002'),
  ('f3000000-0000-4000-a000-000000000003', 'f1000000-0000-4000-a000-000000000003'),
  ('f3000000-0000-4000-a000-000000000004', 'f1000000-0000-4000-a000-000000000004'),
  ('f3000000-0000-4000-a000-000000000005', 'f1000000-0000-4000-a000-000000000005');

insert into public.customers (id, email, is_vip, vip_approved_at) values
  ('f4000000-0000-4000-a000-000000000001', 'member@p4.test', true, now()),
  ('f4000000-0000-4000-a000-000000000002', 'guest@p4.test', false, null);

create function pg_temp.act_as_staff(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select auth_user_id from public.staff where email = p_email), 'role', 'authenticated')::text,
    true);
  set local role authenticated;
$$;

-- Drop state and purchase gating (rule 6, DROP-3) --------------------------
select is((select public.drop_state('f3000000-0000-4000-a000-000000000001')), 'upcoming', 'state upcoming before VIP open');
select is((select public.drop_state('f3000000-0000-4000-a000-000000000002')), 'vip', 'state vip between VIP and public open');
select is((select public.drop_state('f3000000-0000-4000-a000-000000000003')), 'public', 'state public after public open');
select is((select public.drop_state('f3000000-0000-4000-a000-000000000004')), 'closed', 'state closed after closes_at');

select is((select allowed from public.can_purchase('f1000000-0000-4000-a000-000000000001', 'f4000000-0000-4000-a000-000000000001', 1)),
  false, 'nobody buys an upcoming drop, not even a member');
select is((select reason from public.can_purchase('f1000000-0000-4000-a000-000000000001', 'f4000000-0000-4000-a000-000000000001', 1)),
  'drop_not_open', 'upcoming reason is drop_not_open');
select is((select reason from public.can_purchase('f1000000-0000-4000-a000-000000000002', 'f4000000-0000-4000-a000-000000000002', 1)),
  'vip_only', 'non-member is blocked during the Privé window');
select is((select reason from public.can_purchase('f1000000-0000-4000-a000-000000000002', null, 1)),
  'vip_only', 'anonymous buyer is blocked during the Privé window');
select results_eq(
  $$ select allowed, channel::text from public.can_purchase('f1000000-0000-4000-a000-000000000002', 'f4000000-0000-4000-a000-000000000001', 1) $$,
  $$ values (true, 'vip') $$, 'member buys in the Privé window on the vip channel');
select results_eq(
  $$ select allowed, channel::text from public.can_purchase('f1000000-0000-4000-a000-000000000003', 'f4000000-0000-4000-a000-000000000002', 1) $$,
  $$ values (true, 'public') $$, 'anyone buys once public, on the public channel');
select is((select reason from public.can_purchase('f1000000-0000-4000-a000-000000000004', null, 1)),
  'drop_closed', 'closed drop with on_close = hide cannot be bought');
select is((select allowed from public.can_purchase('f1000000-0000-4000-a000-000000000005', null, 1)),
  true, 'closed drop with on_close = move_to_available is an ordinary product');
select is((select reason from public.can_purchase('f1000000-0000-4000-a000-000000000006', null, 1)),
  'no_drop', 'a design with no drop is always purchasable');

-- VIP-3: per-member limit counts paid orders and live holds.
insert into public.orders (id, customer_id, email, currency, subtotal_minor, total_minor, status, paid_at, channel, drop_id) values
  ('f5000000-0000-4000-a000-000000000001', 'f4000000-0000-4000-a000-000000000001', 'member@p4.test', 'NGN', 100, 100, 'paid', now(), 'vip', 'f3000000-0000-4000-a000-000000000002');
insert into public.order_items (order_id, variant_id, product_name, colour, size, sku, qty, unit_price_minor) values
  ('f5000000-0000-4000-a000-000000000001', 'f2000000-0000-4000-a000-000000000001', 'P4 Vip', 'Ink', 'M', 'P4-VIP-M', 1, 100);
select is((select reason from public.can_purchase('f1000000-0000-4000-a000-000000000002', 'f4000000-0000-4000-a000-000000000001', 1)),
  'vip_limit', 'member at the per-design limit is blocked');

-- RLS and execute rights (rule 8) --------------------------------------------
set local role anon;
select throws_ok($$ select public.join_waitlist('f1000000-0000-4000-a000-000000000001', 'x@p4.test') $$, '42501', null,
  'anon cannot call join_waitlist directly');
select throws_ok($$ select * from public.can_purchase('f1000000-0000-4000-a000-000000000003', null, 1) $$, '42501', null,
  'anon cannot call can_purchase');
select is((select count(*)::int from public.vip_access_links), 0, 'anon sees no access links');
select is((select count(*)::int from public.prive_sessions), 0, 'anon sees no Privé sessions');
select throws_ok($$ select public.admin_save_drop('{}'::jsonb) $$, '42501', null, 'anon cannot save drops');
reset role;

select pg_temp.act_as_staff('p4-support@xarina.test');
select throws_ok($$ select public.admin_drops() $$, '42501', null, 'support cannot manage drops');
select throws_ok($$ select public.admin_set_vip(array['f4000000-0000-4000-a000-000000000002']::uuid[], true) $$, '42501', null,
  'support cannot approve Privé members');
reset role;

-- Waitlist: consent and interest (rules 9, 12; WL-1..5) ---------------------
select public.join_waitlist('f1000000-0000-4000-a000-000000000001', ' New@P4.test ', 'New Person', null, 'Ink', 'M');
select is((select marketing_consent or drop_alert_consent from public.customers where email = 'new@p4.test'), false,
  'consents stay off unless ticked, and the email is normalised');

select public.join_waitlist('f1000000-0000-4000-a000-000000000001', 'new@p4.test', null, null, 'Ivory', 'L', false, true);
select results_eq(
  $$ select drop_alert_consent, drop_alert_consent_at is not null, marketing_consent from public.customers where email = 'new@p4.test' $$,
  $$ values (true, true, false) $$, 'drop-alert consent is recorded alone, with a timestamp');
select is((select count(*)::int from public.waitlist_entries w join public.customers c on c.id = w.customer_id where c.email = 'new@p4.test'),
  1, 'one entry per email per design');
select is((select colour from public.waitlist_entries w join public.customers c on c.id = w.customer_id where c.email = 'new@p4.test'),
  'Ivory', 'a repeat sign-up updates preferences');

select public.join_waitlist('f1000000-0000-4000-a000-000000000001', 'new@p4.test', null, null, null, null, false, false);
select is((select drop_alert_consent from public.customers where email = 'new@p4.test'), true,
  'a later untick never silently withdraws consent');
select throws_ok($$ select public.join_waitlist('f1000000-0000-4000-a000-000000000007', 'd@p4.test') $$, 'P0002', null,
  'cannot join the waitlist of a draft design');

select pg_temp.act_as_staff('p4-owner@xarina.test');
select is((select (d->>'interest_count')::int from jsonb_array_elements(public.admin_drops()) d where d->>'id' = 'f3000000-0000-4000-a000-000000000001'),
  1, 'admin reports waitlist numbers as interest_count');
select throws_ok(
  $$ select public.admin_set_drop_products('f3000000-0000-4000-a000-000000000003', array['f1000000-0000-4000-a000-000000000001']::uuid[]) $$,
  '23505', null, 'a design cannot be in two open drops');
reset role;

-- Privé access links (rule 7, VIP-2) ----------------------------------------
select pg_temp.act_as_staff('p4-owner@xarina.test');
select lives_ok($$ select public.admin_create_access_link('f4000000-0000-4000-a000-000000000001', 'hash-live', now() + interval '1 day') $$,
  'staff issue a link for an approved member, storing only a hash');
select throws_ok($$ select public.admin_create_access_link('f4000000-0000-4000-a000-000000000002', 'hash-guest', now() + interval '1 day') $$,
  '22023', null, 'links cannot be issued to non-members');
reset role;

select isnt(public.redeem_access_link('hash-live', 'session-1'), null, 'a valid link redeems once');
select is(public.redeem_access_link('hash-live', 'session-2'), null, 'a used link cannot be redeemed again');
select is(public.prive_session_customer('session-1'), 'f4000000-0000-4000-a000-000000000001'::uuid, 'the session resolves to the member');

-- Launch notifications (DROP-4, rule 12) -------------------------------------
select public.join_waitlist('f1000000-0000-4000-a000-000000000003', 'alerts@p4.test', null, null, null, null, false, true);
select public.join_waitlist('f1000000-0000-4000-a000-000000000003', 'silent@p4.test');
select public.join_drop_alerts('bystander@p4.test', true);
select private.enqueue_drop_notifications();
select is((select count(*)::int from public.drop_notifications n join public.customers c on c.id = n.customer_id
    where n.kind = 'public_launch' and n.drop_id = 'f3000000-0000-4000-a000-000000000003' and c.email in ('alerts@p4.test', 'silent@p4.test')), 1,
  'public launch queues only waitlisters who opted in to drop alerts');
select is((select count(*)::int from public.drop_notifications n join public.customers c on c.id = n.customer_id
    where n.kind = 'vip_invite' and n.drop_id = 'f3000000-0000-4000-a000-000000000002' and c.email in ('member@p4.test')), 0,
  'members without drop-alert consent get no Privé invite');

update public.customers set drop_alert_consent = true, drop_alert_consent_at = now() where email = 'member@p4.test';
select private.enqueue_drop_notifications();
select private.enqueue_drop_notifications();
select is((select count(*)::int from public.drop_notifications n join public.customers c on c.id = n.customer_id
    where n.kind = 'vip_invite' and n.drop_id = 'f3000000-0000-4000-a000-000000000002' and c.email in ('member@p4.test')), 1,
  'the Privé invite is queued once, however often the job runs');

select is((select count(*)::int from public.claim_drop_notifications(500) where drop_id in ('f3000000-0000-4000-a000-000000000002', 'f3000000-0000-4000-a000-000000000003') and email in ('alerts@p4.test', 'member@p4.test')), 2, 'sender claims the pending rows');
select is((select count(*)::int from public.claim_drop_notifications(500) where drop_id in ('f3000000-0000-4000-a000-000000000002', 'f3000000-0000-4000-a000-000000000003') and email in ('alerts@p4.test', 'member@p4.test')), 0, 'claimed rows are not handed out twice');

-- Site-wide drop alerts (footer signup) and Privé request details --------------
select throws_ok($$ select public.join_drop_alerts('footer-none@p4.test') $$, '22023', null,
  'footer signup requires drop-alert consent');

select public.join_drop_alerts('footer@p4.test', true, false);
select results_eq(
  $$ select drop_alert_consent, drop_alert_consent_at is not null, marketing_consent, all_drops_alerts
     from public.customers where email = 'footer@p4.test' $$,
  $$ values (true, true, false, true) $$,
  'footer signup records drop-alert consent alone, with a timestamp');

select public.join_drop_alerts('footer-both@p4.test', true, true);
select results_eq(
  $$ select marketing_consent, marketing_consent_at is not null, marketing_consent_source
     from public.customers where email = 'footer-both@p4.test' $$,
  $$ values (true, true, 'footer') $$,
  'marketing consent is its own box, stored with a timestamp and source');

select private.enqueue_drop_notifications();
select is((select count(*)::int from public.drop_notifications n join public.customers c on c.id = n.customer_id
           where c.email = 'footer@p4.test' and n.kind = 'public_launch'), 1,
  'site-wide subscribers get the launch alert without a per-design waitlist entry');

select public.request_prive_access('asker@p4.test', 'Asker', false, ' +234 809 000 0000 ');
select results_eq(
  $$ select phone, prive_requested_at is not null, is_vip from public.customers where email = 'asker@p4.test' $$,
  $$ values ('+234 809 000 0000', true, false) $$,
  'a Privé request stores the phone and grants nothing');

-- Footer signup keeps the ad campaign, first touch only -----------------------
select public.join_drop_alerts('utm1@p4.test', true, false, '{"utm_source": "instagram", "utm_campaign": "autumn"}'::jsonb);
select public.join_drop_alerts('utm1@p4.test', true, false, '{"utm_source": "tiktok"}'::jsonb);
select is((select first_utm->>'utm_source' from public.customers where email = 'utm1@p4.test'), 'instagram',
  'the first campaign is kept and a later visit does not overwrite it');

select public.join_drop_alerts('utm2@p4.test', true);
select is((select first_utm from public.customers where email = 'utm2@p4.test'), null,
  'no campaign stays empty');
select public.join_drop_alerts('utm2@p4.test', true, false, '{"utm_source": "meta"}'::jsonb);
select is((select first_utm->>'utm_source' from public.customers where email = 'utm2@p4.test'), 'meta',
  'a customer with no earlier campaign takes the first one seen');

select * from finish();
rollback;
