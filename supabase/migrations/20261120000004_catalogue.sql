-- Xarina Phase 2: catalogue reads for the storefront and admin product RPCs.
-- HOME, SHOP, PDP, ADM-2/3, ADM-7 (audit of price/stock/status changes).

-- Internal helpers live in `private`, which PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Hide exact stock from shoppers (decision: show only available / sold out).
-- Column-level grants: clients may read variant identity, never stock numbers.
-- Staff read stock through public.admin_product().
-- ---------------------------------------------------------------------------
revoke select on public.variants from anon, authenticated;
grant select (id, product_id, colour, size, sku, sort, created_at, updated_at)
  on public.variants to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. product_media: Mux upload lifecycle (ADM-2)
-- ---------------------------------------------------------------------------
alter table public.product_media
  add column status text not null default 'ready'
    check (status in ('processing', 'ready', 'errored')),
  add column mux_upload_id text unique,
  add column mux_asset_id text unique;

alter table public.product_media drop constraint product_media_source_check;
alter table public.product_media add constraint product_media_source_check check (
  (type = 'image' and storage_path is not null)
  or (type = 'video' and (status <> 'ready' or mux_playback_id is not null))
);

drop policy "media: public read published" on public.product_media;
create policy "media: public read ready, published" on public.product_media
  for select to anon, authenticated
  using (
    status = 'ready'
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
  );

-- ---------------------------------------------------------------------------
-- Products: permanent slugs, published_at, audit (rule 11, ADM-7)
-- ---------------------------------------------------------------------------

-- A slug that once belonged to a product can never be taken by another one,
-- so its 301 keeps working (rule 11).
create function private.guard_slug_reuse()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.product_slug_history h
    where h.old_slug = new.slug and h.product_id <> new.id
  ) then
    raise exception 'Slug "%" belonged to another product and stays reserved for its redirect', new.slug
      using errcode = '23505';
  end if;
  return new;
end;
$$;
create trigger products_guard_slug_reuse before insert or update of slug on public.products
  for each row execute function private.guard_slug_reuse();

create function private.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger products_set_published_at before insert or update of status on public.products
  for each row execute function private.set_published_at();

-- The calling staff member's id, or null (service role, migrations, seed).
create function private.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.staff s where s.auth_user_id = auth.uid() and s.active;
$$;

