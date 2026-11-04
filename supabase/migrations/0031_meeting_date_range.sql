-- Recovery for projects where migration 0029 was already recorded without
-- creating the meeting tables because two local migrations shared version 0029.
create table if not exists public.meeting_tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users (id) on delete cascade,
  meeting_number integer not null unique check (meeting_number >= 1),
  title text not null,
  instructions text,
  scheduled_start date,
  scheduled_end date,
  created_at timestamptz not null default now(),
  constraint meeting_tasks_scheduled_range_check
    check (scheduled_end is null or scheduled_start is null or scheduled_end >= scheduled_start)
);

create table if not exists public.meeting_assignments (
  id uuid primary key default gen_random_uuid(),
  meeting_task_id uuid not null references public.meeting_tasks (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (meeting_task_id, student_id)
);

create table if not exists public.meeting_reports (
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

alter table public.meeting_tasks
  add column if not exists scheduled_start date,
  add column if not exists scheduled_end date;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'meeting_tasks'
      and column_name = 'scheduled_date'
  ) then
    update public.meeting_tasks
    set scheduled_start = scheduled_date,
        scheduled_end = scheduled_date
    where scheduled_date is not null
      and scheduled_start is null;
    alter table public.meeting_tasks drop column scheduled_date;
  end if;
end $$;

alter table public.meeting_tasks
  drop constraint if exists meeting_tasks_scheduled_range_check;

alter table public.meeting_tasks
  add constraint meeting_tasks_scheduled_range_check
  check (scheduled_end is null or scheduled_start is null or scheduled_end >= scheduled_start);

create index if not exists meeting_tasks_number_idx on public.meeting_tasks (meeting_number);
create index if not exists meeting_tasks_created_by_idx on public.meeting_tasks (created_by, created_at desc);
create index if not exists meeting_assignments_mentor_idx on public.meeting_assignments (mentor_id, meeting_task_id);
create index if not exists meeting_assignments_student_idx on public.meeting_assignments (student_id, meeting_task_id);
create index if not exists meeting_reports_mentor_idx on public.meeting_reports (mentor_id, completed_at desc);
create index if not exists meeting_reports_attention_idx on public.meeting_reports (needs_attention, completed_at desc)
  where needs_attention = true;

alter table public.meeting_tasks enable row level security;
alter table public.meeting_assignments enable row level security;
alter table public.meeting_reports enable row level security;

drop policy if exists "meeting_tasks_select_admin_or_assigned_mentor" on public.meeting_tasks;
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
drop policy if exists "meeting_tasks_select_student_assignment" on public.meeting_tasks;
create policy "meeting_tasks_select_student_assignment" on public.meeting_tasks
  for select using (
    exists (
      select 1 from public.meeting_assignments a
      where a.meeting_task_id = meeting_tasks.id and a.student_id = auth.uid()
    )
  );
drop policy if exists "meeting_tasks_insert_admin" on public.meeting_tasks;
create policy "meeting_tasks_insert_admin" on public.meeting_tasks
  for insert with check (public.is_admin() and created_by = auth.uid());
drop policy if exists "meeting_tasks_update_admin" on public.meeting_tasks;
create policy "meeting_tasks_update_admin" on public.meeting_tasks
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "meeting_tasks_delete_admin" on public.meeting_tasks;
create policy "meeting_tasks_delete_admin" on public.meeting_tasks
  for delete using (public.is_admin());

drop policy if exists "meeting_assignments_select_admin_or_mentor" on public.meeting_assignments;
create policy "meeting_assignments_select_admin_or_mentor" on public.meeting_assignments
  for select using (public.is_admin() or mentor_id = auth.uid());
drop policy if exists "meeting_assignments_select_student" on public.meeting_assignments;
create policy "meeting_assignments_select_student" on public.meeting_assignments
  for select using (student_id = auth.uid());
drop policy if exists "meeting_assignments_insert_mentor" on public.meeting_assignments;
create policy "meeting_assignments_insert_mentor" on public.meeting_assignments
  for insert with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = student_id and mentor_id = auth.uid() and role = 'student'
    )
    and exists (select 1 from public.meeting_tasks where id = meeting_task_id)
  );
drop policy if exists "meeting_assignments_delete_admin_or_mentor" on public.meeting_assignments;
create policy "meeting_assignments_delete_admin_or_mentor" on public.meeting_assignments
  for delete using (public.is_admin() or mentor_id = auth.uid());

drop policy if exists "meeting_reports_select_admin_or_mentor" on public.meeting_reports;
create policy "meeting_reports_select_admin_or_mentor" on public.meeting_reports
  for select using (public.is_admin() or mentor_id = auth.uid());
drop policy if exists "meeting_reports_insert_mentor" on public.meeting_reports;
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
drop policy if exists "meeting_reports_update_admin_or_mentor" on public.meeting_reports;
create policy "meeting_reports_update_admin_or_mentor" on public.meeting_reports
  for update using (public.is_admin() or mentor_id = auth.uid())
  with check (public.is_admin() or mentor_id = auth.uid());
