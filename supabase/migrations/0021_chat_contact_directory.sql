-- Return stable personal-chat contacts so conversations remain visible after
-- refresh instead of depending on the current search input.

create or replace function public.list_chat_contacts()
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
  select distinct on (u.id)
    u.id,
    u.role,
    u.matric_number,
    u.name,
    u.programme,
    u.profile_image,
    case
      when u.role = 'admin' then 'admin'
      when u.id = current_user_row.mentor_id then 'mentor'
      else 'conversation'
    end::text as contact_type
  from public.users u
  cross join lateral (
    select me.mentor_id, me.role
    from public.users me
    where me.id = auth.uid()
  ) current_user_row
  where u.id <> auth.uid()
    and (
      current_user_row.role = 'admin'
      or u.role = 'admin'
      or u.id = current_user_row.mentor_id
      or u.mentor_id = auth.uid()
      or exists (
        select 1
        from public.messages m
        where (m.sender_id = auth.uid() and m.receiver_id = u.id)
           or (m.receiver_id = auth.uid() and m.sender_id = u.id)
      )
    )
  order by u.id, contact_type, u.name;
$$;

grant execute on function public.list_chat_contacts() to authenticated;
