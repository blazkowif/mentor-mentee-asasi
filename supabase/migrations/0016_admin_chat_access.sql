-- Administrators can read, send, delete, and clear all chat messages.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    public.is_admin()
    or sender_id = auth.uid()
    or receiver_id = auth.uid()
    or group_id in (
      select id from public.mentor_groups
      where lecturer_id = auth.uid() or lecturer_id = public.current_mentor_id()
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_admin()
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

drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages
  for delete using (
    public.is_admin()
    or sender_id = auth.uid()
    or receiver_id = auth.uid()
    or group_id in (
      select id from public.mentor_groups
      where lecturer_id = auth.uid() or lecturer_id = public.current_mentor_id()
    )
  );

create or replace function public.clear_all_chat_history()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may clear chat history.';
  end if;

  delete from public.messages;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.clear_all_chat_history() from public;
grant execute on function public.clear_all_chat_history() to authenticated;
