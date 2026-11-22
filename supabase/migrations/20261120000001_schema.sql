-- Xarina Phase 1: core schema (PRD "Data model").
-- Rules: money = bigint *_minor + currency code (rule 1); timestamps = timestamptz (UTC).
-- RLS policies live in 20261120000002_rls.sql.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

-- One role per staff member. The PRD says "staff / staff_roles"; a single
-- staff table with one role column is enough for launch (agreed with the team).
create type public.staff_role as enum ('owner', 'manager', 'merchandiser', 'fulfilment', 'support');
create type public.product_status as enum ('draft', 'published');
create type public.pricing_mode as enum ('fixed', 'fx');           -- CUR-1
create type public.media_type as enum ('image', 'video');
create type public.order_status as enum (                          -- INV-4
  'pending_payment', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled', 'refunded'
);
create type public.order_channel as enum ('vip', 'public');

-- Currency codes (PAY-2). A domain keeps generated TS types as plain strings.
create domain public.currency_code as text
  check (value in ('NGN', 'GBP', 'USD'));

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff (ADM-1)
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(email)),
  name text not null,
  role public.staff_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- is_staff: true if the caller is an active staff member (in `roles` if given).
-- Used by every admin RLS policy.
create function public.is_staff(roles public.staff_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff s
    where s.auth_user_id = auth.uid()
      and s.active
      and (roles is null or s.role = any (roles))
  );
$$;

-- current_staff: the signed-in staff member, for the /admin shell.
create function public.current_staff()
returns table (id uuid, name text, email text, role public.staff_role)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.name, s.email, s.role
  from public.staff s
  where s.auth_user_id = auth.uid()
    and s.active;
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.collections (                                  -- SHOP-2
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                                       -- PDP-1, permanent
  name text not null,
  description text not null default '',
  fabric text not null default '',
  care text not null default '',
  fit_notes text not null default '',
  delivery_timing text not null default '',
  status public.product_status not null default 'draft',
  pricing_mode public.pricing_mode not null default 'fixed',
  -- Base price for pricing_mode = 'fx' (CUR-1). Null when prices are fixed.
  base_currency public.currency_code,
  base_amount_minor bigint check (base_amount_minor >= 0),
  collection_id uuid references public.collections (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_fx_base_check check (
    pricing_mode = 'fixed'
    or (base_currency is not null and base_amount_minor is not null)
  )
);
create index products_collection_idx on public.products (collection_id);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Old slugs, kept forever for 301 redirects (PDP-1, rule 11).
create table public.product_slug_history (
  id uuid primary key default gen_random_uuid(),
  old_slug text not null unique,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Record the old slug whenever a product's slug changes.
create function public.record_slug_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug then
    insert into public.product_slug_history (old_slug, product_id)
    values (old.slug, old.id)
    on conflict (old_slug) do update set product_id = excluded.product_id;
    -- A product may take back one of its own earlier slugs.
    delete from public.product_slug_history
    where old_slug = new.slug and product_id = new.id;
  end if;
  return new;
end;
$$;
create trigger products_slug_history after update of slug on public.products
  for each row execute function public.record_slug_change();

-- Merchandisers cannot publish or change prices (PRD "Users and roles").
-- Checked only for API users (auth.uid() set); the service role and
-- migrations have no auth.uid().
create function public.guard_product_restricted_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null
     or public.is_staff(array['owner', 'manager']::public.staff_role[]) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'Only owners and managers can publish products' using errcode = '42501';
    end if;
  elsif new.status is distinct from old.status
     or new.pricing_mode is distinct from old.pricing_mode
     or new.base_currency is distinct from old.base_currency
     or new.base_amount_minor is distinct from old.base_amount_minor then
    raise exception 'Only owners and managers can change status or prices' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger products_guard_restricted before insert or update on public.products
  for each row execute function public.guard_product_restricted_fields();

create table public.product_media (                                -- PDP-2, ADM-2
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  type public.media_type not null,
  storage_path text,
  mux_playback_id text,
  alt text not null check (length(trim(alt)) > 0),                -- alt text required on upload
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_media_source_check check (
    (type = 'image' and storage_path is not null)
    or (type = 'video' and mux_playback_id is not null)
  )
);
create index product_media_product_idx on public.product_media (product_id, sort);

create table public.variants (                                     -- INV-1
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  colour text not null,
  size text not null,
  sku text not null unique,
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  reserved_public_qty integer not null default 0 check (reserved_public_qty >= 0), -- VIP-4
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, colour, size)
);
create trigger variants_updated_at before update on public.variants
  for each row execute function public.set_updated_at();

-- Fixed prices (pricing_mode = 'fixed'). variant_id null = price for the whole
-- design; a row with variant_id overrides it for that variant.
create table public.variant_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.variants (id) on delete cascade,
  currency public.currency_code not null,
  amount_minor bigint not null check (amount_minor >= 0),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (product_id, variant_id, currency)
);
create trigger variant_prices_updated_at before update on public.variant_prices
  for each row execute function public.set_updated_at();

