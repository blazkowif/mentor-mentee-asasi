update storage.buckets
set public = true
where id = 'announcements';

drop policy if exists "announcements_public_read" on storage.objects;
create policy "announcements_public_read"
  on storage.objects
  for select
  using (bucket_id = 'announcements');
