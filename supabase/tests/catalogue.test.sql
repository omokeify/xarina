-- Phase 2 catalogue tests: hidden stock, storefront reads, slug redirects
-- (rule 11), admin RPC permissions and audit (ADM-3, ADM-7).
begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

create function pg_temp.act_as_staff(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select auth_user_id from public.staff where email = p_email), 'role', 'authenticated')::text,
    true);
  set local role authenticated;
$$;

-- Seed ids
--   drop product:      20000000-0000-4000-a000-000000000001 (solaris-draped-satin-mini, Drop 04)
--   available product: 20000000-0000-4000-a000-000000000003 (noir-draped-cape-mini)
--   skirt (L sold out):20000000-0000-4000-a000-000000000004
--   draft:             20000000-0000-4000-a000-000000000005

-- Seeded drop times are relative to the last reset, so pin Drop 04 to
-- "upcoming" for this run (rolled back at the end).
update public.drops
set vip_opens_at = now() + interval '1 day', public_opens_at = now() + interval '2 days', closes_at = now() + interval '10 days'
where id = '30000000-0000-4000-a000-000000000001';

-- ---------------------------------------------------------------------------
-- Hidden stock
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select stock_on_hand from public.variants limit 1 $$, '42501', null,
  'anon cannot read variants.stock_on_hand');
select throws_ok($$ select reserved_public_qty from public.variants limit 1 $$, '42501', null,
  'anon cannot read variants.reserved_public_qty');
select lives_ok($$ select id, colour, size, sku from public.variants limit 1 $$,
  'anon can read variant identity columns');
reset role;

select pg_temp.act_as_staff('support@xarina.test');
select throws_ok($$ select stock_on_hand from public.variants limit 1 $$, '42501', null,
  'signed-in users cannot read stock columns directly either');
reset role;

-- ---------------------------------------------------------------------------
-- storefront_products
-- ---------------------------------------------------------------------------
set local role anon;
select is((select count(*)::int from public.storefront_products()),
  (select count(*)::int from public.products where status = 'published'), 'listing has every published product');
select is((select count(*)::int from public.storefront_products() where id = '20000000-0000-4000-a000-000000000005'), 0,
  'listing excludes drafts');
select is((select section from public.storefront_products() where id = '20000000-0000-4000-a000-000000000001'), 'upcoming',
  'drop product is upcoming before VIP open');
select is((select drop_state from public.storefront_products() where id = '20000000-0000-4000-a000-000000000001'), 'upcoming',
  'drop_state is upcoming');
select is((select section from public.storefront_products() where id = '20000000-0000-4000-a000-000000000003'), 'available',
  'product with no drop is available');
select is((select prices from public.storefront_products() where id = '20000000-0000-4000-a000-000000000003'),
  '{"NGN": 49500000, "GBP": 28500, "USD": 36000}'::jsonb, 'listing returns the lowest price per currency');
select is((select cover_path from public.storefront_products() where id = '20000000-0000-4000-a000-000000000003'),
  'products/20000000-0000-4000-a000-000000000003/cover.jpg', 'listing returns the cover image');
select is((select sold_out from public.storefront_products() where id = '20000000-0000-4000-a000-000000000004'), false,
  'one sold-out size does not make the design sold out');
select ok(public.server_now() is not null, 'anon can read server time');
reset role;

-- ---------------------------------------------------------------------------
-- storefront_product
-- ---------------------------------------------------------------------------
set local role anon;
select is(public.storefront_product('atelier-draft-sample'), null, 'draft product page returns null');
select is(public.storefront_product('no-such-slug'), null, 'unknown slug returns null');
select is(
  (select v->>'available' from jsonb_array_elements(public.storefront_product('zaria-sequin-fringe-mini')->'variants') v
   where v->>'size' = 'UK 6 / XS' limit 1),
  'false', 'sold-out variant shows available = false');
select ok(
  not exists (select 1 from jsonb_array_elements(public.storefront_product('zaria-sequin-fringe-mini')->'variants') v
              where v ? 'stock_on_hand' or v ? 'reserved_public_qty' or v ? 'sellable'),
  'product page never exposes stock numbers');
select is(public.storefront_product('solaris-draped-satin-mini')->'drop'->>'state', 'upcoming', 'product page includes drop state');
reset role;

-- Exact units: Available Now designs only (user decision 2026-11-21); drop designs stay hidden.
set local role anon;
select ok(
  (select bool_and(jsonb_typeof(v->'available_qty') = 'number')
   from jsonb_array_elements(public.storefront_product('noir-draped-cape-mini')->'variants') v),
  'Available Now design shows available_qty on every variant');
select ok(
  (select bool_and(jsonb_typeof(v->'available_qty') = 'null')
   from jsonb_array_elements(public.storefront_product('solaris-draped-satin-mini')->'variants') v),
  'drop design hides available_qty');
select is(
  (select (v->>'available_qty')::int from jsonb_array_elements(public.storefront_product('zaria-sequin-fringe-mini')->'variants') v
   where v->>'size' = 'UK 6 / XS'),
  0, 'sold-out size shows 0 units, never negative');
select lives_ok($$ select colour_hex from public.variants limit 1 $$, 'anon can read swatch colours');
reset role;
select throws_ok(
  $$ insert into public.product_media (product_id, type, mux_playback_id, alt, status, effect)
     values ('20000000-0000-4000-a000-000000000003', 'video', 'x', 'clip', 'ready', 'pan') $$,
  '23514', null, 'the pan effect is for still images only');

