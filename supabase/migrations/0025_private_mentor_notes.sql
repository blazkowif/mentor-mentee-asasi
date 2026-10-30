-- Private mentor documentation and admin attention escalation.

create type mentor_note_category as enum (
  'general',
  'academic',
  'attendance',
  'welfare',
  'behaviour',
  'financial',
  'follow_up',
  'other'
);

create type attention_severity as enum ('monitor', 'needs_attention', 'urgent');
create type attention_status as enum ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed');

create table public.mentor_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  category mentor_note_category not null default 'general',
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.student_attention_flags (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  severity attention_severity not null,
  reason text not null,
  status attention_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.users (id) on delete set null,
  resolution_note text
);

create table public.admin_follow_up_notes (
  id uuid primary key default gen_random_uuid(),
  attention_flag_id uuid not null references public.student_attention_flags (id) on delete cascade,
  admin_id uuid not null references public.users (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index mentor_notes_student_idx on public.mentor_notes (student_id, created_at desc);
create index mentor_notes_mentor_idx on public.mentor_notes (mentor_id, created_at desc);
create index attention_flags_student_idx on public.student_attention_flags (student_id, created_at desc);
create index attention_flags_status_idx on public.student_attention_flags (status, severity, created_at desc);
create index admin_follow_up_flag_idx on public.admin_follow_up_notes (attention_flag_id, created_at desc);

alter table public.mentor_notes enable row level security;
alter table public.student_attention_flags enable row level security;
alter table public.admin_follow_up_notes enable row level security;

create policy "mentor_notes_select_mentor_or_admin" on public.mentor_notes
  for select using (mentor_id = auth.uid() or public.is_admin());
create policy "mentor_notes_insert_assigned_mentor" on public.mentor_notes
  for insert with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = student_id and mentor_id = auth.uid() and role = 'student'
    )
  );
create policy "mentor_notes_update_owner_or_admin" on public.mentor_notes
  for update using (mentor_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or public.is_admin());

create policy "attention_flags_select_mentor_or_admin" on public.student_attention_flags
  for select using (mentor_id = auth.uid() or public.is_admin());
create policy "attention_flags_insert_assigned_mentor" on public.student_attention_flags
  for insert with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = student_id and mentor_id = auth.uid() and role = 'student'
    )
  );
create policy "attention_flags_update_mentor_or_admin" on public.student_attention_flags
  for update using (mentor_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or public.is_admin());

create policy "admin_follow_up_select_admin_or_mentor" on public.admin_follow_up_notes
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.student_attention_flags f
      where f.id = attention_flag_id and f.mentor_id = auth.uid()
    )
  );
create policy "admin_follow_up_insert_admin" on public.admin_follow_up_notes
  for insert with check (public.is_admin() and admin_id = auth.uid());

create or replace function public.notify_attention_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
  mentor_name text;
begin
  select name into student_name from public.users where id = new.student_id;
  select name into mentor_name from public.users where id = new.mentor_id;

  insert into public.notifications (user_id, title, body)
  select id,
    'Student requires attention',
    coalesce(student_name, 'A student') || ' was marked ' ||
      replace(new.severity::text, '_', ' ') || ' by ' || coalesce(mentor_name, 'a mentor') || '.'
  from public.users
  where role = 'admin';

  return new;
end;
$$;

create trigger trg_notify_attention_flag
after insert on public.student_attention_flags
for each row execute function public.notify_attention_flag();
