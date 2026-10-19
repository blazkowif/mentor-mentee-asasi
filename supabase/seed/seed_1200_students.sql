-- ============================================================================
-- UMS PPST Mentor-Mentee System — Full Dev Seed
-- 2 Admins + 100 Lecturers + 1200 Students across 4 programmes
--   FS = Asasi Sains | FT = Asasi Teknologi
--   FA = Asasi Agrisains | FX = Asasi Sains Sosial
-- All dev passwords: "123". This seed uses pgcrypto to generate a valid
-- Supabase-compatible bcrypt hash for the test password.
-- ============================================================================

begin;

-- ============================================================================
-- Pre-flight: ensure we have an existing auth user to grab instance_id from.
-- ============================================================================
do $$
declare
  existing_count int;
begin
  select count(*) into strict existing_count from auth.users;
  if existing_count = 0 then
    raise exception 'No auth.users found. Create at least one user in Supabase Auth first, then re-run this seed.';
  end if;
end $$;

-- ============================================================================
-- STEP 1: Nuclear cleanup — wipe dependent tables first, then public.users,
-- then auth.users for our known email patterns.
-- ============================================================================
delete from public.notifications where user_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
     or email like 'student%@ppst.ums.local'
     or email like 'admin%@ppst.ums.local'
);
delete from public.messages where sender_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
     or email like 'student%@ppst.ums.local'
     or email like 'admin%@ppst.ums.local'
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
delete from public.activity_logs where user_id in (
  select id from public.users where email like 'lecturer%@ppst.ums.local'
     or email like 'student%@ppst.ums.local'
     or email like 'admin%@ppst.ums.local'
);
delete from public.users where email like 'lecturer%@ppst.ums.local'
   or email like 'student%@ppst.ums.local'
   or email like 'admin%@ppst.ums.local';
delete from auth.users where email like 'lecturer%@ppst.ums.local'
   or email like 'student%@ppst.ums.local'
   or email like 'admin%@ppst.ums.local';

-- ============================================================================
-- STEP 2: Create Auth Users
-- ============================================================================
with instance as (
  select instance_id from auth.users limit 1
),
bcrypt as (
  select crypt('123', gen_salt('bf'))::text as hash
),
all_auth as (
  select gen_random_uuid() as id, 'admin' || i || '@ppst.ums.local' as email
  from generate_series(1, 2) i, instance, bcrypt
  union all
  select gen_random_uuid(), 'lecturer' || i || '@ppst.ums.local'
  from generate_series(1, 100) i, instance, bcrypt
  union all
  select gen_random_uuid(), 'student' || i || '@ppst.ums.local'
  from generate_series(1, 1200) i, instance, bcrypt
)
insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, aud, role, raw_app_meta_data,
  raw_user_meta_data, is_super_admin, created_at, updated_at
)
select
  id,
  (select instance_id from instance),
  email,
  (select hash from bcrypt),
  now(),
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  now(),
  now()
from all_auth;

-- Diagnostic: how many auth users did we just create?
do $$
declare
  auth_count int;
begin
  select count(*) into auth_count from auth.users where email like 'lecturer%@ppst.ums.local'
     or email like 'student%@ppst.ums.local'
     or email like 'admin%@ppst.ums.local';
  if auth_count = 0 then
    raise exception 'Auth user insert returned 0 rows. Your SQL editor may not allow direct auth.users inserts. Create at least one user manually, then re-run.';
  end if;
end $$;

-- ============================================================================
-- STEP 3: Create public.users profiles with correct programme names
-- ============================================================================

-- Admins
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email, created_at)
select id, 'admin'::user_role, 'ADM' || lpad(i::text, 4, '0'), 'IC-ADM-' || lpad(i::text, 4, '0'),
       'Admin User ' || i, null, null, 'admin' || i || '@ppst.ums.local', now()
from auth.users, generate_series(1, 2) i
where email like 'admin%@ppst.ums.local';

