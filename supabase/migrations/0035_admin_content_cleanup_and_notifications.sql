-- Admin cleanup controls and unread notifications for content created after
-- the user last opened the notification center.

create or replace function public.clear_all_tasks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  if not public.is_admin() then raise exception 'Only administrators may clear tasks.'; end if;
  delete from public.tasks;
  get diagnostics deleted_count = row_count;
  delete from public.notifications where title = 'New task assigned';
  return deleted_count;
end;
$$;

create or replace function public.clear_all_announcements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  if not public.is_admin() then raise exception 'Only administrators may clear announcements.'; end if;
  delete from public.announcements;
  get diagnostics deleted_count = row_count;
  delete from public.notifications where title = 'New announcement';
  return deleted_count;
end;
$$;

revoke all on function public.clear_all_tasks() from public;
revoke all on function public.clear_all_announcements() from public;
grant execute on function public.clear_all_tasks() to authenticated;
grant execute on function public.clear_all_announcements() to authenticated;

create or replace function public.notify_new_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, reference_type, reference_id)
  select u.id, 'New task assigned', new.title, 'task', new.id
  from public.users u
  where u.id <> new.lecturer_id
    and (new.target_student_id is null or u.id = new.target_student_id)
    and (new.target_role is null or u.role = new.target_role)
    and (new.is_global or u.role = 'student' and u.mentor_id = new.lecturer_id or u.id = new.lecturer_id);
  return new;
end;
$$;

create or replace function public.notify_new_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, reference_type, reference_id)
  select u.id, 'New announcement', new.title, 'announcement', new.id
  from public.users u
  where u.id <> new.lecturer_id
    and (new.target_student_id is null or u.id = new.target_student_id)
    and (new.target_role is null or u.role = new.target_role)
    and (new.is_global or u.role = 'student' and u.mentor_id = new.lecturer_id or u.id = new.lecturer_id);
  return new;
end;
$$;

drop trigger if exists trg_notify_new_task on public.tasks;
create trigger trg_notify_new_task after insert on public.tasks
for each row execute function public.notify_new_task();

drop trigger if exists trg_notify_new_announcement on public.announcements;
create trigger trg_notify_new_announcement after insert on public.announcements
for each row execute function public.notify_new_announcement();
