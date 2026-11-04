create table public.internal_staff_notes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index internal_staff_notes_target_idx
  on public.internal_staff_notes (target_user_id, created_at desc);

alter table public.internal_staff_notes enable row level security;

create policy "internal_notes_select_admin_or_assigned_mentor" on public.internal_staff_notes
  for select using (
    public.is_admin()
    or author_id = auth.uid()
    or exists (
      select 1
      from public.users target
      where target.id = target_user_id
        and (
          (target.role = 'lecturer' and target.id = auth.uid())
          or (target.role = 'student' and target.mentor_id = auth.uid())
        )
    )
  );

create policy "internal_notes_insert_admin_or_mentor" on public.internal_staff_notes
  for insert with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.users target
        where target.id = target_user_id
          and target.role = 'student'
          and target.mentor_id = auth.uid()
      )
    )
  );
