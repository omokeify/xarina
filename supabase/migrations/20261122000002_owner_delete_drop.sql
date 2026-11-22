-- Owner-only drop deletion (ADM-4). Drops have no RLS write policy: every
-- mutation goes through a security-definer RPC, so the role check has to live
-- here too. Cascades remove drop products, interest, notifications, access
-- links and old slugs; products themselves are never deleted.

create function public.admin_delete_drop(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_orders integer;
begin
  perform private.require_staff(array['owner']::public.staff_role[]);

  select to_jsonb(d) into v_before from public.drops d where d.id = p_id;
  if v_before is null then
    raise exception 'Drop not found' using errcode = 'P0002';
  end if;

  -- Orders keep their drop attribution for reports. Refuse rather than let
  -- the FK set drop_id to null and silently move sales to "Available now".
  select count(*) into v_orders from public.orders o where o.drop_id = p_id;
  if v_orders > 0 then
    raise exception 'This drop has orders. Unpublish it instead of deleting it.'
      using errcode = '22023';
  end if;

  perform private.audit('drop.delete', 'drop', p_id, v_before, null);
  delete from public.drops where id = p_id;
end;
$$;

revoke execute on function public.admin_delete_drop(uuid) from public, anon;
grant execute on function public.admin_delete_drop(uuid) to authenticated, service_role;
