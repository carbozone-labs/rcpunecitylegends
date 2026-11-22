-- Phase 2 operations modules. Apply after the Phase 1 members-hub migration.
begin;

create table if not exists public.member_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('events.manage','attendance.manage','tasks.manage','documents.manage','announcements.manage')),
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(user_id, permission)
);
alter table public.member_permissions enable row level security;
revoke all on public.member_permissions from anon, authenticated;
grant select on public.member_permissions to authenticated;
create policy "Users read own operational permissions" on public.member_permissions for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.members m where m.id=(select auth.uid()) and m.membership_status='active')
 and exists(select 1 from public.member_roles r where r.user_id=(select auth.uid()) and r.role in ('member','board_member','admin','super_admin'));
$$;
revoke all on function public.is_active_member() from public,anon;
grant execute on function public.is_active_member() to authenticated;

create or replace function public.has_operation_permission(permission_name text)
returns boolean language sql stable security definer set search_path = '' as $$
 select (select public.is_active_member()) and (exists(select 1 from public.member_roles r where r.user_id=(select auth.uid()) and r.role in ('admin','super_admin'))
 or exists(select 1 from public.member_permissions p where p.user_id=(select auth.uid()) and p.permission=permission_name));
$$;
revoke all on function public.has_operation_permission(text) from public, anon;
grant execute on function public.has_operation_permission(text) to authenticated;

create table if not exists public.events (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 180), slug text not null unique,
 description text not null default '', image_url text, category text not null default 'Club', starts_at timestamptz not null, ends_at timestamptz not null,
 venue text, location text, registration_deadline timestamptz, capacity integer check(capacity is null or capacity > 0),
 status text not null default 'draft' check(status in ('draft','published','cancelled','completed')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at > starts_at), check(registration_deadline is null or registration_deadline <= starts_at)
);
create index if not exists events_start_status_idx on public.events(status, starts_at);
create table if not exists public.event_registrations (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, status text not null default 'registered' check(status in ('registered','cancelled','attended','waitlisted')),
 registered_at timestamptz not null default now(), cancelled_at timestamptz, unique(event_id,user_id)
);
create index if not exists event_registrations_user_idx on public.event_registrations(user_id,registered_at desc);

