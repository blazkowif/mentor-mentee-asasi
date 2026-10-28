# UMS PPST Mentor-Mentee Management System

## 1. Document purpose

This document is the system-level overview of the UMS PPST Mentor-Mentee
Management System. It explains what the application does, who uses it, how the
main workflows operate, how the frontend and Supabase backend fit together,
and what remains incomplete or requires operational attention.

The documentation is based on the implementation in this repository. It
describes the current working template, not a future-state product
specification.

## 2. System summary

The system is a web application for managing mentor-mentee relationships in a
university foundation/preparatory programme. It gives students and lecturers a
shared workspace for:

- mentor assignment and relationship visibility;
- dashboards tailored to the signed-in role;
- tasks, file submissions, reviews, feedback, and completion status;
- lecturer announcements and administrator-wide announcements;
- scoped personal and mentor-group chat;
- notifications and read/unread state;
- profile viewing, profile editing, and profile images; and
- administrative account, assignment, search, and bulk-import operations.

The application is a single-page React frontend. It does not use a separate
custom backend server. Supabase provides authentication, PostgreSQL data
storage, Row Level Security (RLS), Realtime events, Storage buckets, and an
Edge Function for privileged account administration.

## 3. Primary users and responsibilities

### Student

Students are pre-created accounts. A student signs in with a matriculation
number and IC number, sees the lecturer assigned as their mentor, and works
within that mentor's scope.

Student capabilities include:

- viewing the student dashboard;
- viewing the assigned mentor and mentor-group information;
- viewing mentor tasks and due dates;
- uploading or replacing a task submission;
- viewing submission status and lecturer feedback;
- reading mentor and global announcements;
- sending personal messages to permitted users;
- participating in the applicable mentor group chat;
- searching the permitted student chat directory;
- viewing and updating allowed profile fields;
- uploading a profile image;
- viewing notifications and marking them read; and
- being automatically signed out after inactivity.

### Lecturer

Lecturers are mentors. Each lecturer can have one mentor group, and students
are associated with a lecturer through `users.mentor_id`.

Lecturer capabilities include:

- viewing the lecturer dashboard and mentee list;
- creating, updating, and deleting tasks;
- attaching task resources;
- viewing student submissions for lecturer-owned tasks;
- reviewing submissions, setting status, and writing feedback;
- creating and deleting announcements;
- attaching announcement resources;
- using scoped personal and group chat;
- viewing and updating allowed profile fields;
- uploading a profile image; and
- viewing and managing notifications.

### Administrator

Administrators have system-wide management capabilities. The administrative
surface is available under `/admin/*` and is additionally protected by a
client-side role guard and database policies.

Administrator capabilities include:

- viewing the administrator dashboard;
- searching students and lecturers;
- viewing user details and activity records;
- creating and updating managed accounts;
- deleting individual accounts;
- deleting all student accounts after an exact confirmation phrase;
- importing students from `.xlsx`, `.xls`, or CSV files;
- mapping Malay student-import fields into application fields;
- choosing the source of imported passwords, with KP selected by the import
  workflow;
- assigning or unassigning mentors individually or in bulk;
- auto-assigning currently unassigned students to available lecturers;
- creating and deleting mentor assignments;
- communicating with staff and students through permitted chat paths; and
- publishing global announcements.

The administrator account must already exist before the account-management
Edge Function can create other accounts.

## 4. Technology architecture

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- TanStack Query for server-state fetching and mutation caching
- Zustand for the current application user and role
- `date-fns` for date formatting and comparisons
- `xlsx` for spreadsheet import

The application entry point is `src/main.tsx`. It creates the React root,
wraps the app in `QueryClientProvider` and `BrowserRouter`, and loads the
global stylesheet.

### Backend platform

- Supabase Auth for email/password sessions
- Supabase PostgreSQL for application data
- PostgreSQL functions and triggers for role lookup, login translation,
  mentor-group membership, and activity logging
- Supabase RLS for database authorization
- Supabase Realtime for message inserts and deletes
- Supabase Storage for profile images and file attachments
- Supabase Edge Functions for operations requiring the Auth Admin API

### Deployment

Vercel is configured to:

1. install dependencies with `npm install`;
2. build with `npm run build`;
3. publish `dist`; and
4. rewrite all routes to `index.html` for client-side routing.

The deployment configuration is in `vercel.json`.

## 5. Runtime request and state flow

