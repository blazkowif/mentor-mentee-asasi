-- Restrict report submission to the authenticated mentor assigned to the meeting
-- and prevent regular users from deleting group-chat messages.

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
  if auth.uid() is null then
    raise exception 'You must be signed in to submit a meeting report.';
  end if;

  select mt.id into task_id
  from public.meeting_tasks mt
  where mt.report_token = p_report_token
    and exists (
      select 1
      from public.meeting_assignments a
      where a.meeting_task_id = mt.id
        and a.mentor_id = auth.uid()
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
      select 1
      from public.meeting_assignments
      where id = (report->>'assignment_id')::uuid
        and meeting_task_id = task_id
        and mentor_id = auth.uid()
    ) then
      raise exception 'A student report does not belong to this mentor or meeting.';
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
      and a.mentor_id = auth.uid()
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
grant execute on function public.save_public_meeting_report(text, text, jsonb) to authenticated;

drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages
  for delete using (
    public.is_admin()
    or (
      group_id is null
      and (sender_id = auth.uid() or receiver_id = auth.uid())
    )
  );
