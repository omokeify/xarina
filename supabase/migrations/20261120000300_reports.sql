-- Reporting page (PRD › Reporting page). Sales come only from orders a
-- verified webhook marked paid (rule 2); waitlists are interest, never sales
-- (rule 9). Ad spend (public.ad_spend, from the schema) is entered by hand:
-- attribution is approximate.

-- One call returns everything the page shows for a date range (inclusive, UTC days).
-- Revenue counts orders that reached paid and were not cancelled or refunded.
-- CAC = spend ÷ new paying customers (first paid order in the range);
-- ROAS = revenue ÷ spend. Both are per currency: amounts are never converted.
create function public.admin_report(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := p_from::timestamptz;
  v_to timestamptz := (p_to + 1)::timestamptz;
begin
  perform private.require_staff(array['owner', 'manager']::public.staff_role[]);
  if p_to < p_from then
    raise exception 'The end date is before the start date' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'by_currency', coalesce((
      with paid as (
        select o.currency, o.total_minor, coalesce(o.customer_id::text, o.email) as who
        from public.orders o
        where o.status in ('paid', 'processing', 'dispatched', 'delivered')
          and o.paid_at >= v_from and o.paid_at < v_to
      ),
      first_paid as (
        select coalesce(o.customer_id::text, o.email) as who, min(o.paid_at) as first_at
        from public.orders o
        where o.status in ('paid', 'processing', 'dispatched', 'delivered')
        group by 1
      ),
      spend as (
        select a.currency, sum(a.amount_minor) as spend_minor
        from public.ad_spend a
        where a.date between p_from and p_to
        group by 1
      ),
      currencies as (
        select currency from paid union select currency from spend
      )
      select jsonb_agg(jsonb_build_object(
        'currency', c.currency,
        'orders', (select count(*) from paid p where p.currency = c.currency),
        'revenue_minor', (select coalesce(sum(p.total_minor), 0) from paid p where p.currency = c.currency),
        'new_customers', (
          select count(distinct p.who) from paid p
          join first_paid f on f.who = p.who
          where p.currency = c.currency and f.first_at >= v_from and f.first_at < v_to
        ),
        'spend_minor', coalesce((select s.spend_minor from spend s where s.currency = c.currency), 0)
      ) order by c.currency)
      from currencies c
    ), '[]'::jsonb),

    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'currency', d.currency, 'orders', d.orders, 'revenue_minor', d.revenue)
        order by d.day desc, d.currency)
      from (
        select (o.paid_at at time zone 'UTC')::date as day, o.currency, count(*) as orders, sum(o.total_minor) as revenue
        from public.orders o
        where o.status in ('paid', 'processing', 'dispatched', 'delivered')
          and o.paid_at >= v_from and o.paid_at < v_to
        group by 1, 2
      ) d
    ), '[]'::jsonb),

    'by_drop', coalesce((
      select jsonb_agg(jsonb_build_object('drop', d.drop_name, 'currency', d.currency, 'orders', d.orders, 'revenue_minor', d.revenue)
        order by d.drop_name nulls last, d.currency)
      from (
        select dr.name as drop_name, o.currency, count(*) as orders, sum(o.total_minor) as revenue
        from public.orders o
        left join public.drops dr on dr.id = o.drop_id
        where o.status in ('paid', 'processing', 'dispatched', 'delivered')
          and o.paid_at >= v_from and o.paid_at < v_to
        group by 1, 2
      ) d
    ), '[]'::jsonb),

    -- Rule 9 / WL-5: interest, not sales.
    'interest', coalesce((
      select jsonb_agg(jsonb_build_object('product', i.name, 'slug', i.slug, 'signups', i.signups) order by i.signups desc, i.name)
      from (
        select p.name, p.slug, count(*) as signups
        from public.waitlist_entries w
        join public.products p on p.id = w.product_id
        where w.created_at >= v_from and w.created_at < v_to
        group by p.id, p.name, p.slug
      ) i
    ), '[]'::jsonb),

    'spend', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'date', a.date, 'channel', a.channel, 'campaign', a.campaign,
        'currency', a.currency, 'amount_minor', a.amount_minor)
        order by a.date desc, a.created_at desc)
      from public.ad_spend a
      where a.date between p_from and p_to
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_report(date, date) from public, anon;
grant execute on function public.admin_report(date, date) to authenticated;
