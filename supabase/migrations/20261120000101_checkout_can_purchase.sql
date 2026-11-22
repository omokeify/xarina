-- Xarina Phase 3: use public.can_purchase (Phase 4, drop and Privé rules) as the single
-- drop gate at add-to-cart and payment start (DROP-3, rule 6). Replaces the stand-in
-- assert_can_buy. can_purchase decides allowed / reason / channel; stock stays here.
--
-- The last argument is now the VERIFIED Privé member's customer id (rule 7), or null
-- for guests. It must come from a verified session or access link, never from a form
-- field or an email address.

drop function public.check_add_to_cart(uuid, integer, boolean);
drop function public.create_checkout(jsonb, text, text, text, jsonb, uuid, boolean, jsonb);
drop function public.assert_can_buy(uuid, boolean);

create function public.check_add_to_cart(p_variant_id uuid, p_qty integer, p_prive_customer_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.variants%rowtype;
  v_channel public.order_channel;
  v_allowed boolean;
  v_reason text;
  v_sellable integer;
begin
  select * into v from public.variants where id = p_variant_id;
  if not found
     or not exists (select 1 from public.products p where p.id = v.product_id and p.status = 'published') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select a.allowed, a.reason, a.channel into v_allowed, v_reason, v_channel
  from public.can_purchase(v.product_id, p_prive_customer_id, p_qty) a;
  if not v_allowed then
    raise exception '%', v_reason using errcode = 'P0001';
  end if;
  v_sellable := private.variant_sellable(v.id);
  if v_channel = 'vip' then v_sellable := v_sellable - v.reserved_public_qty; end if;
  if v_sellable < p_qty then
    raise exception 'out_of_stock' using errcode = 'P0001';
  end if;
end;
$$;

create function public.create_checkout(
  p_items jsonb,
  p_currency text,
  p_email text,
  p_phone text,
  p_address jsonb,
  p_shipping_rate_id uuid,
  p_prive_customer_id uuid,
  p_utm jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_customer_id uuid;
  v_channel public.order_channel := 'public';
  v_drop_id uuid;
  v_subtotal bigint := 0;
  v_shipping bigint;
  v_rate public.shipping_rates%rowtype;
  v_country text := upper(coalesce(p_address ->> 'country', ''));
  r record;
  v_unit bigint;
  v_item_channel public.order_channel;
  v_item_drop uuid;
  v_allowed boolean;
  v_reason text;
  v_sellable integer;
begin
  if p_currency not in ('NGN', 'GBP', 'USD') then
    raise exception 'invalid_currency' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart' using errcode = 'P0001';
  end if;

  -- Shipping charge comes from the rate row, never from the client (PAY-3).
  select * into v_rate from public.shipping_rates where id = p_shipping_rate_id and active;
  if not found or v_rate.currency <> p_currency then
    raise exception 'invalid_shipping' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.shipping_zones z
    where z.id = v_rate.zone_id
      and (
        v_country = any (z.countries)
        or (cardinality(z.countries) = 0
            and not exists (select 1 from public.shipping_zones o where v_country = any (o.countries)))
      )
  ) then
    raise exception 'shipping_unavailable' using errcode = 'P0001';
  end if;
  v_shipping := v_rate.amount_minor;

  insert into public.customers (email, phone, country)
  values (lower(p_email), p_phone, nullif(v_country, ''))
  on conflict (email) do update set phone = coalesce(excluded.phone, public.customers.phone)
  returning id into v_customer_id;

  insert into public.orders (customer_id, email, phone, shipping_address, shipping_rate_id, currency,
                             subtotal_minor, shipping_minor, total_minor, utm)
  values (v_customer_id, lower(p_email), p_phone, p_address, v_rate.id, p_currency, 0, v_shipping, v_shipping, p_utm)
  returning id into v_order_id;

  -- Lock variants in id order so concurrent checkouts cannot deadlock.
  for r in
    select v.id as variant_id, v.product_id, v.colour, v.size, v.sku,
           v.reserved_public_qty, p.name as product_name, p.status, i.qty
    from (
      select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'qty')::integer)::integer as qty
      from jsonb_array_elements(p_items) e
      group by 1
    ) i
    join public.variants v on v.id = i.variant_id
    join public.products p on p.id = v.product_id
    order by v.id
    for update of v
  loop
    if r.qty < 1 or r.qty > 10 then
      raise exception 'invalid_quantity' using errcode = 'P0001';
    end if;
    if r.status <> 'published' then
      raise exception 'unavailable' using errcode = 'P0001';
    end if;

    select a.allowed, a.reason, a.drop_id, a.channel into v_allowed, v_reason, v_item_drop, v_item_channel
    from public.can_purchase(r.product_id, p_prive_customer_id, r.qty) a;
    if not v_allowed then
      raise exception '%', v_reason using errcode = 'P0001';   -- drop_not_open, vip_only, vip_limit, drop_closed
    end if;
    if v_item_channel = 'vip' then v_channel := 'vip'; end if;
    v_drop_id := coalesce(v_drop_id, v_item_drop);

    -- Rule 5: one pool; Privé sales cannot touch the public reserve.
    v_sellable := private.variant_sellable(r.variant_id);   -- row is locked above
    if v_item_channel = 'vip' then v_sellable := v_sellable - r.reserved_public_qty; end if;
    if v_sellable < r.qty then
      raise exception 'out_of_stock' using errcode = 'P0001';
    end if;

    v_unit := public.variant_price_minor(r.variant_id, p_currency);
    if v_unit is null then
      raise exception 'no_price' using errcode = 'P0001';
    end if;

    insert into public.stock_reservations (variant_id, order_id, qty) values (r.variant_id, v_order_id, r.qty);
    insert into public.order_items (order_id, variant_id, product_name, colour, size, sku, qty, unit_price_minor)
    values (v_order_id, r.variant_id, r.product_name, r.colour, r.size, r.sku, r.qty, v_unit);

    v_subtotal := v_subtotal + v_unit * r.qty;
  end loop;

  if not exists (select 1 from public.order_items where order_id = v_order_id) then
    raise exception 'unavailable' using errcode = 'P0001';   -- unknown variant ids
  end if;

  update public.orders
  set subtotal_minor = v_subtotal, total_minor = v_subtotal + v_shipping,
      channel = v_channel, drop_id = v_drop_id
  where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.check_add_to_cart(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.check_add_to_cart(uuid, integer, uuid) to service_role;
revoke all on function public.create_checkout(jsonb, text, text, text, jsonb, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout(jsonb, text, text, text, jsonb, uuid, uuid, jsonb) to service_role;
