-- admin_product also returns each variant's swatch colour (re-declared from
-- 20261120000004). Media rows already include label/focus/zoom/effect/duration_sec.

-- Everything the product editor needs, including stock and all media.
create or replace function public.admin_product(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  v_is_admin := public.is_staff(array['owner', 'manager']::public.staff_role[]);

  return (
    select jsonb_build_object(
      'product', to_jsonb(p),
      'collection', (select to_jsonb(c) from public.collections c where c.id = p.collection_id),
      'variants', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', v.id, 'colour', v.colour, 'colour_hex', v.colour_hex, 'size', v.size, 'sku', v.sku, 'sort', v.sort,
                 'stock_on_hand', v.stock_on_hand, 'reserved_public_qty', v.reserved_public_qty,
                 'sellable', private.variant_sellable(v.id))
               order by v.sort, v.colour, v.size)
        from public.variants v where v.product_id = p.id
      ), '[]'::jsonb),
      'prices', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'variant_id', vp.variant_id, 'currency', vp.currency, 'amount_minor', vp.amount_minor)
               order by vp.variant_id nulls first, vp.currency)
        from public.variant_prices vp where vp.product_id = p.id
      ), '[]'::jsonb),
      'media', coalesce((
        select jsonb_agg(to_jsonb(m) order by m.sort, m.created_at)
        from public.product_media m where m.product_id = p.id
      ), '[]'::jsonb),
      'measurements', coalesce((
        select jsonb_agg(to_jsonb(ms) order by ms.sort, ms.size)
        from public.measurements ms where ms.product_id = p.id
      ), '[]'::jsonb),
      'drops', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', d.id, 'name', d.name,
                 'state', private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at))
               order by d.public_opens_at)
        from public.drop_products dp join public.drops d on d.id = dp.drop_id
        where dp.product_id = p.id
      ), '[]'::jsonb),
      'can', jsonb_build_object('publish', v_is_admin, 'change_prices', v_is_admin, 'change_stock', v_is_admin)
    )
    from public.products p
    where p.id = p_id
  );
end;
$$;
