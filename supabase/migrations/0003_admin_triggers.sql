-- ============================================================================
-- Migration 0003: Admin triggers
-- Logs mentor assignment changes into activity_logs automatically.
-- ============================================================================

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
      coalesce(
        case
          when NEW.mentor_id is null then 'mentor_unassigned'
          else 'mentor_assigned_to_' || NEW.mentor_id::text
        end,
        'mentor_updated'
      )
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
