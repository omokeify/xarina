-- Reporting page: public.admin_report(from, to). Sales come only from paid
-- orders (rule 2), never pending, cancelled or refunded ones; waitlists are a
-- separate "interest" figure (rule 9); amounts stay in minor units per
-- currency (rule 1). Self-contained: uses dates in 2001 so seed data can't leak in.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email) values
  ('f7000000-0000-4000-a000-0000000000a1', 'rp-owner@xarina.test'),
  ('f7000000-0000-4000-a000-0000000000a2', 'rp-merch@xarina.test');
insert into public.staff (auth_user_id, email, name, role) values
  ('f7000000-0000-4000-a000-0000000000a1', 'rp-owner@xarina.test', 'RP Owner', 'owner'),
  ('f7000000-0000-4000-a000-0000000000a2', 'rp-merch@xarina.test', 'RP Merch', 'merchandiser');

insert into public.customers (id, email) values
  ('f7100000-0000-4000-a000-000000000001', 'a@rp.test'),
  ('f7100000-0000-4000-a000-000000000002', 'b@rp.test'),
  ('f7100000-0000-4000-a000-000000000003', 'c@rp.test');

insert into public.orders (customer_id, email, currency, subtotal_minor, total_minor, status, paid_at, created_at) values
  -- In range (January 2001), counted:
  ('f7100000-0000-4000-a000-000000000001', 'a@rp.test', 'NGN', 1000, 1000, 'paid',       '2001-01-02', '2001-01-02'),
  ('f7100000-0000-4000-a000-000000000002', 'b@rp.test', 'NGN',  500,  500, 'dispatched', '2001-01-03', '2001-01-03'),
  ('f7100000-0000-4000-a000-000000000003', 'c@rp.test', 'NGN',  400,  400, 'delivered',  '2001-01-04', '2001-01-04'),
  ('f7100000-0000-4000-a000-000000000001', 'a@rp.test', 'GBP',  200,  200, 'paid',       '2001-01-05', '2001-01-05'),
  -- In range, NOT counted:
  ('f7100000-0000-4000-a000-000000000002', 'b@rp.test', 'NGN',  999,  999, 'refunded',   '2001-01-06', '2001-01-06'),
  ('f7100000-0000-4000-a000-000000000002', 'b@rp.test', 'NGN',  777,  777, 'pending_payment', null,   '2001-01-07'),
  -- Before the range: makes customer C a returning customer, not a new one.
  ('f7100000-0000-4000-a000-000000000003', 'c@rp.test', 'NGN',  300,  300, 'paid',       '2000-12-20', '2000-12-20');

insert into public.ad_spend (date, channel, currency, amount_minor) values
  ('2001-01-10', 'meta', 'NGN', 300),
  ('2000-12-31', 'meta', 'NGN', 5000);   -- outside the range

insert into public.products (id, slug, name, status) values ('f7200000-0000-4000-a000-000000000001', 'rp-design', 'RP Design', 'published');
insert into public.waitlist_entries (customer_id, product_id, created_at) values
  ('f7100000-0000-4000-a000-000000000002', 'f7200000-0000-4000-a000-000000000001', '2001-01-08');

create function pg_temp.act_as(p_sub uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- Access ----------------------------------------------------------------------
set local role anon;
select throws_ok($$ select public.admin_report('2001-01-01', '2001-01-31') $$, '42501', null, 'anonymous visitors cannot read the report');
reset role;
select pg_temp.act_as('f7000000-0000-4000-a000-0000000000a2');
select throws_ok($$ select public.admin_report('2001-01-01', '2001-01-31') $$, '42501', null, 'a merchandiser cannot read the report');
reset role;
select pg_temp.act_as('f7000000-0000-4000-a000-0000000000a1');

create temp table r as select public.admin_report('2001-01-01', '2001-01-31') as j;
create temp view ngn as select e from r, jsonb_array_elements(j->'by_currency') e where e->>'currency' = 'NGN';
create temp view gbp as select e from r, jsonb_array_elements(j->'by_currency') e where e->>'currency' = 'GBP';

-- Sales: paid only (rule 2) -------------------------------------------------------
select is((select (e->>'orders')::int from ngn), 3, 'NGN orders count paid, dispatched and delivered only');
select is((select (e->>'revenue_minor')::bigint from ngn), 1900::bigint,
  'NGN revenue excludes refunded and pending orders, in minor units (rule 1)');
select is((select (e->>'revenue_minor')::bigint from gbp), 200::bigint, 'currencies are reported separately, never converted');
select is((select (e->>'new_customers')::int from ngn), 2, 'new paying customers exclude a customer who first paid before the range');
select is((select (e->>'spend_minor')::bigint from ngn), 300::bigint, 'ad spend counts only the range');
select is((select (e->>'spend_minor')::bigint from gbp), 0::bigint, 'no spend in a currency reads as zero');

select is((select jsonb_array_length(j->'by_day') from r), 4, 'one row per day and currency with sales');
select is((select (j->'by_drop'->0->>'drop') from r), null, 'orders without a drop are grouped as no drop');

-- Interest, not sales (rule 9) ---------------------------------------------------
select is((select (j->'interest'->0->>'signups')::int from r), 1, 'waitlist interest is reported on its own');

select throws_ok($$ select public.admin_report('2001-01-31', '2001-01-01') $$, '22023', null, 'an end date before the start date is refused');

select * from finish();
rollback;
