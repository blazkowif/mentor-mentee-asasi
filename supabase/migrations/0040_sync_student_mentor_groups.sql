-- Keep mentor-group memberships in sync for newly imported and reassigned students.

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
  if new.role <> 'student' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.mentor_id is not distinct from old.mentor_id then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.mentor_id is not null then
    select id into old_group_id
    from public.mentor_groups
    where lecturer_id = old.mentor_id;

    if old_group_id is not null then
      update public.mentor_group_memberships
      set ended_at = coalesce(ended_at, now())
      where group_id = old_group_id and student_id = new.id and ended_at is null;
    end if;
  end if;

  if new.mentor_id is not null then
    insert into public.mentor_groups (lecturer_id, group_name)
    values (new.mentor_id, 'Mentor Group')
    on conflict (lecturer_id) do nothing;

    select id into new_group_id
    from public.mentor_groups
    where lecturer_id = new.mentor_id;

    insert into public.mentor_group_memberships (group_id, student_id)
    select new_group_id, new.id
    where not exists (
      select 1
      from public.mentor_group_memberships
      where group_id = new_group_id
        and student_id = new.id
        and ended_at is null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_mentor_group_membership on public.users;
create trigger trg_sync_mentor_group_membership
after insert or update of mentor_id on public.users
for each row execute function public.sync_mentor_group_membership();

insert into public.mentor_groups (lecturer_id, group_name)
select distinct u.mentor_id, 'Mentor Group'
from public.users u
where u.role = 'student' and u.mentor_id is not null
on conflict (lecturer_id) do nothing;

insert into public.mentor_group_memberships (group_id, student_id)
select mg.id, u.id
from public.users u
join public.mentor_groups mg on mg.lecturer_id = u.mentor_id
where u.role = 'student' and u.mentor_id is not null
  and not exists (
    select 1
    from public.mentor_group_memberships m
    where m.group_id = mg.id and m.student_id = u.id and m.ended_at is null
  );

create or replace function public.list_mentor_group_members(p_group_id uuid)
returns table (
  id uuid, name text, role user_role, matric_number text, programme text,
  email text, phone text, address text, motto text, profile_image text
)
language sql stable security definer set search_path = public
as $$
  select u.id, u.name, u.role, u.matric_number, u.programme, u.email,
    u.phone, u.address, u.motto, u.profile_image
  from public.users u
  join public.mentor_group_memberships m on m.student_id = u.id
  where m.group_id = p_group_id
    and m.ended_at is null
    and exists (
      select 1
      from public.mentor_groups g
      where g.id = p_group_id
        and (
          g.lecturer_id = auth.uid()
          or exists (
            select 1
            from public.mentor_group_memberships current_member
            where current_member.group_id = g.id
              and current_member.student_id = auth.uid()
              and current_member.ended_at is null
          )
        )
    )
  order by u.name;
$$;

grant execute on function public.list_mentor_group_members(uuid) to authenticated;
