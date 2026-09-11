-- Allow administrators to start direct conversations with students.

drop policy if exists "messages_insert" on public.messages;

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      group_id in (
        select id from public.mentor_groups where lecturer_id = auth.uid()
        or id in (select group_id from public.mentor_group_memberships where student_id = auth.uid())
      )
      or (
        receiver_id is not null
        and (
          (
            public.is_admin()
            and receiver_id in (select id from public.users where role in ('admin', 'lecturer', 'student'))
          )
          or (
            (select role from public.users where id = auth.uid()) = 'student'
            and (select role from public.users where id = receiver_id) = 'student'
          )
          or receiver_id = public.current_mentor_id()
          or receiver_id in (select id from public.users where role = 'student' and mentor_id = auth.uid())
        )
      )
    )
  );