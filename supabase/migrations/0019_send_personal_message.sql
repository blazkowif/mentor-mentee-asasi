-- Send personal messages through a validated function so direct chat is
-- consistent for students, lecturers, and administrators.

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

  if not (
    public.is_admin()
    or exists (
      select 1
      from public.users sender
      join public.users receiver on receiver.id = p_receiver_id
      where sender.id = auth.uid()
        and (
          receiver.role = 'admin'
          or sender.mentor_id = receiver.id
          or receiver.mentor_id = sender.id
          or (sender.role = 'student' and receiver.role = 'student')
        )
    )
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

revoke all on function public.send_personal_message(uuid, text, text) from public;
grant execute on function public.send_personal_message(uuid, text, text) to authenticated;