-- Slug change keeps a redirect (rule 11).
update public.products set slug = 'noir-draped-cape-mini-renamed' where id = '20000000-0000-4000-a000-000000000003';
set local role anon;
select is(public.storefront_product('noir-draped-cape-mini'), '{"redirect": "noir-draped-cape-mini-renamed"}'::jsonb,
  'rule 11: old slug returns a redirect to the current slug');
reset role;
select throws_ok(
  $$ update public.products set slug = 'noir-draped-cape-mini' where id = '20000000-0000-4000-a000-000000000004' $$,
  '23505', null, 'rule 11: another product cannot take an old slug');

-- Closed drop with on_close = hide removes the product from the shop.
update public.drops set vip_opens_at = now() - interval '3 days', public_opens_at = now() - interval '2 days',
  closes_at = now() - interval '1 day', on_close = 'hide'
where id = '30000000-0000-4000-a000-000000000001';
set local role anon;
select is((select count(*)::int from public.storefront_products() where id = '20000000-0000-4000-a000-000000000001'), 0,
  'closed drop with on_close = hide hides its products');
reset role;
update public.drops set on_close = 'move_to_available' where id = '30000000-0000-4000-a000-000000000001';
set local role anon;
select is((select section from public.storefront_products() where id = '20000000-0000-4000-a000-000000000001'), 'available',
  'closed drop with move_to_available lists its products as available');
reset role;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
select pg_temp.act_as_staff('merch@xarina.test');
select throws_ok(
  $$ select public.admin_set_prices('20000000-0000-4000-a000-000000000003', '[{"variant_id": null, "currency": "NGN", "amount_minor": 1}]') $$,
  '42501', null, 'merchandiser cannot set prices');
select throws_ok(
  $$ select public.admin_save_variants('20000000-0000-4000-a000-000000000003',
       (select jsonb_agg(jsonb_build_object('id', id, 'colour', colour, 'size', size, 'sku', sku,
                                             'stock_on_hand', 99))
        from public.variants where product_id = '20000000-0000-4000-a000-000000000003')) $$,
  '42501', null, 'merchandiser cannot change stock');
select lives_ok(
  $$ select public.admin_save_variants('20000000-0000-4000-a000-000000000003',
       (select jsonb_agg(jsonb_build_object('id', id, 'colour', colour, 'size', size, 'sku', sku || '-X', 'sort', sort))
        from public.variants where product_id = '20000000-0000-4000-a000-000000000003')) $$,
  'merchandiser can edit SKUs');
select lives_ok(
  $$ select public.admin_reorder_media('20000000-0000-4000-a000-000000000003',
       array(select id from public.product_media where product_id = '20000000-0000-4000-a000-000000000003')) $$,
  'merchandiser can reorder media');
reset role;

select pg_temp.act_as_staff('manager@xarina.test');
select lives_ok(
  $$ select public.admin_set_prices('20000000-0000-4000-a000-000000000003',
       '[{"variant_id": null, "currency": "NGN", "amount_minor": 20000000},
         {"variant_id": null, "currency": "GBP", "amount_minor": 9900}]') $$,
  'manager can set prices');
select lives_ok(
  $$ select public.admin_save_variants('20000000-0000-4000-a000-000000000003',
       (select jsonb_agg(jsonb_build_object('id', id, 'colour', colour, 'size', size, 'sku', sku,
                                             'stock_on_hand', 7))
        from public.variants where product_id = '20000000-0000-4000-a000-000000000003')) $$,
  'manager can set stock');
select is(
  (select count(*)::int from public.audit_log where action in ('product.prices', 'variant.stock')
     and at >= now()  -- only rows written in this test's transaction
     and staff_id = (select id from public.staff where email = 'manager@xarina.test')),
  1 + (select count(*)::int from public.variants where product_id = '20000000-0000-4000-a000-000000000003'),
  'ADM-7: one price audit row plus one stock audit row per variant, credited to the manager');
reset role;
select set_config('request.jwt.claims', '', true);

select throws_ok(
  $$ select public.admin_product('20000000-0000-4000-a000-000000000003') $$,
  '42501', null, 'non-staff cannot call admin_product');

-- Deleting a product (owner/manager only; RLS hides it from merchandisers).
select pg_temp.act_as_staff('merch@xarina.test');
delete from public.products where id = '20000000-0000-4000-a000-000000000013';
reset role;
select is((select count(*)::int from public.products where id = '20000000-0000-4000-a000-000000000013'), 1,
  'a merchandiser cannot delete a product');

select pg_temp.act_as_staff('manager@xarina.test');
delete from public.products where id = '20000000-0000-4000-a000-000000000013';
reset role;
select is((select count(*)::int from public.products where id = '20000000-0000-4000-a000-000000000013'), 0,
  'a manager can delete a product (variants, prices and media rows cascade)');
select is(
  (select count(*)::int from public.audit_log where action = 'product.delete'
     and entity_id = '20000000-0000-4000-a000-000000000013'
     and staff_id = (select id from public.staff where email = 'manager@xarina.test')),
  1, 'ADM-7: the delete is audited against the manager');

select * from finish();
rollback;