create or replace function public.register_for_event(target_event uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; occupied integer; existing_status text;
begin
 if (select auth.uid()) is null or not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 select * into e from public.events where id=target_event for update;
 if not found or e.status <> 'published' then raise exception 'Event is not open for registration' using errcode='P0001'; end if;
 if e.registration_deadline is not null and now() > e.registration_deadline then raise exception 'Registration deadline has passed' using errcode='P0001'; end if;
 select status into existing_status from public.event_registrations where event_id=target_event and user_id=(select auth.uid());
 if existing_status = 'registered' or existing_status = 'attended' then raise exception 'Already registered' using errcode='23505'; end if;
 select count(*) into occupied from public.event_registrations where event_id=target_event and status in ('registered','attended');
 if e.capacity is not null and occupied >= e.capacity then raise exception 'Event is full' using errcode='P0001'; end if;
 insert into public.event_registrations(event_id,user_id,status,registered_at,cancelled_at) values(target_event,(select auth.uid()),'registered',now(),null)
 on conflict(event_id,user_id) do update set status='registered',registered_at=now(),cancelled_at=null;
 return 'registered';
end; $$;
revoke all on function public.register_for_event(uuid) from public, anon;
grant execute on function public.register_for_event(uuid) to authenticated;

create or replace function public.cancel_event_registration(target_event uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype;
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 select * into e from public.events where id=target_event;
 if not found then raise exception 'Event not found'; end if;
 if e.starts_at <= now() then raise exception 'Registration can no longer be cancelled'; end if;
 update public.event_registrations set status='cancelled',cancelled_at=now() where event_id=target_event and user_id=(select auth.uid()) and status='registered';
 if not found then raise exception 'Active registration not found'; end if;
end; $$;
revoke all on function public.cancel_event_registration(uuid) from public, anon;
grant execute on function public.cancel_event_registration(uuid) to authenticated;

create table if not exists public.attendance_sessions (
 id uuid primary key default gen_random_uuid(), event_id uuid references public.events(id) on delete cascade,
 title text not null, starts_at timestamptz not null, ends_at timestamptz, session_type text not null default 'event' check(session_type in ('event','meeting','other')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), check(ends_at is null or ends_at > starts_at)
);
create table if not exists public.attendance_records (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.attendance_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, attendance_status text not null check(attendance_status in ('present','absent','late','excused')),
 marked_by uuid not null references auth.users(id), marked_at timestamptz not null default now(), notes text, unique(session_id,user_id)
);
create table if not exists public.attendance_audit (
 id uuid primary key default gen_random_uuid(), attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
 old_status text, new_status text not null, changed_by uuid not null references auth.users(id), reason text not null, changed_at timestamptz not null default now()
);

create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 180), description text not null default '',
 priority text not null default 'medium' check(priority in ('low','medium','high','urgent')), due_at timestamptz,
 status text not null default 'Assigned' check(status in ('Assigned','In Progress','Submitted','Approved','Rejected','Cancelled')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.task_assignments (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, assigned_by uuid not null references auth.users(id), assigned_at timestamptz not null default now(), unique(task_id,user_id)
);
create table if not exists public.task_submissions (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, submission_text text not null default '', attachment_path text,
 submitted_at timestamptz not null default now(), review_status text not null default 'Submitted' check(review_status in ('Submitted','Approved','Rejected')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, review_comment text
);
create table if not exists public.task_status_history (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, old_status text, new_status text not null,
 changed_by uuid not null references auth.users(id), comment text, changed_at timestamptz not null default now()
);

create table if not exists public.announcements (
 id uuid primary key default gen_random_uuid(), title text not null, message text not null,
 category text not null default 'General', priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 published_at timestamptz, expires_at timestamptz, audience text not null default 'all' check(audience in ('all','members','board','admins')),
 author_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, message text not null, category text not null default 'general', link text,
 read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(), title text not null, description text not null default '',
 category text not null check(category in ('Club policies','Meeting documents','Event resources','Project documents','Training materials')),
 storage_path text not null unique, mime_type text not null, file_size bigint not null check(file_size between 1 and 20971520),
 audience text not null default 'all' check(audience in ('all','board','admins')),
 uploaded_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

-- RLS and least-privilege grants.
do $$ declare t text; begin
 foreach t in array array['events','event_registrations','attendance_sessions','attendance_records','attendance_audit','tasks','task_assignments','task_submissions','task_status_history','announcements','notifications','documents'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;

grant select on public.events to authenticated;
grant insert,update,delete on public.events to authenticated;
create policy "Members view published events" on public.events for select to authenticated using((status='published' and (select public.is_active_member())) or (select public.has_operation_permission('events.manage')));
create policy "Authorized event managers create" on public.events for insert to authenticated with check((select public.has_operation_permission('events.manage')) and created_by=(select auth.uid()));
create policy "Authorized event managers update" on public.events for update to authenticated using((select public.has_operation_permission('events.manage'))) with check((select public.has_operation_permission('events.manage')));
create policy "Authorized event managers delete" on public.events for delete to authenticated using((select public.has_operation_permission('events.manage')));

grant select on public.event_registrations to authenticated;
create policy "Members view own event registrations" on public.event_registrations for select to authenticated using((user_id=(select auth.uid()) and (select public.is_active_member())) or (select public.has_operation_permission('events.manage')));

grant select on public.attendance_sessions to authenticated;
create policy "Members view attendance sessions" on public.attendance_sessions for select to authenticated using((select public.is_active_member()) or (select public.has_operation_permission('attendance.manage')));
grant select on public.attendance_records to authenticated;
create policy "Members view own attendance" on public.attendance_records for select to authenticated using((user_id=(select auth.uid()) and (select public.is_active_member())) or (select public.has_operation_permission('attendance.manage')));
grant select on public.attendance_audit to authenticated;
create policy "Managers view attendance audit" on public.attendance_audit for select to authenticated using((select public.has_operation_permission('attendance.manage')));

-- Task managers can manage task definitions/assignments; assignees see only their work.
grant select,insert,update,delete on public.tasks,public.task_assignments to authenticated;
create policy "Task visibility" on public.tasks for select to authenticated using((select public.has_operation_permission('tasks.manage')) or ((select public.is_active_member()) and exists(select 1 from public.task_assignments a where a.task_id=id and a.user_id=(select auth.uid()))));
create policy "Task manager insert" on public.tasks for insert to authenticated with check((select public.has_operation_permission('tasks.manage')) and created_by=(select auth.uid()));
create policy "Task manager update" on public.tasks for update to authenticated using((select public.has_operation_permission('tasks.manage'))) with check((select public.has_operation_permission('tasks.manage')));
create policy "Task manager delete" on public.tasks for delete to authenticated using((select public.has_operation_permission('tasks.manage')));
create policy "Assignment visibility" on public.task_assignments for select to authenticated using((user_id=(select auth.uid()) and (select public.is_active_member())) or (select public.has_operation_permission('tasks.manage')));
create policy "Task manager assignments" on public.task_assignments for all to authenticated using((select public.has_operation_permission('tasks.manage'))) with check((select public.has_operation_permission('tasks.manage')) and assigned_by=(select auth.uid()) and exists(select 1 from public.members m where m.id=user_id and m.membership_status='active'));

grant select,insert on public.task_submissions to authenticated;
grant update(review_status,reviewed_by,reviewed_at,review_comment) on public.task_submissions to authenticated;
create policy "Assignees and managers view submissions" on public.task_submissions for select to authenticated using((user_id=(select auth.uid()) and (select public.is_active_member())) or (select public.has_operation_permission('tasks.manage')));
create policy "Assignees submit own work" on public.task_submissions for insert to authenticated with check(user_id=(select auth.uid()) and (select public.is_active_member()) and exists(select 1 from public.task_assignments a where a.task_id=task_submissions.task_id and a.user_id=(select auth.uid())) and (attachment_path is null or attachment_path like (select auth.uid())::text || '/%'));
create policy "Task managers review submissions" on public.task_submissions for update to authenticated using((select public.has_operation_permission('tasks.manage'))) with check((select public.has_operation_permission('tasks.manage')) and reviewed_by=(select auth.uid()));

grant select on public.task_status_history to authenticated;
create policy "Assignees and managers view task history" on public.task_status_history for select to authenticated using((user_id=(select auth.uid()) and (select public.is_active_member())) or (select public.has_operation_permission('tasks.manage')));

grant select,insert,update,delete on public.announcements to authenticated;
create policy "Members view current announcements" on public.announcements for select to authenticated using((select public.is_active_member()) and published_at is not null and published_at<=now() and (expires_at is null or expires_at>now()) and (audience='all' or (audience='members' and (select public.has_member_role(array['member','board_member','admin','super_admin']))) or (audience='board' and (select public.has_member_role(array['board_member','admin','super_admin']))) or (audience='admins' and (select public.has_member_role(array['admin','super_admin'])))) or (select public.has_operation_permission('announcements.manage')));
create policy "Announcement managers write" on public.announcements for all to authenticated using((select public.has_operation_permission('announcements.manage'))) with check((select public.has_operation_permission('announcements.manage')) and author_id=(select auth.uid()));

grant select,update on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy "Members read own notifications" on public.notifications for select to authenticated using(user_id=(select auth.uid()) and (select public.is_active_member()));
create policy "Members update own notification read state" on public.notifications for update to authenticated using(user_id=(select auth.uid()) and (select public.is_active_member())) with check(user_id=(select auth.uid()) and (select public.is_active_member()));

grant select,insert,delete on public.documents to authenticated;
create policy "Members view authorized document metadata" on public.documents for select to authenticated using(((select public.is_active_member()) and (audience='all' or (audience='board' and (select public.has_member_role(array['board_member','admin','super_admin']))) or (audience='admins' and (select public.has_member_role(array['admin','super_admin']))) or (select public.has_operation_permission('documents.manage')))));
create policy "Document managers upload metadata" on public.documents for insert to authenticated with check((select public.has_operation_permission('documents.manage')) and uploaded_by=(select auth.uid()));
create policy "Document managers delete metadata" on public.documents for delete to authenticated using((select public.has_operation_permission('documents.manage')));


-- Attendance is written only through this audited manager-only RPC.
create or replace function public.mark_attendance(target_session uuid,target_user uuid,new_status text,change_reason text default 'Initial attendance mark')
returns void language plpgsql security definer set search_path = '' as $$
declare old_status text; record_id uuid;
begin
 if not (select public.has_operation_permission('attendance.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if not exists(select 1 from public.members m where m.id=target_user and m.membership_status='active') then raise exception 'Target is not an active member'; end if;
 if new_status is null or new_status not in ('present','absent','late','excused') then raise exception 'Invalid attendance status'; end if;
 select id,attendance_status into record_id,old_status from public.attendance_records where session_id=target_session and user_id=target_user for update;
 if record_id is null then
  insert into public.attendance_records(session_id,user_id,attendance_status,marked_by) values(target_session,target_user,new_status,(select auth.uid())) returning id into record_id;
 else
  update public.attendance_records set attendance_status=new_status,marked_by=(select auth.uid()),marked_at=now() where id=record_id;
 end if;
 insert into public.attendance_audit(attendance_record_id,old_status,new_status,changed_by,reason) values(record_id,old_status,new_status,(select auth.uid()),left(coalesce(change_reason,'Updated'),500));
end; $$;
revoke all on function public.mark_attendance(uuid,uuid,text,text) from public,anon;
grant execute on function public.mark_attendance(uuid,uuid,text,text) to authenticated;

grant insert,update,delete on public.attendance_sessions to authenticated;
create policy "Attendance managers create sessions" on public.attendance_sessions for insert to authenticated with check((select public.has_operation_permission('attendance.manage')) and created_by=(select auth.uid()));
create policy "Attendance managers update sessions" on public.attendance_sessions for update to authenticated using((select public.has_operation_permission('attendance.manage'))) with check((select public.has_operation_permission('attendance.manage')));
create policy "Attendance managers delete sessions" on public.attendance_sessions for delete to authenticated using((select public.has_operation_permission('attendance.manage')));

-- Private document bucket; object authorization mirrors metadata audience/manager permissions.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('members-documents','members-documents',false,20971520,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
create policy "Authorized members read documents storage" on storage.objects for select to authenticated using(bucket_id='members-documents' and exists(select 1 from public.documents d where d.storage_path=name and (d.audience='all' or (d.audience='board' and (select public.has_member_role(array['board_member','admin','super_admin']))) or (d.audience='admins' and (select public.has_member_role(array['admin','super_admin']))) or (select public.has_operation_permission('documents.manage')))));
create policy "Document managers upload storage" on storage.objects for insert to authenticated with check(bucket_id='members-documents' and (select public.has_operation_permission('documents.manage')));
create policy "Document managers delete storage" on storage.objects for delete to authenticated using(bucket_id='members-documents' and (select public.has_operation_permission('documents.manage')));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('members-task-submissions','members-task-submissions',false,10485760,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "Members upload own assigned task attachments" on storage.objects for insert to authenticated with check(bucket_id='members-task-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_active_member()) and exists(select 1 from public.task_assignments a where a.task_id=((storage.foldername(name))[2])::uuid and a.user_id=(select auth.uid())));
create policy "Assignees and task managers read task attachments" on storage.objects for select to authenticated using(bucket_id='members-task-submissions' and (((storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_active_member())) or (select public.has_operation_permission('tasks.manage'))));
create policy "Members delete own task attachments" on storage.objects for delete to authenticated using(bucket_id='members-task-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text);


-- Safe directory projection: intentionally excludes email, phone and account identifiers.
create or replace view public.member_directory with (security_barrier=true) as
 select full_name,profile_photo_url,designation,committee,skills,bio from public.members where membership_status='active' and (select public.is_active_member());
grant select on public.member_directory to authenticated;



create or replace function public.create_task_with_assignment(task_title text,task_description text,task_priority text,task_due_at timestamptz,target_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_task_id uuid;
begin
 if not (select public.has_operation_permission('tasks.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if not exists(select 1 from public.members m where m.id=target_user and m.membership_status='active') then raise exception 'Assignee is not an active member'; end if;
 if task_priority not in ('low','medium','high','urgent') then raise exception 'Invalid task priority'; end if;
 insert into public.tasks(title,description,priority,due_at,status,created_by)
 values(left(trim(task_title),180),coalesce(task_description,''),task_priority,task_due_at,'Assigned',(select auth.uid())) returning id into new_task_id;
 insert into public.task_assignments(task_id,user_id,assigned_by) values(new_task_id,target_user,(select auth.uid()));
 return new_task_id;
end; $$;
revoke all on function public.create_task_with_assignment(text,text,text,timestamptz,uuid) from public,anon;
grant execute on function public.create_task_with_assignment(text,text,text,timestamptz,uuid) to authenticated;

create or replace function public.start_assigned_task(target_task uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare old_task_status text;
begin
 if (select auth.uid()) is null or not (select public.is_active_member()) or not exists(select 1 from public.task_assignments a where a.task_id=target_task and a.user_id=(select auth.uid())) then
  raise exception 'Task is not assigned to this account' using errcode='42501';
 end if;
 select status into old_task_status from public.tasks where id=target_task for update;
 if old_task_status not in ('Assigned','Rejected') then raise exception 'Task cannot be started from its current status'; end if;
 update public.tasks set status='In Progress',updated_at=now() where id=target_task;
 insert into public.task_status_history(task_id,user_id,old_status,new_status,changed_by,comment)
 values(target_task,(select auth.uid()),old_task_status,'In Progress',(select auth.uid()),'Member started assigned task');
end; $$;
revoke all on function public.start_assigned_task(uuid) from public,anon;
grant execute on function public.start_assigned_task(uuid) to authenticated;

-- Database-generated notifications; clients cannot forge notification rows.
create or replace function public.notify_event_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_title text;
begin
 if new.status='registered' and (tg_op='INSERT' or old.status is distinct from new.status) then
  select title into event_title from public.events where id=new.event_id;
  insert into public.notifications(user_id,title,message,category,link)
  values(new.user_id,'Event registration confirmed','Your registration for '||coalesce(event_title,'the event')||' is confirmed.','event','/member-dashboard/events/');
 end if;
 return new;
end; $$;
revoke all on function public.notify_event_registration() from public,anon,authenticated;
drop trigger if exists event_registration_notification on public.event_registrations;
create trigger event_registration_notification after insert or update of status on public.event_registrations for each row execute function public.notify_event_registration();

create or replace function public.notify_task_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare task_title text;
begin
 select title into task_title from public.tasks where id=new.task_id;
 insert into public.notifications(user_id,title,message,category,link)
 values(new.user_id,'New task assigned',coalesce(task_title,'A task')||' has been assigned to you.','task','/member-dashboard/tasks/');
 return new;
end; $$;
revoke all on function public.notify_task_assignment() from public,anon,authenticated;
drop trigger if exists task_assignment_notification on public.task_assignments;
create trigger task_assignment_notification after insert on public.task_assignments for each row execute function public.notify_task_assignment();

create or replace function public.track_task_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare previous_status text;
begin
 select status into previous_status from public.tasks where id=new.task_id for update;
 update public.tasks set status='Submitted',updated_at=now() where id=new.task_id;
 insert into public.task_status_history(task_id,user_id,old_status,new_status,changed_by,comment)
 values(new.task_id,new.user_id,previous_status,'Submitted',new.user_id,'Member submitted task work');
 return new;
end; $$;
revoke all on function public.track_task_submission() from public,anon,authenticated;
drop trigger if exists task_submission_status_history on public.task_submissions;
create trigger task_submission_status_history after insert on public.task_submissions for each row execute function public.track_task_submission();


create or replace function public.track_task_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_task_status text;
begin
 if new.review_status is distinct from old.review_status and new.review_status in ('Approved','Rejected') then
  select status into old_task_status from public.tasks where id=new.task_id for update;
  update public.tasks set status=new.review_status,updated_at=now() where id=new.task_id;
  insert into public.task_status_history(task_id,user_id,old_status,new_status,changed_by,comment)
  values(new.task_id,new.user_id,old_task_status,new.review_status,(select auth.uid()),new.review_comment);
  insert into public.notifications(user_id,title,message,category,link)
  values(new.user_id,'Task review completed','Your task submission was '||lower(new.review_status)||'. '||coalesce(new.review_comment,''),'task','/member-dashboard/tasks/');
 end if;
 return new;
end; $$;
revoke all on function public.track_task_review() from public,anon,authenticated;
drop trigger if exists task_review_status_history on public.task_submissions;
create trigger task_review_status_history after update of review_status on public.task_submissions for each row execute function public.track_task_review();

commit;
