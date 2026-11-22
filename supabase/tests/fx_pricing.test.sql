-- CUR-1/2: exchange-rate pricing. The storefront price must equal the price
-- checkout charges (public.variant_price_minor), in integer minor units (rule 1).
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into public.fx_rates (base, quote, rate, rounding_increment_minor) values
  ('NGN', 'GBP', 0.00051, 500),   -- round to the nearest £5
  ('NGN', 'USD', 0.00065, null)
on conflict (base, quote) do update set rate = excluded.rate, rounding_increment_minor = excluded.rounding_increment_minor;

insert into public.products (id, slug, name, status, pricing_mode, base_currency, base_amount_minor) values
  ('f8100000-0000-4000-a000-000000000001', 'fx-design', 'FX Design', 'published', 'fx', 'NGN', 18500000);  -- ₦185,000
insert into public.variants (id, product_id, colour, size, sku, stock_on_hand) values
  ('f8200000-0000-4000-a000-000000000001', 'f8100000-0000-4000-a000-000000000001', 'Ink', 'M', 'FX-INK-M', 3);

select is((private.product_prices('f8100000-0000-4000-a000-000000000001')->>'NGN')::bigint, 18500000::bigint,
  'the base currency shows the base amount');
select is((private.product_prices('f8100000-0000-4000-a000-000000000001')->>'GBP')::bigint,
  public.variant_price_minor('f8200000-0000-4000-a000-000000000001', 'GBP'),
  'storefront GBP price equals the GBP price checkout charges');
select is((private.product_prices('f8100000-0000-4000-a000-000000000001')->>'GBP')::bigint % 500, 0::bigint,
  'the rounding step from Settings is applied');
select is((private.variant_prices('f8200000-0000-4000-a000-000000000001')->>'USD')::bigint,
  public.variant_price_minor('f8200000-0000-4000-a000-000000000001', 'USD'),
  'variant USD price equals the USD price checkout charges');

delete from public.fx_rates where base = 'NGN' and quote = 'USD';
select is(private.product_prices('f8100000-0000-4000-a000-000000000001')->>'USD', null,
  'without a rate the design is simply not priced in that currency');

update public.products set pricing_mode = 'fixed', base_currency = null, base_amount_minor = null
where id = 'f8100000-0000-4000-a000-000000000001';
select is(private.product_prices('f8100000-0000-4000-a000-000000000001')->>'GBP', null,
  'back on fixed pricing, only fixed prices count');

select * from finish();
rollback;
