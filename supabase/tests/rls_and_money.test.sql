-- Phase 1 database tests. Run with: supabase test db
-- Rule 1 (money), rule 3 (idempotent webhooks), rule 6 (drop state from
-- database time), rule 8 (RLS), plus staff helpers.
begin;
create extension if not exists pgtap with schema extensions;

select plan(30);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres): two customers with one order each, an audit row.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-00000000000a', 'authenticated', 'authenticated', 'a@customer.xarina.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-a000-00000000000b', 'authenticated', 'authenticated', 'b@customer.xarina.test', '', now(), '{}', '{}', now(), now());

insert into public.customers (id, auth_user_id, email) values
  ('aaaaaaaa-1111-4000-a000-00000000000a', 'aaaaaaaa-0000-4000-a000-00000000000a', 'a@customer.xarina.test'),
  ('bbbbbbbb-1111-4000-a000-00000000000b', 'bbbbbbbb-0000-4000-a000-00000000000b', 'b@customer.xarina.test');

insert into public.orders (id, customer_id, email, currency, subtotal_minor, shipping_minor, total_minor) values
  ('aaaaaaaa-2222-4000-a000-00000000000a', 'aaaaaaaa-1111-4000-a000-00000000000a', 'a@customer.xarina.test', 'NGN', 18500000, 500000, 19000000),
  ('bbbbbbbb-2222-4000-a000-00000000000b', 'bbbbbbbb-1111-4000-a000-00000000000b', 'b@customer.xarina.test', 'GBP', 9500, 500, 10000);

insert into public.order_items (order_id, product_name, colour, size, sku, qty, unit_price_minor) values
  ('bbbbbbbb-2222-4000-a000-00000000000b', 'Sample', 'Black', 'M', 'TEST-SKU', 1, 9500);

insert into public.audit_log (staff_id, action, entity_type) values
  ((select id from public.staff where email = 'owner@xarina.test'), 'test', 'product');

-- Helper: act as a signed-in user.
create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- ---------------------------------------------------------------------------
-- Schema-wide checks
-- ---------------------------------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'rule 8: RLS is enabled on every public table'
);

select is_empty(
  $$ select table_name || '.' || column_name from information_schema.columns
     where table_schema = 'public' and column_name like '%\_minor' and data_type <> 'bigint' $$,
  'rule 1: every *_minor money column is bigint'
);

select is_empty(
  $$ select table_name || '.' || column_name from information_schema.columns
     where table_schema = 'public'
       and data_type in ('real', 'double precision', 'money') $$,
  'rule 1: no float or money-type columns anywhere'
);

select is_empty(
  $$ select table_name || '.' || column_name from information_schema.columns
     where table_schema = 'public' and data_type = 'numeric'
       and (table_name, column_name) not in (
         ('fx_rates', 'rate'), ('product_media', 'zoom'),
         ('measurements', 'bust_cm'), ('measurements', 'waist_cm'),
         ('measurements', 'hip_cm'), ('measurements', 'length_cm')) $$,
  'rule 1: numeric only for FX rates, measurements and image zoom, never money'
);

select throws_ok(
  $$ insert into public.variant_prices (product_id, currency, amount_minor)
     values ('20000000-0000-4000-a000-000000000005', 'EUR', 100) $$,
  '23514', null,
  'currency must be NGN, GBP or USD'
);

-- ---------------------------------------------------------------------------
-- Rule 3: one valid payment event per provider reference and type
-- ---------------------------------------------------------------------------
insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
values ('paystack', 'ref_1', 'charge.success', '{}', false),
       ('paystack', 'ref_1', 'charge.success', '{}', true);
select throws_ok(
  $$ insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
     values ('paystack', 'ref_1', 'charge.success', '{}', true) $$,
  '23505', null,
  'rule 3: a duplicate valid webhook is rejected; a forged invalid one never blocks the real one'
);
select throws_ok(
  $$ insert into public.orders (email, currency, subtotal_minor, shipping_minor, total_minor, provider, provider_ref)
     values ('x@customer.xarina.test', 'NGN', 1, 0, 1, 'paystack', 'dup'),
            ('y@customer.xarina.test', 'NGN', 1, 0, 1, 'paystack', 'dup') $$,
  '23505', null,
  'rule 3: orders are unique on (provider, provider_ref)'
);

