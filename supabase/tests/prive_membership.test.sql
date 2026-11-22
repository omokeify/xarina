-- Phase 6: individual Privé access-link revocation and the richer staff roster.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email) values
  ('f6000000-0000-4000-a000-000000000001', 'pm-owner@xarina.test'),
  ('f6000000-0000-4000-a000-000000000002', 'pm-manager@xarina.test'),
  ('f6000000-0000-4000-a000-000000000003', 'pm-support@xarina.test'),
  ('f6000000-0000-4000-a000-000000000004', 'pm-merch@xarina.test');
insert into public.staff (id, auth_user_id, email, name, role) values
  ('f6000000-0000-4000-a000-000000000001', 'f6000000-0000-4000-a000-000000000001', 'pm-owner@xarina.test', 'PM Owner', 'owner'),
  ('f6000000-0000-4000-a000-000000000002', 'f6000000-0000-4000-a000-000000000002', 'pm-manager@xarina.test', 'PM Manager', 'manager'),
  ('f6000000-0000-4000-a000-000000000003', 'f6000000-0000-4000-a000-000000000003', 'pm-support@xarina.test', 'PM Support', 'support'),
  ('f6000000-0000-4000-a000-000000000004', 'f6000000-0000-4000-a000-000000000004', 'pm-merch@xarina.test', 'PM Merch', 'merchandiser');

insert into public.customers (id, email, name, phone, is_vip, vip_approved_at, vip_approved_by, prive_requested_at)
values
  ('f6100000-0000-4000-a000-000000000001', 'member@pm.test', 'PM Member', '+234 800 111 2222', true, now(),
   'f6000000-0000-4000-a000-000000000001', null),
  ('f6100000-0000-4000-a000-000000000002', 'requester@pm.test', 'PM Requester', '+234 800 333 4444', false, null,
   null, now());

insert into public.vip_access_links (id, customer_id, token_hash, expires_at, used_at, created_by)
values
  ('f6200000-0000-4000-a000-000000000001', 'f6100000-0000-4000-a000-000000000001', 'pm-hash-active', now() + interval '1 day', null, 'f6000000-0000-4000-a000-000000000001'),
  ('f6200000-0000-4000-a000-000000000002', 'f6100000-0000-4000-a000-000000000001', 'pm-hash-revoked', now() + interval '1 day', null, 'f6000000-0000-4000-a000-000000000001'),
  ('f6200000-0000-4000-a000-000000000003', 'f6100000-0000-4000-a000-000000000001', 'pm-hash-used', now() + interval '1 day', now() - interval '1 hour', 'f6000000-0000-4000-a000-000000000001'),
  ('f6200000-0000-4000-a000-000000000004', 'f6100000-0000-4000-a000-000000000001', 'pm-hash-expired', now() - interval '1 hour', null, 'f6000000-0000-4000-a000-000000000001');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- Role gate -----------------------------------------------------------------
select pg_temp.act_as('f6000000-0000-4000-a000-000000000003');
select throws_ok(
  $$ select public.admin_revoke_access_link('f6200000-0000-4000-a000-000000000001'::uuid) $$,
  '42501', null, 'support cannot revoke an access link');
select throws_ok(
  $$ select public.admin_prive_members() $$,
  '42501', null, 'support cannot read the Privé roster');

select pg_temp.act_as('f6000000-0000-4000-a000-000000000004');
select throws_ok(
  $$ select public.admin_revoke_access_link('f6200000-0000-4000-a000-000000000001'::uuid) $$,
  '42501', null, 'merchandiser cannot revoke an access link');

select pg_temp.act_as('f6000000-0000-4000-a000-000000000002');
select is(
  public.admin_revoke_access_link('f6200000-0000-4000-a000-000000000002'), true,
  'a manager can revoke an unused link');
select isnt(
  (select revoked_at from public.vip_access_links where id = 'f6200000-0000-4000-a000-000000000002'), null,
  'the revocation is recorded');
select is(
  (select count(*)::int from public.audit_log where action = 'vip.link_revoke'
    and entity_id = 'f6100000-0000-4000-a000-000000000001'), 1,
  'the revocation is audited');

select is(
  public.admin_revoke_access_link('f6200000-0000-4000-a000-000000000003'), false,
  'revoking an already used link is a no-op');
select is(
  public.admin_revoke_access_link('f6200000-0000-4000-a000-000000000004'), false,
  'revoking an expired link is a no-op');
select is(
  public.admin_revoke_access_link('f6200000-0000-4000-a000-000000000002'), false,
  'revoking twice is a no-op');
reset role;

-- Redemption ----------------------------------------------------------------
select is(
  public.redeem_access_link('pm-hash-revoked', 'pm-session-revoked'), null,
  'a revoked link cannot be redeemed');
select isnt(
  public.redeem_access_link('pm-hash-active', 'pm-session-active'), null,
  'an unrevoked link still redeems');
select is(
  public.redeem_access_link('pm-hash-active', 'pm-session-again'), null,
  'the unrevoked link is still single-use');

-- Roster fields -------------------------------------------------------------
select pg_temp.act_as('f6000000-0000-4000-a000-000000000002');
select is(
  (select value->>'phone' from jsonb_array_elements(public.admin_prive_members())
   where value->>'email' = 'requester@pm.test'),
  '+234 800 333 4444', 'the roster exposes the request phone number');
select is(
  (select value->>'approved_by_name' from jsonb_array_elements(public.admin_prive_members())
   where value->>'email' = 'member@pm.test'),
  'PM Owner', 'the roster names the approving staff member');
reset role;

select * from finish();
rollback;
