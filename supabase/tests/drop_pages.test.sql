-- Phase 4 drop pages: storefront_drops(), storefront_drop(slug), permanent slugs
-- (rule 11 spirit), archive behaviour for closed drops, hero fields, admin save.
-- Self-contained: creates its own staff, designs and drops.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

insert into auth.users (id, email) values ('f6000000-0000-4000-a000-0000000000a1', 'dp-owner@xarina.test');
insert into public.staff (auth_user_id, email, name, role)
values ('f6000000-0000-4000-a000-0000000000a1', 'dp-owner@xarina.test', 'DP Owner', 'owner');

insert into public.products (id, slug, name, status) values
  ('f6100000-0000-4000-a000-000000000001', 'dp-design-one', 'DP Design One', 'published'),
  ('f6100000-0000-4000-a000-000000000002', 'dp-design-two', 'DP Design Two', 'published'),
  ('f6100000-0000-4000-a000-000000000003', 'dp-design-draft', 'DP Design Draft', 'draft');
insert into public.product_media (product_id, type, storage_path, alt) values
  ('f6100000-0000-4000-a000-000000000001', 'image', 'products/dp-one/cover.jpg', 'Design one');

insert into public.drops (id, name, slug, pitch, vip_opens_at, public_opens_at, closes_at, on_close, published,
                          hero_storage_path, hero_alt) values
  ('f6200000-0000-4000-a000-000000000001', 'DP Upcoming', 'dp-upcoming', 'Soon.', now() + interval '2 days', now() + interval '3 days', null, 'move_to_available', true,
     'drops/dp-upcoming/hero.jpg', 'Upcoming hero'),
  ('f6200000-0000-4000-a000-000000000002', 'DP Closed Hide', 'dp-closed-hide', '', now() - interval '5 days', now() - interval '4 days', now() - interval '1 day', 'hide', true, null, ''),
  ('f6200000-0000-4000-a000-000000000003', 'DP Closed Move', 'dp-closed-move', '', now() - interval '5 days', now() - interval '4 days', now() - interval '1 day', 'move_to_available', true, null, ''),
  ('f6200000-0000-4000-a000-000000000004', 'DP Unpublished', 'dp-unpublished', '', now() + interval '2 days', now() + interval '3 days', null, 'move_to_available', false, null, '');
insert into public.drop_products (drop_id, product_id, sort) values
  ('f6200000-0000-4000-a000-000000000001', 'f6100000-0000-4000-a000-000000000001', 0),
  ('f6200000-0000-4000-a000-000000000001', 'f6100000-0000-4000-a000-000000000003', 1),
  ('f6200000-0000-4000-a000-000000000002', 'f6100000-0000-4000-a000-000000000002', 0),
  ('f6200000-0000-4000-a000-000000000003', 'f6100000-0000-4000-a000-000000000001', 0);

create function pg_temp.act_as_owner() returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', 'f6000000-0000-4000-a000-0000000000a1', 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- storefront_drop(slug) -----------------------------------------------------
set local role anon;
select is(public.storefront_drop('no-such-drop'), null, 'unknown slug returns null');
select is(public.storefront_drop('dp-unpublished'), null, 'an unpublished drop returns null');
select is(public.storefront_drop('dp-upcoming')->'drop'->>'state', 'upcoming', 'state comes from database time');
select is(jsonb_array_length(public.storefront_drop('dp-upcoming')->'products'), 1,
  'products lists published designs only (the draft is left out)');
select ok(public.storefront_drop('dp-upcoming')->'products'->0 ? 'sold_out'
          and not (public.storefront_drop('dp-upcoming')->'products'->0 ? 'stock_on_hand'),
  'product rows use the listing shape, with no stock numbers');
select is(public.storefront_drop('dp-upcoming')->'drop'->'hero'->>'storage_path', 'drops/dp-upcoming/hero.jpg',
  'the hero image is returned');
