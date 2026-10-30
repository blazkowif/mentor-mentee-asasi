-- Keep chat lists focused on actual conversations. Pinned contacts remain
-- available for students and lecturers, while admins only see people who have
-- exchanged a direct message with them.

drop function if exists public.list_chat_contacts();
create or replace function public.list_chat_contacts()
returns table (
  id uuid,
  role user_role,
  matric_number text,
  name text,
  programme text,
  profile_image text,
  contact_type text,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with current_user_row as (
    select me.mentor_id, me.role
    from public.users me
    where me.id = auth.uid()
  ),
  conversation_contacts as (
    select
      case when m.sender_id = auth.uid() then m.receiver_id else m.sender_id end as contact_id,
      max(m.created_at) as last_message_at
    from public.messages m
    where m.group_id is null
      and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
    group by contact_id
  ),
  pinned_contacts as (
    select u.id as contact_id, 'admin'::text as contact_type
    from public.users u, current_user_row me
    where me.role <> 'admin'
      and u.role = 'admin'
      and u.id <> auth.uid()
    union
    select me.mentor_id, 'mentor'::text
    from current_user_row me
    where me.role = 'student'
      and me.mentor_id is not null
  ),
  contact_ids as (
    select contact_id, last_message_at, 'conversation'::text as contact_type
    from conversation_contacts
    union
    select contact_id, null::timestamptz, contact_type
    from pinned_contacts
  )
  select
    u.id,
    u.role,
    u.matric_number,
    u.name,
    u.programme,
    u.profile_image,
    c.contact_type,
    c.last_message_at
  from contact_ids c
  join public.users u on u.id = c.contact_id
  order by
    case when c.contact_type in ('admin', 'mentor') then 0 else 1 end,
    c.last_message_at desc nulls last,
    u.name;
$$;

grant execute on function public.list_chat_contacts() to authenticated;
