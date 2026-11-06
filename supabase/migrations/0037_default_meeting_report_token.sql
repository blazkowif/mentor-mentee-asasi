-- Meeting task creation does not need to manage report-link tokens.
-- Generate them at the database boundary so every task is valid.

alter table public.meeting_tasks
  alter column report_token set default md5(gen_random_uuid()::text || clock_timestamp()::text);

update public.meeting_tasks
set report_token = md5(gen_random_uuid()::text || clock_timestamp()::text)
where report_token is null;

alter table public.meeting_tasks
  alter column report_token set not null;
