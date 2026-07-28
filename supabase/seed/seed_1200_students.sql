-- ============================================================================
-- UMS PPST Mentor-Mentee System — Large Scale Seed
-- 100 Lecturers + 1200 Students across 4 programmes
--   FS = Asasi Sains | FT = Asasi Teknologi
--   FA = Asasi Agrisains | FX = Asasi Sains Sosial
-- All dev passwords: "123" (bcrypt hash)
-- ============================================================================

-- ============================================================
-- STEP 1: Clear existing seed data (optional safety cleanup)
-- ============================================================
delete from public.notifications where user_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
  or email like 'student%@ppst.ums.local'
);
delete from public.messages where sender_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
  or email like 'student%@ppst.ums.local'
);
delete from public.task_submissions where student_id in (
  select id from public.users where email like 'student%@ppst.ums.local'
);
delete from public.tasks where lecturer_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
);
delete from public.announcements where lecturer_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
);
delete from public.mentor_groups where lecturer_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
);
delete from public.users where email like 'lecturer%@ppst.ums.local'
or email like 'student%@ppst.ums.local';
-- Note: if you created users with explicit IDs, they stay in auth.users 
-- but the public profile is cleaned up. Re-run fresh inserts below.

-- ============================================================
-- STEP 2: Create Auth Users (password hash for "123")
-- ============================================================
-- bcrypt hash for "123" (cost 10) — same for all dev accounts
do $$
declare
  bcrypt_hash constant text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LwZdS17hWyW';
  instance_rec record;
begin
  select id into strict instance_rec from auth.instances limit 1;

  -- Insert 100 lecturers
  insert into auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, aud, role, raw_app_meta_data,
    raw_user_meta_data, is_super_admin, created_at, updated_at
  )
  select
    gen_random_uuid(),
    instance_rec.id,
    'lecturer' || i || '@ppst.ums.local',
    bcrypt_hash,
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    now(),
    now()
  from generate_series(1, 100) i;

  -- Insert 1200 students
  insert into auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, aud, role, raw_app_meta_data,
    raw_user_meta_data, is_super_admin, created_at, updated_at
  )
  select
    gen_random_uuid(),
    instance_rec.id,
    'student' || i || '@ppst.ums.local',
    bcrypt_hash,
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    now(),
    now()
  from generate_series(1, 1200) i;
end $$;

-- ============================================================
-- STEP 3: Create public.users profiles
-- ============================================================

-- 3a. Lecturers
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email, created_at)
select
  au.id,
  'lecturer'::user_role,
  'LEC' || lpad(i::text, 4, '0'),
  'IC-LEC-' || lpad(i::text, 4, '0'),
  'Dr. Lecturer ' || i,
  null::text,
  null::uuid,
  'lecturer' || i || '@ppst.ums.local',
  now()
from generate_series(1, 100) i
join auth.users au on au.email = 'lecturer' || i || '@ppst.ums.local';

-- 3b. Students (FS / FT / FA / FX)
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email, created_at)
select
  au.id,
  'student'::user_role,
  case
    when sn.rn between 1   and 300 then 'FS' || lpad((sn.rn)::text, 4, '0')
    when sn.rn between 301 and 600 then 'FT' || lpad((sn.rn - 300)::text, 4, '0')
    when sn.rn between 601 and 900 then 'FA' || lpad((sn.rn - 600)::text, 4, '0')
    else                              'FX' || lpad((sn.rn - 900)::text, 4, '0')
  end,
  'IC-STU-' || lpad(sn.rn::text, 8, '0'),
  'Student ' || sn.rn,
  case
    when sn.rn between 1   and 300 then 'Asasi Sains'
    when sn.rn between 301 and 600 then 'Asasi Teknologi'
    when sn.rn between 601 and 900 then 'Asasi Agrisains'
    else                              'Asasi Sains Sosial'
  end,
  null::uuid,
  'student' || sn.rn || '@ppst.ums.local',
  now()
from (
  select row_number() over (order by gen_random_uuid()) as rn, i
  from generate_series(1, 1200) i
) sn
join auth.users au on au.email = 'student' || sn.rn || '@ppst.ums.local';

-- ============================================================
-- STEP 4: Mentor Groups (one per lecturer)
-- ============================================================
insert into public.mentor_groups (lecturer_id, group_name)
select
  u.id,
  'Group ' || u.matric_number
from public.users u
where u.role = 'lecturer'
on conflict (lecturer_id) do nothing;

-- ============================================================
-- STEP 5: Auto-assign random mentors to all students
-- ============================================================
with random_mentors as (
  select
    s.id as student_id,
    l.id as mentor_id
  from public.users s
  join lateral (
    select id
    from public.users
    where role = 'lecturer'
    order by random()
    limit 1
  ) l on true
  where s.role = 'student'
    and s.mentor_id is null
)
update public.users s
set mentor_id = rm.mentor_id
from random_mentors rm
where s.id = rm.student_id;

-- ============================================================
-- STEP 6: Sample activity data (so dashboards aren't empty)
-- ============================================================

-- A few announcements from first 3 lecturers
insert into public.announcements (lecturer_id, title, content)
select id, 'Weekly Check-in ' || i, 'Please update your progress log before Friday.'
from public.users
where role = 'lecturer' and email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

-- A few tasks from first 3 lecturers
insert into public.tasks (id, lecturer_id, title, description, due_date, priority)
select
  gen_random_uuid(),
  id,
  'Reflection ' || i,
  'Write a 1-page learning reflection.',
  now() + interval '7 days',
  'medium'::task_priority
from public.users
where role = 'lecturer' and email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

-- A few submissions from students
insert into public.task_submissions (task_id, student_id, file, status, submitted_at)
select
  t.id,
  s.id,
  'task-submissions/' || s.id::text || '/reflection.pdf',
  'submitted'::submission_status,
  now() - interval '1 day'
from public.tasks t
cross join lateral (
  select id
  from public.users
  where role = 'student'
  order by random()
  limit 5
) s
where t.lecturer_id in (select id from public.users where email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local'));

-- A few messages
insert into public.messages (sender_id, receiver_id, message)
select
  l.id, s.id, 'Hi ' || s.name || ', great progress on your submission!'
from public.users l
join lateral (
  select id, name from public.users
  where role = 'student' and mentor_id = l.id
  limit 1
) s on true
where l.email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

insert into public.messages (sender_id, group_id, message)
select
  u.id, mg.id, 'Welcome to the mentoring group. Please attend the next session.'
from public.users u
join public.mentor_groups mg on mg.lecturer_id = u.id
where u.email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local')
limit 3;

-- A few notifications
insert into public.notifications (user_id, title, body, is_read)
select
  s.id,
  'New Task Assigned',
  'Your mentor assigned a new task.',
  false
from public.users s
join public.users m on s.mentor_id = m.id
where m.email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local')
order by random()
limit 20;

-- ============================================================
-- DONE
-- ============================================================
select 'Seed completed: 100 lecturers + 1200 students created.' as status;
