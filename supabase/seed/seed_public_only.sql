-- ============================================================================
-- UMS PPST Mentor-Mentee System — Public Schema Seed
-- Requires auth.users to already exist.
-- 2 Admins + 100 Lecturers + 1200 Students
--   FS = Asasi Sains | FT = Asasi Teknologi
--   FA = Asasi Agrisains | FX = Asasi Sains Sosial
-- ============================================================================

begin;

-- ============================================================================
-- Cleanup — wipe everything so re-runs are idempotent
-- ============================================================================
truncate table public.activity_logs cascade;
truncate table public.notifications cascade;
truncate table public.messages cascade;
truncate table public.task_submissions cascade;
truncate table public.tasks cascade;
truncate table public.announcements cascade;
truncate table public.mentor_groups cascade;
truncate table public.users cascade;

-- ============================================================================
-- 2 Admins
-- ============================================================================
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email, created_at)
select id, 'admin'::user_role, 'ADM' || lpad(row_number() over (order by email)::text, 4, '0'),
       'IC-ADM-' || lpad(row_number() over (order by email)::text, 4, '0'),
       'Admin User ' || row_number() over (order by email), null, null, email, now()
from auth.users
where email like 'admin%@ppst.ums.local';

-- ============================================================================
-- 100 Lecturers
-- ============================================================================
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email, created_at)
select id, 'lecturer'::user_role, 'LEC' || lpad(row_number() over (order by email)::text, 4, '0'),
       'IC-LEC-' || lpad(row_number() over (order by email)::text, 4, '0'),
       'Dr. Lecturer ' || row_number() over (order by email), null, null, email, now()
from auth.users
where email like 'lecturer%@ppst.ums.local';

-- ============================================================================
-- 1200 Students (FS / FT / FA / FX)
-- ============================================================================
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

-- ============================================================================
-- Mentor Groups
-- ============================================================================
insert into public.mentor_groups (lecturer_id, group_name)
select id, 'Group ' || matric_number
from public.users where role = 'lecturer'
on conflict (lecturer_id) do nothing;

-- ============================================================================
-- Auto-assign random mentors to all students
-- ============================================================================
with random_mentors as (
  select s.id as student_id, l.id as mentor_id
  from public.users s
  join lateral (
    select id from public.users where role = 'lecturer' order by random() limit 1
  ) l on true
  where s.role = 'student' and s.mentor_id is null
)
update public.users s set mentor_id = rm.mentor_id
from random_mentors rm where s.id = rm.student_id;

-- ============================================================================
-- Sample data (announcements, tasks, submissions, messages, notifications)
-- ============================================================================
insert into public.announcements (lecturer_id, title, content)
select id, 'Weekly Check-in', 'Please update your progress log before Friday.'
from public.users where role = 'lecturer' and email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

insert into public.tasks (id, lecturer_id, title, description, due_date, priority)
select gen_random_uuid(), id, 'Reflection', 'Write a 1-page learning reflection.', now() + interval '7 days', 'medium'::task_priority
from public.users where role = 'lecturer' and email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

insert into public.task_submissions (task_id, student_id, file, status, submitted_at)
select t.id, s.id, 'task-submissions/' || s.id::text || '/reflection.pdf', 'submitted'::submission_status, now() - interval '1 day'
from public.tasks t cross join lateral (select id from public.users where role = 'student' order by random() limit 5) s
where t.lecturer_id in (select id from public.users where email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local'));

insert into public.messages (sender_id, receiver_id, message)
select l.id, s.id, 'Hi ' || s.name || ', great progress!'
from public.users l join lateral (select id, name from public.users where role = 'student' and mentor_id = l.id limit 1) s on true
where l.email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local');

insert into public.messages (sender_id, group_id, message)
select u.id, mg.id, 'Welcome to the mentoring group.'
from public.users u join public.mentor_groups mg on mg.lecturer_id = u.id
where u.email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local')
limit 3;

insert into public.notifications (user_id, title, body, is_read)
select s.id, 'New Task Assigned', 'Your mentor assigned a new task.', false
from public.users s join public.users m on s.mentor_id = m.id
where m.email in ('lecturer1@ppst.ums.local','lecturer2@ppst.ums.local','lecturer3@ppst.ums.local')
order by random() limit 20;

commit;

select 
  count(*) filter (where role = 'admin') as admins,
  count(*) filter (where role = 'lecturer') as lecturers,
  count(*) filter (where role = 'student') as students,
  count(*) as total
from public.users
where email like 'lecturer%@ppst.ums.local'
   or email like 'student%@ppst.ums.local'
   or email like 'admin%@ppst.ums.local';
