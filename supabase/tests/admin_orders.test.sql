-- Phase 5 database tests: orders board status changes (ADM-5, INV-4/5) and settings audit.
-- Rule 2 (an order is never marked paid from the admin), rule 4 (stock goes back once on
-- cancel, holds are freed), rule 8 (service-checked function, no direct writes), ADM-7 (audit).
-- Self-contained fixtures; run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures (as postgres) -------------------------------------------------------
insert into public.products (id, slug, name, status) values
  ('c1000000-0000-4000-a000-000000000001', 'p5-piece', 'P5 Piece', 'published');
insert into public.variants (id, product_id, colour, size, sku, stock_on_hand) values
  ('d1000000-0000-4000-a000-000000000001', 'c1000000-0000-4000-a000-000000000001', 'Black', 'M', 'P5-M', 3);

-- Paid order for 2 pieces (stock already taken: 5 - 2 = 3).
insert into public.orders (id, email, currency, subtotal_minor, shipping_minor, total_minor, status, paid_at) values
  ('e1000000-0000-4000-a000-000000000001', 'a@p5.test', 'NGN', 200, 0, 200, 'paid', now()),
  ('e1000000-0000-4000-a000-000000000002', 'b@p5.test', 'NGN', 200, 0, 200, 'paid', now()),
  ('e1000000-0000-4000-a000-000000000003', 'c@p5.test', 'NGN', 200, 0, 200, 'pending_payment', null);
insert into public.order_items (order_id, variant_id, product_name, colour, size, sku, qty, unit_price_minor) values
  ('e1000000-0000-4000-a000-000000000001', 'd1000000-0000-4000-a000-000000000001', 'P5 Piece', 'Black', 'M', 'P5-M', 2, 100),
  ('e1000000-0000-4000-a000-000000000002', 'd1000000-0000-4000-a000-000000000001', 'P5 Piece', 'Black', 'M', 'P5-M', 1, 100),
  ('e1000000-0000-4000-a000-000000000003', 'd1000000-0000-4000-a000-000000000001', 'P5 Piece', 'Black', 'M', 'P5-M', 1, 100);
insert into public.stock_reservations (variant_id, order_id, qty) values
  ('d1000000-0000-4000-a000-000000000001', 'e1000000-0000-4000-a000-000000000003', 1);

-- Act as a seeded staff member by email (rolls back with the test).
create function pg_temp.act_as(p_email text) returns void language plpgsql as $$
declare v_uid uuid;
begin
  select s.auth_user_id into v_uid from public.staff s where s.email = p_email;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;
-- Fulfilment: shipping moves only -----------------------------------------------
select pg_temp.act_as('fulfil@xarina.test');
select is(public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'processing'), 'processing', 'fulfilment: paid -> processing');
select throws_ok(
  $$select public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'cancelled')$$,
  '42501', 'not_allowed', 'fulfilment cannot cancel');
select throws_ok(
  $$select public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'refunded')$$,
  '42501', 'not_allowed', 'fulfilment cannot refund');
select throws_ok(
  $$select public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'dispatched')$$,
  '22023', 'tracking_required', 'dispatch needs courier, tracking number and link');
select throws_ok(
  $$select public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'dispatched', 'DHL', '123', 'not-a-link')$$,
  '22023', 'tracking_url_invalid', 'tracking link must be http(s)');
select is(public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'dispatched', ' DHL ', ' 123 ', 'https://track.test/123'),
  'dispatched', 'fulfilment: dispatch with tracking');
reset role;
select is((select courier || '|' || tracking_number || '|' || tracking_url from public.orders where id = 'e1000000-0000-4000-a000-000000000001'),
  'DHL|123|https://track.test/123', 'tracking details are stored trimmed');
select pg_temp.act_as('fulfil@xarina.test');
select is(public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'delivered'), 'delivered', 'fulfilment: dispatched -> delivered');

-- Support cannot change status ---------------------------------------------------
reset role;
select pg_temp.act_as('support@xarina.test');
select throws_ok(
  $$select public.admin_set_order_status('e1000000-0000-4000-a000-000000000002', 'processing')$$,
  '42501', 'not_allowed', 'support cannot change order status');

-- Manager: cancel, refund, and the rules around them -------------------------------
reset role;
select pg_temp.act_as('manager@xarina.test');
select throws_ok(
  $$select public.admin_set_order_status('e1000000-0000-4000-a000-000000000003', 'paid')$$,
  '42501', 'not_allowed', 'rule 2: the admin can never mark an order paid');
select is(public.admin_set_order_status('e1000000-0000-4000-a000-000000000002', 'cancelled'), 'cancelled', 'manager: cancel a paid order');
reset role;
select is((select stock_on_hand from public.variants where id = 'd1000000-0000-4000-a000-000000000001'), 4, 'cancelling a paid order puts its pieces back (3 + 1)');
select pg_temp.act_as('manager@xarina.test');
select throws_ok(
  $$select public.admin_set_order_status('e1000000-0000-4000-a000-000000000002', 'refunded')$$,
  '42501', 'not_allowed', 'cancelled is final');
select is(public.admin_set_order_status('e1000000-0000-4000-a000-000000000001', 'refunded'), 'refunded', 'manager: refund a delivered order (record only)');

-- Cancelling an unpaid order frees its hold; stock on hand is untouched -------------
select is(public.admin_set_order_status('e1000000-0000-4000-a000-000000000003', 'cancelled'), 'cancelled', 'manager: cancel an unpaid order');
reset role;
select ok((select released_at is not null from public.stock_reservations where order_id = 'e1000000-0000-4000-a000-000000000003'),
  'the unpaid order''s hold is released');
select is((select stock_on_hand from public.variants where id = 'd1000000-0000-4000-a000-000000000001'), 4, 'releasing a hold does not change stock on hand');

-- Audit and access (ADM-7, rule 8) --------------------------------------------------
select ok((select count(*) >= 1 from public.audit_log where action = 'order.status' and entity_id = 'e1000000-0000-4000-a000-000000000001'),
  'status changes are audited');
select is(has_function_privilege('anon', 'public.admin_set_order_status(uuid, public.order_status, text, text, text)', 'execute'), false,
  'anonymous visitors cannot call it');

-- Settings changes are audited too (ADM-7): they change what shoppers pay ------------
insert into public.fx_rates (base, quote, rate) values ('NGN', 'GBP', 0.0005) on conflict (base, quote) do nothing;
select pg_temp.act_as('owner@xarina.test');
update public.fx_rates set rate = 0.00051 where base = 'NGN' and quote = 'GBP';
reset role;
select ok((select count(*) >= 1 from public.audit_log where action = 'fx_rates.update'), 'exchange-rate changes are audited');

select * from finish();
rollback;
