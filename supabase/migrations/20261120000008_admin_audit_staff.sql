-- Phase 5: audit log reading (ADM-7), customer-export audit entry (CRM-3),
-- staff management (ADM-1). Price, stock and product changes are already
-- audited (20261120000004); drop changes by the drop functions (20261120000200+).

-- ---------------------------------------------------------------------------
-- Staff: audit role/active changes; never lose the last active owner.
-- ---------------------------------------------------------------------------
create function private.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.active
     and (new.role <> 'owner' or not new.active)
     and not exists (
       select 1 from public.staff s
       where s.role = 'owner' and s.active and s.id <> old.id
     ) then
    raise exception 'Xarina needs at least one active owner' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger staff_guard_last_owner before update of role, active on public.staff
  for each row execute function private.guard_last_owner();

create function private.audit_staff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit('staff.add', 'staff', new.id, null,
      jsonb_build_object('email', new.email, 'name', new.name, 'role', new.role, 'active', new.active));
  elsif (old.role, old.active, old.name) is distinct from (new.role, new.active, new.name) then
    perform private.audit('staff.update', 'staff', new.id,
      jsonb_build_object('email', old.email, 'name', old.name, 'role', old.role, 'active', old.active),
      jsonb_build_object('email', new.email, 'name', new.name, 'role', new.role, 'active', new.active));
  end if;
  return null;
end;
$$;
create trigger staff_audit after insert or update on public.staff
  for each row execute function private.audit_staff();

-- Add someone as staff (owner only). Returns:
--   'added'          staff row created for an existing login
--   'needs_account'  no login with that email yet: the caller creates one
--                    (service role), then calls again
--   'exists'         already staff (role and name are left unchanged)
create function public.admin_add_staff(p_email text, p_name text, p_role public.staff_role)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
begin
  perform private.require_staff(array['owner']::public.staff_role[]);
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Enter a name' using errcode = '22023';
  end if;
  if exists (select 1 from public.staff where email = v_email) then
    return 'exists';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = v_email;
  if v_user is null then
    return 'needs_account';
  end if;
  insert into public.staff (auth_user_id, email, name, role) values (v_user, v_email, trim(p_name), p_role);
  return 'added';
end;
$$;

-- ---------------------------------------------------------------------------
-- CRM-3: one audit row per customer export (called by the export action).
-- ---------------------------------------------------------------------------
create function public.record_customer_export(p_row_count integer, p_filters jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  perform private.audit('customers.export', 'customers', null, null,
    jsonb_build_object('rows', p_row_count, 'filters', coalesce(p_filters, '{}'::jsonb)));
end;
$$;

-- ---------------------------------------------------------------------------
-- ADM-7: the audit log for admin, with the staff member's name and a label
-- for the thing that changed. Owner and manager only.
-- ---------------------------------------------------------------------------
create function public.admin_audit_log(p_entity_type text default null, p_limit integer default 200)
returns table (
  id uuid,
  at timestamptz,
  action text,
  entity_type text,
  entity_id uuid,
  entity_label text,
  staff_name text,
  staff_email text,
  before jsonb,
  after jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  return query
    select
      a.id, a.at, a.action, a.entity_type, a.entity_id,
      coalesce(
        case a.entity_type
          when 'product' then (select p.name from public.products p where p.id = a.entity_id)
          when 'variant' then (select p.name || ' · ' || v.colour || ' · ' || v.size
                               from public.variants v join public.products p on p.id = v.product_id
                               where v.id = a.entity_id)
          when 'drop' then (select d.name from public.drops d where d.id = a.entity_id)
          when 'staff' then (select s.name from public.staff s where s.id = a.entity_id)
          when 'customer' then (select c.email from public.customers c where c.id = a.entity_id)
          when 'order' then (select o.number from public.orders o where o.id = a.entity_id)
        end,
        -- Deleted things: fall back to what the row recorded.
        a.before ->> 'name', a.after ->> 'name', a.before ->> 'sku', a.after ->> 'sku'
      ),
      s.name, s.email, a.before, a.after
    from public.audit_log a
    left join public.staff s on s.id = a.staff_id
    where p_entity_type is null or a.entity_type = p_entity_type
    order by a.at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end;
$$;

revoke execute on function public.admin_add_staff(text, text, public.staff_role) from public, anon;
revoke execute on function public.record_customer_export(integer, jsonb) from public, anon;
revoke execute on function public.admin_audit_log(text, integer) from public, anon;
grant execute on function public.admin_add_staff(text, text, public.staff_role) to authenticated, service_role;
grant execute on function public.record_customer_export(integer, jsonb) to authenticated, service_role;
grant execute on function public.admin_audit_log(text, integer) to authenticated, service_role;
revoke execute on all functions in schema private from public, anon, authenticated;
