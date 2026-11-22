-- Run with: npx supabase test db
-- This smoke test validates privilege boundaries without creating or changing users.
begin;
do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='club_office_bearers' and c.relrowsecurity
  ) then raise exception 'club_office_bearers must have RLS enabled'; end if;

  if has_table_privilege('anon','public.club_office_bearers','select,insert,update,delete') then
    raise exception 'anon must not access the office-bearer allowlist';
  end if;
  if has_table_privilege('authenticated','public.club_office_bearers','select,insert,update,delete') then
    raise exception 'authenticated must not access or modify the office-bearer allowlist';
  end if;
  if not has_function_privilege('authenticated','public.is_office_bearer_admin()','execute') then
    raise exception 'authenticated users must be able to call the boolean authorization check';
  end if;

  if public.is_office_bearer_admin() then
    raise exception 'a database session without a signed-in user must not be an office-bearer admin';
  end if;
  if public.has_member_role(array['admin','super_admin']) then
    raise exception 'a database session without a signed-in user must not have an admin role';
  end if;
  if public.has_operation_permission('members.manage') then
    raise exception 'a database session without a signed-in user must not have administrative permissions';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='has_operation_permission'
      and pg_get_functiondef(p.oid) ilike '%is_office_bearer_admin%'
  ) then raise exception 'has_operation_permission must enforce office-bearer eligibility'; end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='is_office_bearer_admin'
      and pg_get_functiondef(p.oid) ilike '%member_roles%'
      and pg_get_functiondef(p.oid) ilike '%role = ''admin''%'
      and pg_get_functiondef(p.oid) ilike '%club_office_bearers%'
  ) then raise exception 'admin authorization must require both the admin role and office-bearer record'; end if;

  if exists (select 1 from public.member_roles where role='super_admin') then
    raise exception 'super_admin role rows must not remain after the corrective migration';
  end if;
  if exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='member_roles'
      and c.contype='c' and pg_get_constraintdef(c.oid) ilike '%super_admin%'
  ) then raise exception 'member_roles must not permit super_admin'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='member_invitations' and column_name='role'
  ) then raise exception 'member invitations must retain the requested member role'; end if;
end;
$$;
rollback;
