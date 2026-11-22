-- Xarina Phase 1: row level security (rule 8, PRD "Security rules (RLS)").
--
-- Model:
--   anon / authenticated  read published catalogue, published drops, pages,
--                          site settings, shipping and FX rates.
--   customers              read only their own row, waitlist entries, restock
--                          requests, orders and order items.
--   staff                  checked with public.is_staff(roles) in every policy.
--   stock, orders, drops,  no client write policies at all: written only by
--   payments               SECURITY DEFINER functions or the service role.

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.staff                enable row level security;
alter table public.collections          enable row level security;
alter table public.products             enable row level security;
alter table public.product_slug_history enable row level security;
alter table public.product_media        enable row level security;
alter table public.variants             enable row level security;
alter table public.variant_prices       enable row level security;
alter table public.fx_rates             enable row level security;
alter table public.measurements         enable row level security;
alter table public.drops                enable row level security;
alter table public.drop_products        enable row level security;
alter table public.customers            enable row level security;
alter table public.vip_access_links     enable row level security;
alter table public.waitlist_entries     enable row level security;
alter table public.restock_requests     enable row level security;
alter table public.shipping_zones       enable row level security;
alter table public.shipping_rates       enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.stock_reservations   enable row level security;
alter table public.payment_events       enable row level security;
alter table public.audit_log            enable row level security;
alter table public.notes                enable row level security;
alter table public.pages                enable row level security;
alter table public.site_settings        enable row level security;
alter table public.ad_spend             enable row level security;

-- Belt and braces: client roles get no write privilege at all on tables that
-- must only change through server functions (rules 2, 3, 4, 8).
revoke insert, update, delete, truncate on
  public.variants, public.drops, public.drop_products,
  public.orders, public.order_items, public.stock_reservations,
  public.payment_events, public.audit_log, public.vip_access_links,
  public.waitlist_entries, public.restock_requests, public.product_slug_history
from anon, authenticated;

-- Helper roles arrays used below.
--   catalogue editors: owner, manager, merchandiser
--   commerce admins:   owner, manager

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create policy "staff: read own row" on public.staff
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy "staff: owner reads all" on public.staff
  for select to authenticated
  using ((select public.is_staff(array['owner']::public.staff_role[])));

create policy "staff: owner inserts" on public.staff
  for insert to authenticated
  with check ((select public.is_staff(array['owner']::public.staff_role[])));

create policy "staff: owner updates" on public.staff
  for update to authenticated
  using ((select public.is_staff(array['owner']::public.staff_role[])))
  with check ((select public.is_staff(array['owner']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- Catalogue: public reads published only; staff read everything.
-- ---------------------------------------------------------------------------
create policy "collections: public read" on public.collections
  for select to anon, authenticated using (true);
create policy "collections: editors write" on public.collections
  for all to authenticated
  using ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])));

create policy "products: public read published" on public.products
  for select to anon, authenticated using (status = 'published');
create policy "products: staff read all" on public.products
  for select to authenticated using ((select public.is_staff()));
-- Merchandisers may edit copy; publishing and prices are blocked by the
-- products_guard_restricted trigger.
create policy "products: editors insert" on public.products
  for insert to authenticated
  with check ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])));
create policy "products: editors update" on public.products
  for update to authenticated
  using ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])));
create policy "products: admins delete" on public.products
  for delete to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])));

-- Needed by the storefront to 301 old slugs (rule 11).
create policy "slug history: public read for published" on public.product_slug_history
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "slug history: staff read" on public.product_slug_history
  for select to authenticated using ((select public.is_staff()));

create policy "media: public read published" on public.product_media
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "media: staff read" on public.product_media
  for select to authenticated using ((select public.is_staff()));
create policy "media: editors write" on public.product_media
  for all to authenticated
  using ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])));

-- Variants hold stock: read-only for clients; written by server functions.
create policy "variants: public read published" on public.variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "variants: staff read" on public.variants
  for select to authenticated using ((select public.is_staff()));

create policy "prices: public read published" on public.variant_prices
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "prices: staff read" on public.variant_prices
  for select to authenticated using ((select public.is_staff()));
create policy "prices: admins write" on public.variant_prices
  for all to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

create policy "fx: public read" on public.fx_rates
  for select to anon, authenticated using (true);
create policy "fx: admins write" on public.fx_rates
  for all to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

create policy "measurements: public read published" on public.measurements
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "measurements: staff read" on public.measurements
  for select to authenticated using ((select public.is_staff()));
