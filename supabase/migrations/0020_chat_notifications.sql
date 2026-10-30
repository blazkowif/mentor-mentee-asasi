-- Create an in-app notification for every direct chat message.

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

  select name into sender_name
  from public.users
  where id = new.sender_id;

  insert into public.notifications (user_id, title, body)
  values (
    new.receiver_id,
    'New chat message',
    coalesce(sender_name, 'A user') || ' sent you a message.'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_direct_message on public.messages;
create trigger trg_notify_direct_message
after insert on public.messages
for each row
execute function public.notify_direct_message();