create function private.audit(p_action text, p_entity_type text, p_entity_id uuid, p_before jsonb, p_after jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (staff_id, action, entity_type, entity_id, before, after)
  values (private.current_staff_id(), p_action, p_entity_type, p_entity_id, p_before, p_after);
$$;

-- Audit product create/delete and changes to status, slug or pricing.
create function private.audit_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'INSERT' then
    perform private.audit('product.create', 'product', new.id, null,
      jsonb_build_object('slug', new.slug, 'name', new.name, 'status', new.status));
  elsif tg_op = 'DELETE' then
    perform private.audit('product.delete', 'product', old.id,
      jsonb_build_object('slug', old.slug, 'name', old.name, 'status', old.status), null);
  else
    v_before := jsonb_build_object('status', old.status, 'slug', old.slug, 'pricing_mode', old.pricing_mode,
                                   'base_currency', old.base_currency, 'base_amount_minor', old.base_amount_minor);
    v_after  := jsonb_build_object('status', new.status, 'slug', new.slug, 'pricing_mode', new.pricing_mode,
                                   'base_currency', new.base_currency, 'base_amount_minor', new.base_amount_minor);
    if v_before is distinct from v_after then
      perform private.audit('product.update', 'product', new.id, v_before, v_after);
    end if;
  end if;
  return null;
end;
$$;
create trigger products_audit after insert or update or delete on public.products
  for each row execute function private.audit_product();

-- ---------------------------------------------------------------------------
-- Shared read helpers
-- ---------------------------------------------------------------------------

-- Units a shopper could buy now: stock minus live (unreleased, unexpired) holds.
create function private.variant_sellable(p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select v.stock_on_hand - coalesce((
    select sum(r.qty)::integer
    from public.stock_reservations r
    where r.variant_id = v.id and r.released_at is null and r.expires_at > now()
  ), 0)
  from public.variants v
  where v.id = p_variant_id;
$$;

-- State of a drop from database time (rule 6). Same logic as public.drop_state,
-- without RLS, for use inside SECURITY DEFINER functions.
create function private.drop_state_of(p_vip timestamptz, p_public timestamptz, p_closes timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_closes is not null and now() >= p_closes then 'closed'
    when now() >= p_public then 'public'
    when now() >= p_vip then 'vip'
    else 'upcoming'
  end;
$$;

-- How the storefront treats a product with respect to drops:
--   drop_id set     -> the open (not closed) published drop it belongs to;
--                      if several, the one with the earliest public opening.
--   hidden = true   -> no open drop, and its most recently closed drop says
--                      on_close = 'hide'.
--   otherwise       -> an ordinary Available Now product.
create function private.product_drop(p_product_id uuid)
returns table (drop_id uuid, hidden boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select d.*, private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at) as state
    from public.drop_products dp
    join public.drops d on d.id = dp.drop_id
    where dp.product_id = p_product_id and d.published
  ),
  open_drop as (
    select id from mine where state <> 'closed' order by public_opens_at, id limit 1
  ),
  last_closed as (
    select on_close from mine where state = 'closed' order by closes_at desc, id limit 1
  )
  select
    (select id from open_drop),
    (select id from open_drop) is null and coalesce((select on_close = 'hide' from last_closed), false);
$$;

-- Lowest fixed price per currency for a product (product-level or any variant
-- override): {"NGN": minor|null, "GBP": ..., "USD": ...}. FX pricing is
-- Phase 3, so fx products return nulls.
create function private.product_prices(p_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'NGN', min(vp.amount_minor) filter (where vp.currency = 'NGN'),
    'GBP', min(vp.amount_minor) filter (where vp.currency = 'GBP'),
    'USD', min(vp.amount_minor) filter (where vp.currency = 'USD'))
  from public.products p
  left join public.variant_prices vp on vp.product_id = p.id and p.pricing_mode = 'fixed'
  where p.id = p_product_id;
$$;

-- Price of one variant per currency: its override, else the design's price.
create function private.variant_prices(p_variant_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_object_agg(cur, (
    select coalesce(
      (select vp.amount_minor from public.variant_prices vp
       where vp.variant_id = v.id and vp.currency = cur),
      (select vp.amount_minor from public.variant_prices vp
       where vp.product_id = v.product_id and vp.variant_id is null and vp.currency = cur))
    where p.pricing_mode = 'fixed'))
  from public.variants v
  join public.products p on p.id = v.product_id
  cross join unnest(array['NGN', 'GBP', 'USD']) as cur
  where v.id = p_variant_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. Server time for countdowns (DROP-2)
-- ---------------------------------------------------------------------------
create function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

-- ---------------------------------------------------------------------------
-- 4. Shop listing (SHOP-1..3, HOME-1/3). Prices for all currencies, so
--    ISR pages can pick the shopper's currency on the client (CUR-3).
-- ---------------------------------------------------------------------------
create function public.storefront_products()
returns table (
  id uuid,
  slug text,
  name text,
  collection_slug text,
  collection_name text,
  cover_path text,
  cover_alt text,
  prices jsonb,
  drop_id uuid,
  drop_name text,
  drop_state text,
  vip_opens_at timestamptz,
  public_opens_at timestamptz,
  sold_out boolean,
  section text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.slug,
    p.name,
    c.slug,
    c.name,
    cover.storage_path,
    cover.alt,
    private.product_prices(p.id),
    d.id,
    d.name,
    case when d.id is null then null
         else private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at) end,
    d.vip_opens_at,
    d.public_opens_at,
    not exists (
      select 1 from public.variants v
      where v.product_id = p.id and private.variant_sellable(v.id) > 0
    ),
    case when d.id is not null
              and private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at) in ('upcoming', 'vip')
         then 'upcoming' else 'available' end,
    p.published_at
  from public.products p
  cross join lateral private.product_drop(p.id) pd
  left join public.drops d on d.id = pd.drop_id
  left join public.collections c on c.id = p.collection_id
  left join lateral (
    select m.storage_path, m.alt
    from public.product_media m
    where m.product_id = p.id and m.type = 'image' and m.status = 'ready'
    order by m.sort, m.created_at
    limit 1
  ) cover on true
  where p.status = 'published'
    and not pd.hidden
  order by p.published_at desc nulls last, p.name;
$$;

-- ---------------------------------------------------------------------------
-- 5. Product page (PDP-1..6)
-- Returns {"redirect": "<slug>"} for an old slug (rule 11), null when not found,
-- unpublished or hidden after its drop closed, otherwise the page data.
-- Availability is a boolean only: exact stock never leaves the database.
-- ---------------------------------------------------------------------------
create function public.storefront_product(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_pd record;
  v_redirect text;
begin
  select * into v_product from public.products where slug = p_slug and status = 'published';

  if not found then
    select p.slug into v_redirect
    from public.product_slug_history h
    join public.products p on p.id = h.product_id
    where h.old_slug = p_slug and p.status = 'published';
    if v_redirect is not null then
      return jsonb_build_object('redirect', v_redirect);
    end if;
    return null;
  end if;

  select * into v_pd from private.product_drop(v_product.id);
  if v_pd.hidden then
    return null;
  end if;

  return jsonb_build_object(
    'product', jsonb_build_object(
      'id', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'description', v_product.description,
      'fabric', v_product.fabric,
      'care', v_product.care,
      'fit_notes', v_product.fit_notes,
      'delivery_timing', v_product.delivery_timing,
      'collection', (
        select jsonb_build_object('slug', c.slug, 'name', c.name)
        from public.collections c where c.id = v_product.collection_id
      )
    ),
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'type', m.type, 'storage_path', m.storage_path,
               'mux_playback_id', m.mux_playback_id, 'alt', m.alt)
             order by m.sort, m.created_at)
      from public.product_media m
      where m.product_id = v_product.id and m.status = 'ready'
    ), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'colour', v.colour, 'size', v.size, 'sku', v.sku,
               'available', private.variant_sellable(v.id) > 0,
               'prices', private.variant_prices(v.id))
             order by v.sort, v.colour, v.size)
      from public.variants v
      where v.product_id = v_product.id
    ), '[]'::jsonb),
    'measurements', coalesce((
      select jsonb_agg(jsonb_build_object(
               'size', ms.size, 'bust_cm', ms.bust_cm, 'waist_cm', ms.waist_cm,
               'hip_cm', ms.hip_cm, 'length_cm', ms.length_cm)
             order by ms.sort, ms.size)
      from public.measurements ms
      where ms.product_id = v_product.id
    ), '[]'::jsonb),
    'prices', private.product_prices(v_product.id),
    'drop', (
      select jsonb_build_object(
        'id', d.id, 'name', d.name, 'pitch', d.pitch,
        'state', private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at),
        'vip_opens_at', d.vip_opens_at, 'public_opens_at', d.public_opens_at,
        'closes_at', d.closes_at, 'on_close', d.on_close)
      from public.drops d where d.id = v_pd.drop_id
    ),
    'server_now', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Admin product RPCs (ADM-2, ADM-3, ADM-7)