-- ---------------------------------------------------------------------------
-- Rule 6: drop_state from database time
-- ---------------------------------------------------------------------------
insert into public.drops (id, name, vip_opens_at, public_opens_at, closes_at, published) values
  ('d0000000-0000-4000-a000-000000000001', 'upcoming', now() + interval '1 hour', now() + interval '2 hours', null, true),
  ('d0000000-0000-4000-a000-000000000002', 'vip',      now() - interval '1 hour', now() + interval '1 hour',  null, true),
  ('d0000000-0000-4000-a000-000000000003', 'public',   now() - interval '2 hours', now() - interval '1 hour', null, true),
  ('d0000000-0000-4000-a000-000000000004', 'closed',   now() - interval '3 hours', now() - interval '2 hours', now() - interval '1 hour', true),
  ('d0000000-0000-4000-a000-000000000005', 'hidden',   now() - interval '3 hours', now() - interval '2 hours', null, false);

select is(public.drop_state('d0000000-0000-4000-a000-000000000001'), 'upcoming', 'rule 6: before VIP open = upcoming');
select is(public.drop_state('d0000000-0000-4000-a000-000000000002'), 'vip',      'rule 6: between VIP and public = vip');
select is(public.drop_state('d0000000-0000-4000-a000-000000000003'), 'public',   'rule 6: after public open = public');
select is(public.drop_state('d0000000-0000-4000-a000-000000000004'), 'closed',   'rule 6: after closes_at = closed');

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------
set local role anon;

select is(
  (select count(*)::int from public.products where status = 'draft'), 0,
  'anon cannot read draft products'
);
select ok(
  (select count(*) from public.products where status = 'published') >= 4,
  'anon can read published products'
);
select is(
  (select count(*)::int from public.variant_prices where product_id = '20000000-0000-4000-a000-000000000005'), 0,
  'anon cannot read prices of a draft product'
);
select is(public.drop_state('d0000000-0000-4000-a000-000000000005'), null, 'anon gets no state for an unpublished drop');
select throws_ok(
  $$ insert into public.orders (email, currency, subtotal_minor, shipping_minor, total_minor)
     values ('anon@customer.xarina.test', 'NGN', 100, 0, 100) $$,
  '42501', null,
  'anon cannot insert into orders'
);
select throws_ok(
  $$ insert into public.variants (product_id, colour, size, sku)
     values ('20000000-0000-4000-a000-000000000003', 'Red', 'XL', 'ANON-1') $$,
  '42501', null,
  'anon cannot insert into variants'
);
select throws_ok(
  $$ update public.variants set stock_on_hand = 999 $$,
  '42501', null,
  'anon cannot change stock'
);
select is((select count(*)::int from public.customers), 0, 'anon cannot read customers');

reset role;

-- ---------------------------------------------------------------------------
-- Customer A
-- ---------------------------------------------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-a000-00000000000a');

select is((select count(*)::int from public.orders), 1, 'customer A sees exactly one order');
select is(
  (select count(*)::int from public.orders where customer_id = 'bbbbbbbb-1111-4000-a000-00000000000b'), 0,
  'customer A cannot read customer B''s orders'
);
select is((select count(*)::int from public.order_items), 0, 'customer A cannot read customer B''s order items');
select is((select count(*)::int from public.customers), 1, 'customer A sees only their own customer row');
select is(public.is_staff(), false, 'a customer is not staff');
select throws_ok(
  $$ update public.orders set status = 'paid', paid_at = now() where customer_id = public.current_customer_id() $$,
  '42501', null,
  'rule 2: a customer cannot mark their own order paid'
);

reset role;

-- ---------------------------------------------------------------------------
-- Staff roles
-- ---------------------------------------------------------------------------
select pg_temp.act_as((select auth_user_id from public.staff where email = 'support@xarina.test'));
select is((select count(*)::int from public.audit_log), 0, 'support cannot read audit_log');
select ok((select count(*) from public.orders) >= 2, 'support can read orders');
reset role;

select pg_temp.act_as((select auth_user_id from public.staff where email = 'manager@xarina.test'));
select is((select count(*)::int from public.audit_log where action = 'test'), 1, 'manager can read audit_log');
select is((select role::text from public.current_staff()), 'manager', 'current_staff returns the signed-in staff member');
reset role;

select pg_temp.act_as((select auth_user_id from public.staff where email = 'merch@xarina.test'));
select throws_ok(
  $$ update public.products set status = 'published' where id = '20000000-0000-4000-a000-000000000005' $$,
  '42501', null,
  'a merchandiser cannot publish a product'
);
reset role;

select * from finish();
rollback;
