-- Phase 5 customer database (CRM-1/2/3): roles, search, filters, paid orders only
-- (rule 9 interest, not sales), consent with timestamps (rule 12), export rights.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email) values
  ('f7000000-0000-4000-a000-0000000000a1', 'cr-owner@xarina.test'),
  ('f7000000-0000-4000-a000-0000000000a2', 'cr-support@xarina.test'),
  ('f7000000-0000-4000-a000-0000000000a3', 'cr-fulfil@xarina.test');
insert into public.staff (auth_user_id, email, name, role) values
  ('f7000000-0000-4000-a000-0000000000a1', 'cr-owner@xarina.test', 'CR Owner', 'owner'),
  ('f7000000-0000-4000-a000-0000000000a2', 'cr-support@xarina.test', 'CR Support', 'support'),
  ('f7000000-0000-4000-a000-0000000000a3', 'cr-fulfil@xarina.test', 'CR Fulfilment', 'fulfilment');

insert into public.products (id, slug, name, status) values
  ('f7100000-0000-4000-a000-000000000001', 'cr-design', 'CR Design', 'published');

insert into public.customers (id, email, name, phone, is_vip, vip_approved_at,
                              marketing_consent, marketing_consent_at, marketing_consent_source,
                              drop_alert_consent, drop_alert_consent_at, drop_alert_consent_source) values
  ('f7200000-0000-4000-a000-000000000001', 'alice@crtest.example', 'Alice Adeyemi', '+234 809 111 2222', true, now(),
     true, now(), 'waitlist', true, now(), 'waitlist'),
  ('f7200000-0000-4000-a000-000000000002', 'bob@crtest.example', 'Bob Mensah', null, false, null,
     false, null, null, false, null, null),
  ('f7200000-0000-4000-a000-000000000003', 'carla@crtest.example', 'Carla Obi', '+44 7700 900123', false, null,
     false, null, null, false, null, null);

insert into public.orders (customer_id, email, currency, subtotal_minor, total_minor, status, paid_at, channel) values
  ('f7200000-0000-4000-a000-000000000001', 'alice@crtest.example', 'NGN', 1000, 1000, 'paid', now(), 'vip'),
  ('f7200000-0000-4000-a000-000000000001', 'alice@crtest.example', 'NGN', 500, 500, 'pending_payment', null, 'public'),
  ('f7200000-0000-4000-a000-000000000003', 'carla@crtest.example', 'NGN', 700, 700, 'pending_payment', null, 'public'),
  (null, 'bob@crtest.example', 'NGN', 900, 900, 'delivered', now(), 'public');   -- guest checkout, matched by email

insert into public.waitlist_entries (customer_id, product_id, colour, size) values
  ('f7200000-0000-4000-a000-000000000001', 'f7100000-0000-4000-a000-000000000001', 'Ink', 'M');

create function pg_temp.act_as(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select auth_user_id from public.staff where email = p_email), 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- Access --------------------------------------------------------------------
set local role anon;
select throws_ok($$ select public.admin_customers() $$, '42501', null, 'anon cannot read the customer list');
reset role;
select pg_temp.act_as('cr-fulfil@xarina.test');
select throws_ok($$ select public.admin_customers() $$, '42501', null, 'fulfilment cannot read the customer list');
reset role;

-- Search and filters (support can read) -------------------------------------
select pg_temp.act_as('cr-support@xarina.test');
select is((public.admin_customers('crtest.example')->>'total')::int, 3, 'search by email finds the 3 test customers');
select is((public.admin_customers('mensah')->>'total')::int, 1, 'search by name');
select is((public.admin_customers('8091112222')->>'total')::int, 1, 'search by phone digits ignores spaces and +234');
select is((public.admin_customers('+44 (7700) 900-123')->>'total')::int, 1, 'phone search ignores punctuation');
select is((public.admin_customers('%')->>'total')::int, 0, 'a wildcard character is just text, not a match-all');

select is((public.admin_customers('crtest.example', true)->>'total')::int, 1, 'filter: Privé members');
select is((public.admin_customers('crtest.example', false)->>'total')::int, 2, 'filter: not Privé members');
select is((public.admin_customers('crtest.example', null, null, true)->>'total')::int, 2,
  'filter: has purchased counts paid orders only, matched by customer or guest email');
select is((public.admin_customers('crtest.example', null, null, false)->>'total')::int, 1,
  'filter: has not purchased (a pending order is not a purchase)');
select is((public.admin_customers('crtest.example', null, 'f7100000-0000-4000-a000-000000000001')->>'total')::int, 1,
  'filter: waitlisted for a design');

select is((select r->>'paid_orders' from jsonb_array_elements(public.admin_customers('alice')->'rows') r), '1',
  'the list counts only paid orders');
select is((select r->>'interest_count' from jsonb_array_elements(public.admin_customers('alice')->'rows') r), '1',
  'waitlist sign-ups are reported as interest_count');

-- Customer record ------------------------------------------------------------
select is(jsonb_array_length(public.admin_customer('f7200000-0000-4000-a000-000000000001')->'orders'), 1,
  'the record lists paid orders only');
select is(public.admin_customer('f7200000-0000-4000-a000-000000000001')->'waitlist'->0->>'name', 'CR Design',
  'the record lists waitlisted designs');
select results_eq(
  $$ select c->'marketing'->>'source', c->'drop_alerts'->>'source', (c->'marketing'->>'at') is not null
     from (select public.admin_customer('f7200000-0000-4000-a000-000000000001')->'consents' as c) x $$,
  $$ values ('waitlist', 'waitlist', true) $$,
  'each consent is shown separately with its source and timestamp');
select throws_ok($$ select public.admin_customer('f7200000-0000-4000-a000-0000000000ff') $$, 'P0002', null,
  'an unknown customer is not found');

-- Export (owner and manager only) ----------------------------------------------
select throws_ok($$ select public.admin_customers_export('crtest.example') $$, '42501', null, 'support cannot export');
reset role;
select pg_temp.act_as('cr-owner@xarina.test');
select is(jsonb_array_length(public.admin_customers_export('crtest.example')), 3, 'an owner can export the filtered customers');
reset role;

select * from finish();
rollback;