-- ---------------------------------------------------------------------------
create function private.require_staff(p_roles public.staff_role[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff(p_roles) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;

create function private.require_product(p_product_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Everything the product editor needs, including stock and all media.
create function public.admin_product(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  v_is_admin := public.is_staff(array['owner', 'manager']::public.staff_role[]);

  return (
    select jsonb_build_object(
      'product', to_jsonb(p),
      'collection', (select to_jsonb(c) from public.collections c where c.id = p.collection_id),
      'variants', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', v.id, 'colour', v.colour, 'size', v.size, 'sku', v.sku, 'sort', v.sort,
                 'stock_on_hand', v.stock_on_hand, 'reserved_public_qty', v.reserved_public_qty,
                 'sellable', private.variant_sellable(v.id))
               order by v.sort, v.colour, v.size)
        from public.variants v where v.product_id = p.id
      ), '[]'::jsonb),
      'prices', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'variant_id', vp.variant_id, 'currency', vp.currency, 'amount_minor', vp.amount_minor)
               order by vp.variant_id nulls first, vp.currency)
        from public.variant_prices vp where vp.product_id = p.id
      ), '[]'::jsonb),
      'media', coalesce((
        select jsonb_agg(to_jsonb(m) order by m.sort, m.created_at)
        from public.product_media m where m.product_id = p.id
      ), '[]'::jsonb),
      'measurements', coalesce((
        select jsonb_agg(to_jsonb(ms) order by ms.sort, ms.size)
        from public.measurements ms where ms.product_id = p.id
      ), '[]'::jsonb),
      'drops', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', d.id, 'name', d.name,
                 'state', private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at))
               order by d.public_opens_at)
        from public.drop_products dp join public.drops d on d.id = dp.drop_id
        where dp.product_id = p.id
      ), '[]'::jsonb),
      'can', jsonb_build_object('publish', v_is_admin, 'change_prices', v_is_admin, 'change_stock', v_is_admin)
    )
    from public.products p
    where p.id = p_id
  );
