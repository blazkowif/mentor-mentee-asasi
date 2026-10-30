-- Ensure non-admin users can reply to administrators even when earlier chat
-- migrations have already been applied.

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_admin()
      or receiver_id in (
        select id from public.users where role = 'admin'
      )
      or receiver_id = public.current_mentor_id()
      or receiver_id in (
        select id from public.users where role = 'student' and mentor_id = auth.uid()
      )
      or (
        (select role from public.users where id = auth.uid()) = 'student'
        and (select role from public.users where id = receiver_id) = 'student'
      )
      or group_id in (
        select id from public.mentor_groups
        where lecturer_id = auth.uid()
          or lecturer_id = public.current_mentor_id()
      )
    )
  );