create table public.fx_rates (                                     -- CUR-2
  id uuid primary key default gen_random_uuid(),
  base public.currency_code not null,
  quote public.currency_code not null,
  rate numeric(18, 8) not null check (rate > 0),
  -- Round converted prices to this step, in minor units of `quote`
  -- (e.g. 500 = nearest £5). Null = no rounding.
  rounding_increment_minor bigint check (rounding_increment_minor > 0),
  updated_by uuid references public.staff (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (base, quote),
  check (base <> quote)
);
create trigger fx_rates_updated_at before update on public.fx_rates
  for each row execute function public.set_updated_at();

create table public.measurements (                                 -- PDP-3
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  bust_cm numeric(5, 1),
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  length_cm numeric(5, 1),
  sort integer not null default 0,
  unique (product_id, size)
);

-- ---------------------------------------------------------------------------
-- Drops (DROP-1..4)
-- ---------------------------------------------------------------------------
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pitch text not null default '',
  vip_opens_at timestamptz not null,
  public_opens_at timestamptz not null,
  closes_at timestamptz,
  vip_limit_per_member integer check (vip_limit_per_member > 0),   -- VIP-3, null = no limit
  on_close text not null default 'move_to_available'
    check (on_close in ('move_to_available', 'hide')),
  published boolean not null default false,                        -- drafts stay staff-only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- VIP may open at the same time as public (no early window).
  constraint drops_timing_check check (
    vip_opens_at <= public_opens_at
    and (closes_at is null or closes_at > public_opens_at)
  )
);
create trigger drops_updated_at before update on public.drops
  for each row execute function public.set_updated_at();

-- PRD: "a design can be in one active drop". Not enforced yet: "active"
-- depends on drop timing, so the rule is left for Phase 4 (ADM-4).
create table public.drop_products (
  drop_id uuid not null references public.drops (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort integer not null default 0,
  primary key (drop_id, product_id)
);
create index drop_products_product_idx on public.drop_products (product_id);

-- drop_state: computed from database time only (DROP-1, DROP-3, rule 6).
-- SECURITY INVOKER, so callers only see drops RLS lets them read
-- (unknown or hidden drop -> null).
create function public.drop_state(p_drop_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when d.closes_at is not null and now() >= d.closes_at then 'closed'
    when now() >= d.public_opens_at then 'public'
    when now() >= d.vip_opens_at then 'vip'
    else 'upcoming'
  end
  from public.drops d
  where d.id = p_drop_id;
$$;

-- ---------------------------------------------------------------------------
-- Customers, Privé, waitlists (CRM, VIP, WL)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique check (email = lower(email)),
  name text,
  phone text,
  country text,                                                    -- ISO 3166-1 alpha-2
  is_vip boolean not null default false,
  vip_approved_at timestamptz,
  vip_approved_by uuid references public.staff (id) on delete set null,
  -- Rule 12 / WL-2: two separate consents, off by default, each with time and source.
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_source text,
  drop_alert_consent boolean not null default false,
  drop_alert_consent_at timestamptz,
  drop_alert_consent_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_marketing_consent_ts check (not marketing_consent or marketing_consent_at is not null),
  constraint customers_drop_alert_consent_ts check (not drop_alert_consent or drop_alert_consent_at is not null)
);
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- The signed-in shopper's customer id (null for guests and staff without one).
create function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.customers c where c.auth_user_id = auth.uid();
$$;

-- VIP-2, rule 7: personal single-use links. Only the SHA-256 hash is stored.
create table public.vip_access_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  drop_id uuid references public.drops (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now()
);
create index vip_access_links_customer_idx on public.vip_access_links (customer_id);

-- WL-4: one entry per email per design. Counts are "interest", never sales (rule 9).
create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  colour text,
  size text,
  source_utm jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, product_id)
);
create index waitlist_entries_product_idx on public.waitlist_entries (product_id);
create trigger waitlist_entries_updated_at before update on public.waitlist_entries
  for each row execute function public.set_updated_at();

