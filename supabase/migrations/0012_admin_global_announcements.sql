alter table public.announcements
  add column if not exists is_global boolean not null default false;

create index if not exists announcements_global_idx
  on public.announcements (is_global, created_at desc);

drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements
  for select using (
    public.is_admin()
    or is_global = true
    or lecturer_id = auth.uid()
    or lecturer_id = public.current_mentor_id()
  );
