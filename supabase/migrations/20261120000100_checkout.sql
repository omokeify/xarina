-- Xarina Phase 3: server-side pricing, drop check, stock reservation, orders and
-- the paid transition (CUR-1/2, PAY-2..5, INV-2/3; rules 1, 2, 3, 4, 5, 6).
--
-- Every function here is SECURITY DEFINER and executable by the service role
-- only (rule 8): the browser never writes stock or orders. Errors use a stable
-- message (e.g. 'out_of_stock') that lib/checkout maps to shopper-facing copy.
--
-- Stock model (shared with the storefront, private.variant_sellable):
--   sellable = stock_on_hand - live holds (released_at is null and expires_at > now()).
-- Starting payment takes a 15-minute hold, checked while the variant row is
-- locked (FOR UPDATE), so two buyers can never hold the same last piece.
-- stock_on_hand is decremented only when the paid webhook is accepted, in the
-- same transaction that marks the order paid. Expired holds stop counting the
-- moment they expire; the cron job only tidies the rows and cancels the order.

alter table public.stock_reservations add column consumed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Pricing (CUR-1, CUR-2): mirrors lib/currency/pricing.ts
-- ---------------------------------------------------------------------------
create function public.variant_price_minor(p_variant_id uuid, p_currency text)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_price bigint;
  v_rate public.fx_rates%rowtype;
  v_amount numeric;
begin
  select p.* into v_product
  from public.variants v join public.products p on p.id = v.product_id
  where v.id = p_variant_id;
  if not found then return null; end if;

  if v_product.pricing_mode = 'fixed' then
    select vp.amount_minor into v_price
    from public.variant_prices vp
    where vp.product_id = v_product.id
      and vp.currency = p_currency
      and (vp.variant_id = p_variant_id or vp.variant_id is null)
    order by (vp.variant_id is null)   -- variant override first
    limit 1;
    return v_price;
  end if;

  if v_product.base_currency = p_currency then
    return v_product.base_amount_minor;
  end if;
  select * into v_rate from public.fx_rates r
  where r.base = v_product.base_currency and r.quote = p_currency;
  if not found then return null; end if;

  v_amount := round(v_product.base_amount_minor * v_rate.rate);   -- half away from zero = half up (prices >= 0)
  if v_rate.rounding_increment_minor is not null then
    v_amount := round(v_amount / v_rate.rounding_increment_minor) * v_rate.rounding_increment_minor;
  end if;
  return v_amount::bigint;
end;
$$;

-- ---------------------------------------------------------------------------
-- Drop gate (rule 6, DROP-3). Database time only.
-- p_is_vip must come from trusted server code that has verified Privé access
-- (rule 7); this function never decides who is a member.
-- Returns the drop and the channel the sale counts under.
-- ---------------------------------------------------------------------------
create function public.assert_can_buy(p_product_id uuid, p_is_vip boolean)
returns table (drop_id uuid, channel public.order_channel)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_drop public.drops%rowtype;
  v_state text;
begin
  -- The most recently opening published drop that holds this design governs it.
  select d.* into v_drop
  from public.drop_products dp
  join public.drops d on d.id = dp.drop_id
  where dp.product_id = p_product_id and d.published
  order by d.public_opens_at desc
  limit 1;

  if not found then
    return query select null::uuid, 'public'::public.order_channel;   -- Available Now item
    return;
  end if;

  v_state := case
    when v_drop.closes_at is not null and now() >= v_drop.closes_at then 'closed'
    when now() >= v_drop.public_opens_at then 'public'
    when now() >= v_drop.vip_opens_at then 'vip'
    else 'upcoming'
  end;

  if v_state = 'public' or (v_state = 'closed' and v_drop.on_close = 'move_to_available') then
    return query select v_drop.id, 'public'::public.order_channel;
  elsif v_state = 'vip' and p_is_vip then
    return query select v_drop.id, 'vip'::public.order_channel;
  else
    raise exception 'drop_not_open' using errcode = 'P0001';
  end if;
end;
$$;

-- Add-to-cart check (DROP-3): same gate, plus published and in-stock.
create function public.check_add_to_cart(p_variant_id uuid, p_qty integer, p_is_vip boolean)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.variants%rowtype;
  v_channel public.order_channel;
  v_sellable integer;
begin
  select * into v from public.variants where id = p_variant_id;
  if not found
     or not exists (select 1 from public.products p where p.id = v.product_id and p.status = 'published') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select a.channel into v_channel from public.assert_can_buy(v.product_id, p_is_vip) a;
  v_sellable := private.variant_sellable(v.id);
  if v_channel = 'vip' then v_sellable := v_sellable - v.reserved_public_qty; end if;
  if v_sellable < p_qty then
    raise exception 'out_of_stock' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Checkout: price, reserve and create the pending order in ONE transaction