create table public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  variant_id uuid not null references public.variants (id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (customer_id, variant_id)
);

-- ---------------------------------------------------------------------------
-- Shipping (PAY-3)
-- ---------------------------------------------------------------------------
create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- ISO 3166-1 alpha-2 codes. Empty array = rest of world (fallback zone).
  countries text[] not null default '{}',
  sort integer not null default 0
);

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones (id) on delete cascade,
  name text not null,
  currency public.currency_code not null,
  amount_minor bigint not null check (amount_minor >= 0),
  eta_text text not null default '',
  active boolean not null default true,
  sort integer not null default 0
);
create index shipping_rates_zone_idx on public.shipping_rates (zone_id);

-- ---------------------------------------------------------------------------
-- Orders and payments (PAY, INV)
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('XA' || nextval('public.order_number_seq')::text),
  customer_id uuid references public.customers (id) on delete set null,
  email text not null check (email = lower(email)),
  phone text,
  shipping_address jsonb,
  shipping_rate_id uuid references public.shipping_rates (id) on delete set null,
  currency public.currency_code not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  status public.order_status not null default 'pending_payment',
  channel public.order_channel not null default 'public',
  drop_id uuid references public.drops (id) on delete set null,
  provider text,
  provider_ref text,
  utm jsonb,
  tracking_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_check check (total_minor = subtotal_minor + shipping_minor),
  constraint orders_provider_ref_unique unique (provider, provider_ref),   -- rule 3
  constraint orders_paid_at_check check (status in ('pending_payment', 'cancelled') or paid_at is not null)
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.variants (id) on delete set null,
  -- Snapshot at checkout, so later catalogue edits never change an order.
  product_name text not null,
  colour text not null,
  size text not null,
  sku text not null,
  qty integer not null check (qty > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- PAY-4, rule 4: 15-minute holds. Reserve/release functions come in Phase 3.
create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  qty integer not null check (qty > 0),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create index stock_reservations_variant_idx on public.stock_reservations (variant_id) where released_at is null;

-- Every webhook received, valid or not. Idempotency (rule 3): one VALID event
-- per (provider, provider_ref, event_type). Invalid-signature rows are kept for
-- audit but never block the genuine event.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_ref text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  received_at timestamptz not null default now()
);
create unique index payment_events_idempotency_idx
  on public.payment_events (provider, provider_ref, event_type)
  where signature_valid;

-- ---------------------------------------------------------------------------
-- Admin support tables
-- ---------------------------------------------------------------------------
create table public.audit_log (                                    -- ADM-7, CRM-3
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, at desc);

create table public.notes (                                        -- Support notes
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete restrict,
  entity_type text not null check (entity_type in ('customer', 'order')),
  entity_id uuid not null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index notes_entity_idx on public.notes (entity_type, entity_id, created_at desc);

create table public.pages (                                        -- INFO-1, ADM-6
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null default '',                                   -- rich text (Markdown)
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

-- HOME-4: hero, featured drop, announcement bar, WhatsApp number.
-- Readable by everyone: never store secrets here.
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.staff (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

create table public.ad_spend (                                     -- reporting: CAC / ROAS
  id uuid primary key default gen_random_uuid(),
  date date not null,
  channel text not null,
  campaign text,
  currency public.currency_code not null,
  amount_minor bigint not null check (amount_minor >= 0),
  created_at timestamptz not null default now()
);
create index ad_spend_date_idx on public.ad_spend (date);
