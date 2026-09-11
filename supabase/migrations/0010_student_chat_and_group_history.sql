-- Allow student-to-student chat and preserve mentor-group history.

create table if not exists public.mentor_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.mentor_groups (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (group_id, student_id, started_at)
);

create index if not exists mentor_group_memberships_student_idx
  on public.mentor_group_memberships (student_id, started_at desc);
create index if not exists mentor_group_memberships_group_idx
  on public.mentor_group_memberships (group_id, started_at desc);

alter table public.mentor_group_memberships enable row level security;

insert into public.mentor_group_memberships (group_id, student_id)
select mg.id, u.id
from public.users u
join public.mentor_groups mg on mg.lecturer_id = u.mentor_id
where u.role = 'student'
on conflict do nothing;

create or replace function public.sync_mentor_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_group_id uuid;
  new_group_id uuid;
begin
  if new.role <> 'student' or new.mentor_id is not distinct from old.mentor_id then
    return new;
  end if;

  select id into old_group_id
  from public.mentor_groups
  where lecturer_id = old.mentor_id;

  if old_group_id is not null then
    update public.mentor_group_memberships
    set ended_at = coalesce(ended_at, now())
    where group_id = old_group_id and student_id = new.id and ended_at is null;
  end if;

  if new.mentor_id is not null then
    insert into public.mentor_groups (lecturer_id, group_name)
    values (new.mentor_id, 'Mentor Group')
    on conflict (lecturer_id) do nothing;

    select id into new_group_id
    from public.mentor_groups
    where lecturer_id = new.mentor_id;

    insert into public.mentor_group_memberships (group_id, student_id)
    values (new_group_id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_mentor_group_membership on public.users;
create trigger trg_sync_mentor_group_membership
after update of mentor_id on public.users
for each row execute function public.sync_mentor_group_membership();

create policy "mentor_group_memberships_select" on public.mentor_group_memberships
  for select using (
    student_id = auth.uid()
    or group_id in (select id from public.mentor_groups where lecturer_id = auth.uid())
  );

create or replace function public.search_chat_users(p_query text)
returns table (
  id uuid,
  role user_role,
  matric_number text,
  name text,
  programme text,
  profile_image text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.role, u.matric_number, u.name, u.programme, u.profile_image
  from public.users u
  where auth.uid() is not null
    and u.id <> auth.uid()
    and u.role = 'student'
    and (
      nullif(trim(p_query), '') is null
      or u.name ilike '%' || trim(p_query) || '%'
      or u.matric_number ilike '%' || trim(p_query) || '%'
    )
  order by u.name
  limit 50;
$$;
grant execute on function public.search_chat_users(text) to authenticated;

create or replace function public.list_chat_groups()
returns table (id uuid, lecturer_id uuid, group_name text, created_at timestamptz, is_current boolean)
language sql
stable
security definer
set search_path = public
as $$
  select mg.id, mg.lecturer_id, mg.group_name, mg.created_at,
    mg.lecturer_id = coalesce((select mentor_id from public.users where id = auth.uid()), auth.uid())
  from public.mentor_groups mg
  where auth.uid() is not null
    and (
      mg.lecturer_id = auth.uid()
      or exists (
        select 1 from public.mentor_group_memberships m
        where m.group_id = mg.id and m.student_id = auth.uid()
      )
    )
  order by (mg.lecturer_id = coalesce((select mentor_id from public.users where id = auth.uid()), auth.uid())) desc,
    mg.created_at desc;
$$;
grant execute on function public.list_chat_groups() to authenticated;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
    or group_id in (
      select id from public.mentor_groups where lecturer_id = auth.uid()
      or id in (select group_id from public.mentor_group_memberships where student_id = auth.uid())
    )
  );

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
          (select role from public.users where id = auth.uid()) = 'student'
          and (select role from public.users where id = receiver_id) = 'student'
        )
        or receiver_id = public.current_mentor_id()
        or receiver_id in (select id from public.users where role = 'student' and mentor_id = auth.uid())
        or (public.is_admin() and receiver_id in (select id from public.users where role in ('admin', 'lecturer')))
      )
    )
  );

drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages
  for delete using (
    sender_id = auth.uid() or receiver_id = auth.uid()
    or group_id in (
      select id from public.mentor_groups where lecturer_id = auth.uid()
      or id in (select group_id from public.mentor_group_memberships where student_id = auth.uid())
    )
  );