# Admin Module — Technical Specification

## 1. Overview

Extend the existing admin subsystem into a full mentor-management console: course-centric dashboards, bulk/auto assignment, manual hand-pick assignment, per-student mentor inspection, and global search with activity logs.

**Scope:** Frontend-only build on top of existing Supabase schema + services. No new DB tables required.

---

## 2. Existing Assets To Leverage

| Asset | Location | Notes |
|-------|----------|-------|
| `ProtectedRoute` with `allowedRoles={['admin']}` | `src/components/ProtectedRoute.tsx` | Already blocks non-admins |
| Admin route block (empty) | `src/routes/index.tsx:32-36` | Needs child routes added |
| `AdminDashboard` (minimal) | `src/features/dashboard/AdminDashboard.tsx` | Current: stat cards + tables. Will be replaced/expanded |
| `listAllUsers()` | `src/services/userService.ts:42` | Returns all users ordered by role |
| `assignMentor(studentId, mentorId)` | `src/services/userService.ts:48` | Updates `mentor_id`, accepts `null` to unassign |
| `users.programme` | DB column | Values: `Asasi Sains`, `Asasi Teknologi`, `Asasi Agrisains`, `Asasi Sains Sosial` |
| `users.mentor_id` | DB column | Nullable FK to `users(id)` |
| `activity_logs` table | `supabase/migrations/0001_init.sql` | Exists but nothing writes to it yet |

---

## 3. New Service Requirements

All new services go in `src/services/adminService.ts`.

### 3.1 Query Services

```ts
// Students grouped by programme, with mentor info
getStudentsByProgramme(programme?: string): Promise<UserRow[]>

// Lecturers who can act as mentors
getAvailableMentors(): Promise<UserRow[]>

// Single user + their recent activity (messages, tasks, submissions)
getUserActivity(userId: string, limit = 20): Promise<ActivityLogRow[]>

// Search across students and lecturers
searchUsers(query: string): Promise<UserRow[]>
```

### 3.2 Mutation Services

```ts
// Bulk auto-assign: N random mentors to all unassigned students (optionally filtered by programme)
autoAssignMentors(options?: { programme?: string; count?: number }): Promise<{ assigned: number }>

// Manual single assign
assignMentor(studentId: string, mentorId: string | null): Promise<UserRow>

// Bulk manual assign: array of student IDs → one mentor
bulkAssignMentors(studentIds: string[], mentorId: string | null): Promise<{ assigned: number }>
```

### 3.3 Activity Log Population

Add a lightweight trigger or RPC to write to `activity_logs` on mentor assignment, so search results show meaningful history. This can be done via:

- **Option A (server-side, preferred):** Supabase PostgreSQL trigger on `users` UPDATE of `mentor_id`
- **Option B (client-side, fallback):** Call `insertActivityLog()` after every successful assignment mutation

Proposed trigger SQL (add to a new migration `supabase/migrations/0003_admin_triggers.sql`):

```sql
create or replace function public.log_mentor_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.mentor_id is distinct from OLD.mentor_id then
    insert into public.activity_logs (user_id, action)
    values (
      NEW.id,
      case
        when NEW.mentor_id is null then 'mentor_unassigned'
        else 'mentor_assigned_to_' || NEW.mentor_id::text
      end
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_mentor_assignment on public.users;
create trigger trg_mentor_assignment
after update of mentor_id on public.users
for each row
execute function public.log_mentor_assignment();
```

---

## 4. New Database Types

Extend `src/types/database.types.ts` (or rely on `supabase gen types typescript`) to include `activity_logs` if not already present:

```ts
export type ActivityAction =
  | 'mentor_assigned'
  | 'mentor_unassigned'
  | 'login'
  | 'task_submitted'
  | 'announcement_created'
  | string; // allow extensibility
```

---

## 5. Frontend Spec — Pages & Components

### 5.1 Route Additions

Add to `src/routes/index.tsx` inside the admin `ProtectedRoute` block:

```
/admin/dashboard      → AdminDashboard (rewritten)
/admin/assign         → AssignmentPage (new)
/admin/search         → AdminSearchPage (new)
/admin/student/:id    → StudentDetailDrawer/Page (new)
/admin/lecturer/:id   → LecturerDetailDrawer/Page (new)
```

### 5.2 Component Tree

```
features/admin/
├── AdminDashboard.tsx          # Course-centric dashboards (replaces current minimal one)
│   ├── CourseStatCards.tsx     # 4 cards: FS/FT/FA/FX student counts + unassigned counts
│   ├── LecturerActivityTable.tsx
│   └── UnassignedAlert.tsx     # Banner showing X students without mentors
│
├── AssignmentPage.tsx          # Main assignment workspace
│   ├── ProgrammeFilter.tsx     # Tabs/select: All | FS | FT | FA | FX
│   ├── MentorPool.tsx          # Sidebar: available lecturers with mentee count
│   ├── StudentTable.tsx        # Main table with checkboxes, mentor badge, assign button
│   └── AutoAssignPanel.tsx     # "Auto-assign all unassigned" + "Auto-assign by programme"
│
├── AdminSearchPage.tsx
│   ├── SearchBar.tsx
│   └── ActivityTimeline.tsx    # Chronological log for selected user
│
└── UserDetailPanel.tsx         # Shared drawer for student/lecturer detail
    ├── MentorInfoCard.tsx      # Shows assigned mentor (or "Unassigned")
    └── ActivityFeed.tsx        # From activity_logs
```

### 5.3 Page Mockups (textual wireframes)

