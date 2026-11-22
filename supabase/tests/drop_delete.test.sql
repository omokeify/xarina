-- ADM-4: deleting a drop is owner-only, audited, and refused when the drop
-- has orders (their attribution must survive for reports).
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email) values
  ('f7200000-0000-4000-a000-0000000000a1', 'dd-owner@xarina.test'),
  ('f7200000-0000-4000-a000-0000000000a2', 'dd-manager@xarina.test'),
  ('f7200000-0000-4000-a000-0000000000a3', 'dd-merch@xarina.test');
insert into public.staff (auth_user_id, email, name, role) values
  ('f7200000-0000-4000-a000-0000000000a1', 'dd-owner@xarina.test', 'DD Owner', 'owner'),
  ('f7200000-0000-4000-a000-0000000000a2', 'dd-manager@xarina.test', 'DD Manager', 'manager'),
  ('f7200000-0000-4000-a000-0000000000a3', 'dd-merch@xarina.test', 'DD Merch', 'merchandiser');

insert into public.products (id, slug, name, status) values
  ('f7200000-0000-4000-a000-0000000000b1', 'dd-design', 'DD Design', 'published');
insert into public.drops (id, name, slug, vip_opens_at, public_opens_at, published) values
  ('f7200000-0000-4000-a000-0000000000c1', 'DD Draft', 'dd-draft', now() + interval '1 day', now() + interval '2 days', false),
  ('f7200000-0000-4000-a000-0000000000c2', 'DD With Order', 'dd-order', now() + interval '1 day', now() + interval '2 days', false);
insert into public.drop_products (drop_id, product_id) values
  ('f7200000-0000-4000-a000-0000000000c1', 'f7200000-0000-4000-a000-0000000000b1');
insert into public.orders (id, email, currency, subtotal_minor, total_minor, drop_id)
values ('f7200000-0000-4000-a000-0000000000d1', 'dd@xarina.test', 'GBP', 1000, 1000,
        'f7200000-0000-4000-a000-0000000000c2');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('f7200000-0000-4000-a000-0000000000a2');
select throws_ok(
  $$ select public.admin_delete_drop('f7200000-0000-4000-a000-0000000000c1'::uuid) $$,
  '42501', null, 'a manager cannot delete a drop');

select pg_temp.act_as('f7200000-0000-4000-a000-0000000000a3');
select throws_ok(
  $$ select public.admin_delete_drop('f7200000-0000-4000-a000-0000000000c1'::uuid) $$,
  '42501', null, 'a merchandiser cannot delete a drop');

select pg_temp.act_as('f7200000-0000-4000-a000-0000000000a1');
select lives_ok(
  $$ select public.admin_delete_drop('f7200000-0000-4000-a000-0000000000c1'::uuid) $$,
  'an owner can delete a drop');
select is(
  (select count(*)::int from public.drops where id = 'f7200000-0000-4000-a000-0000000000c1'), 0,
  'the drop is gone');
select is(
  (select count(*)::int from public.drop_products where drop_id = 'f7200000-0000-4000-a000-0000000000c1'), 0,
  'its designs are detached');
select is(
  (select count(*)::int from public.products where id = 'f7200000-0000-4000-a000-0000000000b1'), 1,
  'the designs themselves are not deleted');
select is(
  (select count(*)::int from public.audit_log
   where action = 'drop.delete' and entity_id = 'f7200000-0000-4000-a000-0000000000c1'), 1,
  'the deletion is audited');

select throws_ok(
  $$ select public.admin_delete_drop('f7200000-0000-4000-a000-0000000000c2'::uuid) $$,
  '22023', null, 'a drop with orders cannot be deleted');
select is(
  (select count(*)::int from public.drops where id = 'f7200000-0000-4000-a000-0000000000c2'), 1,
  'the drop with orders still exists');

select * from finish();
rollback;
