-- Dummy app data for quick manual testing.
--
-- Step 1: Create three Auth users first in Supabase Auth dashboard with these
-- emails and the same password (example: Test123!):
--   - student1@ppst.ums.local
--   - lecturer1@ppst.ums.local
--   - admin1@ppst.ums.local
--
-- Step 2: Run this script in SQL editor. It resolves user IDs from auth.users
-- by email so you do not need manual UUID replacement.

begin;

do $$
declare
  lecturer_uuid uuid;
  admin_uuid uuid;
  student_uuid uuid;
begin
  select id into lecturer_uuid from auth.users where email = 'lecturer1@ppst.ums.local' limit 1;
  select id into admin_uuid from auth.users where email = 'admin1@ppst.ums.local' limit 1;
  select id into student_uuid from auth.users where email = 'student1@ppst.ums.local' limit 1;

  if lecturer_uuid is null or admin_uuid is null or student_uuid is null then
    raise exception 'Missing auth user(s). Create student1/lecturer1/admin1 accounts in Supabase Auth first.';
  end if;
end $$;

-- Profiles
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email)
select
lecturer.id,
'lecturer'::user_role,
'LEC0001',
  'Test123!',
  'Dr. Nur Amalina',
  null,
  null::uuid,
  'lecturer1@ppst.ums.local'
from auth.users lecturer
where lecturer.email = 'lecturer1@ppst.ums.local'
union all
select
admin_user.id,
'admin'::user_role,
'ADM0001',
  'Test123!',
  'Admin PPST',
  null,
  null::uuid,
  'admin1@ppst.ums.local'
from auth.users admin_user
where admin_user.email = 'admin1@ppst.ums.local'
union all
select
student.id,
'student'::user_role,
'BS2401001',
  'Test123!',
  'Aiman Hakim',
  'Asasi Sains',
  lecturer.id,
  'student1@ppst.ums.local'
from auth.users student
join auth.users lecturer on lecturer.email = 'lecturer1@ppst.ums.local'
where student.email = 'student1@ppst.ums.local'
on conflict (id) do update
set
  role = excluded.role,
  matric_number = excluded.matric_number,
  ic_number = excluded.ic_number,
  name = excluded.name,
  programme = excluded.programme,
  mentor_id = excluded.mentor_id,
  email = excluded.email;

-- One mentor group per lecturer
insert into public.mentor_groups (lecturer_id, group_name)
select u.id, 'Asasi Sains Group A'
from public.users u
where u.email = 'lecturer1@ppst.ums.local'
on conflict (lecturer_id) do update
set group_name = excluded.group_name;

-- Announcement
insert into public.announcements (lecturer_id, title, content)
select
  u.id,
  'Welcome to Mentoring Week',
  'Please check your first assignment and submit before Friday 5PM.'
from public.users u
where u.email = 'lecturer1@ppst.ums.local';

-- Task
insert into public.tasks (id, lecturer_id, title, description, due_date, priority)
select
  '44444444-4444-4444-4444-444444444444',
  u.id,
  'Weekly Reflection 01',
  'Write a 1-page reflection about your learning goals this semester.',
  now() + interval '7 days',
  'medium'::task_priority
from public.users u
where u.email = 'lecturer1@ppst.ums.local'
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  due_date = excluded.due_date,
  priority = excluded.priority;

-- Task submission (already submitted)
insert into public.task_submissions (task_id, student_id, file, status, feedback, submitted_at)
select
  '44444444-4444-4444-4444-444444444444',
  s.id,
  'task-submissions/student1/reflection01.pdf',
  'submitted'::submission_status,
  null,
  now() - interval '1 day'
from public.users s
where s.email = 'student1@ppst.ums.local'
on conflict (task_id, student_id) do update
set
  file = excluded.file,
  status = excluded.status,
  feedback = excluded.feedback,
  submitted_at = excluded.submitted_at;

-- Personal message
insert into public.messages (sender_id, receiver_id, message)
select
  l.id,
  s.id,
  'Hi Aiman, let me know if you need help with your reflection.'
from public.users l
join public.users s on s.email = 'student1@ppst.ums.local'
where l.email = 'lecturer1@ppst.ums.local';

-- Group message
insert into public.messages (sender_id, group_id, message)
select
  u.id,
  mg.id,
  'Group update: next mentoring check-in is Thursday 2PM.'
from public.mentor_groups mg
join public.users u on u.id = mg.lecturer_id
where u.email = 'lecturer1@ppst.ums.local'
limit 1;

-- Notifications
insert into public.notifications (user_id, title, body, is_read)
select
  s.id,
  'New Task Assigned',
  'Weekly Reflection 01 was assigned by your mentor.',
  false
from public.users s
where s.email = 'student1@ppst.ums.local'
union all
select
  l.id,
  'Submission Received',
  'Aiman Hakim submitted Weekly Reflection 01.',
  false
from public.users l
where l.email = 'lecturer1@ppst.ums.local';

commit;