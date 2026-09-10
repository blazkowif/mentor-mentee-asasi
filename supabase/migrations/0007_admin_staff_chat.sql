-- Allow admins to communicate with staff while keeping student chat scoped.

drop policy if exists "messages_insert" on public.messages;

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and receiver_id is not null
    and group_id is null
    and (
      (
        public.is_admin()
        and receiver_id in (
          select id from public.users where role in ('admin', 'lecturer')
        )
      )
      or receiver_id = public.current_mentor_id()
      or receiver_id in (
        select id from public.users where role = 'student' and mentor_id = auth.uid()
      )
    )
  );