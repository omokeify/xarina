-- Xarina Phase 5: customer database (CRM-1, CRM-2, CRM-3).
-- Plain reads for staff: list with search and filters, one record per customer,
-- and a full export for owners and managers. Waitlist numbers are "interest",
-- never orders or sales (rule 9). Consent is shown with its timestamp (rule 12).

-- Customers matching the search and filters. The one place the filter logic lives.
--   p_search     name, email or phone (substring, case-insensitive; phone by digits)
--   p_vip        true = Privé members only, false = non-members only
--   p_product_id customers on that design's waitlist
--   p_purchased  true = has at least one paid order, false = none
create function private.customer_ids(
  p_search text, p_vip boolean, p_product_id uuid, p_purchased boolean
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select nullif(lower(btrim(p_search)), '') as text,
           nullif(regexp_replace(coalesce(p_search, ''), '\D', '', 'g'), '') as digits
  )
  select c.id
  from public.customers c, q
  where (q.text is null
         or position(q.text in lower(c.email)) > 0
         or position(q.text in lower(coalesce(c.name, ''))) > 0
         or (length(q.digits) >= 3 and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like '%' || q.digits || '%'))
    and (p_vip is null or c.is_vip = p_vip)
    and (p_product_id is null or exists (
          select 1 from public.waitlist_entries w
          where w.customer_id = c.id and w.product_id = p_product_id))
    and (p_purchased is null or p_purchased = exists (
          select 1 from public.orders o
          where (o.customer_id = c.id or o.email = c.email)
            and o.paid_at is not null and o.status <> 'cancelled'));
$$;

-- Paid orders only: an order counts once a verified payment marked it paid
-- (paid_at is set by the webhook function), never a pending or cancelled one.
create function public.admin_customers(
  p_search text default null,
  p_vip boolean default null,
  p_product_id uuid default null,
  p_purchased boolean default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_rows jsonb;
begin
  perform private.require_staff(array['owner', 'manager', 'support']::public.staff_role[]);

  select count(*) into v_total from private.customer_ids(p_search, p_vip, p_product_id, p_purchased);

  select coalesce(jsonb_agg(r order by (r->>'created_at') desc), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'id', c.id,
      'email', c.email,
      'name', c.name,
      'phone', c.phone,
      'is_vip', c.is_vip,
      'created_at', c.created_at,
      'paid_orders', (select count(*) from public.orders o
                      where (o.customer_id = c.id or o.email = c.email)
                        and o.paid_at is not null and o.status <> 'cancelled'),
      -- Waitlist sign-ups are interest, not sales.
      'interest_count', (select count(*) from public.waitlist_entries w where w.customer_id = c.id)
    ) as r
    from public.customers c
    where c.id in (select private.customer_ids(p_search, p_vip, p_product_id, p_purchased))
    order by c.created_at desc, c.id
    limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)
  ) page;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

-- One customer record (CRM-1).
create function public.admin_customer(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.customers;
begin
  perform private.require_staff(array['owner', 'manager', 'support']::public.staff_role[]);
  select * into c from public.customers where id = p_id;
  if not found then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', c.id, 'email', c.email, 'name', c.name, 'phone', c.phone, 'country', c.country,
      'created_at', c.created_at,
      'is_vip', c.is_vip, 'vip_approved_at', c.vip_approved_at, 'prive_requested_at', c.prive_requested_at,
      'all_drops_alerts', c.all_drops_alerts
    ),
    -- Rule 12: each consent on its own, with when and where it was given.
    'consents', jsonb_build_object(
      'marketing', jsonb_build_object(
        'given', c.marketing_consent, 'at', c.marketing_consent_at, 'source', c.marketing_consent_source),
      'drop_alerts', jsonb_build_object(
        'given', c.drop_alert_consent, 'at', c.drop_alert_consent_at, 'source', c.drop_alert_consent_source)
    ),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'number', o.number, 'status', o.status, 'channel', o.channel,
        'currency', o.currency, 'total_minor', o.total_minor, 'paid_at', o.paid_at
      ) order by o.paid_at desc)
      from public.orders o
      where (o.customer_id = c.id or o.email = c.email)
        and o.paid_at is not null and o.status <> 'cancelled'
    ), '[]'::jsonb),
    'waitlist', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', p.id, 'name', p.name, 'slug', p.slug,
        'colour', w.colour, 'size', w.size, 'joined_at', w.created_at
      ) order by w.created_at desc)
      from public.waitlist_entries w join public.products p on p.id = w.product_id
      where w.customer_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Everything the CSV needs, for owners and managers only (CRM-3). The caller
-- writes the audit entry with record_customer_export.
create function public.admin_customers_export(
  p_search text default null,
  p_vip boolean default null,
  p_product_id uuid default null,
  p_purchased boolean default null
)
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
      'email', c.email, 'name', c.name, 'phone', c.phone, 'country', c.country,
      'is_vip', c.is_vip,
      'marketing_consent', c.marketing_consent, 'marketing_consent_at', c.marketing_consent_at,
      'drop_alert_consent', c.drop_alert_consent, 'drop_alert_consent_at', c.drop_alert_consent_at,
      'paid_orders', (select count(*) from public.orders o
                      where (o.customer_id = c.id or o.email = c.email)
                        and o.paid_at is not null and o.status <> 'cancelled'),
      'interest_count', (select count(*) from public.waitlist_entries w where w.customer_id = c.id),
      'created_at', c.created_at
    ) order by c.created_at desc)
    from public.customers c
    where c.id in (select private.customer_ids(p_search, p_vip, p_product_id, p_purchased))
  ), '[]'::jsonb);
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.admin_customers(text, boolean, uuid, boolean, integer, integer) from public, anon;
revoke execute on function public.admin_customer(uuid) from public, anon;
revoke execute on function public.admin_customers_export(text, boolean, uuid, boolean) from public, anon;
grant execute on function public.admin_customers(text, boolean, uuid, boolean, integer, integer) to authenticated, service_role;
grant execute on function public.admin_customer(uuid) to authenticated, service_role;
grant execute on function public.admin_customers_export(text, boolean, uuid, boolean) to authenticated, service_role;