end;
$$;

-- Product list for /admin/products. p_status null = all.
create function public.admin_products(p_status public.product_status default null)
returns table (
  id uuid,
  slug text,
  name text,
  status public.product_status,
  collection_name text,
  variant_count integer,
  sold_out boolean,
  cover_path text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  return query
    select
      p.id, p.slug, p.name, p.status, c.name,
      (select count(*)::integer from public.variants v where v.product_id = p.id),
      not exists (select 1 from public.variants v where v.product_id = p.id and private.variant_sellable(v.id) > 0),
      (select m.storage_path from public.product_media m
       where m.product_id = p.id and m.type = 'image' and m.status = 'ready'
       order by m.sort, m.created_at limit 1),
      p.updated_at
    from public.products p
    left join public.collections c on c.id = p.collection_id
    where p_status is null or p.status = p_status
    order by p.updated_at desc;
end;
$$;

-- Upsert the product's variants; variants missing from the list are deleted.
-- Items: {id?, colour, size, sku, sort?, stock_on_hand?, reserved_public_qty?}
-- Merchandisers may change colour/size/sku/sort only.
create function public.admin_save_variants(p_product_id uuid, p_variants jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_item jsonb;
  v_old public.variants;
  v_id uuid;
  v_stock integer;
  v_reserved integer;
  v_keep uuid[] := '{}';
  v_gone record;
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  perform private.require_product(p_product_id);
  v_is_admin := public.is_staff(array['owner', 'manager']::public.staff_role[]);

  if jsonb_typeof(p_variants) is distinct from 'array' then
    raise exception 'p_variants must be a JSON array' using errcode = '22023';
  end if;

  -- Lock this product's variants for the rest of the transaction.
  perform 1 from public.variants where product_id = p_product_id for update;

  -- Ids that stay.
  for v_item in select * from jsonb_array_elements(p_variants) loop
    if v_item ? 'id' and v_item->>'id' is not null then
      v_keep := v_keep || (v_item->>'id')::uuid;
    end if;
  end loop;

  -- Delete removed variants first (frees colour/size/sku for re-use).
  for v_gone in
    select v.* from public.variants v
    where v.product_id = p_product_id and not (v.id = any (v_keep))
  loop
    if exists (
      select 1 from public.stock_reservations r
      where r.variant_id = v_gone.id and r.released_at is null and r.expires_at > now()
    ) then
      raise exception 'Variant % has open stock reservations and cannot be removed', v_gone.sku
        using errcode = '55006';
    end if;
    if v_gone.stock_on_hand <> 0 and not v_is_admin then
      raise exception 'Only owners and managers can remove a variant that has stock' using errcode = '42501';
    end if;
    delete from public.variants where id = v_gone.id;
    perform private.audit('variant.delete', 'variant', v_gone.id, to_jsonb(v_gone), null);
  end loop;

  for v_item in select * from jsonb_array_elements(p_variants) loop
    if coalesce(trim(v_item->>'colour'), '') = '' or coalesce(trim(v_item->>'size'), '') = ''
       or coalesce(trim(v_item->>'sku'), '') = '' then
      raise exception 'Each variant needs colour, size and sku' using errcode = '22023';
    end if;

    v_id := nullif(v_item->>'id', '')::uuid;
    if v_id is not null then
      select * into v_old from public.variants where id = v_id and product_id = p_product_id;
      if not found then
        raise exception 'Variant % does not belong to this product', v_id using errcode = '22023';
      end if;
    else
      v_old := null;
    end if;

    v_stock := coalesce((v_item->>'stock_on_hand')::integer, v_old.stock_on_hand, 0);
    v_reserved := coalesce((v_item->>'reserved_public_qty')::integer, v_old.reserved_public_qty, 0);

    if not v_is_admin
       and (v_stock is distinct from coalesce(v_old.stock_on_hand, 0)
            or v_reserved is distinct from coalesce(v_old.reserved_public_qty, 0)) then
      raise exception 'Only owners and managers can change stock' using errcode = '42501';
    end if;
    if v_stock < 0 or v_reserved < 0 then
      raise exception 'Stock cannot be negative' using errcode = '22023';
    end if;
    if v_reserved > v_stock then
      raise exception 'Reserved public quantity cannot exceed stock on hand (%)', v_item->>'sku'
        using errcode = '22023';
    end if;

    if v_id is null then
      insert into public.variants (product_id, colour, size, sku, sort, stock_on_hand, reserved_public_qty)
      values (p_product_id, trim(v_item->>'colour'), trim(v_item->>'size'), trim(v_item->>'sku'),
              coalesce((v_item->>'sort')::integer, 0), v_stock, v_reserved)
      returning id into v_id;
      perform private.audit('variant.create', 'variant', v_id, null,
        jsonb_build_object('sku', trim(v_item->>'sku'), 'stock_on_hand', v_stock, 'reserved_public_qty', v_reserved));
    else
      update public.variants set
        colour = trim(v_item->>'colour'),
        size = trim(v_item->>'size'),
        sku = trim(v_item->>'sku'),
        sort = coalesce((v_item->>'sort')::integer, v_old.sort),
        stock_on_hand = v_stock,
        reserved_public_qty = v_reserved
      where id = v_id;
      if v_stock <> v_old.stock_on_hand or v_reserved <> v_old.reserved_public_qty then
        perform private.audit('variant.stock', 'variant', v_id,
          jsonb_build_object('sku', v_old.sku, 'stock_on_hand', v_old.stock_on_hand, 'reserved_public_qty', v_old.reserved_public_qty),
          jsonb_build_object('sku', trim(v_item->>'sku'), 'stock_on_hand', v_stock, 'reserved_public_qty', v_reserved));
      end if;
    end if;
  end loop;

  return public.admin_product(p_product_id);
end;
$$;

-- Replace the product's fixed prices. Items: {variant_id|null, currency, amount_minor}.
create function public.admin_set_prices(p_product_id uuid, p_prices jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_item jsonb;
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  perform private.require_product(p_product_id);

  if jsonb_typeof(p_prices) is distinct from 'array' then
    raise exception 'p_prices must be a JSON array' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_prices) loop
    if jsonb_typeof(v_item->'amount_minor') is distinct from 'number'
       or (v_item->>'amount_minor')::numeric <> trunc((v_item->>'amount_minor')::numeric)
       or (v_item->>'amount_minor')::numeric < 0 then
      raise exception 'amount_minor must be a whole number of minor units, zero or more' using errcode = '22023';
    end if;
    if v_item->>'variant_id' is not null and not exists (
      select 1 from public.variants where id = (v_item->>'variant_id')::uuid and product_id = p_product_id
    ) then
      raise exception 'Variant % does not belong to this product', v_item->>'variant_id' using errcode = '22023';
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object('variant_id', variant_id, 'currency', currency, 'amount_minor', amount_minor)
                            order by variant_id nulls first, currency), '[]'::jsonb)
  into v_before
  from public.variant_prices where product_id = p_product_id;

  delete from public.variant_prices where product_id = p_product_id;

  insert into public.variant_prices (product_id, variant_id, currency, amount_minor)
  select p_product_id,
         nullif(x->>'variant_id', '')::uuid,
         (x->>'currency')::public.currency_code,
         (x->>'amount_minor')::bigint
  from jsonb_array_elements(p_prices) as x;

  select coalesce(jsonb_agg(jsonb_build_object('variant_id', variant_id, 'currency', currency, 'amount_minor', amount_minor)
                            order by variant_id nulls first, currency), '[]'::jsonb)
  into v_after
  from public.variant_prices where product_id = p_product_id;

  if v_before is distinct from v_after then
    perform private.audit('product.prices', 'product', p_product_id, v_before, v_after);
  end if;

  return public.admin_product(p_product_id);
