-- One-time clean slate for the admin dashboard.
-- Deletes all non-admin accounts and all application data while preserving
-- every administrator profile and its auth account.

do $$
declare
  non_admin_ids uuid[];
begin
  select coalesce(array_agg(id), '{}'::uuid[])
  into non_admin_ids
  from public.users
  where role <> 'admin';

  -- Clear dependent and shared data first, including records authored by an
  -- administrator, so the database is ready for a fresh Excel import.
  if to_regclass('public.admin_follow_up_notes') is not null then
    delete from public.admin_follow_up_notes;
  end if;
  if to_regclass('public.meeting_reports') is not null then
    delete from public.meeting_reports;
  end if;
  if to_regclass('public.meeting_assignments') is not null then
    delete from public.meeting_assignments;
  end if;
  if to_regclass('public.mentor_group_memberships') is not null then
    delete from public.mentor_group_memberships;
  end if;
  if to_regclass('public.internal_staff_notes') is not null then
    delete from public.internal_staff_notes;
  end if;
  if to_regclass('public.mentor_notes') is not null then
    delete from public.mentor_notes;
  end if;
  if to_regclass('public.student_attention_flags') is not null then
    delete from public.student_attention_flags;
  end if;
  delete from public.messages;
  delete from public.chat_read_states;
  delete from public.notifications;
  delete from public.activity_logs;
  delete from public.task_submissions;
  delete from public.tasks;
  delete from public.announcements;
  if to_regclass('public.meeting_tasks') is not null then
    delete from public.meeting_tasks;
  end if;
  delete from public.mentor_groups;

  if cardinality(non_admin_ids) > 0 then
    delete from auth.users
    where id = any(non_admin_ids);
  end if;
end;
$$;
