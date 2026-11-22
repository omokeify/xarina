-- Xarina Phase 6: Privé membership hardening.
-- 1. Access links can be revoked individually, not only by revoking the member.
-- 2. The staff roster shows the request phone and who approved the member.

-- A revoked link stays in the table for the audit trail, but can never be spent.
alter table public.vip_access_links add column revoked_at timestamptz;

-- Replace the redemption function so it also refuses revoked links. The signature
-- is unchanged, so the service_role grant from the original migration stands.
create or replace function public.redeem_access_link(p_link_hash text, p_session_hash text)
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
  where l.token_hash = p_link_hash and l.used_at is null and l.revoked_at is null
    and l.expires_at > now()
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

-- Staff revoke an unused link. Used, expired and already-revoked links are a
-- no-op; a session already created from the link is unaffected by design.
create function public.admin_revoke_access_link(p_link_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  update public.vip_access_links
  set revoked_at = now()
  where id = p_link_id and revoked_at is null and used_at is null and expires_at > now()
  returning customer_id into v_customer_id;

  if v_customer_id is null then
    return false;
  end if;

  perform private.audit('vip.link_revoke', 'customer', v_customer_id, null,
    jsonb_build_object('link_id', p_link_id));
  return true;
end;
$$;
revoke all on function public.admin_revoke_access_link(uuid) from public, anon;
grant execute on function public.admin_revoke_access_link(uuid) to authenticated;

-- Add the request phone and the approving staff member to the roster. Keep the
-- original keys so existing parsing and e2e checks continue to work.
create or replace function public.admin_prive_members()
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
      'drop_alert_consent', c.drop_alert_consent,
      'phone', c.phone,
      'vip_approved_by', c.vip_approved_by,
      'approved_by_name', (select s.name from public.staff s where s.id = c.vip_approved_by)
    ) order by c.is_vip, c.prive_requested_at desc nulls last, c.email)
    from public.customers c
    where c.is_vip or c.prive_requested_at is not null
  ), '[]'::jsonb);
end;
$$;
