-- Xarina Phase 4: drops, waitlists and Privé (DROP-1..4, WL-1..5, VIP-1..5, ADM-4).
-- Privé rules are data, not code (PRD open decision):
--   who qualifies          -> customers.is_vip, set by staff (VIP-1)
--   hours early            -> drops.vip_opens_at vs public_opens_at, per drop
--   per-member limit       -> drops.vip_limit_per_member, per drop (VIP-3)
--   reserved public stock  -> variants.reserved_public_qty, per variant (VIP-4)

-- ---------------------------------------------------------------------------
-- 1. Privé sessions for single-use access links (VIP-2, rule 7).
-- A link is redeemed once; the browser then holds an opaque random token whose
-- SHA-256 hash is stored here. No shared password anywhere (VIP-5).
-- ---------------------------------------------------------------------------
create table public.prive_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  drop_id uuid references public.drops (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index prive_sessions_customer_idx on public.prive_sessions (customer_id);
alter table public.prive_sessions enable row level security;   -- no policies: service role only (rule 8)

-- ---------------------------------------------------------------------------
-- 2. Drop admin (ADM-4)
-- ---------------------------------------------------------------------------
create function public.admin_drops()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id,
      'name', d.name,
      'published', d.published,
      'vip_opens_at', d.vip_opens_at,
      'public_opens_at', d.public_opens_at,
      'closes_at', d.closes_at,
      'state', private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at),
      'product_count', (select count(*) from public.drop_products dp where dp.drop_id = d.id),
      -- WL-5: interest, never sales.
      'interest_count', (
        select count(distinct w.customer_id)
        from public.waitlist_entries w
        join public.drop_products dp on dp.product_id = w.product_id
        where dp.drop_id = d.id
      )
    ) order by d.public_opens_at desc)
    from public.drops d
  ), '[]'::jsonb);
end;
$$;

create function public.admin_drop(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  select to_jsonb(d) || jsonb_build_object(
    'state', private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', p.id, 'name', p.name, 'slug', p.slug,
        'interest_count', (select count(*) from public.waitlist_entries w where w.product_id = p.id)
      ) order by dp.sort)
      from public.drop_products dp join public.products p on p.id = dp.product_id
      where dp.drop_id = d.id
    ), '[]'::jsonb)
  )
  into v
  from public.drops d where d.id = p_id;
  if v is null then
    raise exception 'Drop not found' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

-- Create (p_id null) or update a drop. Times are timestamptz (UTC).
create function public.admin_save_drop(p_data jsonb, p_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_before jsonb;
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);

  if p_id is null then
    insert into public.drops (name, pitch, vip_opens_at, public_opens_at, closes_at,
                              vip_limit_per_member, on_close, published)
    values (
      btrim(p_data->>'name'),
      coalesce(p_data->>'pitch', ''),
      (p_data->>'vip_opens_at')::timestamptz,
      (p_data->>'public_opens_at')::timestamptz,
      nullif(p_data->>'closes_at', '')::timestamptz,
      nullif(p_data->>'vip_limit_per_member', '')::integer,
      coalesce(p_data->>'on_close', 'move_to_available'),
      coalesce((p_data->>'published')::boolean, false)
    )
    returning id into v_id;
    perform private.audit('drop.create', 'drop', v_id, null, (select to_jsonb(d) from public.drops d where d.id = v_id));
  else
    select to_jsonb(d) into v_before from public.drops d where d.id = p_id;
    if v_before is null then
      raise exception 'Drop not found' using errcode = 'P0002';
    end if;
    update public.drops d set
      name = case when p_data ? 'name' then btrim(p_data->>'name') else d.name end,
      pitch = case when p_data ? 'pitch' then coalesce(p_data->>'pitch', '') else d.pitch end,
      vip_opens_at = case when p_data ? 'vip_opens_at' then (p_data->>'vip_opens_at')::timestamptz else d.vip_opens_at end,
      public_opens_at = case when p_data ? 'public_opens_at' then (p_data->>'public_opens_at')::timestamptz else d.public_opens_at end,
      closes_at = case when p_data ? 'closes_at' then nullif(p_data->>'closes_at', '')::timestamptz else d.closes_at end,
      vip_limit_per_member = case when p_data ? 'vip_limit_per_member' then nullif(p_data->>'vip_limit_per_member', '')::integer else d.vip_limit_per_member end,
      on_close = case when p_data ? 'on_close' then p_data->>'on_close' else d.on_close end,
      published = case when p_data ? 'published' then (p_data->>'published')::boolean else d.published end
    where d.id = p_id;
    perform private.audit('drop.update', 'drop', p_id, v_before, (select to_jsonb(d) from public.drops d where d.id = p_id));
  end if;

  return v_id;
