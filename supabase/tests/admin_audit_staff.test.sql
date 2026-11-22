-- Phase 5: audit log (ADM-7), customer-export audit (CRM-3), staff management (ADM-1).
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.act_as_staff(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select auth_user_id from public.staff where email = p_email), 'role', 'authenticated')::text,
    true);
  set local role authenticated;
$$;

-- A login that is not staff yet.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'eeeeeeee-0000-4000-a000-00000000000e', 'authenticated', 'authenticated',
        'new.hire@xarina.test', '', now(), '{}', '{}', now(), now());

-- ---------------------------------------------------------------------------
-- Staff management (owner only)
-- ---------------------------------------------------------------------------
select pg_temp.act_as_staff('manager@xarina.test');
select throws_ok($$ select public.admin_add_staff('new.hire@xarina.test', 'New Hire', 'support') $$,
  '42501', null, 'a manager cannot add staff');
reset role;

select pg_temp.act_as_staff('owner@xarina.test');
select is(public.admin_add_staff('New.Hire@xarina.test', 'New Hire', 'support'), 'added', 'owner adds an existing login as staff');
select is(public.admin_add_staff('new.hire@xarina.test', 'New Hire', 'support'), 'exists', 'adding the same person again is a no-op');
select is(public.admin_add_staff('nobody@xarina.test', 'Nobody', 'support'), 'needs_account', 'an unknown email needs a login first');
update public.staff set role = 'manager' where email = 'new.hire@xarina.test';
update public.staff set active = false where email = 'new.hire@xarina.test';
select throws_ok($$ update public.staff set role = 'manager' where email = 'owner@xarina.test' $$,
  '23514', null, 'the last active owner cannot be demoted');
select throws_ok($$ update public.staff set active = false where email = 'owner@xarina.test' $$,
  '23514', null, 'the last active owner cannot be deactivated');
reset role;
select is((select active from public.staff where email = 'new.hire@xarina.test'), false, 'deactivating staff sticks');

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.audit_log a
   join public.staff s on s.id = a.entity_id
   where s.email = 'new.hire@xarina.test' and a.action in ('staff.add', 'staff.update') and a.at >= now()),
  3, 'staff add, role change and deactivation are each audited');

select pg_temp.act_as_staff('manager@xarina.test');
select lives_ok($$ select public.record_customer_export(12, '{"vip": true}') $$, 'manager can record a customer export');
select ok(
  exists (select 1 from public.admin_audit_log('customers') where action = 'customers.export' and staff_email = 'manager@xarina.test'),
  'CRM-3: the export appears in the audit log, credited to the manager');
reset role;

select pg_temp.act_as_staff('merch@xarina.test');
select throws_ok($$ select * from public.admin_audit_log() $$, '42501', null, 'a merchandiser cannot read the audit log');
select throws_ok($$ select public.record_customer_export(1) $$, '42501', null, 'a merchandiser cannot export customers');
reset role;

select * from finish();
rollback;
