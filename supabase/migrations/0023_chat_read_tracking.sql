-- Track the last time each user opened each direct conversation.

create table if not exists public.chat_read_states (
  user_id uuid not null references public.users (id) on delete cascade,
  contact_id uuid not null references public.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, contact_id)
);

alter table public.chat_read_states enable row level security;

drop policy if exists "chat_read_states_own" on public.chat_read_states;
create policy "chat_read_states_own" on public.chat_read_states
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.mark_chat_read(p_contact_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.chat_read_states (user_id, contact_id, last_read_at)
  values (auth.uid(), p_contact_id, now())
  on conflict (user_id, contact_id)
  do update set last_read_at = excluded.last_read_at;

  update public.notifications
  set is_read = true
  where user_id = auth.uid()
    and title = 'New chat message'
    and is_read = false;
$$;

grant execute on function public.mark_chat_read(uuid) to authenticated;

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
  last_message_at timestamptz,
  unread_count bigint
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
    where me.role <> 'admin' and u.role = 'admin' and u.id <> auth.uid()
    union
    select me.mentor_id, 'mentor'::text
    from current_user_row me
    where me.role = 'student' and me.mentor_id is not null
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
    c.last_message_at,
    count(m.id) filter (
      where m.sender_id = c.contact_id
        and m.created_at > coalesce(rs.last_read_at, 'epoch'::timestamptz)
    ) as unread_count
  from contact_ids c
  join public.users u on u.id = c.contact_id
  left join public.chat_read_states rs
    on rs.user_id = auth.uid() and rs.contact_id = c.contact_id
  left join public.messages m
    on m.group_id is null
    and ((m.sender_id = auth.uid() and m.receiver_id = c.contact_id)
      or (m.sender_id = c.contact_id and m.receiver_id = auth.uid()))
  group by u.id, u.role, u.matric_number, u.name, u.programme,
    u.profile_image, c.contact_type, c.last_message_at, rs.last_read_at
  order by case when c.contact_type in ('admin', 'mentor') then 0 else 1 end,
    c.last_message_at desc nulls last, u.name;
$$;

grant execute on function public.list_chat_contacts() to authenticated;
