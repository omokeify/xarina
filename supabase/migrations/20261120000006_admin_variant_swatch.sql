-- Admin variants accept a swatch colour (colour_hex). Same rules as before:
-- merchandisers may change colour, swatch, size, SKU and order; only owners
-- and managers change stock (re-declared from 20261120000004 with colour_hex).

-- Upsert the product's variants; variants missing from the list are deleted.
-- Items: {id?, colour, colour_hex?, size, sku, sort?, stock_on_hand?, reserved_public_qty?}
-- Merchandisers may change colour/size/sku/sort only.
create or replace function public.admin_save_variants(p_product_id uuid, p_variants jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_item jsonb;
  v_old public.variants;
  v_id uuid;
  v_stock integer;
  v_reserved integer;
  v_keep uuid[] := '{}';
  v_gone record;
begin
  perform private.require_staff(array['owner', 'manager', 'merchandiser']::public.staff_role[]);
  perform private.require_product(p_product_id);
  v_is_admin := public.is_staff(array['owner', 'manager']::public.staff_role[]);

  if jsonb_typeof(p_variants) is distinct from 'array' then
    raise exception 'p_variants must be a JSON array' using errcode = '22023';
  end if;

  -- Lock this product's variants for the rest of the transaction.
  perform 1 from public.variants where product_id = p_product_id for update;

  -- Ids that stay.
  for v_item in select * from jsonb_array_elements(p_variants) loop
    if v_item ? 'id' and v_item->>'id' is not null then
      v_keep := v_keep || (v_item->>'id')::uuid;
    end if;
  end loop;

  -- Delete removed variants first (frees colour/size/sku for re-use).
  for v_gone in
    select v.* from public.variants v
    where v.product_id = p_product_id and not (v.id = any (v_keep))
  loop
    if exists (
      select 1 from public.stock_reservations r
      where r.variant_id = v_gone.id and r.released_at is null and r.expires_at > now()
    ) then
      raise exception 'Variant % has open stock reservations and cannot be removed', v_gone.sku
        using errcode = '55006';
    end if;
    if v_gone.stock_on_hand <> 0 and not v_is_admin then
      raise exception 'Only owners and managers can remove a variant that has stock' using errcode = '42501';
    end if;
    delete from public.variants where id = v_gone.id;
    perform private.audit('variant.delete', 'variant', v_gone.id, to_jsonb(v_gone), null);
  end loop;

  for v_item in select * from jsonb_array_elements(p_variants) loop
    if coalesce(trim(v_item->>'colour'), '') = '' or coalesce(trim(v_item->>'size'), '') = ''
       or coalesce(trim(v_item->>'sku'), '') = '' then
      raise exception 'Each variant needs colour, size and sku' using errcode = '22023';
    end if;

    v_id := nullif(v_item->>'id', '')::uuid;
    if v_id is not null then
      select * into v_old from public.variants where id = v_id and product_id = p_product_id;
      if not found then
        raise exception 'Variant % does not belong to this product', v_id using errcode = '22023';
      end if;
    else
      v_old := null;
    end if;

    v_stock := coalesce((v_item->>'stock_on_hand')::integer, v_old.stock_on_hand, 0);
    v_reserved := coalesce((v_item->>'reserved_public_qty')::integer, v_old.reserved_public_qty, 0);

    if not v_is_admin
       and (v_stock is distinct from coalesce(v_old.stock_on_hand, 0)
            or v_reserved is distinct from coalesce(v_old.reserved_public_qty, 0)) then
      raise exception 'Only owners and managers can change stock' using errcode = '42501';
    end if;
    if v_stock < 0 or v_reserved < 0 then
      raise exception 'Stock cannot be negative' using errcode = '22023';
    end if;
    if v_reserved > v_stock then
      raise exception 'Reserved public quantity cannot exceed stock on hand (%)', v_item->>'sku'
        using errcode = '22023';
    end if;

    if v_id is null then
      insert into public.variants (product_id, colour, colour_hex, size, sku, sort, stock_on_hand, reserved_public_qty)
      values (p_product_id, trim(v_item->>'colour'), nullif(trim(v_item->>'colour_hex'), ''), trim(v_item->>'size'), trim(v_item->>'sku'),
              coalesce((v_item->>'sort')::integer, 0), v_stock, v_reserved)
      returning id into v_id;
      perform private.audit('variant.create', 'variant', v_id, null,
        jsonb_build_object('sku', trim(v_item->>'sku'), 'stock_on_hand', v_stock, 'reserved_public_qty', v_reserved));
    else
      update public.variants set
        colour = trim(v_item->>'colour'),
        -- Absent key keeps the current swatch; "" clears it.
        colour_hex = case when v_item ? 'colour_hex' then nullif(trim(v_item->>'colour_hex'), '') else v_old.colour_hex end,
        size = trim(v_item->>'size'),
        sku = trim(v_item->>'sku'),
        sort = coalesce((v_item->>'sort')::integer, v_old.sort),
        stock_on_hand = v_stock,
        reserved_public_qty = v_reserved
      where id = v_id;
      if v_stock <> v_old.stock_on_hand or v_reserved <> v_old.reserved_public_qty then
        perform private.audit('variant.stock', 'variant', v_id,
          jsonb_build_object('sku', v_old.sku, 'stock_on_hand', v_old.stock_on_hand, 'reserved_public_qty', v_old.reserved_public_qty),
          jsonb_build_object('sku', trim(v_item->>'sku'), 'stock_on_hand', v_stock, 'reserved_public_qty', v_reserved));
      end if;
    end if;
  end loop;

  return public.admin_product(p_product_id);
end;
$$;
