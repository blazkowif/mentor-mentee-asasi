-- Meeting tasks are assigned to every mentor when created. Reports support
-- saving a draft and explicitly submitting it to administrators.

alter table public.meeting_reports
  add column if not exists is_submitted boolean not null default false;

update public.meeting_reports
set is_submitted = true
where is_submitted = false;

create or replace function public.save_public_meeting_report(
  p_report_token text,
  p_overall_summary text,
  p_student_reports jsonb,
  p_submit boolean default false
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
  if auth.uid() is null then
    raise exception 'You must be signed in to save a meeting report.';
  end if;
  select mt.id into task_id
  from public.meeting_tasks mt
  where mt.report_token = p_report_token
    and exists (
      select 1 from public.meeting_assignments a
      where a.meeting_task_id = mt.id and a.mentor_id = auth.uid()
    );
  if task_id is null then
    raise exception 'This meeting report is not assigned to the current mentor.';
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
      where id = (report->>'assignment_id')::uuid
        and meeting_task_id = task_id and mentor_id = auth.uid()
    ) then
      raise exception 'A student report does not belong to this mentor or meeting.';
    end if;

    insert into public.meeting_reports (
      meeting_assignment_id, mentor_id, student_id, overall_summary,
      student_comment, needs_attention, attention_remark, completed_at, is_submitted
    )
    select a.id, a.mentor_id, a.student_id, trim(p_overall_summary),
      coalesce(report->>'student_comment', ''),
      coalesce((report->>'needs_attention')::boolean, false),
      nullif(trim(report->>'attention_remark'), ''),
      now(), p_submit
    from public.meeting_assignments a
    where a.id = (report->>'assignment_id')::uuid and a.mentor_id = auth.uid()
    on conflict (meeting_assignment_id) do update set
      overall_summary = excluded.overall_summary,
      student_comment = excluded.student_comment,
      needs_attention = excluded.needs_attention,
      attention_remark = excluded.attention_remark,
      completed_at = excluded.completed_at,
      is_submitted = case
        when public.meeting_reports.is_submitted then true
        else excluded.is_submitted
      end;
  end loop;
end;
$$;

revoke all on function public.save_public_meeting_report(text, text, jsonb) from public;
revoke all on function public.save_public_meeting_report(text, text, jsonb, boolean) from public;
grant execute on function public.save_public_meeting_report(text, text, jsonb, boolean) to authenticated;

create or replace function public.auto_assign_new_meeting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assign_meeting_to_all_mentors(
    new.id,
    '/meeting-report/' || new.report_token
  );
  return new;
end;
$$;

drop trigger if exists trg_auto_assign_new_meeting on public.meeting_tasks;
create trigger trg_auto_assign_new_meeting
after insert on public.meeting_tasks
for each row execute function public.auto_assign_new_meeting();

create or replace function public.search_chat_users(p_query text)
returns table (
  id uuid, role user_role, matric_number text, name text,
  programme text, profile_image text
)
language sql stable security definer set search_path = public
as $$
  select u.id, u.role, u.matric_number, u.name, u.programme, u.profile_image
  from public.users u
  where auth.uid() is not null and u.id <> auth.uid()
    and (nullif(trim(p_query), '') is null
      or u.name ilike '%' || trim(p_query) || '%'
      or coalesce(u.matric_number, '') ilike '%' || trim(p_query) || '%')
  order by u.name
  limit 50;
$$;

grant execute on function public.search_chat_users(text) to authenticated;

create or replace function public.list_mentor_group_members(p_group_id uuid)
returns table (
  id uuid, name text, role user_role, matric_number text, programme text,
  email text, phone text, address text, motto text, profile_image text
)
language sql stable security definer set search_path = public
as $$
  select u.id, u.name, u.role, u.matric_number, u.programme, u.email,
    u.phone, u.address, u.motto, u.profile_image
  from public.users u
  join public.mentor_group_memberships m on m.student_id = u.id
  where m.group_id = p_group_id
    and (m.ended_at is null or exists (
      select 1 from public.mentor_groups g where g.id = p_group_id and g.lecturer_id = auth.uid()
    ))
    and exists (
      select 1 from public.mentor_groups g
      where g.id = p_group_id
        and (g.lecturer_id = auth.uid() or m.student_id = auth.uid())
    )
  order by u.name;
$$;

grant execute on function public.list_mentor_group_members(uuid) to authenticated;

drop function if exists public.get_public_meeting_report(text);
create function public.get_public_meeting_report(p_report_token text)
returns table (
  meeting_task_id uuid, meeting_number integer, title text, instructions text,
  scheduled_start date, scheduled_end date, mentor_id uuid, mentor_name text,
  assignment_id uuid, student_id uuid, student_name text, overall_summary text,
  student_comment text, needs_attention boolean, attention_remark text,
  is_submitted boolean
)
language sql security definer set search_path = public
as $$
  select mt.id, mt.meeting_number, mt.title, mt.instructions,
    mt.scheduled_start, mt.scheduled_end, mentor.id, mentor.name,
    a.id, student.id, student.name, coalesce(r.overall_summary, ''),
    coalesce(r.student_comment, ''), coalesce(r.needs_attention, false),
    r.attention_remark, coalesce(r.is_submitted, false)
  from public.meeting_tasks mt
  join public.meeting_assignments a on a.meeting_task_id = mt.id
  join public.users mentor on mentor.id = a.mentor_id
  join public.users student on student.id = a.student_id
  left join public.meeting_reports r on r.meeting_assignment_id = a.id
  where mt.report_token = p_report_token and mentor.id = auth.uid()
  order by student.name;
$$;

revoke all on function public.get_public_meeting_report(text) from public;
grant execute on function public.get_public_meeting_report(text) to authenticated;