-- (rule 4, PAY-2, PAY-4). Called at payment start, so the drop is re-checked
-- here as well as at add-to-cart (rule 6).
-- p_items: [{"variant_id": uuid, "qty": int}, ...]
-- ---------------------------------------------------------------------------
create function public.create_checkout(
  p_items jsonb,
  p_currency text,
  p_email text,
  p_phone text,
  p_address jsonb,
  p_shipping_rate_id uuid,
  p_is_vip boolean,
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

    select a.drop_id, a.channel into v_item_drop, v_item_channel
    from public.assert_can_buy(r.product_id, p_is_vip) a;
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

-- Remember the provider reference once the provider transaction exists.
create function public.attach_payment_ref(p_order_id uuid, p_provider text, p_provider_ref text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders set provider = p_provider, provider_ref = p_provider_ref
  where id = p_order_id and status = 'pending_payment';
$$;

-- ---------------------------------------------------------------------------
-- Release (PAY-4): failure, abandonment or the 15-minute timeout.
-- Only unpaid orders are touched. Stock on hand was never decremented for a
-- hold, so releasing only frees the hold.
-- ---------------------------------------------------------------------------
create function public.release_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is distinct from 'pending_payment' then return false; end if;

  update public.stock_reservations set released_at = now()
  where order_id = p_order_id and released_at is null and consumed_at is null;

  update public.orders set status = 'cancelled' where id = p_order_id;
  return true;
end;
$$;

create function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid;
  v_count integer := 0;
begin
  for v_order in
    select distinct s.order_id
    from public.stock_reservations s
    join public.orders o on o.id = s.order_id
    where s.released_at is null and s.consumed_at is null
      and s.expires_at <= now() and o.status = 'pending_payment'
  loop
    if public.release_order(v_order) then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- The ONLY path to 'paid' (rule 2, PAY-5). The caller (webhook route) has
-- already verified the provider signature. Here: idempotency (rule 3) and
-- amount + currency matching. Returns one of:
--   paid | already_paid | duplicate | unknown_order | mismatch | no_stock
-- mismatch and no_stock keep the order unpaid and need staff attention (refund).
-- ---------------------------------------------------------------------------
create function public.mark_order_paid(
  p_provider text,
  p_provider_ref text,
  p_event_type text,
  p_amount_minor bigint,
  p_currency text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted uuid;
  v_order public.orders%rowtype;
  r record;
begin
  insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
  values (p_provider, p_provider_ref, p_event_type, p_payload, true)
  on conflict (provider, provider_ref, event_type) where signature_valid do nothing
  returning id into v_inserted;
  if v_inserted is null then return 'duplicate'; end if;

  select * into v_order from public.orders
  where provider = p_provider and provider_ref = p_provider_ref
  for update;
  if not found then return 'unknown_order'; end if;

  if v_order.status not in ('pending_payment', 'cancelled') then return 'already_paid'; end if;
  if v_order.total_minor <> p_amount_minor or v_order.currency <> p_currency then
    return 'mismatch';
  end if;

  -- Take the stock. A live hold already guarantees it; a hold that expired
  -- (or was released) before the money arrived may have been sold on, so
  -- re-check the sellable quantity under the row lock. Nothing is changed
  -- until every line passes.
  for r in
    select s.variant_id, s.qty, (s.released_at is null and s.expires_at > now()) as live
    from public.stock_reservations s
    where s.order_id = v_order.id and s.consumed_at is null
    order by s.variant_id
  loop
    perform 1 from public.variants v where v.id = r.variant_id for update;
    if not r.live and private.variant_sellable(r.variant_id) < r.qty then
      return 'no_stock';
    end if;
  end loop;

  update public.variants v
  set stock_on_hand = v.stock_on_hand - s.qty
  from public.stock_reservations s
  where s.order_id = v_order.id and s.consumed_at is null and v.id = s.variant_id;

  update public.stock_reservations set consumed_at = now(), released_at = now()
  where order_id = v_order.id and consumed_at is null;
  update public.orders set status = 'paid', paid_at = now() where id = v_order.id;
  return 'paid';
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down: service role only (rule 8). Supabase grants new functions to
-- anon/authenticated by default, so revoke explicitly.
-- ---------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'variant_price_minor(uuid, text)',
    'assert_can_buy(uuid, boolean)',
    'check_add_to_cart(uuid, integer, boolean)',
    'create_checkout(jsonb, text, text, text, jsonb, uuid, boolean, jsonb)',
    'attach_payment_ref(uuid, text, text)',
    'release_order(uuid)',
    'release_expired_reservations()',
    'mark_order_paid(text, text, text, bigint, text, jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end;
$$;

-- Expire stale holds every minute (PAY-4).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('release-expired-reservations', '* * * * *', $$select public.release_expired_reservations()$$);
