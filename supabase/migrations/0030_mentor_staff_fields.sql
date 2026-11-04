alter table public.users
  add column if not exists job_title text,
  add column if not exists grade text,
  add column if not exists ums_per text;