-- Lecturers
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email, created_at)
select id, 'lecturer'::user_role, 'LEC' || lpad(i::text, 4, '0'), 'IC-LEC-' || lpad(i::text, 4, '0'),
       'Dr. Lecturer ' || i, null, null, 'lecturer' || i || '@ppst.ums.local', now()
from auth.users, generate_series(1, 100) i
where email like 'lecturer%@ppst.ums.local';

-- Students (FS / FT / FA / FX)
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email, created_at)
select
  id,
  'student'::user_role,
  case
    when ((row_number() over (order by email)) - 1) / 300 = 0 then 'FS' || lpad((((row_number() over (order by email)) - 1) % 300 + 1)::text, 4, '0')
    when ((row_number() over (order by email)) - 1) / 300 = 1 then 'FT' || lpad((((row_number() over (order by email)) - 1) % 300 + 1)::text, 4, '0')
    when ((row_number() over (order by email)) - 1) / 300 = 2 then 'FA' || lpad((((row_number() over (order by email)) - 1) % 300 + 1)::text, 4, '0')
    else 'FX' || lpad((((row_number() over (order by email)) - 1) % 300 + 1)::text, 4, '0')
  end,
  'IC-STU-' || lpad((row_number() over (order by email))::text, 8, '0'),
  'Student ' || (row_number() over (order by email)),
  case
    when ((row_number() over (order by email)) - 1) / 300 = 0 then 'Asasi Sains'
    when ((row_number() over (order by email)) - 1) / 300 = 1 then 'Asasi Teknologi'
    when ((row_number() over (order by email)) - 1) / 300 = 2 then 'Asasi Agrisains'
    else 'Asasi Sains Sosial'
  end,
  null::uuid,
  email,
  now()
from auth.users
where email like 'student%@ppst.ums.local';

-- Diagnostic: how many public.users did we just create?
do $$
declare
  public_count int;
begin
  select count(*) into public_count from public.users where email like 'lecturer%@ppst.ums.local'
     or email like 'student%@ppst.ums.local'
     or email like 'admin%@ppst.ums.local';
  if public_count = 0 then
    raise exception 'public.users insert returned 0 rows. Check for FK or constraint errors.';
  end if;
end $$;

-- ============================================================================
-- STEP 4: Mentor Groups (one per lecturer)
-- ============================================================================
insert into public.mentor_groups (lecturer_id, group_name)
select id, 'Group ' || matric_number
from public.users
where role = 'lecturer'
on conflict (lecturer_id) do nothing;

-- ============================================================================
-- STEP 5: Auto-assign random mentors to all students
-- ============================================================================
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

-- ============================================================================
-- STEP 6: Sample activity data
-- ============================================================================

-- Announcements from first 3 lecturers
insert into public.announcements (lecturer_id, title, content)
select id, 'Weekly Check-in', 'Please update your progress log before Friday.'
from public.users
where role = 'lecturer' and email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

-- Tasks from first 3 lecturers
insert into public.tasks (id, lecturer_id, title, description, due_date, priority)
select
  gen_random_uuid(),
  id,
  'Reflection',
  'Write a 1-page learning reflection.',
  now() + interval '7 days',
  'medium'::task_priority
from public.users
where role = 'lecturer' and email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

-- Submissions from students
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

-- Personal messages
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

-- Group messages
insert into public.messages (sender_id, group_id, message)
select
  u.id, mg.id, 'Welcome to the mentoring group. Please attend the next session.'
from public.users u
join public.mentor_groups mg on mg.lecturer_id = u.id
where u.email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local')
limit 3;

-- Notifications
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

commit;

-- Final diagnostic
select 
  count(*) filter (where role = 'admin') as admins,
  count(*) filter (where role = 'lecturer') as lecturers,
  count(*) filter (where role = 'student') as students,
  count(*) as total
from public.users
where email like 'lecturer%@ppst.ums.local'
   or email like 'student%@ppst.ums.local'
   or email like 'admin%@ppst.ums.local';
