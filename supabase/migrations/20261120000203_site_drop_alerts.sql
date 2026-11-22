-- Xarina Phase 4: site-wide drop alerts (footer signup) and a phone on Privé requests.
-- Rule 12: drop-alert and marketing consent stay separate, unticked by default,
-- and each is stored with a timestamp and a source.

-- A subscriber to every drop, not tied to one design's waitlist (WL-1 stays per design).
alter table public.customers
  add column all_drops_alerts boolean not null default false,
  add constraint customers_all_drops_needs_consent check (not all_drops_alerts or drop_alert_consent);

-- Footer signup. Drop-alert consent is the point of the form, so it is required;
-- marketing consent is optional and recorded separately. Service role only.
create function public.join_drop_alerts(
  p_email text, p_drop_alert_consent boolean default false, p_marketing_consent boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not coalesce(p_drop_alert_consent, false) then
    raise exception 'Drop-alert consent is required' using errcode = '22023';
  end if;
  v_id := private.upsert_customer_consent(p_email, null, null, p_marketing_consent, true, 'footer');
  update public.customers set all_drops_alerts = true where id = v_id;
end;
$$;
revoke execute on function public.join_drop_alerts(text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.join_drop_alerts(text, boolean, boolean) to service_role;

-- Launch alerts now also reach site-wide subscribers (still only with consent).
create or replace function private.enqueue_drop_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vip integer;
  v_public integer;
begin
  insert into public.drop_notifications (drop_id, customer_id, kind)
  select d.id, c.id, 'vip_invite'
  from public.drops d
  cross join public.customers c
  where d.published
    and d.vip_opens_at < d.public_opens_at
    and now() >= d.vip_opens_at and now() < d.public_opens_at
    and c.is_vip and c.drop_alert_consent
  on conflict do nothing;
  get diagnostics v_vip = row_count;

  insert into public.drop_notifications (drop_id, customer_id, kind)
  select d.id, r.customer_id, 'public_launch'
  from public.drops d
  cross join lateral (
    select w.customer_id
    from public.drop_products dp
    join public.waitlist_entries w on w.product_id = dp.product_id
    where dp.drop_id = d.id
    union
    select c2.id from public.customers c2 where c2.all_drops_alerts
  ) r
  join public.customers c on c.id = r.customer_id and c.drop_alert_consent
  where d.published
    and now() >= d.public_opens_at
    and d.public_opens_at > now() - interval '2 days'
    and (d.closes_at is null or now() < d.closes_at)
  on conflict do nothing;
  get diagnostics v_public = row_count;

  return v_vip + v_public;
end;
$$;

-- Privé request: add an optional phone (the form now asks for WhatsApp / phone).
drop function public.request_prive_access(text, text, boolean);
create function public.request_prive_access(
  p_email text, p_name text default null, p_drop_alert_consent boolean default false, p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := private.upsert_customer_consent(p_email, p_name, p_phone, false, p_drop_alert_consent, 'prive_request');
  update public.customers set prive_requested_at = coalesce(prive_requested_at, now()) where id = v_id;
end;
$$;
revoke execute on function public.request_prive_access(text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.request_prive_access(text, text, boolean, text) to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
