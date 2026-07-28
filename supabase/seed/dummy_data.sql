-- Dummy app data for quick manual testing.
--
-- Step 1: Create three Auth users first in Supabase Auth dashboard with these
-- emails and the same password (example: Test123!):
--   - student1@ppst.ums.local
--   - lecturer1@ppst.ums.local
--   - admin1@ppst.ums.local
--
-- Step 2: Replace UUID placeholders below with the real Auth user IDs.
-- Step 3: Run this script in SQL editor.

begin;

-- Profiles
insert into public.users (id, role, matric_number, ic_number, name, programme, mentor_id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'lecturer', 'LEC0001', 'Test123!', 'Dr. Nur Amalina', null, null, 'lecturer1@ppst.ums.local'),
  ('22222222-2222-2222-2222-222222222222', 'admin', 'ADM0001', 'Test123!', 'Admin PPST', null, null, 'admin1@ppst.ums.local'),
  ('33333333-3333-3333-3333-333333333333', 'student', 'BS2401001', 'Test123!', 'Aiman Hakim', 'Asasi Sains', '11111111-1111-1111-1111-111111111111', 'student1@ppst.ums.local')
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
values ('11111111-1111-1111-1111-111111111111', 'Asasi Sains Group A')
on conflict (lecturer_id) do update
set group_name = excluded.group_name;

-- Announcement
insert into public.announcements (lecturer_id, title, content)
values (
  '11111111-1111-1111-1111-111111111111',
  'Welcome to Mentoring Week',
  'Please check your first assignment and submit before Friday 5PM.'
);

-- Task
insert into public.tasks (id, lecturer_id, title, description, due_date, priority)
values (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'Weekly Reflection 01',
  'Write a 1-page reflection about your learning goals this semester.',
  now() + interval '7 days',
  'medium'
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  due_date = excluded.due_date,
  priority = excluded.priority;

-- Task submission (already submitted)
insert into public.task_submissions (task_id, student_id, file, status, feedback, submitted_at)
values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'task-submissions/33333333-3333-3333-3333-333333333333/reflection01.pdf',
  'submitted',
  null,
  now() - interval '1 day'
)
on conflict (task_id, student_id) do update
set
  file = excluded.file,
  status = excluded.status,
  feedback = excluded.feedback,
  submitted_at = excluded.submitted_at;

-- Personal message
insert into public.messages (sender_id, receiver_id, message)
values (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Hi Aiman, let me know if you need help with your reflection.'
);

-- Group message
insert into public.messages (sender_id, group_id, message)
select
  '11111111-1111-1111-1111-111111111111',
  mg.id,
  'Group update: next mentoring check-in is Thursday 2PM.'
from public.mentor_groups mg
where mg.lecturer_id = '11111111-1111-1111-1111-111111111111'
limit 1;

-- Notifications
insert into public.notifications (user_id, title, body, is_read)
values
  (
    '33333333-3333-3333-3333-333333333333',
    'New Task Assigned',
    'Weekly Reflection 01 was assigned by your mentor.',
    false
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Submission Received',
    'Aiman Hakim submitted Weekly Reflection 01.',
    false
  );

commit;