end;
$$;

-- Replace the designs in a drop. A design can be in only one open (not closed)
-- drop at a time (PRD, ADM-4).
create function public.admin_set_drop_products(p_drop_id uuid, p_product_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clash record;
  v_before uuid[];
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  if not exists (select 1 from public.drops where id = p_drop_id) then
    raise exception 'Drop not found' using errcode = 'P0002';
  end if;

  select p.name, d.name as drop_name into v_clash
  from public.drop_products dp
  join public.drops d on d.id = dp.drop_id
  join public.products p on p.id = dp.product_id
  where dp.product_id = any (p_product_ids)
    and dp.drop_id <> p_drop_id
    and private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at) <> 'closed'
  limit 1;
  if found then
    raise exception '% is already in the open drop "%"', v_clash.name, v_clash.drop_name using errcode = '23505';
  end if;

  select coalesce(array_agg(product_id order by sort), '{}') into v_before
  from public.drop_products where drop_id = p_drop_id;

  delete from public.drop_products where drop_id = p_drop_id;
  insert into public.drop_products (drop_id, product_id, sort)
  select p_drop_id, pid, ord - 1
  from unnest(p_product_ids) with ordinality as t(pid, ord);

  perform private.audit('drop.products', 'drop', p_drop_id,
    jsonb_build_object('product_ids', v_before), jsonb_build_object('product_ids', p_product_ids));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Waitlist (WL-1..5) and restock requests. Called by the server with the
