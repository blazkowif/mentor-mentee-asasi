-- Make matric-number login tolerant of spreadsheet casing and whitespace.
create or replace function public.get_login_email(p_matric_number text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select au.email
  from auth.users au
  join public.users u on u.id = au.id
  where lower(trim(u.matric_number)) = lower(trim(p_matric_number))
  limit 1;
$$;

revoke all on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;
