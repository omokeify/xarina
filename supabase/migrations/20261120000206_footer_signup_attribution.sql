-- Xarina Phase 6 follow-up: the footer drop-alert signup keeps the ad campaign.
-- First touch only: the campaign that first brought this customer in is stored
-- once and never overwritten by a later visit.

alter table public.customers add column first_utm jsonb;

-- Same function, one more optional argument (last, so existing callers still work).
drop function public.join_drop_alerts(text, boolean, boolean);
create function public.join_drop_alerts(
  p_email text,
  p_drop_alert_consent boolean default false,
  p_marketing_consent boolean default false,
  p_utm jsonb default null
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
  update public.customers
  set all_drops_alerts = true,
      first_utm = coalesce(first_utm, p_utm)
  where id = v_id;
end;
$$;
revoke execute on function public.join_drop_alerts(text, boolean, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.join_drop_alerts(text, boolean, boolean, jsonb) to service_role;