1. The browser loads the Vite bundle.
2. `src/lib/supabase.ts` creates a typed Supabase client using
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `App` mounts `useAuth` and `useAutoLogout`.
4. `useAuth` reads the current Supabase session, loads the corresponding
   `public.users` profile, and listens for Auth state changes.
5. Zustand stores the profile and role in `authStore`.
6. `ProtectedRoute` blocks unauthenticated users and redirects unauthorized
   roles to `/dashboard`.
7. Feature hooks use TanStack Query to call service functions.
8. Service functions call Supabase tables, RPC functions, Storage, or the
   `admin-user` Edge Function.
9. PostgreSQL RLS evaluates the request using `auth.uid()`, the current role,
   and mentor relationships. Client guards are therefore a UX layer, not the
   security boundary.
10. Chat hooks add Supabase Realtime subscriptions and invalidate/update query
    state when messages change.

## 6. Application routes

| Route | Audience | Purpose |
|---|---|---|
| `/login` | Student/general | Matric-number and IC-number login |
| `/staff-login` | Staff | Staff email/password login |
| `/dashboard` | Authenticated users | Role-specific dashboard router |
| `/chat` | Authenticated users | Personal and mentor-group chat |
| `/tasks` | Authenticated users | Task list, submissions, and review workflows |
| `/announcements` | Authenticated users | Announcement feed and lecturer management |
| `/notifications` | Authenticated users | Notification list and read state |
| `/profile` | Authenticated users | Profile display and editable profile fields |
| `/admin/dashboard` | Admin | Administrative overview |
| `/admin/assignment` | Admin | Mentor assignment operations |
| `/admin/search` | Admin | Search across managed users |
| `/admin/student/:id` | Admin | Student detail view |
| `/admin/lecturer/:id` | Admin | Lecturer detail view |
| `/admin/control` | Admin | Account, import, announcement, and control operations |

Unknown routes redirect to `/dashboard`. Unauthenticated access to protected
routes redirects to `/login`.

## 7. Feature architecture

Feature code is grouped under `src/features`. Each feature generally contains
page components, hooks, and feature-specific components, while cross-feature
Supabase calls are kept in `src/services`.

### Authentication

`authService.ts` supports two login forms:

- **Matric-number login:** calls the `get_login_email` RPC to translate a
  matric number into the synthetic Auth email, then signs in with the IC
  number as the password.
- **Staff email login:** signs in directly with email and password.

The synthetic-email approach exists because Supabase Auth natively accepts
email/password credentials. Imported student accounts use an address such as
`a12345@student.local` internally; the student does not need to enter that
address.

Authentication sessions persist and refresh through Supabase Auth. The
application also signs an active user out after 30 minutes without click,
keyboard, pointer, scroll, or touch activity.

### Dashboards

`DashboardRouter` selects a dashboard from the profile role:

- `StudentDashboard`: mentor information, tasks, announcements, and
  notification-oriented student information;
- `LecturerDashboard`: mentee count/list, task information, and upcoming work;
- `AdminDashboard`: administrative activity and assignment-oriented controls.

### Tasks and submissions

Tasks belong to a lecturer. Students read tasks through their current mentor
scope. A student submission is uniquely identified by `(task_id, student_id)`,
so a new submission updates the existing submission instead of creating a
version history.

Submission states are:

`pending -> submitted -> reviewed -> completed`

Lecturers can review submissions belonging to their tasks and add feedback.
The database prevents students from changing a submission after it has moved
past the student-editable states.

### Announcements

Lecturers publish announcements to their own mentor scope. Administrators can
publish global announcements using the `is_global` flag. Students receive
announcements from their mentor and global announcements.

### Chat

The chat model supports:

- direct messages;
- mentor-group messages;
- student-to-student messaging where permitted;
- administrator-to-staff and administrator-to-student messaging;
- message attachments; and
- participant-authorized message deletion.

Personal conversations are filtered to the two participants. Group
conversations are scoped to a lecturer's group and the student's historical
group memberships. Realtime INSERT and DELETE events update active
conversations without a full page refresh.

### Notifications

The notification center lists up to 50 notifications for the current user and
supports marking one or all notifications as read. The current repository
contains the read/list UI and service functions, but no completed producer
pipeline for automatically creating notification rows.

### Profiles and files

Users can edit the profile fields exposed by the profile UI, including name,
phone, address, motto, and profile image. Administrators can manage a broader
set of imported identity and programme fields.

File paths are deliberately scoped so Storage policies can compare path
segments with authenticated user IDs. Private buckets require signed URLs.

