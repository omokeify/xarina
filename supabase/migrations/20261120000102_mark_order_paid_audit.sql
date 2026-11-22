-- Xarina Phase 3: fix webhook idempotency (rule 3).
-- Before: the event row was stored first, so a delivery that was rejected (amount
-- mismatch, unknown order, no stock) blocked a later correct delivery for the same
-- reference as a "duplicate" and the order could never be paid.
-- Now: only a PROCESSED success is stored under the provider's event type (the
-- idempotency key). Rejected deliveries are kept for audit under a distinct type
-- ("charge.success:mismatch" etc.) and never block a retry.

create or replace function public.mark_order_paid(
  p_provider text,
  p_provider_ref text,
  p_event_type text,
  p_amount_minor bigint,
  p_currency text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  r record;
begin
  if exists (
    select 1 from public.payment_events e
    where e.provider = p_provider and e.provider_ref = p_provider_ref
      and e.event_type = p_event_type and e.signature_valid
  ) then
    return 'duplicate';
  end if;

  select * into v_order from public.orders
  where provider = p_provider and provider_ref = p_provider_ref
  for update;

  if not found then
    insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
    values (p_provider, p_provider_ref, p_event_type || ':unknown_order', p_payload, true)
    on conflict (provider, provider_ref, event_type) where signature_valid do nothing;
    return 'unknown_order';
  end if;

  if v_order.status not in ('pending_payment', 'cancelled') then return 'already_paid'; end if;

  if v_order.total_minor <> p_amount_minor or v_order.currency <> p_currency then
    insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
    values (p_provider, p_provider_ref, p_event_type || ':mismatch', p_payload, true)
    on conflict (provider, provider_ref, event_type) where signature_valid do nothing;
    return 'mismatch';
  end if;

  -- Take the stock. A live hold already guarantees it; a hold that expired (or was
  -- released) before the money arrived may have been sold on, so re-check the
  -- sellable quantity under the row lock. Nothing changes until every line passes.
  for r in
    select s.variant_id, s.qty, (s.released_at is null and s.expires_at > now()) as live
    from public.stock_reservations s
    where s.order_id = v_order.id and s.consumed_at is null
    order by s.variant_id
  loop
    perform 1 from public.variants v where v.id = r.variant_id for update;
    if not r.live and private.variant_sellable(r.variant_id) < r.qty then
      insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
      values (p_provider, p_provider_ref, p_event_type || ':no_stock', p_payload, true)
      on conflict (provider, provider_ref, event_type) where signature_valid do nothing;
      return 'no_stock';
    end if;
  end loop;

  update public.variants v
  set stock_on_hand = v.stock_on_hand - s.qty
  from public.stock_reservations s
  where s.order_id = v_order.id and s.consumed_at is null and v.id = s.variant_id;

  update public.stock_reservations set consumed_at = now(), released_at = now()
  where order_id = v_order.id and consumed_at is null;

  insert into public.payment_events (provider, provider_ref, event_type, payload, signature_valid)
  values (p_provider, p_provider_ref, p_event_type, p_payload, true)
  on conflict (provider, provider_ref, event_type) where signature_valid do nothing;

  update public.orders set status = 'paid', paid_at = now() where id = v_order.id;
  return 'paid';
end;
$$;

revoke all on function public.mark_order_paid(text, text, text, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, text, text, bigint, text, jsonb) to service_role;
