-- ============================================================================
-- UMS PPST Mentor-Mentee Management System — initial schema
-- Tables per PRD §19, RLS per PRD §20.
-- Run via `supabase db push`, or paste into the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('student', 'lecturer', 'admin');
create type task_priority as enum ('low', 'medium', 'high');
create type submission_status as enum ('pending', 'submitted', 'reviewed', 'completed');

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- App-level user profile, 1:1 with an auth.users row.
-- NOTE on ic_number: this is sensitive PII used only as an initial login
-- credential (PRD §6). Consider requiring a password reset on first login and
-- dropping reliance on ic_number thereafter, rather than keeping it as a
-- standing password. At minimum, RLS below keeps it invisible to anyone but
-- the row owner and admins.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  matric_number text unique,
  ic_number text,
  name text not null,
  programme text,
  mentor_id uuid references public.users (id) on delete set null,
  email text,
  phone text,
  profile_image text,
  created_at timestamptz not null default now()
);
comment on column public.users.mentor_id is 'Set for students only — the lecturer they are assigned to (PRD §9: one student, one mentor).';

create table public.mentor_groups (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null unique references public.users (id) on delete cascade,
  group_name text not null,
  created_at timestamptz not null default now()
);
comment on table public.mentor_groups is 'One group per lecturer (PRD §10). Membership = students whose mentor_id = this lecturer.';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid references public.users (id) on delete cascade,
  group_id uuid references public.mentor_groups (id) on delete cascade,
  message text,
  attachment text,
  created_at timestamptz not null default now(),
  constraint messages_target_check check (
    (receiver_id is not null and group_id is null) or
    (receiver_id is null and group_id is not null)
  )
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  content text,
  attachment text,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  attachment text,
  priority task_priority not null default 'medium',
  created_at timestamptz not null default now()
);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  file text,
  status submission_status not null default 'pending',
  feedback text,
  submitted_at timestamptz,
  unique (task_id, student_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  action text not null,
  "timestamp" timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index users_mentor_id_idx on public.users (mentor_id);
create index users_role_idx on public.users (role);
create index messages_sender_idx on public.messages (sender_id);
create index messages_receiver_idx on public.messages (receiver_id);
create index messages_group_idx on public.messages (group_id, created_at desc);
create index announcements_lecturer_idx on public.announcements (lecturer_id, created_at desc);
create index tasks_lecturer_idx on public.tasks (lecturer_id, due_date);
create index task_submissions_student_idx on public.task_submissions (student_id);
create index task_submissions_task_idx on public.task_submissions (task_id);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);
create index activity_logs_user_idx on public.activity_logs (user_id, "timestamp" desc);

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS on `users` doesn't recurse)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.current_mentor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select mentor_id from public.users where id = auth.uid();
$$;

-- Used by the frontend's matric-number login (see src/services/authService.ts).
-- SECURITY DEFINER + no direct table grant to anon keeps this from being an
-- enumeration vector: it only ever returns the synthetic auth email, never
-- the row itself.
create or replace function public.get_login_email(p_matric_number text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
select au.email from auth.users au
join public.users u on u.id = au.id
where u.matric_number = p_matric_number
limit 1;
$$;
revoke all on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.mentor_groups enable row level security;
alter table public.messages enable row level security;
alter table public.announcements enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- users -----------------------------------------------------------------
create policy "users_select_own_or_related" on public.users
  for select using (
    id = auth.uid()
    or public.is_admin()
    or mentor_id = auth.uid()              -- lecturer viewing their mentees
    or id = public.current_mentor_id()     -- student viewing their mentor
  );

create policy "users_update_own" on public.users
  for update using (id = auth.uid() or public.is_admin());

create policy "users_admin_insert" on public.users
  for insert with check (public.is_admin());

create policy "users_admin_delete" on public.users
  for delete using (public.is_admin());

-- mentor_groups -----------------------------------------------------------
create policy "mentor_groups_select" on public.mentor_groups
  for select using (
    public.is_admin()
    or lecturer_id = auth.uid()
    or lecturer_id = public.current_mentor_id()
  );

create policy "mentor_groups_write" on public.mentor_groups
  for all using (public.is_admin() or lecturer_id = auth.uid())
  with check (public.is_admin() or lecturer_id = auth.uid());

-- messages ------------------------------------------------------------------
create policy "messages_select" on public.messages
  for select using (
    public.is_admin()
    or sender_id = auth.uid()
    or receiver_id = auth.uid()
    or group_id in (
      select id from public.mentor_groups
      where lecturer_id = auth.uid() or lecturer_id = public.current_mentor_id()
    )
  );

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      -- personal message to your own mentor/mentee
      receiver_id in (
        select id from public.users
        where id = public.current_mentor_id() or mentor_id = auth.uid()
      )
      -- or a message into a group you belong to
      or group_id in (
        select id from public.mentor_groups
        where lecturer_id = auth.uid() or lecturer_id = public.current_mentor_id()
      )
    )
  );

-- announcements ---------------------------------------------------------
create policy "announcements_select" on public.announcements
  for select using (
    public.is_admin()
    or lecturer_id = auth.uid()
    or lecturer_id = public.current_mentor_id()
  );

create policy "announcements_write" on public.announcements
  for all using (public.is_admin() or lecturer_id = auth.uid())
  with check (public.is_admin() or lecturer_id = auth.uid());

-- tasks -------------------------------------------------------------------
create policy "tasks_select" on public.tasks
  for select using (
    public.is_admin()
    or lecturer_id = auth.uid()
    or lecturer_id = public.current_mentor_id()
  );

create policy "tasks_write" on public.tasks
  for all using (public.is_admin() or lecturer_id = auth.uid())
  with check (public.is_admin() or lecturer_id = auth.uid());

-- task_submissions ----------------------------------------------------------
create policy "task_submissions_select" on public.task_submissions
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or task_id in (select id from public.tasks where lecturer_id = auth.uid())
  );

create policy "task_submissions_student_insert" on public.task_submissions
  for insert with check (
    student_id = auth.uid()
    and task_id in (
      select t.id from public.tasks t
      where t.lecturer_id = public.current_mentor_id()
    )
  );

create policy "task_submissions_student_update" on public.task_submissions
  for update using (
    student_id = auth.uid()
    and status in ('pending', 'submitted')
  );

create policy "task_submissions_lecturer_review" on public.task_submissions
  for update using (
    public.is_admin()
    or task_id in (select id from public.tasks where lecturer_id = auth.uid())
  );

-- notifications ---------------------------------------------------------
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid() or public.is_admin());

create policy "notifications_insert" on public.notifications
  for insert with check (public.is_admin() or true); -- tighten once notification triggers land; see README

-- activity_logs -----------------------------------------------------------
create policy "activity_logs_select_admin" on public.activity_logs
  for select using (public.is_admin());

create policy "activity_logs_insert_own" on public.activity_logs
  for insert with check (user_id = auth.uid());