-- service role: guests have no direct write access (rule 8).
-- Consent (rule 12): marketing and drop-alert are separate, never inferred, and
-- stored with a timestamp. A repeat sign-up updates preferences (WL-4) and never
-- withdraws a consent already given.
-- ---------------------------------------------------------------------------
create function private.upsert_customer_consent(
  p_email text, p_name text, p_phone text, p_marketing boolean, p_drop_alerts boolean, p_source text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;

  insert into public.customers (email, name, phone)
  values (v_email, nullif(btrim(p_name), ''), nullif(btrim(p_phone), ''))
  on conflict (email) do update set
    name = coalesce(nullif(btrim(p_name), ''), public.customers.name),
    phone = coalesce(nullif(btrim(p_phone), ''), public.customers.phone)
  returning id into v_id;

  if coalesce(p_marketing, false) then
    update public.customers set
      marketing_consent = true,
      marketing_consent_at = coalesce(marketing_consent_at, now()),
      marketing_consent_source = coalesce(marketing_consent_source, p_source)
    where id = v_id and not marketing_consent;
  end if;
  if coalesce(p_drop_alerts, false) then
    update public.customers set
      drop_alert_consent = true,
      drop_alert_consent_at = coalesce(drop_alert_consent_at, now()),
      drop_alert_consent_source = coalesce(drop_alert_consent_source, p_source)
    where id = v_id and not drop_alert_consent;
  end if;

  return v_id;
end;
$$;

create function public.join_waitlist(
  p_product_id uuid,
  p_email text,
  p_name text default null,
  p_phone text default null,
  p_colour text default null,
  p_size text default null,
  p_marketing_consent boolean default false,
  p_drop_alert_consent boolean default false,
  p_utm jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer uuid;
  v_id uuid;
begin
  if not exists (select 1 from public.products where id = p_product_id and status = 'published') then
    raise exception 'Design not found' using errcode = 'P0002';
  end if;

  v_customer := private.upsert_customer_consent(
    p_email, p_name, p_phone, p_marketing_consent, p_drop_alert_consent, 'waitlist');

  insert into public.waitlist_entries (customer_id, product_id, colour, size, source_utm)
  values (v_customer, p_product_id, nullif(btrim(p_colour), ''), nullif(btrim(p_size), ''), p_utm)
  on conflict (customer_id, product_id) do update set
    colour = excluded.colour,
    size = excluded.size,
    source_utm = coalesce(public.waitlist_entries.source_utm, excluded.source_utm)
  returning id into v_id;

  return v_id;
end;
$$;

create function public.request_restock(p_variant_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer uuid;
  v_id uuid;
begin
  if not exists (
    select 1 from public.variants v join public.products p on p.id = v.product_id
    where v.id = p_variant_id and p.status = 'published'
  ) then
    raise exception 'Variant not found' using errcode = 'P0002';
  end if;

  -- No consent is recorded: this is a one-off notice about the item requested.
  v_customer := private.upsert_customer_consent(p_email, null, null, false, false, 'restock');

  insert into public.restock_requests (customer_id, variant_id)
  values (v_customer, p_variant_id)
  on conflict (customer_id, variant_id) do update set notified_at = null
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Privé membership (VIP-1) and access links (VIP-2)
-- ---------------------------------------------------------------------------
-- Approve or revoke existing customers (single or bulk).
create function public.admin_set_vip(p_customer_ids uuid[], p_is_vip boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  update public.customers set
    is_vip = p_is_vip,
    vip_approved_at = case when p_is_vip then coalesce(vip_approved_at, now()) else null end,
    vip_approved_by = case when p_is_vip then coalesce(vip_approved_by, private.current_staff_id()) else null end
  where id = any (p_customer_ids) and is_vip is distinct from p_is_vip;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform private.audit(case when p_is_vip then 'vip.approve' else 'vip.revoke' end,
      'customer', null, null, jsonb_build_object('customer_ids', p_customer_ids));
  end if;
  return v_count;
end;
$$;

-- Bulk approve from a pasted list of emails; creates customers that don't exist
-- yet. No marketing or alert consent is implied.
create function public.admin_approve_vip_emails(p_emails text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_email text;
  v_id uuid;
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  v_ids := '{}';
  foreach v_email in array p_emails loop
    continue when nullif(btrim(v_email), '') is null;
    v_id := private.upsert_customer_consent(v_email, null, null, false, false, 'vip_import');
    v_ids := v_ids || v_id;
  end loop;
  return public.admin_set_vip(v_ids, true);
end;
$$;

-- Staff issue a personal link. The app generates the random token and passes
-- only its SHA-256 hash (rule 7); the raw token is shown to staff once.
create function public.admin_create_access_link(
  p_customer_id uuid, p_token_hash text, p_expires_at timestamptz, p_drop_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  if not exists (select 1 from public.customers where id = p_customer_id and is_vip) then
    raise exception 'Customer is not an approved Privé member' using errcode = '22023';
  end if;
  if p_expires_at <= now() then
    raise exception 'Expiry must be in the future' using errcode = '22023';
  end if;
  insert into public.vip_access_links (customer_id, drop_id, token_hash, expires_at, created_by)
  values (p_customer_id, p_drop_id, p_token_hash, p_expires_at, private.current_staff_id())
  returning id into v_id;
  perform private.audit('vip.link', 'customer', p_customer_id, null,
    jsonb_build_object('drop_id', p_drop_id, 'expires_at', p_expires_at));
  return v_id;
end;
$$;

-- Redeem a link exactly once (service role). Returns the new session's expiry,
-- or null if the link is unknown, used or expired. Re-checks the member is still
-- approved. The single UPDATE ... WHERE used_at IS NULL makes it race-safe.
create function public.redeem_access_link(p_link_hash text, p_session_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.vip_access_links;
  v_expires timestamptz;
begin
  update public.vip_access_links l
  set used_at = now()
  where l.token_hash = p_link_hash and l.used_at is null and l.expires_at > now()
    and exists (select 1 from public.customers c where c.id = l.customer_id and c.is_vip)
  returning l.* into v_link;

  if v_link.id is null then
    return null;
  end if;

  v_expires := least(now() + interval '24 hours', v_link.expires_at + interval '24 hours');
  insert into public.prive_sessions (customer_id, drop_id, token_hash, expires_at)
  values (v_link.customer_id, v_link.drop_id, p_session_hash, v_expires);

  return jsonb_build_object('customer_id', v_link.customer_id, 'drop_id', v_link.drop_id, 'expires_at', v_expires);
end;
$$;

-- Customer behind a Privé session cookie hash (service role), or null.
create function public.prive_session_customer(p_session_hash text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.customer_id
  from public.prive_sessions s
  join public.customers c on c.id = s.customer_id and c.is_vip
  where s.token_hash = p_session_hash and s.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- 5. Purchase check (DROP-3, VIP-3, VIP-4). Server-side only, database time.
-- Called by the checkout functions at add-to-cart AND payment start (rule 6).
--   -> {ok, reason, state, drop_id, hold_back_public, vip_remaining}
--   reasons: no_drop | drop_not_open | vip_only | vip_limit | drop_closed | open
--   hold_back_public: true while only Privé may buy, so reserve_stock must keep
--   variants.reserved_public_qty out of VIP reach (rule 5, VIP-4).
-- ---------------------------------------------------------------------------
create function private.drop_purchase_check(p_product_id uuid, p_customer_id uuid, p_qty integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_drop public.drops;
  v_hidden boolean;
  v_state text;
  v_is_vip boolean := false;
  v_taken integer;
  v_remaining integer;
begin
  select pd.drop_id, pd.hidden into v_drop.id, v_hidden from private.product_drop(p_product_id) pd;

  if v_drop.id is null then
    if v_hidden then
      return jsonb_build_object('ok', false, 'reason', 'drop_closed', 'state', 'closed');
    end if;
    return jsonb_build_object('ok', true, 'reason', 'no_drop', 'state', null);
  end if;

  select * into v_drop from public.drops where id = v_drop.id;
  v_state := private.drop_state_of(v_drop.vip_opens_at, v_drop.public_opens_at, v_drop.closes_at);

  if v_state = 'upcoming' then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_open', 'state', v_state, 'drop_id', v_drop.id);
  end if;
  if v_state = 'public' then
    return jsonb_build_object('ok', true, 'reason', 'open', 'state', v_state, 'drop_id', v_drop.id,
                              'hold_back_public', false);
  end if;

  -- v_state = 'vip'
  select coalesce(c.is_vip, false) into v_is_vip from public.customers c where c.id = p_customer_id;
  if not coalesce(v_is_vip, false) then
    return jsonb_build_object('ok', false, 'reason', 'vip_only', 'state', v_state, 'drop_id', v_drop.id);
  end if;

  if v_drop.vip_limit_per_member is not null then
    -- Per design: paid-or-later orders plus pending orders still holding stock.
    select coalesce(sum(oi.qty), 0) into v_taken
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.variants v on v.id = oi.variant_id
    where o.customer_id = p_customer_id
      and v.product_id = p_product_id
      and (
        o.status in ('paid', 'processing', 'dispatched', 'delivered')
        or (o.status = 'pending_payment' and exists (
          select 1 from public.stock_reservations r
          where r.order_id = o.id and r.released_at is null and r.expires_at > now()))
      );
    v_remaining := greatest(v_drop.vip_limit_per_member - v_taken, 0);
    if p_qty > v_remaining then
      return jsonb_build_object('ok', false, 'reason', 'vip_limit', 'state', v_state,
                                'drop_id', v_drop.id, 'vip_remaining', v_remaining);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'reason', 'open', 'state', v_state, 'drop_id', v_drop.id,
                            'hold_back_public', true, 'vip_remaining', v_remaining);
end;
$$;

-- Contract with the checkout functions (xarina-a5): decides allowed / reason /
-- channel only. Stock, including keeping reserved_public_qty out of Privé reach,
-- stays in reserve_stock. channel is 'vip' only while the drop is in its Privé window.
create function public.can_purchase(p_product_id uuid, p_customer_id uuid, p_qty integer default 1)
returns table (allowed boolean, reason text, drop_id uuid, channel public.order_channel)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select private.drop_purchase_check(p_product_id, p_customer_id, p_qty) as r)
  select
    (c.r->>'ok')::boolean,
    c.r->>'reason',
    nullif(c.r->>'drop_id', '')::uuid,
    case when c.r->>'state' = 'vip' then 'vip'::public.order_channel else 'public'::public.order_channel end
  from c;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
revoke execute on function public.can_purchase(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.can_purchase(uuid, uuid, integer) to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.admin_drops() from public, anon;
revoke execute on function public.admin_drop(uuid) from public, anon;
revoke execute on function public.admin_save_drop(jsonb, uuid) from public, anon;
revoke execute on function public.admin_set_drop_products(uuid, uuid[]) from public, anon;
revoke execute on function public.admin_set_vip(uuid[], boolean) from public, anon;
revoke execute on function public.admin_approve_vip_emails(text[]) from public, anon;
revoke execute on function public.admin_create_access_link(uuid, text, timestamptz, uuid) from public, anon;
grant execute on function public.admin_drops() to authenticated, service_role;
grant execute on function public.admin_drop(uuid) to authenticated, service_role;
grant execute on function public.admin_save_drop(jsonb, uuid) to authenticated, service_role;
grant execute on function public.admin_set_drop_products(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.admin_set_vip(uuid[], boolean) to authenticated, service_role;
grant execute on function public.admin_approve_vip_emails(text[]) to authenticated, service_role;
grant execute on function public.admin_create_access_link(uuid, text, timestamptz, uuid) to authenticated, service_role;

-- Guest-facing writes and session lookups: service role only (rule 8).
revoke execute on function public.join_waitlist(uuid, text, text, text, text, text, boolean, boolean, jsonb) from public, anon, authenticated;
revoke execute on function public.request_restock(uuid, text) from public, anon, authenticated;
revoke execute on function public.redeem_access_link(text, text) from public, anon, authenticated;
revoke execute on function public.prive_session_customer(text) from public, anon, authenticated;
grant execute on function public.join_waitlist(uuid, text, text, text, text, text, boolean, boolean, jsonb) to service_role;
grant execute on function public.request_restock(uuid, text) to service_role;
grant execute on function public.redeem_access_link(text, text) to service_role;
grant execute on function public.prive_session_customer(text) to service_role;
