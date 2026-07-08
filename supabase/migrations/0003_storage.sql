-- Storage bucket for raw CSV uploads. Objects are stored at
-- `{org_id}/{data_source_id}/{filename}` so RLS can scope access by the first
-- path segment without a separate lookup table.

insert into storage.buckets (id, name, public)
values ('raw-uploads', 'raw-uploads', false)
on conflict (id) do nothing;

create policy "raw_uploads_select" on storage.objects
  for select using (
    bucket_id = 'raw-uploads'
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "raw_uploads_insert" on storage.objects
  for insert with check (
    bucket_id = 'raw-uploads'
    and has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'admin', 'analyst']::org_role[])
  );

create policy "raw_uploads_delete" on storage.objects
  for delete using (
    bucket_id = 'raw-uploads'
    and has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'admin']::org_role[])
  );
