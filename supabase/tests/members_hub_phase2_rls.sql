-- Run after both Members Hub migrations in a disposable Supabase test project.
begin;
do $$
declare t text;
begin
 foreach t in array array['events','event_registrations','attendance_sessions','attendance_records','attendance_audit','tasks','task_assignments','task_submissions','task_status_history','announcements','notifications','documents','member_permissions'] loop
  if not (select relrowsecurity from pg_class where oid=to_regclass('public.'||t)) then raise exception 'RLS is not enabled on %',t; end if;
 end loop;
 if has_function_privilege('anon','public.register_for_event(uuid)','EXECUTE') then raise exception 'anon can execute event registration'; end if;
 if not has_function_privilege('authenticated','public.register_for_event(uuid)','EXECUTE') then raise exception 'authenticated cannot execute event registration'; end if;
 if has_table_privilege('authenticated','public.event_registrations','INSERT') then raise exception 'browser can directly insert event registrations'; end if;
 if has_table_privilege('authenticated','public.attendance_records','INSERT') then raise exception 'browser can directly insert attendance'; end if;
 if has_table_privilege('authenticated','public.member_permissions','INSERT') then raise exception 'browser can grant operational permissions'; end if;
 if not has_column_privilege('authenticated','public.notifications','read_at','UPDATE') then raise exception 'member cannot mark own notification read'; end if;
 if has_column_privilege('authenticated','public.notifications','title','UPDATE') then raise exception 'member can modify notification contents'; end if;
 if not exists(select 1 from storage.buckets where id='members-documents' and public=false) then raise exception 'members-documents bucket must exist and be private'; end if;
 if not exists(select 1 from storage.buckets where id='members-task-submissions' and public=false) then raise exception 'members-task-submissions bucket must exist and be private'; end if;
end $$;
rollback;
