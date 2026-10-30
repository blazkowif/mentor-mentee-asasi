-- Versioned admin-only chat cleanup. This avoids relying on the older
-- clear_all_chat_history definition from the initial chat migrations.

create or replace function public.clear_all_chat_history_v2()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to clear chat history.';
  end if;

  if not exists (
    select 1
    from public.users
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only administrators may clear chat history.';
  end if;

  delete from public.messages;
  get diagnostics deleted_count = row_count;

  delete from public.chat_read_states;
  delete from public.notifications
  where title = 'New chat message';

  return deleted_count;
end;
$$;

revoke all on function public.clear_all_chat_history_v2() from public;
grant execute on function public.clear_all_chat_history_v2() to authenticated;
