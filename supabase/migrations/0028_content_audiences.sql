alter table public.announcements
  add column if not exists target_role user_role,
  add column if not exists target_student_id uuid references public.users (id) on delete cascade;

alter table public.tasks
  add column if not exists target_role user_role,
  add column if not exists target_student_id uuid references public.users (id) on delete cascade;

create index if not exists announcements_target_student_idx
  on public.announcements (target_student_id, created_at desc);
create index if not exists tasks_target_student_idx
  on public.tasks (target_student_id, due_date);

drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements
  for select using (
    public.is_admin()
    or is_global = true
    or lecturer_id = auth.uid()
    or lecturer_id = public.current_mentor_id()
    or target_student_id = auth.uid()
    or (target_role = 'lecturer' and public.current_user_role() = 'lecturer')
  );

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    public.is_admin()
    or lecturer_id = auth.uid()
    or lecturer_id = public.current_mentor_id()
    or target_student_id = auth.uid()
    or (target_role = 'lecturer' and public.current_user_role() = 'lecturer')
  );

create policy "tasks_insert_admin_or_lecturer" on public.tasks
  for insert with check (
    public.is_admin() or lecturer_id = auth.uid()
  );
