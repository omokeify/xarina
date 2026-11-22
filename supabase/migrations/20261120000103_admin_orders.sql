-- Xarina Phase 5 (orders board, ADM-5, INV-4/5) and settings audit (ADM-7).
--
-- Order status changes go through ONE staff-checked SECURITY DEFINER function
-- (rule 8: no direct client writes to orders). It never marks an order PAID:
-- that only happens in mark_order_paid, from a verified webhook (rule 2).

alter table public.orders
  add column courier text,
  add column tracking_number text;

-- ---------------------------------------------------------------------------
-- Allowed moves (INV-4) and who may make them.
--   pending_payment -> cancelled                         owner, manager (frees the hold)
--   paid            -> processing | dispatched           owner, manager, fulfilment
--   paid            -> cancelled | refunded              owner, manager
--   processing      -> dispatched                        owner, manager, fulfilment
--   processing      -> cancelled | refunded              owner, manager
--   dispatched      -> delivered                         owner, manager, fulfilment
--   dispatched      -> refunded                          owner, manager
--   delivered       -> refunded                          owner, manager
-- cancelled and refunded are final. "refunded" records a refund made in the payment
-- provider's dashboard; it does not move money.
-- ---------------------------------------------------------------------------
create function private.order_move_allowed(p_role public.staff_role, p_from public.order_status, p_to public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_role not in ('owner', 'manager', 'fulfilment') then false
    -- fulfilment: shipping moves only
    when p_role = 'fulfilment' then
      (p_from, p_to) in (
        ('paid', 'processing'), ('paid', 'dispatched'),
        ('processing', 'dispatched'), ('dispatched', 'delivered'))
    else
      (p_from, p_to) in (
        ('pending_payment', 'cancelled'),
        ('paid', 'processing'), ('paid', 'dispatched'), ('paid', 'cancelled'), ('paid', 'refunded'),
        ('processing', 'dispatched'), ('processing', 'cancelled'), ('processing', 'refunded'),
        ('dispatched', 'delivered'), ('dispatched', 'refunded'),
        ('delivered', 'refunded'))
  end;
$$;

create function public.admin_set_order_status(
  p_order_id uuid,
  p_to public.order_status,
  p_courier text default null,
  p_tracking_number text default null,
  p_tracking_url text default null
)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.staff_role;
  v_order public.orders%rowtype;
  v_courier text := nullif(trim(coalesce(p_courier, '')), '');
  v_number text := nullif(trim(coalesce(p_tracking_number, '')), '');
  v_url text := nullif(trim(coalesce(p_tracking_url, '')), '');
begin
  select s.role into v_role from public.staff s where s.auth_user_id = auth.uid() and s.active;
  if v_role is null then
    raise exception 'not_staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if not private.order_move_allowed(v_role, v_order.status, p_to) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_to = 'dispatched' then
    if v_courier is null or v_number is null or v_url is null then
      raise exception 'tracking_required' using errcode = '22023';
    end if;
    if v_url !~* '^https?://' then
      raise exception 'tracking_url_invalid' using errcode = '22023';
    end if;
    update public.orders
    set status = 'dispatched', courier = v_courier, tracking_number = v_number, tracking_url = v_url
    where id = p_order_id;

  elsif p_to = 'cancelled' and v_order.status = 'pending_payment' then
    -- Unpaid: just free the 15-minute hold. Stock on hand was never touched.
    perform public.release_order(p_order_id);

  elsif p_to = 'cancelled' then
    -- Paid but not shipped: the sale is undone, so the pieces go back on the shelf.
    update public.variants v
    set stock_on_hand = v.stock_on_hand + i.qty
    from public.order_items i
    where i.order_id = p_order_id and i.variant_id = v.id;
    update public.orders set status = 'cancelled' where id = p_order_id;

  else
    update public.orders set status = p_to where id = p_order_id;
  end if;

  perform private.audit(
    'order.status', 'order', p_order_id,
    jsonb_build_object('status', v_order.status),
    jsonb_build_object('status', p_to, 'courier', v_courier, 'tracking_number', v_number));
  return p_to;
end;
$$;

revoke all on function public.admin_set_order_status(uuid, public.order_status, text, text, text)
  from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Audit exchange-rate and shipping changes (ADM-7): they change what shoppers pay.
-- ---------------------------------------------------------------------------
create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit(tg_table_name || '.create', tg_table_name, new.id, null, to_jsonb(new));
  elsif tg_op = 'DELETE' then
    perform private.audit(tg_table_name || '.delete', tg_table_name, old.id, to_jsonb(old), null);
  elsif to_jsonb(old) is distinct from to_jsonb(new) then
    perform private.audit(tg_table_name || '.update', tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return null;
end;
$$;

create trigger fx_rates_audit after insert or update or delete on public.fx_rates
  for each row execute function private.audit_row();
create trigger shipping_zones_audit after insert or update or delete on public.shipping_zones
  for each row execute function private.audit_row();
create trigger shipping_rates_audit after insert or update or delete on public.shipping_rates
  for each row execute function private.audit_row();
