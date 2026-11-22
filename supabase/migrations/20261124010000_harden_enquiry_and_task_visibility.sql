-- Production access hardening identified during the 2026-2027 BOD audit.
-- Apply only after confirming that 20261124000000_three_portal_office_bearer_security.sql
-- is present in the remote migration history.
--
-- Fixes:
-- 1. Task visibility must correlate assignments to the outer tasks.id. The old
--    unqualified `id` can bind to task_assignments.id inside the subquery.
-- 2. Enquiry administration must follow the same three-office-bearer allowlist
--    as the Admin Portal, rather than a separate enquiry_admins allowlist.

begin;

drop policy if exists "Task visibility" on public.tasks;
create policy "Task visibility"
  on public.tasks
  for select
  to authenticated
  using (
    (select public.has_operation_permission('tasks.manage'))
    or (
      (select public.is_active_member())
      and exists (
        select 1
        from public.task_assignments a
        where a.task_id = public.tasks.id
          and a.user_id = (select auth.uid())
      )
    )
  );

create or replace function public.is_enquiry_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.is_office_bearer_admin());
$$;
revoke all on function public.is_enquiry_admin() from public, anon;
grant execute on function public.is_enquiry_admin() to authenticated;

commit;
