-- Xarina Phase 4: Privé access requests (VIP-1) and the sender job wiring.

-- A visitor asks to join Privé from /prive. Staff see requests and approve them
-- (VIP-1); nothing is granted by asking.
alter table public.customers add column prive_requested_at timestamptz;

create function public.request_prive_access(
  p_email text, p_name text default null, p_drop_alert_consent boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := private.upsert_customer_consent(p_email, p_name, null, false, p_drop_alert_consent, 'prive_request');
  update public.customers set prive_requested_at = coalesce(prive_requested_at, now()) where id = v_id;
end;
$$;
revoke execute on function public.request_prive_access(text, text, boolean) from public, anon, authenticated;
grant execute on function public.request_prive_access(text, text, boolean) to service_role;

-- Staff list for the Privé admin page: members and pending requests.
create function public.admin_prive_members()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'email', c.email, 'name', c.name, 'is_vip', c.is_vip,
      'vip_approved_at', c.vip_approved_at, 'requested_at', c.prive_requested_at,
      'drop_alert_consent', c.drop_alert_consent
    ) order by c.is_vip, c.prive_requested_at desc nulls last, c.email)
    from public.customers c
    where c.is_vip or c.prive_requested_at is not null
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_prive_members() from public, anon;
grant execute on function public.admin_prive_members() to authenticated, service_role;

-- The sender is a Next.js route (it shares the React Email templates and the
-- Resend client with the other emails), not an Edge Function. The job calls it
-- once Vault holds `site_url` and `cron_secret`; until then it does nothing.
select cron.schedule('drop-notifications-send', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'site_url') || '/api/internal/drop-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb)
  where exists (select 1 from public.drop_notifications where status in ('pending', 'sending'))
    and exists (select 1 from vault.decrypted_secrets where name = 'site_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
$$);
