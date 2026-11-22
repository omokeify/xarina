-- Phase 3 database tests. Run with: supabase test db
-- Rule 1 (money), 2/3 (paid only via idempotent, matched webhook), 4 (no overselling,
-- 15-minute holds), 5 (one stock pool minus reserved_public_qty), 6 (drop state
-- from database time at add-to-cart and payment start), 8 (service role only).
-- Self-contained fixtures: does not depend on seed.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(33);

-- Fixtures -------------------------------------------------------------------
insert into public.products (id, slug, name, status, pricing_mode, base_currency, base_amount_minor) values
  ('c0000000-0000-4000-a000-000000000001', 't3-fixed', 'T3 Fixed', 'published', 'fixed', null, null),
  ('c0000000-0000-4000-a000-000000000002', 't3-fx', 'T3 Fx', 'published', 'fx', 'NGN', 8500000),
  ('c0000000-0000-4000-a000-000000000003', 't3-draft', 'T3 Draft', 'draft', 'fixed', null, null),
  ('c0000000-0000-4000-a000-000000000004', 't3-upcoming', 'T3 Upcoming', 'published', 'fixed', null, null),
  ('c0000000-0000-4000-a000-000000000005', 't3-vip', 'T3 Vip', 'published', 'fixed', null, null);

insert into public.variants (id, product_id, colour, size, sku, stock_on_hand, reserved_public_qty) values
  ('d0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-000000000001', 'Black', 'M', 'T3-FIXED-M', 3, 0),
  ('d0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-000000000002', 'Black', 'M', 'T3-FX-M', 5, 0),
  ('d0000000-0000-4000-a000-000000000003', 'c0000000-0000-4000-a000-000000000003', 'Black', 'M', 'T3-DRAFT-M', 5, 0),
  ('d0000000-0000-4000-a000-000000000004', 'c0000000-0000-4000-a000-000000000004', 'Black', 'M', 'T3-UP-M', 5, 0),
  ('d0000000-0000-4000-a000-000000000005', 'c0000000-0000-4000-a000-000000000005', 'Black', 'M', 'T3-VIP-M', 3, 2);

insert into public.variant_prices (product_id, variant_id, currency, amount_minor) values
  ('c0000000-0000-4000-a000-000000000001', null, 'NGN', 8500000),
  ('c0000000-0000-4000-a000-000000000001', null, 'GBP', 12000),
  ('c0000000-0000-4000-a000-000000000001', 'd0000000-0000-4000-a000-000000000001', 'USD', 15500),
  ('c0000000-0000-4000-a000-000000000004', null, 'NGN', 100),
  ('c0000000-0000-4000-a000-000000000005', null, 'NGN', 100);

-- Seed data has placeholder rates; start from a known set (rolled back with the test).
delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate, rounding_increment_minor) values ('NGN', 'GBP', 0.0005, 500);

insert into public.customers (id, email, is_vip, vip_approved_at) values
  ('a0000000-0000-4000-a000-000000000001', 't3-member@example.test', true, now());

insert into public.drops (id, name, vip_opens_at, public_opens_at, published) values
  ('e0000000-0000-4000-a000-000000000001', 'T3 upcoming drop', now() + interval '2 days', now() + interval '3 days', true),
  ('e0000000-0000-4000-a000-000000000002', 'T3 vip drop', now() - interval '1 hour', now() + interval '1 day', true);
insert into public.drop_products (drop_id, product_id) values
  ('e0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-000000000004'),
  ('e0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-000000000005');

insert into public.shipping_zones (id, name, countries) values
  ('f0000000-0000-4000-a000-000000000001', 'T3 Nigeria', '{NG}'),
  ('f0000000-0000-4000-a000-000000000002', 'T3 Rest of world', '{}');
insert into public.shipping_rates (id, zone_id, name, currency, amount_minor) values
  ('f1000000-0000-4000-a000-000000000001', 'f0000000-0000-4000-a000-000000000001', 'Standard', 'NGN', 500000),
  ('f1000000-0000-4000-a000-000000000002', 'f0000000-0000-4000-a000-000000000002', 'Intl', 'GBP', 2500);

create function pg_temp.checkout(p_variant uuid, p_qty int, p_currency text default 'NGN',
                                 p_rate uuid default 'f1000000-0000-4000-a000-000000000001',
                                 p_member uuid default null, p_country text default 'NG')
returns uuid language sql as $$
  select public.create_checkout(
    jsonb_build_array(jsonb_build_object('variant_id', p_variant, 'qty', p_qty)),
    p_currency, 'Buyer@Example.test', '+2348000000000',
    jsonb_build_object('country', p_country), p_rate, p_member, null);
$$;

-- Pricing (rule 1, CUR-1/2) --------------------------------------------------
select is(public.variant_price_minor('d0000000-0000-4000-a000-000000000001', 'NGN'), 8500000::bigint, 'fixed: design price');
select is(public.variant_price_minor('d0000000-0000-4000-a000-000000000001', 'USD'), 15500::bigint, 'fixed: variant price');
select is(public.variant_price_minor('d0000000-0000-4000-a000-000000000001', 'EUR'), null, 'fixed: no price -> null');
select is(public.variant_price_minor('d0000000-0000-4000-a000-000000000002', 'NGN'), 8500000::bigint, 'fx: base currency');
select is(public.variant_price_minor('d0000000-0000-4000-a000-000000000002', 'GBP'), 4500::bigint, 'fx: converted and rounded to nearest 5 (42.50 -> 45)');
select is(public.variant_price_minor('d0000000-0000-4000-a000-000000000002', 'USD'), null, 'fx: no rate -> null');

