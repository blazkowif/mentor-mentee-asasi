alter table public.meeting_tasks
  add column if not exists report_token text;

update public.meeting_tasks
set report_token = md5(gen_random_uuid()::text || clock_timestamp()::text || id::text)
where report_token is null;

alter table public.meeting_tasks
  alter column report_token set not null;

create unique index if not exists meeting_tasks_report_token_idx
  on public.meeting_tasks (report_token);

alter table public.meeting_reports
  add column if not exists student_comment text not null default '';

create or replace function public.assign_meeting_to_mentor(
  p_meeting_task_id uuid,
  p_mentor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  mentor_name text;
  student_names text;
  assigned_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign meeting reports.';
  end if;

  select name into mentor_name
  from public.users
  where id = p_mentor_id and role = 'lecturer';
  if mentor_name is null then
    raise exception 'The selected mentor does not exist.';
  end if;

  if not exists (select 1 from public.meeting_tasks where id = p_meeting_task_id) then
    raise exception 'The meeting task does not exist.';
  end if;

  insert into public.meeting_assignments (meeting_task_id, mentor_id, student_id)
  select p_meeting_task_id, p_mentor_id, id
  from public.users
  where mentor_id = p_mentor_id and role = 'student'
  on conflict (meeting_task_id, student_id) do update
    set mentor_id = excluded.mentor_id;

  get diagnostics assigned_count = row_count;

  select string_agg(name, ', ' order by name)
  into student_names
  from public.users
  where mentor_id = p_mentor_id and role = 'student';

  insert into public.messages (sender_id, receiver_id, message)
  values (
    auth.uid(),
    p_mentor_id,
    'Hi ' || mentor_name || ', you are required to do meeting with your student and complete the reporting form for ' ||
    coalesce(student_names, 'your assigned students') || '.'
  );

  return assigned_count;
end;
$$;

revoke all on function public.assign_meeting_to_mentor(uuid, uuid) from public;
grant execute on function public.assign_meeting_to_mentor(uuid, uuid) to authenticated;

create or replace function public.get_public_meeting_report(p_report_token text)
returns table (
  meeting_task_id uuid,
  meeting_number integer,
  title text,
  instructions text,
  scheduled_start date,
  scheduled_end date,
  mentor_id uuid,
  mentor_name text,
  assignment_id uuid,
  student_id uuid,
  student_name text,
  overall_summary text,
  student_comment text,
  needs_attention boolean,
  attention_remark text
)
language sql
security definer
set search_path = public
as $$
  select mt.id, mt.meeting_number, mt.title, mt.instructions, mt.scheduled_start,
    mt.scheduled_end, mentor.id, mentor.name, a.id, student.id, student.name,
    coalesce(r.overall_summary, ''), coalesce(r.student_comment, ''),
    coalesce(r.needs_attention, false), r.attention_remark
  from public.meeting_tasks mt
  join public.meeting_assignments a on a.meeting_task_id = mt.id
  join public.users mentor on mentor.id = a.mentor_id
  join public.users student on student.id = a.student_id
  left join public.meeting_reports r on r.meeting_assignment_id = a.id
  where mt.report_token = p_report_token
  order by student.name;
$$;

revoke all on function public.get_public_meeting_report(text) from public;
grant execute on function public.get_public_meeting_report(text) to anon, authenticated;

create or replace function public.save_public_meeting_report(
  p_report_token text,
  p_overall_summary text,
  p_student_reports jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  task_id uuid;
  report jsonb;
begin
  select id into task_id from public.meeting_tasks where report_token = p_report_token;
  if task_id is null then
    raise exception 'This meeting report link is invalid.';
  end if;
  if nullif(trim(p_overall_summary), '') is null then
    raise exception 'An overall meeting summary is required.';
  end if;
  if jsonb_typeof(p_student_reports) <> 'array' then
    raise exception 'Student reports must be a list.';
  end if;

  for report in select value from jsonb_array_elements(p_student_reports)
  loop
    if not exists (
      select 1 from public.meeting_assignments
      where id = (report->>'assignment_id')::uuid and meeting_task_id = task_id
    ) then
      raise exception 'A student report does not belong to this meeting.';
    end if;

    insert into public.meeting_reports (
      meeting_assignment_id, mentor_id, student_id, overall_summary,
      student_comment, needs_attention, attention_remark, completed_at
    )
    select a.id, a.mentor_id, a.student_id, trim(p_overall_summary),
      coalesce(report->>'student_comment', ''),
      coalesce((report->>'needs_attention')::boolean, false),
      nullif(trim(report->>'attention_remark'), ''),
      now()
    from public.meeting_assignments a
    where a.id = (report->>'assignment_id')::uuid
    on conflict (meeting_assignment_id) do update set
      overall_summary = excluded.overall_summary,
      student_comment = excluded.student_comment,
      needs_attention = excluded.needs_attention,
      attention_remark = excluded.attention_remark,
      completed_at = excluded.completed_at;
  end loop;
end;
$$;

revoke all on function public.save_public_meeting_report(text, text, jsonb) from public;
grant execute on function public.save_public_meeting_report(text, text, jsonb) to anon, authenticated;
