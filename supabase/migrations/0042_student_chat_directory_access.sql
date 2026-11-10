-- Allow students to discover and message any account in the system while
-- keeping profile access limited to chat-safe fields.

create or replace function public.search_chat_users(p_query text)
returns table (
  id uuid,
  role user_role,
  matric_number text,
  name text,
  programme text,
  profile_image text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.role, u.matric_number, u.name, u.programme, u.profile_image
  from public.users u
  where auth.uid() is not null
    and u.id <> auth.uid()
    and (
      nullif(trim(p_query), '') is null
      or u.name ilike '%' || trim(p_query) || '%'
      or coalesce(u.email, '') ilike '%' || trim(p_query) || '%'
      or coalesce(u.matric_number, '') ilike '%' || trim(p_query) || '%'
    )
  order by u.name
  limit 50;
$$;

grant execute on function public.search_chat_users(text) to authenticated;

create or replace function public.get_chat_profile(p_user_id uuid)
returns table (
  id uuid,
  role user_role,
  matric_number text,
  name text,
  programme text,
  email text,
  phone text,
  address text,
  motto text,
  profile_image text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.role, u.matric_number, u.name, u.programme, u.email,
    u.phone, u.address, u.motto, u.profile_image
  from public.users u
  where auth.uid() is not null
    and u.id = p_user_id
    and u.id <> auth.uid();
$$;

grant execute on function public.get_chat_profile(uuid) to authenticated;

create or replace function public.send_personal_message(
  p_receiver_id uuid,
  p_message text,
  p_attachment text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a message.';
  end if;
  if p_receiver_id is null or p_receiver_id = auth.uid() then
    raise exception 'A valid recipient is required.';
  end if;
  if not exists (select 1 from public.users where id = p_receiver_id) then
    raise exception 'The recipient no longer exists.';
  end if;
  if not exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('student', 'lecturer', 'admin')
  ) then
    raise exception 'You are not allowed to message this recipient.';
  end if;
  if nullif(trim(p_message), '') is null then
    raise exception 'Message cannot be empty.';
  end if;

  insert into public.messages (sender_id, receiver_id, message, attachment)
  values (auth.uid(), p_receiver_id, trim(p_message), p_attachment)
  returning * into inserted_message;
  return inserted_message;
end;
$$;

revoke all on function public.get_chat_profile(uuid) from public;
grant execute on function public.get_chat_profile(uuid) to authenticated;
revoke all on function public.send_personal_message(uuid, text, text) from public;
grant execute on function public.send_personal_message(uuid, text, text) to authenticated;
