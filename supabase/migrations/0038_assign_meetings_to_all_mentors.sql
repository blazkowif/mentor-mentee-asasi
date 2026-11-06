-- Assign a meeting to every existing lecturer and notify each mentor with
-- the shared report link.

create or replace function public.assign_meeting_to_all_mentors(
  p_meeting_task_id uuid,
  p_report_url text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  mentor_record record;
  student_names text;
  assigned_count integer := 0;
  mentor_assigned_count integer;
  message_body text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign meeting reports.';
  end if;
  if nullif(trim(p_report_url), '') is null then
    raise exception 'A report link is required.';
  end if;
  if not exists (select 1 from public.meeting_tasks where id = p_meeting_task_id) then
    raise exception 'The meeting task does not exist.';
  end if;

  for mentor_record in
    select id, name
    from public.users
    where role = 'lecturer'
    order by name
  loop
    insert into public.meeting_assignments (meeting_task_id, mentor_id, student_id)
    select p_meeting_task_id, mentor_record.id, id
    from public.users
    where mentor_id = mentor_record.id and role = 'student'
    on conflict (meeting_task_id, student_id) do update
      set mentor_id = excluded.mentor_id;
    get diagnostics mentor_assigned_count = row_count;
    assigned_count := assigned_count + mentor_assigned_count;

    select string_agg(name, ', ' order by name)
      into student_names
    from public.users
    where mentor_id = mentor_record.id and role = 'student';

    message_body := 'Hello ' || mentor_record.name || ', you are required to do meeting with your student(s) ' ||
      coalesce(student_names, 'assigned students') ||
      ' and complete the reporting form. Report link: ' || trim(p_report_url);

    insert into public.messages (sender_id, receiver_id, message)
    values (auth.uid(), mentor_record.id, message_body);

    insert into public.notifications (user_id, title, body, reference_type, reference_id)
    values (
      mentor_record.id,
      'Meeting report required',
      'Meeting report assigned. Complete the report using the link in your chat.',
      'meeting_task',
      p_meeting_task_id
    );
  end loop;

  return assigned_count;
end;
$$;

revoke all on function public.assign_meeting_to_all_mentors(uuid, text) from public;
grant execute on function public.assign_meeting_to_all_mentors(uuid, text) to authenticated;

create table if not exists public.meeting_report_comments (
  id uuid primary key default gen_random_uuid(),
  meeting_assignment_id uuid not null references public.meeting_assignments (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  comment text not null check (nullif(trim(comment), '') is not null),
  created_at timestamptz not null default now()
);

create index if not exists meeting_report_comments_assignment_idx
  on public.meeting_report_comments (meeting_assignment_id, created_at);

alter table public.meeting_report_comments enable row level security;

drop policy if exists "meeting_report_comments_select" on public.meeting_report_comments;
create policy "meeting_report_comments_select" on public.meeting_report_comments
  for select using (public.is_admin() or mentor_id = auth.uid());

drop policy if exists "meeting_report_comments_insert" on public.meeting_report_comments;
create policy "meeting_report_comments_insert" on public.meeting_report_comments
  for insert with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.meeting_assignments a
      where a.id = meeting_assignment_id and a.mentor_id = auth.uid()
    )
  );

drop policy if exists "meeting_report_comments_update" on public.meeting_report_comments;
create policy "meeting_report_comments_update" on public.meeting_report_comments
  for update using (false);

drop policy if exists "meeting_report_comments_delete" on public.meeting_report_comments;
create policy "meeting_report_comments_delete" on public.meeting_report_comments
  for delete using (false);

create or replace function public.add_meeting_report_comment(
  p_assignment_id uuid,
  p_comment text
)
returns public.meeting_report_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_comment public.meeting_report_comments;
begin
  if auth.uid() is null or nullif(trim(p_comment), '') is null then
    raise exception 'A signed-in mentor and a comment are required.';
  end if;

  insert into public.meeting_report_comments (meeting_assignment_id, mentor_id, comment)
  select p_assignment_id, a.mentor_id, trim(p_comment)
  from public.meeting_assignments a
  where a.id = p_assignment_id and a.mentor_id = auth.uid()
  returning * into inserted_comment;

  if inserted_comment.id is null then
    raise exception 'This meeting assignment does not belong to you.';
  end if;
  return inserted_comment;
end;
$$;

revoke all on function public.add_meeting_report_comment(uuid, text) from public;
grant execute on function public.add_meeting_report_comment(uuid, text) to authenticated;
