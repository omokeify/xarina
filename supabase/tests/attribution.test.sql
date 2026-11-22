-- Phase 6: first-touch UTM attribution. The capture runs in the app; these
-- tests prove the RPCs actually persist what the app sends (WL-1, PAY-1).
-- Self-contained fixtures: does not depend on seed.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into public.products (id, slug, name, status, pricing_mode, base_currency, base_amount_minor) values
  ('b0000000-0000-4000-a000-000000000001', 'p6-utm-one', 'P6 One', 'published', 'fixed', null, null),
  ('b0000000-0000-4000-a000-000000000002', 'p6-utm-two', 'P6 Two', 'published', 'fixed', null, null);
insert into public.variants (id, product_id, colour, size, sku, stock_on_hand) values
  ('b1000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-a000-000000000001', 'Ink', 'M', 'P6-UTM-M', 5);
insert into public.variant_prices (product_id, variant_id, currency, amount_minor) values
  ('b0000000-0000-4000-a000-000000000001', null, 'NGN', 1000);
insert into public.shipping_zones (id, name, countries) values
  ('b2000000-0000-4000-a000-000000000001', 'P6 Nigeria', '{NG}');
insert into public.shipping_rates (id, zone_id, name, currency, amount_minor) values
  ('b3000000-0000-4000-a000-000000000001', 'b2000000-0000-4000-a000-000000000001', 'Standard', 'NGN', 500);

-- Waitlist: the campaign from the first tagged visit is saved and never replaced.
select public.join_waitlist(
  'b0000000-0000-4000-a000-000000000001', 'p6-wait@example.test', null, null, null, null, false, false,
  '{"utm_source":"meta","utm_campaign":"drop_1"}'::jsonb);
select is(
  (select source_utm from public.waitlist_entries w join public.customers c on c.id = w.customer_id
   where c.email = 'p6-wait@example.test' and w.product_id = 'b0000000-0000-4000-a000-000000000001'),
  '{"utm_source":"meta","utm_campaign":"drop_1"}'::jsonb,
  'first-touch UTMs are saved on the waitlist entry');

select public.join_waitlist(
  'b0000000-0000-4000-a000-000000000001', 'p6-wait@example.test', null, null, null, null, false, false,
  '{"utm_source":"later"}'::jsonb);
select is(
  (select source_utm from public.waitlist_entries w join public.customers c on c.id = w.customer_id
   where c.email = 'p6-wait@example.test' and w.product_id = 'b0000000-0000-4000-a000-000000000001'),
  '{"utm_source":"meta","utm_campaign":"drop_1"}'::jsonb,
  'a later tagged visit keeps the first campaign');

select public.join_waitlist(
  'b0000000-0000-4000-a000-000000000002', 'p6-wait@example.test');
select is(
  (select source_utm from public.waitlist_entries w join public.customers c on c.id = w.customer_id
   where c.email = 'p6-wait@example.test' and w.product_id = 'b0000000-0000-4000-a000-000000000002'),
  null::jsonb,
  'an untagged visit saves no campaign');

-- Orders: the same campaign travels with the checkout to the payment step.
select public.create_checkout(
  jsonb_build_array(jsonb_build_object('variant_id', 'b1000000-0000-4000-a000-000000000001', 'qty', 1)),
  'NGN', 'p6-buyer@example.test', '+2348000000000', jsonb_build_object('country', 'NG'),
  'b3000000-0000-4000-a000-000000000001'::uuid, null,
  '{"utm_source":"meta","utm_campaign":"drop_1"}'::jsonb);
select is(
  (select utm from public.orders where email = 'p6-buyer@example.test'),
  '{"utm_source":"meta","utm_campaign":"drop_1"}'::jsonb,
  'UTMs are saved on the order');

select public.create_checkout(
  jsonb_build_array(jsonb_build_object('variant_id', 'b1000000-0000-4000-a000-000000000001', 'qty', 1)),
  'NGN', 'p6-buyer2@example.test', '+2348000000000', jsonb_build_object('country', 'NG'),
  'b3000000-0000-4000-a000-000000000001'::uuid, null, null::jsonb);
select is(
  (select utm from public.orders where email = 'p6-buyer2@example.test'),
  null::jsonb,
  'an untagged checkout saves no campaign');

select * from finish();
rollback;