-- Checkout, reservation, no overselling (rule 4) -----------------------------
create temp table t_orders (name text primary key, id uuid);
insert into t_orders values ('first', pg_temp.checkout('d0000000-0000-4000-a000-000000000001', 2));

select is(private.variant_sellable('d0000000-0000-4000-a000-000000000001'), 1, 'a hold reduces sellable stock');
select is((select stock_on_hand from public.variants where id = 'd0000000-0000-4000-a000-000000000001'), 3, 'stock on hand is untouched until paid');
select is((select subtotal_minor from public.orders where id = (select id from t_orders where name = 'first')), 17000000::bigint, 'subtotal is server-priced');
select is((select total_minor from public.orders where id = (select id from t_orders where name = 'first')), 17500000::bigint, 'total = subtotal + shipping from the rate row');
select is((select status::text from public.orders where id = (select id from t_orders where name = 'first')), 'pending_payment', 'order starts pending');
select throws_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000001', 2)$$, 'P0001', 'out_of_stock', 'cannot reserve more than is left');
select is(private.variant_sellable('d0000000-0000-4000-a000-000000000001'), 1, 'failed checkout takes no hold');
select throws_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000001', 1, 'GBP')$$, 'P0001', 'invalid_shipping', 'shipping rate must match the order currency');
select throws_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000001', 1, 'GBP', 'f1000000-0000-4000-a000-000000000002', null, 'NG')$$, 'P0001', 'shipping_unavailable', 'fallback zone not used for a country with its own zone');
select throws_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000003', 1)$$, 'P0001', 'unavailable', 'draft product cannot be bought');

-- Hold expiry (PAY-4) ----------------------------------------------------------
update public.stock_reservations set expires_at = now() - interval '1 minute'
where order_id = (select id from t_orders where name = 'first');
select is(public.release_expired_reservations(), 1, 'expired hold released');
select is(private.variant_sellable('d0000000-0000-4000-a000-000000000001'), 3, 'expired hold frees sellable stock');
select is((select status::text from public.orders where id = (select id from t_orders where name = 'first')), 'cancelled', 'expired order cancelled');

-- Drop gate (rule 6) ------------------------------------------------------------
select throws_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000004', 1)$$, 'P0001', 'drop_not_open', 'upcoming drop blocks payment start');
select throws_ok($$select public.check_add_to_cart('d0000000-0000-4000-a000-000000000004', 1, null)$$, 'P0001', 'drop_not_open', 'upcoming drop blocks add-to-cart');
select throws_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000005', 1)$$, 'P0001', 'vip_only', 'vip window blocks non-members');

-- One pool minus reserved_public_qty (rule 5) ---------------------------------
select throws_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000005', 2, 'NGN', 'f1000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001')$$, 'P0001', 'out_of_stock', 'vip sale cannot take the public reserve (3 on hand, 2 reserved)');
select lives_ok($$select pg_temp.checkout('d0000000-0000-4000-a000-000000000005', 1, 'NGN', 'f1000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001')$$, 'vip sale can take unreserved stock');

-- Paid only via a matched, idempotent webhook (rules 2, 3) ------------------------
insert into t_orders values ('paid', pg_temp.checkout('d0000000-0000-4000-a000-000000000002', 1)),
                            ('wrong', pg_temp.checkout('d0000000-0000-4000-a000-000000000002', 1));
select public.attach_payment_ref((select id from t_orders where name = 'paid'), 'paystack', 'ref-paid');
select public.attach_payment_ref((select id from t_orders where name = 'wrong'), 'paystack', 'ref-wrong');
select is(public.mark_order_paid('paystack', 'ref-wrong', 'charge.success', 1, 'NGN', '{}'), 'mismatch', 'wrong amount is not paid');
select is(public.mark_order_paid('paystack', 'ref-wrong', 'charge.success', 1, 'NGN', '{}'), 'mismatch', 'a repeated wrong amount is still just a mismatch');
select is(public.mark_order_paid('paystack', 'ref-wrong', 'charge.success',
  (select total_minor from public.orders where id = (select id from t_orders where name = 'wrong')), 'NGN', '{}'), 'paid', 'a rejected delivery never blocks the later correct one');
select is(public.mark_order_paid('paystack', 'ref-paid', 'charge.success',
  (select total_minor from public.orders where id = (select id from t_orders where name = 'paid')), 'NGN', '{}'), 'paid', 'matching amount and currency marks paid');
select is(public.mark_order_paid('paystack', 'ref-paid', 'charge.success',
  (select total_minor from public.orders where id = (select id from t_orders where name = 'paid')), 'NGN', '{}'), 'duplicate', 'replayed webhook is a no-op');
select is((select stock_on_hand from public.variants where id = 'd0000000-0000-4000-a000-000000000002'), 3, 'each paid order decrements stock on hand once (two paid orders: 5 -> 3)');
select is(public.release_order((select id from t_orders where name = 'paid')), false, 'a paid order cannot be released');

-- Service role only (rule 8) -----------------------------------------------------
select is(has_function_privilege('anon', 'public.create_checkout(jsonb, text, text, text, jsonb, uuid, uuid, jsonb)', 'execute'), false, 'anon cannot create orders');
select is(has_function_privilege('authenticated', 'public.mark_order_paid(text, text, text, bigint, text, jsonb)', 'execute'), false, 'shoppers cannot mark orders paid');

select * from finish();
rollback;
