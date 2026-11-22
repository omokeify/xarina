-- Xarina Phase 1: product media bucket (ADM-2).
-- Public bucket: anyone can fetch files by public URL. Only catalogue editors
-- (owner, manager, merchandiser) can upload, change or delete.

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

create policy "product-media: staff list" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-media' and (select public.is_staff()));

create policy "product-media: editors upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-media'
    and (select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[]))
  );

create policy "product-media: editors update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-media'
    and (select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[]))
  )
  with check (
    bucket_id = 'product-media'
    and (select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[]))
  );

create policy "product-media: editors delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-media'
    and (select public.is_staff(array['owner','manager','merchandiser']::public.staff_role[]))
  );
