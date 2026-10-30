-- Allow students and lecturers to message administrators directly and expose
-- the contacts that should stay at the top of their personal chat list.

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_admin()
      or receiver_id in (select id from public.users where role = 'admin')
      or (
        (select role from public.users where id = auth.uid()) = 'student'
        and (select role from public.users where id = receiver_id) = 'student'
      )
      or receiver_id = public.current_mentor_id()
      or receiver_id in (select id from public.users where role = 'student' and mentor_id = auth.uid())
      or group_id in (
        select id from public.mentor_groups
        where lecturer_id = auth.uid() or lecturer_id = public.current_mentor_id()
      )
    )
  );

create or replace function public.list_pinned_chat_contacts()
returns table (
  id uuid,
  role user_role,
  matric_number text,
  name text,
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
    select u.id, u.role, u.matric_number, u.name, u.programme, u.profile_image, 'admin'::text as contact_type
    from public.users u
    where auth.uid() is not null
      and u.role = 'admin'
      and u.id <> auth.uid()
    union all
    select u.id, u.role, u.matric_number, u.name, u.programme, u.profile_image, 'mentor'::text
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
