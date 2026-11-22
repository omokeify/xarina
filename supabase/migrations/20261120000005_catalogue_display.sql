-- Xarina: product page parity with the concept (PDP-2, PDP-3).
-- Tagline, colour swatches, gallery view metadata, and exact available units
-- for Available Now designs.
--
-- Stock exposure (user decision, 2026-11-21): the product page shows exact
-- purchasable units ONLY for designs that are not in an open drop. Drop designs
-- (upcoming, Privé window, public drop) keep stock hidden: available_qty is null.
-- The number is the same one checkout enforces (private.variant_sellable:
-- stock_on_hand minus live holds). Raw stock_on_hand and reserved_public_qty
-- still never leave the database.

alter table public.products
  add column tagline text not null default '';

alter table public.variants
  add column colour_hex text check (colour_hex ~ '^#[0-9A-Fa-f]{6}$');

-- Shoppers may read the swatch colour (column grant, like the other identity columns).
grant select (colour_hex) on public.variants to anon, authenticated;

alter table public.product_media
  add column label text not null default '',
  -- CSS object-position, e.g. '50% 56%'.
  add column focus text check (focus ~ '^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$'),
  add column zoom numeric(3, 2) not null default 1 check (zoom between 1 and 3),
  -- 'pan' = a still image shown as a slow movement view (concept "movement reel").
  add column effect text not null default 'none' check (effect in ('none', 'pan')),
  add column duration_sec integer check (duration_sec between 1 and 600),
  add constraint product_media_pan_image check (effect = 'none' or type = 'image');

-- ---------------------------------------------------------------------------
-- storefront_product: same contract as before, plus the new fields.
-- ---------------------------------------------------------------------------
create or replace function public.storefront_product(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_pd record;
  v_redirect text;
  v_show_qty boolean;
begin
  select * into v_product from public.products where slug = p_slug and status = 'published';

  if not found then
    select p.slug into v_redirect
    from public.product_slug_history h
    join public.products p on p.id = h.product_id
    where h.old_slug = p_slug and p.status = 'published';
    if v_redirect is not null then
      return jsonb_build_object('redirect', v_redirect);
    end if;
    return null;
  end if;

  select * into v_pd from private.product_drop(v_product.id);
  if v_pd.hidden then
    return null;
  end if;
  -- Exact units only for Available Now designs (no open drop).
  v_show_qty := v_pd.drop_id is null;

  return jsonb_build_object(
    'product', jsonb_build_object(
      'id', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'tagline', v_product.tagline,
      'description', v_product.description,
      'fabric', v_product.fabric,
      'care', v_product.care,
      'fit_notes', v_product.fit_notes,
      'delivery_timing', v_product.delivery_timing,
      'pricing_mode', v_product.pricing_mode,
      'collection', (
        select jsonb_build_object('slug', c.slug, 'name', c.name)
        from public.collections c where c.id = v_product.collection_id
      )
    ),
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'type', m.type, 'storage_path', m.storage_path,
               'mux_playback_id', m.mux_playback_id, 'alt', m.alt,
               'label', m.label, 'focus', m.focus, 'zoom', m.zoom,
               'effect', m.effect, 'duration_sec', m.duration_sec)
             order by m.sort, m.created_at)
      from public.product_media m
      where m.product_id = v_product.id and m.status = 'ready'
    ), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'colour', v.colour, 'colour_hex', v.colour_hex,
               'size', v.size, 'sku', v.sku,
               'available', private.variant_sellable(v.id) > 0,
               'available_qty', case when v_show_qty then greatest(private.variant_sellable(v.id), 0) end,
               'prices', private.variant_prices(v.id))
             order by v.sort, v.colour, v.size)
      from public.variants v
      where v.product_id = v_product.id
    ), '[]'::jsonb),
    'measurements', coalesce((
      select jsonb_agg(jsonb_build_object(
               'size', ms.size, 'bust_cm', ms.bust_cm, 'waist_cm', ms.waist_cm,
               'hip_cm', ms.hip_cm, 'length_cm', ms.length_cm)
             order by ms.sort, ms.size)
      from public.measurements ms
      where ms.product_id = v_product.id
    ), '[]'::jsonb),
    'prices', private.product_prices(v_product.id),
    'drop', (
      select jsonb_build_object(
        -- drops.slug comes from 20261120000204_drop_pages (plpgsql resolves it at run time).
        'id', d.id, 'slug', d.slug, 'name', d.name, 'pitch', d.pitch,
        'state', private.drop_state_of(d.vip_opens_at, d.public_opens_at, d.closes_at),
        'vip_opens_at', d.vip_opens_at, 'public_opens_at', d.public_opens_at,
        'closes_at', d.closes_at, 'on_close', d.on_close,
        'vip_limit_per_member', d.vip_limit_per_member)
      from public.drops d where d.id = v_pd.drop_id
    ),
    'server_now', now()
  );
end;
$$;
