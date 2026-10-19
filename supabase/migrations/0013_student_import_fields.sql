alter table public.users
  add column if not exists gender text,
  add column if not exists religion text,
  add column if not exists race text,
  add column if not exists postcode text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists study_status text;
