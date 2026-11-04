alter table public.meeting_tasks
  add column if not exists scheduled_start date,
  add column if not exists scheduled_end date;

update public.meeting_tasks
set scheduled_start = scheduled_date,
    scheduled_end = scheduled_date
where scheduled_date is not null
  and scheduled_start is null;

alter table public.meeting_tasks
  drop constraint if exists meeting_tasks_scheduled_range_check;

alter table public.meeting_tasks
  add constraint meeting_tasks_scheduled_range_check
  check (scheduled_end is null or scheduled_start is null or scheduled_end >= scheduled_start);

alter table public.meeting_tasks
  drop column if exists scheduled_date;
