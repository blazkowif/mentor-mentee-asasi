# UMS PPST — Mentor-Mentee Management System

A **working template** built from the project PRD (v1.0) — real data flows
against Supabase, not just static UI. Verified with `tsc -b` (clean) and
`npm run build` (succeeds). Ready for a developer to extend feature-by-feature.

## Stack

React + Vite + TypeScript + Tailwind CSS + React Router + TanStack Query +
Zustand, on Supabase (Postgres, Auth, Realtime, Storage, RLS). No separate
backend server.

## Getting started for developers

```bash
npm install
copy .env.example .env    # Windows
# cp .env.example .env    # macOS/Linux
npm run dev
```

The repository already contains the shared development Supabase URL and public
frontend key in `.env.example`. Copy the file as shown; do not edit the values.
Ask the project owner for an existing test account to log in.

The app connects directly to the already-configured Supabase project. The
database, authentication accounts, storage, and seed data are already set up.
Developers do not need the Supabase CLI, a local database, or any seed scripts
for normal frontend work. They should use the supplied test credentials and
avoid changing or deleting shared data.

Before opening a pull request, create a branch and run:

```bash
git checkout -b feature/short-description
npm run typecheck
npm run lint
npm run build
npm run dev
```

Push the branch and open a pull request into `main`. `.env` is ignored by Git
and must never be committed.

The frontend only uses the two `VITE_` variables. Never add a
`SUPABASE_SERVICE_ROLE_KEY` to this file or the frontend; it is privileged and
bypasses RLS. If a secret is ever committed or shared, rotate it in Supabase
immediately.

## Supabase maintenance

The shared Supabase project is maintained by the project owner. Developers
working on the frontend should not run migrations, seed scripts, or change the
shared database. The files in `supabase/migrations/` and `supabase/seed/` are
for database maintainers and isolated development projects only.

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
- **Admin** — dashboard with lecturer activity (mentee load per lecturer)
  and a student roster with assigned mentor. Minimal on purpose — see
  "Not yet built" below for the rest of PRD §14–15.
- **Supabase layer** — full schema, indexes, helper functions, and RLS
  policies for all 8 tables (`supabase/migrations/0001_init.sql`), storage
  buckets + path-scoped policies for all 5 buckets (`0002_storage.sql`).

## Not yet built

- **Admin**: user import (CSV), mentor (re)assignment UI, report/export
  (Excel/PDF, PRD §15), login/activity/engagement charts — the
  `activity_logs` table exists but nothing writes to it yet.
- **Notifications**: nothing currently *creates* notification rows (no
  triggers or Edge Function) — the center works once rows exist. The
  `notifications_insert` RLS policy is intentionally permissive for now;
  tighten it once you decide whether inserts come from a trigger, an Edge
  Function, or client-side.
- **Search** (PRD §16) — `useDebounce` hook is in `src/hooks/`, no query
  wired to it yet.
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









