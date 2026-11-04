-- Structured mentor meeting workflow.
create table public.meeting_tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users (id) on delete cascade,
  meeting_number integer not null unique check (meeting_number >= 1),
  title text not null,
  instructions text,
  scheduled_date date,
  created_at timestamptz not null default now()
);

create table public.meeting_assignments (
  id uuid primary key default gen_random_uuid(),
  meeting_task_id uuid not null references public.meeting_tasks (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (meeting_task_id, student_id)
);

create table public.meeting_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_assignment_id uuid not null unique references public.meeting_assignments (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  overall_summary text not null,
  needs_attention boolean not null default false,
  attention_remark text,
  completed_at timestamptz not null default now(),
  check (needs_attention = false or nullif(trim(attention_remark), '') is not null)
);

create index meeting_tasks_number_idx on public.meeting_tasks (meeting_number);
create index meeting_tasks_created_by_idx on public.meeting_tasks (created_by, created_at desc);
create index meeting_assignments_mentor_idx on public.meeting_assignments (mentor_id, meeting_task_id);
create index meeting_assignments_student_idx on public.meeting_assignments (student_id, meeting_task_id);
create index meeting_reports_mentor_idx on public.meeting_reports (mentor_id, completed_at desc);
create index meeting_reports_attention_idx on public.meeting_reports (needs_attention, completed_at desc)
  where needs_attention = true;

alter table public.meeting_tasks enable row level security;
alter table public.meeting_assignments enable row level security;
alter table public.meeting_reports enable row level security;

create policy "meeting_tasks_select_admin_or_assigned_mentor" on public.meeting_tasks
  for select using (
    public.is_admin()
    or created_by = auth.uid()
    or public.current_user_role() = 'lecturer'
    or exists (
      select 1 from public.meeting_assignments a
      where a.meeting_task_id = meeting_tasks.id and a.student_id = auth.uid()
    )
  );
create policy "meeting_tasks_select_student_assignment" on public.meeting_tasks
  for select using (
    exists (
      select 1 from public.meeting_assignments a
      where a.meeting_task_id = meeting_tasks.id and a.student_id = auth.uid()
    )
  );
create policy "meeting_tasks_insert_admin" on public.meeting_tasks
  for insert with check (public.is_admin() and created_by = auth.uid());
create policy "meeting_tasks_update_admin" on public.meeting_tasks
  for update using (public.is_admin()) with check (public.is_admin());
create policy "meeting_tasks_delete_admin" on public.meeting_tasks
  for delete using (public.is_admin());

create policy "meeting_assignments_select_admin_or_mentor" on public.meeting_assignments
  for select using (public.is_admin() or mentor_id = auth.uid());
create policy "meeting_assignments_select_student" on public.meeting_assignments
  for select using (student_id = auth.uid());
create policy "meeting_assignments_insert_mentor" on public.meeting_assignments
  for insert with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = student_id and mentor_id = auth.uid() and role = 'student'
    )
    and exists (select 1 from public.meeting_tasks where id = meeting_task_id)
  );
create policy "meeting_assignments_delete_admin_or_mentor" on public.meeting_assignments
  for delete using (public.is_admin() or mentor_id = auth.uid());

create policy "meeting_reports_select_admin_or_mentor" on public.meeting_reports
  for select using (public.is_admin() or mentor_id = auth.uid());
create policy "meeting_reports_insert_mentor" on public.meeting_reports
  for insert with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.meeting_assignments a
      where a.id = meeting_assignment_id
        and a.mentor_id = auth.uid()
        and a.student_id = meeting_reports.student_id
    )
  );
create policy "meeting_reports_update_admin_or_mentor" on public.meeting_reports
  for update using (public.is_admin() or mentor_id = auth.uid())
  with check (public.is_admin() or mentor_id = auth.uid());