#### AdminDashboard.tsx
```
┌─────────────────────────────────────────────┐
│  Admin Dashboard                    [Search] │
├────────┬────────┬────────┬──────────────────┤
│ FS     │ FT     │ FA     │ FX               │
│ 300    │ 300    │ 300    │ 300              │
│ 12 unass │ 8 un │ 5 un  │ 3 un             │
├────────┴────────┴────────┴──────────────────┤
│  Lecturer Activity (by course)               │
│  ┌─────────────────────────────────────────┐│
│  │ Dr. Nur Amalina | Asasi Sains | 45 ment ││
│  │ Dr. Ahmad Faiz  | Asasi Teknologi | 38 ││
│  └─────────────────────────────────────────┘│
│                                              │
│  Recent Activity Log (last 10)              │
│  • Dr. Ahmad assigned mentor to BS2401045   │
│  • Admin unassigned BS2401099               │
└──────────────────────────────────────────────┘
```

#### AssignmentPage.tsx
```
┌──────────────┬──────────────────────────────────┐
│  Mentor Pool │  Filters: [All] [FS] [FT] ...   │
│              │  Search: [___________]           │
│  ☐ Dr. Nur  │                                  │
│    45 mentees│  ☐ BS2401001 | FS | Dr. Nur     │
│  ☐ Dr. Ahmad│  ☐ BS2401002 | FS | —           │
│    38 mentees│  ☐ BS2401003 | FS | Dr. Ahmad   │
│  ☐ Dr. Siti │  ...                            │
│    42 mentees│                                  │
│              │  [Assign Selected → Dropdown ↓]  │
│ [Auto-assign│  [Auto-assign unassigned in FS]  │
│  all empty]  │                                  │
└──────────────┴──────────────────────────────────┘
```

#### UserDetailPanel (Drawer)
```
┌───────────────────────────────┐
│  BS2401001 — Aiman Hakim      │
│  Programme: Asasi Sains       │
│  Matric: BS2401001            │
├───────────────────────────────┤
│  Mentor                       │
│  ┌──────────────────────────┐ │
│  │ Dr. Nur Amalina   [View] │ │
│  │ Email: lecturer1@...     │ │
│  │ Mentees: 45              │ │
│  └──────────────────────────┘ │
├───────────────────────────────┤
│  Activity                     │
│  • 28 Jul — mentor assigned    │
│  • 25 Jul — task submitted     │
│  • 22 Jul — login             │
└───────────────────────────────┘
```

---

## 6. API / Query Keys Extension

Add to `src/lib/queryKeys.ts`:

```ts
export const adminKeys = {
  all: ['admin'] as const,
  students: (programme?: string) => [...adminKeys.all, 'students', programme] as const,
  mentors: () => [...adminKeys.all, 'mentors'] as const,
  activity: (userId: string) => [...adminKeys.all, 'activity', userId] as const,
  search: (q: string) => [...adminKeys.all, 'search', q] as const,
  unassigned: (programme?: string) => [...adminKeys.all, 'unassigned', programme] as const,
}
```

---

## 7. RLS / Security Notes

- `assignMentor` already covered by existing `users_update_own` + `users_admin_insert` policies (admin can update any row).
- New `getStudentsByProgramme` should use the existing `users_select_own_or_related` policy — admins already pass `public.is_admin()`.
- `activity_logs` select is admin-only per existing policy.
- **No new RLS policies required.**

---

## 8. Implementation Phases

### Phase 1 — Foundation (1 session)
1. Add admin routes to `routes/index.tsx`
2. Create `adminService.ts` with `getStudentsByProgramme`, `getAvailableMentors`, `searchUsers`
3. Add migration `0003_admin_triggers.sql` for mentor-assignment activity trigger
4. Create base layout shell (`features/admin/AdminLayout.tsx`) if sidebar navigation is desired

### Phase 2 — Dashboard Rewrite (1 session)
1. Replace `AdminDashboard.tsx` with course-centric cards + lecturer activity table
2. Add `CourseStatCards` and `LecturerActivityTable` components
3. Wire TanStack Query to new service functions

### Phase 3 — Assignment Module (1–2 sessions)
1. Build `AssignmentPage.tsx` with mentor pool sidebar + student table with checkboxes
2. Implement single `assignMentor` mutation with cache invalidation
3. Implement bulk `bulkAssignMentors` mutation
4. Implement `autoAssignMentors` (random assignment to unassigned students)
5. Add optimistic updates / toast feedback

### Phase 4 — Search & Detail (1 session)
1. Build `AdminSearchPage.tsx` with debounced search
2. Build `UserDetailPanel` drawer with `MentorInfoCard` + `ActivityFeed`
3. Integrate `getUserActivity` from `activity_logs`

### Phase 5 — Polish (optional)
1. Pagination / virtual scrolling for 1200+ student table
2. Export assigned mentor list (CSV)
3. Confirm password-reset flow for IC-based login (existing PRD note in `authService.ts`)

---

## 9. Non-Functional Requirements

- **Performance:** 1200 students page must remain usable. Use `@tanstack/react-virtual` or simple pagination (50/page).
- **Accessibility:** Tables require proper `scope` attributes; drawer requires focus trap.
- **Consistency:** Follow existing conventions — `@/` path aliases, `queryKeys` pattern, `clsx` for conditionals, existing Tailwind utility pattern.
- **Error Handling:** All mutations should surface Supabase errors via toast or inline alert. No unhandled promise rejections.

---

## 10. Out of Scope (Future)

- CSV bulk import / export (PRD §14–15 mentions this explicitly)
- Real-time presence indicators
- Lecturer-specific profile fields (Staff ID, Faculty)
- Activity-log charts/engagement metrics (data will exist once triggers fire; UI later)