## 8. Data model

The schema is defined by the ordered migrations in `supabase/migrations`.

### Core tables

| Table | Purpose | Important relationships |
|---|---|---|
| `users` | Application profile and role record for each `auth.users` row | Self-reference through `mentor_id` |
| `mentor_groups` | One group per lecturer | `lecturer_id -> users.id` |
| `mentor_group_memberships` | Historical and current student group membership | `group_id -> mentor_groups.id`, `student_id -> users.id` |
| `messages` | Direct and group chat messages | Sender/receiver/group references |
| `announcements` | Lecturer and global announcements | `lecturer_id -> users.id` |
| `tasks` | Lecturer-created work items | `lecturer_id -> users.id` |
| `task_submissions` | Student submission and review record | Unique task/student pair |
| `notifications` | User notification and read state | `user_id -> users.id` |
| `activity_logs` | Administrative/audit-oriented activity records | `user_id -> users.id` |

### `users`

The `users` table is the application profile layer over Supabase Auth. It
contains:

- role: `student`, `lecturer`, or `admin`;
- matric number and login-only IC number;
- name, email, phone, and profile image;
- programme and student-import demographic fields;
- mentor relationship;
- address and motto; and
- study status and channel.

The Auth user ID and profile ID are the same UUID. Deleting an Auth account
cascades to its profile and related records where configured.

### Message target invariant

`messages` has a check constraint requiring exactly one target:

- `receiver_id` for a personal message; or
- `group_id` for a group message.

This prevents a row from being ambiguously both personal and group-scoped.

### Mentor assignment invariant

Students use `mentor_id` to identify their current lecturer. Assignment
updates are logged and synchronized to group membership by database triggers.
Ending a mentor relationship records `ended_at` rather than destroying the
historical membership record.

### Database helper functions and triggers

Important database helpers include:

- `current_user_role()`;
- `is_admin()`;
- `current_mentor_id()`;
- `get_login_email(matric_number)`;
- `search_chat_users(query)`; and
- `list_chat_groups()`.

Important triggers include:

- mentor assignment activity logging; and
- mentor-group membership synchronization.

## 9. Authorization and privacy

### Defense in depth

The system uses two layers:

1. React route guards hide and redirect users in the browser.
2. PostgreSQL RLS and Storage policies enforce access for every API request.

The second layer is authoritative and protects the system even if a client is
modified or a request is made outside the UI.

### Scope rules

- Students can access their own profile, their mentor, their mentor's tasks
  and announcements, permitted chat users, and their own submissions.
- Lecturers can access their own profile, their assigned students, their own
  tasks and announcements, and submissions for their tasks.
- Administrators can access system-wide records permitted by admin policies.
- Direct messages are limited by relationship, role, or administrator
  privileges.
- Group messages are limited by lecturer ownership or student membership.
- Activity logs are readable by administrators; users can insert their own
  activity rows.

The `0006_scope_privacy.sql` migration specifically removes browser selection
of `ic_number` and tightens user update and message policies.

### Storage buckets

| Bucket | Visibility | Intended contents |
|---|---|---|
| `profile` | Public read; owner write | Avatar images |
| `announcements` | Private | Lecturer/global announcement attachments |
| `tasks` | Private | Task resource attachments |
| `submissions` | Private | Student task submissions |
| `chat` | Private | Chat attachments |

Each bucket has a 10 MB file limit and an allowlist of MIME types. Private
objects should be accessed through signed URLs, not public URLs.

### Sensitive data and credential handling

IC numbers are sensitive personal information and are intended only for the
initial login design. The repository notes that a long-term implementation
should consider forcing a password reset and reducing reliance on IC numbers
as standing passwords.

The frontend must never contain the Supabase service-role key. That key belongs
only in the `admin-user` Edge Function environment. Local credential files and
environment files must be treated as secrets and must not be committed or
published.

## 10. Administrative account management

The browser calls the `admin-user` Edge Function for create, update, delete,
and delete-all-students operations. The function:

1. requires an Authorization header;
2. creates a Supabase client using the caller's session to verify
   `current_user_role() = 'admin'`;
3. creates or updates Auth accounts with the service-role client;
4. upserts the matching `public.users` profile; and
5. returns a sanitized profile or operation result.

This keeps the Auth Admin API out of browser code. The destructive
`delete_all_students` operation requires the exact phrase
`I-hereby-ending-this-session`.