select is(public.storefront_drop('dp-closed-hide')->'drop'->'hero', 'null'::jsonb, 'no hero image is null');
select ok(public.storefront_drop('dp-upcoming') ? 'server_now', 'server time is included');

-- Closed drops stay up as an archive.
select is(public.storefront_drop('dp-closed-hide')->'drop'->>'state', 'closed', 'a closed drop still resolves');
select is(public.storefront_drop('dp-closed-hide')->'products', '[]'::jsonb, 'closed with on_close = hide shows no designs');
select is(jsonb_array_length(public.storefront_drop('dp-closed-move')->'products'), 1,
  'closed with on_close = move_to_available keeps its designs');

-- storefront_drops() --------------------------------------------------------
select is((select count(*)::int from jsonb_array_elements(public.storefront_drops()) d
           where d->>'slug' like 'dp-%'), 3, 'the list has the 3 published drops and not the unpublished one');
select is((select d->>'design_count' from jsonb_array_elements(public.storefront_drops()) d where d->>'slug' = 'dp-upcoming'),
  '1', 'design_count counts published designs');
select is((select d->>'cover_path' from jsonb_array_elements(public.storefront_drops()) d where d->>'slug' = 'dp-upcoming'),
  'products/dp-one/cover.jpg', 'cover_path is the first design''s first image');
select is((select d->>'design_count' from jsonb_array_elements(public.storefront_drops()) d where d->>'slug' = 'dp-closed-hide'),
  '0', 'a hidden archived drop lists no designs');
reset role;

-- Permanent slugs -----------------------------------------------------------
update public.drops set slug = 'dp-upcoming-renamed' where id = 'f6200000-0000-4000-a000-000000000001';
select is(public.storefront_drop('dp-upcoming'), '{"redirect": "dp-upcoming-renamed"}'::jsonb,
  'an old slug redirects to the new one');
select is(public.storefront_drop('dp-upcoming-renamed')->'drop'->>'name', 'DP Upcoming', 'the new slug serves the drop');
select throws_ok(
  $$ update public.drops set slug = 'dp-upcoming' where id = 'f6200000-0000-4000-a000-000000000003' $$,
  '23505', null, 'an old slug stays reserved for its redirect');
select throws_ok(
  $$ update public.drops set slug = 'Bad Slug' where id = 'f6200000-0000-4000-a000-000000000003' $$,
  '23514', null, 'slugs must be lowercase kebab-case');

-- Default slug when none is given ---------------------------------------------
insert into public.drops (name, vip_opens_at, public_opens_at) values ('Fresh Drop Name', now() + interval '9 days', now() + interval '10 days');
insert into public.drops (name, vip_opens_at, public_opens_at) values ('Fresh Drop Name', now() + interval '9 days', now() + interval '10 days');
select is((select array_agg(slug order by slug) from public.drops where name = 'Fresh Drop Name'),
  array['fresh-drop-name', 'fresh-drop-name-2'], 'a drop without a slug gets one from its name, de-duplicated');

-- Admin save (ADM-4) ----------------------------------------------------------
select pg_temp.act_as_owner();
select public.admin_save_drop(
  jsonb_build_object('slug', 'dp-closed-move-renamed', 'hero_storage_path', 'drops/x/hero.jpg', 'hero_alt', 'A hero'),
  'f6200000-0000-4000-a000-000000000003');
reset role;
select results_eq(
  $$ select slug, hero_storage_path, hero_alt from public.drops where id = 'f6200000-0000-4000-a000-000000000003' $$,
  $$ values ('dp-closed-move-renamed', 'drops/x/hero.jpg', 'A hero') $$,
  'staff can save a slug and hero image');
select is(public.storefront_drop('dp-closed-move'), '{"redirect": "dp-closed-move-renamed"}'::jsonb,
  'renaming through the admin keeps the old address working');

set local role anon;
select throws_ok($$ select public.admin_save_drop('{}'::jsonb) $$, '42501', null, 'anon cannot save drops');
reset role;

select * from finish();
rollback;
