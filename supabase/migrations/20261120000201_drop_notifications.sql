-- Xarina Phase 4: launch notifications (DROP-4, WL-3, VIP-2).
-- pg_cron queues one row per recipient when a drop reaches VIP open (Privé invite)
-- and public open (waitlist launch alert). A second job (see 202) wakes the
-- /api/internal/drop-notifications route, which claims rows and sends via Resend.
-- Idempotent: unique (drop_id, customer_id, kind), so a re-run never double-sends.
-- Consent (rule 12): only customers with drop_alert_consent are queued.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.drop_notifications (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind text not null check (kind in ('vip_invite', 'public_launch')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (drop_id, customer_id, kind)
);
create index drop_notifications_pending_idx on public.drop_notifications (status, created_at)
  where status in ('pending', 'sending');
alter table public.drop_notifications enable row level security;
create policy "drop notifications: staff read" on public.drop_notifications
  for select to authenticated
  using ((select public.is_staff(array['owner', 'manager']::public.staff_role[])));

-- Queue recipients for every drop whose window has opened. Safe to run every minute.
create function private.enqueue_drop_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vip integer;
  v_public integer;
begin
  -- Privé invite at VIP open: approved members who opted in to drop alerts.
  -- Only while the Privé window is open (vip_opens_at < public_opens_at).
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

  -- Launch alert at public open: waitlisters of the drop's designs who opted in.
  -- Looks back two days so a missed run still catches up, but never an old drop.
  insert into public.drop_notifications (drop_id, customer_id, kind)
  select distinct d.id, w.customer_id, 'public_launch'
  from public.drops d
  join public.drop_products dp on dp.drop_id = d.id
  join public.waitlist_entries w on w.product_id = dp.product_id
  join public.customers c on c.id = w.customer_id and c.drop_alert_consent
  where d.published
    and now() >= d.public_opens_at
    and d.public_opens_at > now() - interval '2 days'
    and (d.closes_at is null or now() < d.closes_at)
  on conflict do nothing;
  get diagnostics v_public = row_count;

  return v_vip + v_public;
end;
$$;

-- Claim a batch for the sender (service role). Rows stuck in 'sending' for over
-- ten minutes are retried, up to five attempts.
create function public.claim_drop_notifications(p_limit integer default 50)
returns table (
  id uuid, kind text, drop_id uuid, drop_name text, drop_pitch text,
  vip_opens_at timestamptz, public_opens_at timestamptz,
  customer_id uuid, email text, name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with picked as (
    select n.id
    from public.drop_notifications n
    where n.attempts < 5
      and (n.status = 'pending' or (n.status = 'sending' and n.claimed_at < now() - interval '10 minutes'))
    order by n.created_at
    limit p_limit
    for update skip locked
  ),
  upd as (
    update public.drop_notifications n
    set status = 'sending', attempts = n.attempts + 1, claimed_at = now()
    from picked where n.id = picked.id
    returning n.id, n.kind, n.drop_id, n.customer_id
  )
  select upd.id, upd.kind, d.id, d.name, d.pitch, d.vip_opens_at, d.public_opens_at,
         c.id, c.email, c.name
  from upd
  join public.drops d on d.id = upd.drop_id
  join public.customers c on c.id = upd.customer_id;
end;
$$;

-- p_error null = sent. With p_error, p_retry puts the row back in the queue (up to
-- five attempts, see claim_drop_notifications); otherwise it is final.
create function public.complete_drop_notification(p_id uuid, p_error text default null, p_retry boolean default false)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.drop_notifications
  set status = case
        when p_error is null then 'sent'
        when p_retry and attempts < 5 then 'pending'
        else 'failed' end,
      sent_at = case when p_error is null then now() end,
      error = p_error
  where id = p_id;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.claim_drop_notifications(integer) from public, anon, authenticated;
revoke execute on function public.complete_drop_notification(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_drop_notifications(integer) to service_role;
grant execute on function public.complete_drop_notification(uuid, text, boolean) to service_role;

-- Queue job. The sender job that wakes the Next.js route is in 20261120000202.
select cron.schedule('drop-notifications-enqueue', '* * * * *',
  $$ select private.enqueue_drop_notifications() $$);
