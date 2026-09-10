-- Restore scoped mentor-group chat with persistent participant deletion.

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    sender_id = auth.uid()
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
      (
        public.is_admin()
        and receiver_id in (
          select id from public.users where role in ('admin', 'lecturer')
        )
      )
      or (
        receiver_id is not null
        and (
          receiver_id = public.current_mentor_id()
          or receiver_id in (
            select id from public.users where role = 'student' and mentor_id = auth.uid()
          )
        )
      )
      or group_id in (
        select id from public.mentor_groups
        where lecturer_id = auth.uid() or lecturer_id = public.current_mentor_id()
      )
    )
  );

drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages
  for delete using (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
    or group_id in (
      select id from public.mentor_groups
      where lecturer_id = auth.uid() or lecturer_id = public.current_mentor_id()
    )
  );