alter table public.notifications
  add column if not exists reference_type text,
  add column if not exists reference_id uuid;

create index if not exists notifications_reference_idx
  on public.notifications (reference_type, reference_id);

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  if new.receiver_id is null then
    return new;
  end if;

  select name into sender_name from public.users where id = new.sender_id;
  insert into public.notifications (user_id, title, body, reference_type, reference_id)
  values (
    new.receiver_id,
    'New chat message',
    coalesce(sender_name, 'A user') || ' sent you a message.',
    'chat_user',
    new.sender_id
  );
  return new;
end;
$$;

create or replace function public.notify_attention_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
  mentor_name text;
begin
  select name into student_name from public.users where id = new.student_id;
  select name into mentor_name from public.users where id = new.mentor_id;
  insert into public.notifications (user_id, title, body, reference_type, reference_id)
  select id,
    'Student requires attention',
    coalesce(student_name, 'A student') || ' was marked ' ||
      replace(new.severity::text, '_', ' ') || ' by ' || coalesce(mentor_name, 'a mentor') || '.',
    'attention_flag',
    new.id
  from public.users
  where role = 'admin';
  return new;
end;
$$;
