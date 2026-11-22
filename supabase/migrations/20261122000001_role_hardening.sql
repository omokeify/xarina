-- Deployment hardening: make the admin role rules true in the database, not
-- just in the UI. A staff member can call an RPC or the Supabase API directly,
-- so role checks that only exist in a server action are not enough.

-- ---------------------------------------------------------------------------
-- 1. Publishing a drop is an owner/manager action (ADM-1). Merchandisers can
--    still edit drafts, but cannot publish or unpublish directly via RPC.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_drop(p_data jsonb, p_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_before jsonb;
  v_published boolean;
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);

  if p_id is null then
    if coalesce((p_data->>'published')::boolean, false) then
      perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
    end if;
  else
    select published into v_published from public.drops d where d.id = p_id;
    if p_data ? 'published' and ((p_data->>'published')::boolean is distinct from v_published) then
      perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
    end if;
  end if;

  if p_id is null then
    insert into public.drops (name, slug, pitch, vip_opens_at, public_opens_at, closes_at,
                              vip_limit_per_member, on_close, published, hero_storage_path, hero_alt)
    values (
      btrim(p_data->>'name'),
      nullif(btrim(p_data->>'slug'), ''),
      coalesce(p_data->>'pitch', ''),
      (p_data->>'vip_opens_at')::timestamptz,
      (p_data->>'public_opens_at')::timestamptz,
      nullif(p_data->>'closes_at', '')::timestamptz,
      nullif(p_data->>'vip_limit_per_member', '')::integer,
      coalesce(p_data->>'on_close', 'move_to_available'),
      coalesce((p_data->>'published')::boolean, false),
      nullif(p_data->>'hero_storage_path', ''),
      coalesce(p_data->>'hero_alt', '')
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
      slug = case when p_data ? 'slug' and nullif(btrim(p_data->>'slug'), '') is not null
                  then btrim(p_data->>'slug') else d.slug end,
      pitch = case when p_data ? 'pitch' then coalesce(p_data->>'pitch', '') else d.pitch end,
      vip_opens_at = case when p_data ? 'vip_opens_at' then (p_data->>'vip_opens_at')::timestamptz else d.vip_opens_at end,
      public_opens_at = case when p_data ? 'public_opens_at' then (p_data->>'public_opens_at')::timestamptz else d.public_opens_at end,
      closes_at = case when p_data ? 'closes_at' then nullif(p_data->>'closes_at', '')::timestamptz else d.closes_at end,
      vip_limit_per_member = case when p_data ? 'vip_limit_per_member' then nullif(p_data->>'vip_limit_per_member', '')::integer else d.vip_limit_per_member end,
      on_close = case when p_data ? 'on_close' then p_data->>'on_close' else d.on_close end,
      published = case when p_data ? 'published' then (p_data->>'published')::boolean else d.published end,
      hero_storage_path = case when p_data ? 'hero_storage_path' then nullif(p_data->>'hero_storage_path', '') else d.hero_storage_path end,
      hero_alt = case when p_data ? 'hero_alt' then coalesce(p_data->>'hero_alt', '') else d.hero_alt end
    where d.id = p_id;
    perform private.audit('drop.update', 'drop', p_id, v_before, (select to_jsonb(d) from public.drops d where d.id = p_id));
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Money settings and collections are owner/manager only. The UI already
--    restricts /admin/settings to owners and has no collections screen, but
--    RLS previously allowed managers (and merchandisers, for collections) to
--    write these tables directly through the Supabase API.
-- ---------------------------------------------------------------------------
drop policy if exists "fx: admins write" on public.fx_rates;
create policy "fx: owners write" on public.fx_rates
  for all to authenticated
  using ((select public.is_staff(array['owner']::public.staff_role[])))
  with check ((select public.is_staff(array['owner']::public.staff_role[])));

drop policy if exists "zones: admins write" on public.shipping_zones;
create policy "zones: owners write" on public.shipping_zones
  for all to authenticated
  using ((select public.is_staff(array['owner']::public.staff_role[])))
  with check ((select public.is_staff(array['owner']::public.staff_role[])));

drop policy if exists "rates: admins write" on public.shipping_rates;
create policy "rates: owners write" on public.shipping_rates
  for all to authenticated
  using ((select public.is_staff(array['owner']::public.staff_role[])))
  with check ((select public.is_staff(array['owner']::public.staff_role[])));

drop policy if exists "collections: editors write" on public.collections;
create policy "collections: owners and managers write" on public.collections
  for all to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- 3. Rejected webhook deliveries have no idempotency index, so a flood of
--    bad signatures could grow payment_events without bound. Keep an audit
--    trail but cap each provider's invalid rows at 500 (oldest first).
-- ---------------------------------------------------------------------------
create index payment_events_invalid_received_idx
  on public.payment_events (provider, received_at desc)
  where not signature_valid;

create or replace function private.cap_invalid_payment_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.payment_events
  where id in (
    select id from public.payment_events
    where signature_valid = false and provider = new.provider
    order by received_at desc, id desc
    offset 500
  );
  return new;
end;
$$;

drop trigger if exists payment_events_invalid_cap on public.payment_events;
create trigger payment_events_invalid_cap
  after insert on public.payment_events
  for each row when (new.signature_valid = false)
  execute function private.cap_invalid_payment_events();
