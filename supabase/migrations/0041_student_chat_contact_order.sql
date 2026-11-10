-- Include admin email in pinned contacts so student chat can prioritize the
-- designated administrator contact.

drop function if exists public.list_pinned_chat_contacts();

create function public.list_pinned_chat_contacts()
returns table (
  id uuid,
  role user_role,
  matric_number text,
  name text,
  email text,
  programme text,
  profile_image text,
  contact_type text
)
language sql
stable
security definer
set search_path = public
as $$
  with contacts as (
    select u.id, u.role, u.matric_number, u.name, u.email, u.programme,
      u.profile_image, 'admin'::text as contact_type
    from public.users u
    where auth.uid() is not null
      and u.role = 'admin'
      and u.id <> auth.uid()
    union all
    select u.id, u.role, u.matric_number, u.name, u.email, u.programme,
      u.profile_image, 'mentor'::text
    from public.users me
    join public.users u on u.id = me.mentor_id
    where me.id = auth.uid()
      and me.role = 'student'
  )
  select *
  from contacts
  order by case when contact_type = 'admin' then 0 else 1 end, name;
$$;

grant execute on function public.list_pinned_chat_contacts() to authenticated;
