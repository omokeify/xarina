-- CUR-1/2: exchange-rate pricing on the storefront. Checkout already converts
-- FX-priced designs (public.variant_price_minor), but the storefront price
-- functions only read fixed prices, so an FX design showed no price. Both now
-- use one conversion with exactly the same rounding as checkout, so the price
-- shown is the price charged ("display and charge consistently"). Rule 1:
-- integer minor units throughout.

-- base amount (minor units of p_base) → p_quote, using fx_rates and its rounding step.
create function private.fx_price(p_base public.currency_code, p_base_amount_minor bigint, p_quote text)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rate public.fx_rates%rowtype;
  v_amount numeric;
begin
  if p_base is null or p_base_amount_minor is null then
    return null;
  end if;
  if p_base::text = p_quote then
    return p_base_amount_minor;
  end if;
  select * into v_rate from public.fx_rates r where r.base = p_base and r.quote::text = p_quote;
  if not found then
    return null;   -- no rate set: not sold in that currency
  end if;
  v_amount := round(p_base_amount_minor * v_rate.rate);   -- same as checkout: half up for prices >= 0
  if v_rate.rounding_increment_minor is not null then
    v_amount := round(v_amount / v_rate.rounding_increment_minor) * v_rate.rounding_increment_minor;
  end if;
  return v_amount::bigint;
end;
$$;

-- Design price per currency (cards, listings). Fixed: unchanged. FX: converted.
create or replace function private.product_prices(p_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case p.pricing_mode
    when 'fixed' then (
      select jsonb_build_object(
        'NGN', min(vp.amount_minor) filter (where vp.currency = 'NGN'),
        'GBP', min(vp.amount_minor) filter (where vp.currency = 'GBP'),
        'USD', min(vp.amount_minor) filter (where vp.currency = 'USD'))
      from public.variant_prices vp
      where vp.product_id = p.id)
    else jsonb_build_object(
      'NGN', private.fx_price(p.base_currency, p.base_amount_minor, 'NGN'),
      'GBP', private.fx_price(p.base_currency, p.base_amount_minor, 'GBP'),
      'USD', private.fx_price(p.base_currency, p.base_amount_minor, 'USD'))
  end
  from public.products p
  where p.id = p_product_id;
$$;

-- Price of one variant per currency: fixed = its override, else the design's
-- price (unchanged); FX = the design's converted price (variants share it).
create or replace function private.variant_prices(p_variant_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_object_agg(cur, case p.pricing_mode
    when 'fixed' then coalesce(
      (select vp.amount_minor from public.variant_prices vp
       where vp.variant_id = v.id and vp.currency = cur),
      (select vp.amount_minor from public.variant_prices vp
       where vp.product_id = v.product_id and vp.variant_id is null and vp.currency = cur))
    else private.fx_price(p.base_currency, p.base_amount_minor, cur)
  end)
  from public.variants v
  join public.products p on p.id = v.product_id
  cross join unnest(array['NGN', 'GBP', 'USD']) as cur
  where v.id = p_variant_id;
$$;
