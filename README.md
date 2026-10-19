# UMS PPST — Mentor-Mentee Management System

A **working template** built from the project PRD (v1.0) — real data flows
against Supabase, not just static UI. Verified with `tsc -b` (clean) and
`npm run build` (succeeds). Ready for a developer to extend feature-by-feature.

## Stack

React + Vite + TypeScript + Tailwind CSS + React Router + TanStack Query +
Zustand, on Supabase (Postgres, Auth, Realtime, Storage, RLS). No separate
backend server.

## Getting started

```bash
npm install
cp .env.example .env      # fill in your Supabase project URL + anon key
npm run dev
```

## Setting up Supabase

1. Create a project at supabase.com.
2. Push the schema:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   (or paste the migrations into the SQL editor in filename order, including
   `0012_admin_global_announcements.sql`).
3. Create at least one lecturer + one student `auth.users` row (see the
   login design note below), then insert matching `public.users` rows per
   `supabase/seed/seed.sql`, and a `mentor_groups` row for the lecturer, so
   there's something to see in the dashboards/chat/tasks.

## What's working

- **Auth** — matric-number/IC login (`LoginPage.tsx`, `authService.ts`), a
  Zustand session store, and role-based route guarding (`ProtectedRoute.tsx`).
  **Read the design note in `authService.ts` first**: Supabase Auth is
  email/password native, so this maps a matric number to a synthetic email
  via a `get_login_email` RPC. Decide during account-import build-out
  whether IC-as-password is acceptable long-term or should force a reset.
- **Student** — dashboard (mentor info, upcoming tasks, recent
  announcements, notification count), task list with file-upload
  submission, announcement feed, personal + group chat with realtime
  updates, notification center, profile view/edit with avatar upload.
- **Lecturer** — dashboard (mentee count, task count, upcoming deadlines,
  mentee list), task create/list/delete with a submissions review panel
  (mark reviewed/completed + feedback), announcement create/list/delete,
  same chat/notifications/profile as above.
- **Admin** — dashboard with lecturer activity and assignment tools, plus
  `/admin/control` for user creation/deletion, password changes, `.xlsx`/`.xls`
  /CSV import with column mapping, lecturer-inclusive search, assignment
  creation/deletion, and global announcement management.
- **Supabase layer** — full schema, indexes, helper functions, and RLS
  policies for all 8 tables (`supabase/migrations/0001_init.sql`), storage
  buckets + path-scoped policies for all 5 buckets (`0002_storage.sql`).

## Not yet built

- **Admin**: report/export (Excel/PDF, PRD §15) and login/activity/engagement
  charts remain outside this increment.
- **Notifications**: nothing currently *creates* notification rows (no
  triggers or Edge Function) — the center works once rows exist. The
  `notifications_insert` RLS policy is intentionally permissive for now;
  tighten it once you decide whether inserts come from a trigger, an Edge
  Function, or client-side.
- Real-time presence / "online now" indicators.
- Lecturer-specific profile fields (Staff ID, Faculty from PRD §17) — the
  shared `users` table (PRD §19) doesn't have columns for these yet.

## Notes / decisions worth revisiting

- `users.ic_number` is sensitive PII stored for login purposes only — RLS
  restricts it to the row owner and admins, but consider whether it should
  be stored at all post-first-login (see auth note above).
- `messages` distinguishes personal vs. group via a check constraint
  (exactly one of `receiver_id` / `group_id` set).
- `task_submissions` has a unique `(task_id, student_id)` constraint — one
  submission per student per task, updated in place rather than versioned.
- `src/types/database.types.ts` is hand-authored to match the migration.
  Regenerate it from the live schema once the project is linked:
  `npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts`.
- Account creation and password changes use the `admin-user` Supabase Edge
  Function, because the Auth Admin API must never run in the browser. Deploy it
  after linking with `supabase functions deploy admin-user`. The function uses
  the project-provided `SUPABASE_SERVICE_ROLE_KEY` secret. The admin account
  must already exist before it can create other accounts.


## For developer testing

- clone the project and type **npm run dev** to view the machine locally. env file will be provided once u contact me.
