-- Enforce the mentor-mentee scope at the database boundary.

-- IC numbers are login-only data and are not selectable by browser clients.
revoke select (ic_number) on public.users from anon, authenticated;

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      id = auth.uid()
      and role = (select role from public.users where id = auth.uid())
      and matric_number is not distinct from (select matric_number from public.users where id = auth.uid())
      and ic_number is not distinct from (select ic_number from public.users where id = auth.uid())
      and mentor_id is not distinct from (select mentor_id from public.users where id = auth.uid())
    )
  );

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    sender_id = auth.uid() or receiver_id = auth.uid()
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and receiver_id is not null
    and group_id is null
    and (
      receiver_id = public.current_mentor_id()
      or receiver_id in (
        select id from public.users where role = 'student' and mentor_id = auth.uid()
      )
    )
  );