-- Xarina Phase 4: dedicated drop pages (/drops and /drops/[slug]).
-- Closed drops stay up as an archive. A drop's slug is permanent, like a product's
-- (rule 11 spirit): when it changes, the old slug keeps redirecting.

-- ---------------------------------------------------------------------------
-- 1. Slug and hero image
-- ---------------------------------------------------------------------------
alter table public.drops
  add column slug text,
  add column hero_storage_path text,            -- path in the product-media bucket
  add column hero_alt text not null default '';

-- Backfill existing drops from their name, de-duplicated with -2, -3 ...
update public.drops d
set slug = s.slug
from (
  select id, base || case when rn > 1 then '-' || rn else '' end as slug
  from (
    select id, base, row_number() over (partition by base order by created_at, id) as rn
    from (
      select id, created_at,
             coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'drop') as base
      from public.drops
    ) a
  ) b
) s
where s.id = d.id;

alter table public.drops
  alter column slug set not null,
  add constraint drops_slug_key unique (slug),
  add constraint drops_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Old slugs, kept forever so their pages redirect.
create table public.drop_slug_history (
  id uuid primary key default gen_random_uuid(),
  old_slug text not null unique,
  drop_id uuid not null references public.drops (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.drop_slug_history enable row level security;
create policy "drop slug history: staff read" on public.drop_slug_history
  for select to authenticated using ((select public.is_staff()));

-- A drop created without a slug gets one from its name (the seed and older
-- callers keep working); staff can edit it afterwards.
create function private.drop_default_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
  v_n integer := 1;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;
  v_base := coalesce(nullif(trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g')), ''), 'drop');
  v_slug := v_base;
  while exists (select 1 from public.drops where slug = v_slug)
     or exists (select 1 from public.drop_slug_history where old_slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  new.slug := v_slug;
  return new;
end;
$$;
create trigger drops_default_slug before insert on public.drops
  for each row execute function private.drop_default_slug();

-- A slug that once belonged to another drop stays reserved for its redirect.
create function private.guard_drop_slug_reuse()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.drop_slug_history h
    where h.old_slug = new.slug and h.drop_id <> new.id
  ) then
    raise exception 'Slug "%" belonged to another drop and stays reserved for its redirect', new.slug
      using errcode = '23505';
  end if;
  return new;
end;
$$;
create trigger drops_guard_slug_reuse before insert or update of slug on public.drops
  for each row execute function private.guard_drop_slug_reuse();

create function private.record_drop_slug_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug then
    insert into public.drop_slug_history (old_slug, drop_id)
    values (old.slug, old.id)
    on conflict (old_slug) do update set drop_id = excluded.drop_id;
    -- A drop may take back one of its own earlier slugs.
    delete from public.drop_slug_history where old_slug = new.slug and drop_id = new.id;
  end if;
  return new;
end;
$$;
create trigger drops_slug_history after update of slug on public.drops
  for each row execute function private.record_drop_slug_change();

-- ---------------------------------------------------------------------------
-- 2. Admin: save slug and hero too (replaces the Phase 4 version, same signature)
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
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);

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

-- The drop list shows each drop's public address.
create or replace function public.admin_drops()
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
      'slug', d.slug,
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

-- ---------------------------------------------------------------------------
-- 3. Public reads. State comes from database time (rule 6); no stock numbers.
-- ---------------------------------------------------------------------------

-- Published drops, newest public opening first. A closed drop with on_close =
-- 'hide' stays listed as an archive entry but shows no designs.
create function public.storefront_drops()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_json order by public_opens_at desc, name), '[]'::jsonb)
  from (
    select
      d.public_opens_at,
      d.name,
      jsonb_build_object(
        'id', d.id,
        'slug', d.slug,
        'name', d.name,
        'pitch', d.pitch,
        'state', st.state,
        'vip_opens_at', d.vip_opens_at,
        'public_opens_at', d.public_opens_at,
        'closes_at', d.closes_at,
        'hero', case when d.hero_storage_path is null then null
                     else jsonb_build_object('storage_path', d.hero_storage_path, 'alt', d.hero_alt) end,
        'design_count', case when st.hidden then 0 else (
          select count(*) from public.drop_products dp
          join public.products p on p.id = dp.product_id and p.status = 'published'
          where dp.drop_id = d.id) end,
        'cover_path', case when st.hidden then null else (
          select m.storage_path
          from public.drop_products dp
          join public.products p on p.id = dp.product_id and p.status = 'published'
          join public.product_media m on m.product_id = p.id and m.type = 'image' and m.status = 'ready'
          where dp.drop_id = d.id
          order by dp.sort, m.sort, m.created_at
          limit 1) end
      ) as row_json
    from public.drops d
    cross join lateral (
      select private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at) as state,
             private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at) = 'closed'
               and d.on_close = 'hide' as hidden
    ) st
    where d.published
  ) x;
$$;

-- One drop by slug. null = unknown or unpublished; {"redirect": slug} = an old
-- slug; otherwise {drop, products, server_now}. Products use the exact
-- storefront_products() row shape; a closed drop with on_close = 'hide' has none.
create function public.storefront_drop(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d public.drops;
  v_state text;
  v_hidden boolean;
  v_new text;
begin
  select * into d from public.drops where slug = p_slug and published;

  if not found then
    select x.slug into v_new
    from public.drop_slug_history h
    join public.drops x on x.id = h.drop_id and x.published
    where h.old_slug = p_slug;
    if v_new is not null then
      return jsonb_build_object('redirect', v_new);
    end if;
    return null;
  end if;

  v_state := private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at);
  v_hidden := v_state = 'closed' and d.on_close = 'hide';

  return jsonb_build_object(
    'drop', jsonb_build_object(
      'id', d.id,
      'slug', d.slug,
      'name', d.name,
      'pitch', d.pitch,
      'state', v_state,
      'vip_opens_at', d.vip_opens_at,
      'public_opens_at', d.public_opens_at,
      'closes_at', d.closes_at,
      'vip_limit_per_member', d.vip_limit_per_member,
      'on_close', d.on_close,
      'hero', case when d.hero_storage_path is null then null
                   else jsonb_build_object('storage_path', d.hero_storage_path, 'alt', d.hero_alt) end
    ),
    'products', case when v_hidden then '[]'::jsonb else coalesce((
      select jsonb_agg(to_jsonb(sp) order by dp.sort, sp.name)
      from public.drop_products dp
      join public.storefront_products() sp on sp.id = dp.product_id
      where dp.drop_id = d.id
    ), '[]'::jsonb) end,
    'server_now', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.storefront_drops() from public;
revoke execute on function public.storefront_drop(text) from public;
grant execute on function public.storefront_drops() to anon, authenticated, service_role;
grant execute on function public.storefront_drop(text) to anon, authenticated, service_role;