end;
$$;

-- Replace the size chart. Rows: {size, bust_cm?, waist_cm?, hip_cm?, length_cm?, sort?}
create function public.admin_set_measurements(p_product_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  perform private.require_product(p_product_id);

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows must be a JSON array' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) x where coalesce(trim(x->>'size'), '') = '') then
    raise exception 'Each measurement row needs a size' using errcode = '22023';
  end if;

  delete from public.measurements where product_id = p_product_id;

  insert into public.measurements (product_id, size, bust_cm, waist_cm, hip_cm, length_cm, sort)
  select p_product_id,
         trim(x->>'size'),
         (x->>'bust_cm')::numeric,
         (x->>'waist_cm')::numeric,
         (x->>'hip_cm')::numeric,
         (x->>'length_cm')::numeric,
         coalesce((x->>'sort')::integer, (ord - 1)::integer)
  from jsonb_array_elements(p_rows) with ordinality as t (x, ord);

  return public.admin_product(p_product_id);
end;
$$;

-- Set gallery order. p_ids must list every media item of the product exactly once.
create function public.admin_reorder_media(p_product_id uuid, p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  perform private.require_product(p_product_id);

  if coalesce(cardinality(p_ids), 0) <> (select count(distinct x) from unnest(p_ids) x)
     or (select array_agg(id order by id) from public.product_media where product_id = p_product_id)
        is distinct from (select array_agg(x order by x) from unnest(p_ids) x) then
    raise exception 'p_ids must list every media item of this product exactly once' using errcode = '22023';
  end if;

  update public.product_media m
  set sort = (o.ord - 1)::integer
  from unnest(p_ids) with ordinality as o (id, ord)
  where m.id = o.id;

  return public.admin_product(p_product_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.server_now() from public;
revoke execute on function public.storefront_products() from public;
revoke execute on function public.storefront_product(text) from public;
grant execute on function public.server_now() to anon, authenticated, service_role;
grant execute on function public.storefront_products() to anon, authenticated, service_role;
grant execute on function public.storefront_product(text) to anon, authenticated, service_role;

revoke execute on function public.admin_products(public.product_status) from public, anon;
revoke execute on function public.admin_product(uuid) from public, anon;
revoke execute on function public.admin_save_variants(uuid, jsonb) from public, anon;
revoke execute on function public.admin_set_prices(uuid, jsonb) from public, anon;
revoke execute on function public.admin_set_measurements(uuid, jsonb) from public, anon;
revoke execute on function public.admin_reorder_media(uuid, uuid[]) from public, anon;
grant execute on function public.admin_products(public.product_status) to authenticated, service_role;
grant execute on function public.admin_product(uuid) to authenticated, service_role;
grant execute on function public.admin_save_variants(uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_set_prices(uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_set_measurements(uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_reorder_media(uuid, uuid[]) to authenticated, service_role;