create policy "measurements: editors write" on public.measurements
  for all to authenticated
  using ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- Drops: read-only for clients (rule 8).
-- ---------------------------------------------------------------------------
create policy "drops: public read published" on public.drops
  for select to anon, authenticated using (published);
create policy "drops: staff read" on public.drops
  for select to authenticated using ((select public.is_staff()));

create policy "drop products: public read published" on public.drop_products
  for select to anon, authenticated
  using (
    exists (select 1 from public.drops d where d.id = drop_id and d.published)
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
  );
create policy "drop products: staff read" on public.drop_products
  for select to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Customers and their data
-- ---------------------------------------------------------------------------
create policy "customers: read own" on public.customers
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy "customers: staff read" on public.customers
  for select to authenticated
  using ((select public.is_staff(array['owner','manager','support']::public.staff_role[])));
-- VIP approval (VIP-1) and CRM edits.
create policy "customers: admins update" on public.customers
  for update to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

create policy "access links: admins read" on public.vip_access_links
  for select to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])));

create policy "waitlist: read own" on public.waitlist_entries
  for select to authenticated using (customer_id = (select public.current_customer_id()));
create policy "waitlist: staff read" on public.waitlist_entries
  for select to authenticated
  using ((select public.is_staff(array['owner','manager','merchandiser','support']::public.staff_role[])));

create policy "restock: read own" on public.restock_requests
  for select to authenticated using (customer_id = (select public.current_customer_id()));
create policy "restock: staff read" on public.restock_requests
  for select to authenticated
  using ((select public.is_staff(array['owner','manager','support']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- Shipping
-- ---------------------------------------------------------------------------
create policy "zones: public read" on public.shipping_zones
  for select to anon, authenticated using (true);
create policy "zones: admins write" on public.shipping_zones
  for all to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

create policy "rates: public read active" on public.shipping_rates
  for select to anon, authenticated using (active);
create policy "rates: staff read" on public.shipping_rates
  for select to authenticated using ((select public.is_staff()));
create policy "rates: admins write" on public.shipping_rates
  for all to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- Orders: read-only for clients (rules 2, 8).
-- ---------------------------------------------------------------------------
create policy "orders: read own" on public.orders
  for select to authenticated using (customer_id = (select public.current_customer_id()));
create policy "orders: staff read" on public.orders
  for select to authenticated
  using ((select public.is_staff(array['owner','manager','fulfilment','support']::public.staff_role[])));

create policy "order items: read own" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = (select public.current_customer_id())
  ));
create policy "order items: staff read" on public.order_items
  for select to authenticated
  using ((select public.is_staff(array['owner','manager','fulfilment','support']::public.staff_role[])));

create policy "reservations: staff read" on public.stock_reservations
  for select to authenticated
  using ((select public.is_staff(array['owner','manager','fulfilment']::public.staff_role[])));

create policy "payment events: admins read" on public.payment_events
  for select to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- Admin tables
-- ---------------------------------------------------------------------------
-- Written by server functions only; readable by owner and manager.
create policy "audit: admins read" on public.audit_log
  for select to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])));

create policy "notes: read" on public.notes
  for select to authenticated
  using ((select public.is_staff(array['owner','manager','support']::public.staff_role[])));
create policy "notes: add as self" on public.notes
  for insert to authenticated
  with check (
    (select public.is_staff(array['owner','manager','support']::public.staff_role[]))
    and staff_id = (select s.id from public.current_staff() s)
  );

create policy "pages: public read published" on public.pages
  for select to anon, authenticated using (published);
create policy "pages: staff read" on public.pages
  for select to authenticated using ((select public.is_staff()));
create policy "pages: editors write" on public.pages
  for all to authenticated
  using ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[])));

create policy "settings: public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "settings: admins write" on public.site_settings
  for all to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

create policy "ad spend: admins" on public.ad_spend
  for all to authenticated
  using ((select public.is_staff(array['owner','manager']::public.staff_role[])))
  with check ((select public.is_staff(array['owner','manager']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.is_staff(public.staff_role[]) from public;
revoke execute on function public.current_staff() from public;
revoke execute on function public.current_customer_id() from public;
revoke execute on function public.drop_state(uuid) from public;
grant execute on function public.is_staff(public.staff_role[]) to anon, authenticated, service_role;
grant execute on function public.current_staff() to authenticated, service_role;
grant execute on function public.current_customer_id() to authenticated, service_role;
grant execute on function public.drop_state(uuid) to anon, authenticated, service_role;
