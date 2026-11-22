-- Deployment hardening: role rules must hold even when staff call the
-- Supabase API/RPCs directly, not just through the admin UI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email) values
  ('f7000000-0000-4000-a000-0000000000a1', 'rh-owner@xarina.test'),
  ('f7000000-0000-4000-a000-0000000000a2', 'rh-manager@xarina.test'),
  ('f7000000-0000-4000-a000-0000000000a3', 'rh-merch@xarina.test');
insert into public.staff (auth_user_id, email, name, role) values
  ('f7000000-0000-4000-a000-0000000000a1', 'rh-owner@xarina.test', 'RH Owner', 'owner'),
  ('f7000000-0000-4000-a000-0000000000a2', 'rh-manager@xarina.test', 'RH Manager', 'manager'),
  ('f7000000-0000-4000-a000-0000000000a3', 'rh-merch@xarina.test', 'RH Merch', 'merchandiser');

insert into public.drops (id, name, slug, vip_opens_at, public_opens_at, on_close, published) values
  ('f7100000-0000-4000-a000-000000000001', 'RH Draft', 'rh-draft', now() + interval '1 day', now() + interval '2 days', 'move_to_available', false),
  ('f7100000-0000-4000-a000-000000000002', 'RH Live', 'rh-live', now() + interval '1 day', now() + interval '2 days', 'move_to_available', true);

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- A merchandiser may edit a draft, including sending published = false.
select pg_temp.act_as('f7000000-0000-4000-a000-0000000000a3');
select lives_ok(
  $$ select public.admin_save_drop(jsonb_build_object('pitch', 'Edited by merch', 'published', false),
                                   'f7100000-0000-4000-a000-000000000001') $$,
  'merchandiser can edit a draft without publishing it');
select throws_ok(
  $$ select public.admin_save_drop(jsonb_build_object('published', true),
                                   'f7100000-0000-4000-a000-000000000001') $$,
  '42501', null, 'merchandiser cannot publish a drop via RPC');
select throws_ok(
  $$ select public.admin_save_drop(jsonb_build_object('published', false),
                                   'f7100000-0000-4000-a000-000000000002') $$,
  '42501', null, 'merchandiser cannot unpublish a live drop via RPC');

-- Owner/manager may publish.
select pg_temp.act_as('f7000000-0000-4000-a000-0000000000a1');
select lives_ok(
  $$ select public.admin_save_drop(jsonb_build_object('published', true),
                                   'f7100000-0000-4000-a000-000000000001') $$,
  'owner can publish a drop');

-- Money settings are owner-only even though the old RLS allowed managers.
select pg_temp.act_as('f7000000-0000-4000-a000-0000000000a2');
select throws_ok(
  $$ insert into public.fx_rates (base, quote, rate) values ('GBP', 'USD', 1.25) $$,
  '42501', null, 'manager cannot write fx rates');
select pg_temp.act_as('f7000000-0000-4000-a000-0000000000a3');
select throws_ok(
  $$ insert into public.fx_rates (base, quote, rate) values ('GBP', 'USD', 1.25) $$,
  '42501', null, 'merchandiser cannot write fx rates');
select throws_ok(
  $$ insert into public.collections (slug, name) values ('rh-merch-collection', 'RH Merch') $$,
  '42501', null, 'merchandiser cannot create collections');

select pg_temp.act_as('f7000000-0000-4000-a000-0000000000a1');
select lives_ok(
  $$ insert into public.fx_rates (base, quote, rate) values ('GBP', 'USD', 1.25) $$,
  'owner can write fx rates');
select lives_ok(
  $$ insert into public.collections (slug, name) values ('rh-owner-collection', 'RH Owner') $$,
  'owner can create collections');
reset role;

-- A bad-signature flood must be bounded.
insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
select 'paystack', 'invalid', 'invalid_signature', jsonb_build_object('raw', g), false
from generate_series(1, 501) g;
select is((select count(*)::int from public.payment_events
           where provider = 'paystack' and signature_valid = false), 500,
  'invalid webhook rows are capped at 500 per provider');

select * from finish();
rollback;