The spreadsheet importer maps source columns into the managed-user input
shape. Since the source format does not require an email column, the import
workflow generates a synthetic login email from `Nomatrik`.

## 11. Setup and deployment

### Local frontend setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set the following frontend variables:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### Supabase setup

1. Create or select a Supabase project.
2. Link the local project:

   ```bash
   supabase link --project-ref <your-project-ref>
   ```

3. Apply migrations in order:

   ```bash
   supabase db push
   ```

4. Deploy the privileged function:

   ```bash
   supabase functions deploy admin-user
   ```

5. Ensure the function has the project-provided
   `SUPABASE_SERVICE_ROLE_KEY` secret.
6. Create an initial administrator account and matching `public.users` row.
7. Seed or import lecturer and student accounts.
8. Ensure each lecturer has a mentor group and students have appropriate
   assignments.

Seed scripts are provided under `supabase/seed`. `scripts/seed-auth.mjs` is a
development utility for creating large sets of Auth users and requires a
service-role key; it must only be run against an intended development or test
project.

### Validation commands

```bash
npm run typecheck
npm run lint
npm run build
```

The production build emits the `dist` directory expected by Vercel.

## 12. Repository map

| Location | Responsibility |
|---|---|
| `src/main.tsx` | React application bootstrap |
| `src/App.tsx` | Global auth lifecycle and route mounting |
| `src/routes/index.tsx` | Public, authenticated, and admin routes |
| `src/features/` | Role and feature UI, hooks, and components |
| `src/services/` | Supabase data-access functions |
| `src/lib/supabase.ts` | Typed Supabase client |
| `src/lib/queryClient.ts` | TanStack Query client configuration |
| `src/types/database.types.ts` | Hand-maintained database type model |
| `src/layouts/` | Shared authenticated application layout |
| `src/components/` | Shared route/security/status UI |
| `supabase/migrations/` | Database schema, RLS, triggers, and storage policies |
| `supabase/functions/admin-user/` | Privileged account-management Edge Function |
| `supabase/seed/` | Development and demonstration SQL data |
| `scripts/seed-auth.mjs` | Development Auth-user seeding utility |
| `vercel.json` | Vercel build, output, and SPA rewrite configuration |
| `.env.example` | Required frontend environment variables |
| `docs/ADMIN_MODULE_SPEC.md` | Detailed administrative module specification |

## 13. Known limitations and follow-up work

The following items are visible in the current implementation and should be
addressed before treating the system as a fully hardened production product:

1. **Notification production pipeline:** notification listing and read state
   exist, but the repository does not yet create notification rows from task,
   announcement, submission, assignment, or message events.
2. **Notification INSERT policy:** the current `notifications_insert` policy
   is intentionally permissive while the notification producer is undecided.
   It should be tightened when inserts move to trusted triggers, an Edge
   Function, or another defined producer.
3. **IC-as-password design:** imported accounts use IC numbers as the initial
   password. A first-login reset or another credential policy is recommended.
4. **Reporting and analytics:** administrator report/export features and
   login/activity/engagement charts are not implemented in this increment.
5. **Presence:** the application does not currently provide “online now” or
   realtime presence indicators.
6. **Lecturer profile fields:** staff ID and faculty fields described in the
   broader product requirements are not currently represented in the shared
   profile schema.
7. **Submission version history:** resubmission updates one row. Historical
   versions are not retained.
8. **Generated database types:** `src/types/database.types.ts` is hand-authored
   and should be regenerated from the linked live schema whenever migrations
   change.
9. **Operational audit coverage:** mentor assignment logging exists, but a
   complete audit trail for every administrative action is not yet present.
10. **Import safeguards:** bulk import and bulk deletion should be tested with
    production-sized files and backed by an explicit backup/rollback
    procedure.

## 14. Recommended operational checklist

Before a production release:

- confirm all migrations have been applied in order;
- verify RLS and Storage policies against student, lecturer, and admin test
  accounts;
- deploy and smoke-test the `admin-user` Edge Function;
- verify no service-role key is present in frontend variables or committed
  files;
- establish a first-login password-reset policy;
- test CSV/XLS/XLSX imports with duplicate and malformed rows;
- test account deletion and the delete-all-students confirmation flow in a
  non-production project;
- confirm private attachments are served with signed URLs;
- define the trusted notification producer and remove the permissive insert
  policy;
- regenerate database types from the live schema;
- run typecheck, lint, and production build; and
- configure database backups and an incident/rollback process.

