-- ============================================================================
-- Storage buckets per PRD §18. Convention: object path starts with the
-- owning user's id (or lecturer_id for group-scoped buckets), e.g.
--   profile/<user_id>/avatar.png
--   submissions/<task_id>/<student_id>/<filename>
-- so policies can check auth.uid() against the path.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile', 'profile', true, 10485760, array['image/jpeg','image/png']),
  ('announcements', 'announcements', false, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('tasks', 'tasks', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png']),
  ('submissions', 'submissions', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png']),
  ('chat', 'chat', false, 10485760, array['application/pdf','image/jpeg','image/png']);

-- profile/ — publicly readable (avatars), owner-only write
create policy "profile_public_read" on storage.objects
  for select using (bucket_id = 'profile');

create policy "profile_owner_write" on storage.objects
  for insert with check (bucket_id = 'profile' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile_owner_update" on storage.objects
  for update using (bucket_id = 'profile' and (storage.foldername(name))[1] = auth.uid()::text);

-- announcements/ & tasks/ — lecturer (owner) writes, mentor-group reads
create policy "announcements_files_read" on storage.objects
  for select using (
    bucket_id = 'announcements'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.current_mentor_id()::text
    )
  );

create policy "announcements_files_write" on storage.objects
  for insert with check (
    bucket_id = 'announcements' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tasks_files_read" on storage.objects
  for select using (
    bucket_id = 'tasks'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.current_mentor_id()::text
    )
  );

create policy "tasks_files_write" on storage.objects
  for insert with check (
    bucket_id = 'tasks' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- submissions/ — student (owner) writes their own, lecturer of the task reads
create policy "submissions_owner_read_write" on storage.objects
  for all using (
    bucket_id = 'submissions'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  )
  with check (
    bucket_id = 'submissions' and (storage.foldername(name))[2] = auth.uid()::text
  );

-- chat/ — either participant in the conversation can read/write; simplest
-- safe rule is owner-uploads-only plus admin, refine once chat UI is built.
create policy "chat_files_owner" on storage.objects
  for all using (
    bucket_id = 'chat'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  )
  with check (
    bucket_id = 'chat' and (storage.foldername(name))[1] = auth.uid()::text
  );
