alter table public.users
  add column if not exists study_status_smp text,
  add column if not exists lecture_group text,
  add column if not exists residence_college text,
  add column if not exists room_number text,
  add column if not exists bka_status text;
