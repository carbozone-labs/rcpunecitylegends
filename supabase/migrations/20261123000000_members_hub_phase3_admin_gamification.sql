-- Legends Members Hub / Phase 3
-- Administrative foundation, audited membership operations, configurable gamification,
-- verified XP ledger, achievements, levels, privacy-aware leaderboard and analytics.
-- Apply after the Phase 1 and Phase 2 migrations. No prototype/demo rows are imported.
begin;

-- Central switch: all proposed gamification remains disabled until explicitly approved.
create table if not exists public.club_gamification_settings (
  singleton boolean primary key default true check (singleton),
  xp_enabled boolean not null default false,
  achievements_enabled boolean not null default false,
  leaderboard_enabled boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.club_gamification_settings(singleton) values(true) on conflict(singleton) do nothing;
alter table public.club_gamification_settings enable row level security;
revoke all on public.club_gamification_settings from anon, authenticated;
grant select on public.club_gamification_settings to authenticated;
create policy "Members read gamification availability" on public.club_gamification_settings for select to authenticated using((select public.is_active_member()));

create table if not exists public.contribution_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  title text not null,
  description text not null default '',
  xp_value integer not null check(xp_value between 0 and 10000),
  enabled boolean not null default false,
  is_proposed_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.contribution_rules(rule_key,title,description,xp_value,enabled,is_proposed_default) values
 ('attendance','Meeting attendance','Proposed value from the existing Legend Zone prototype.',10,false,true),
 ('volunteering','Volunteering for a project','Proposed value from the existing Legend Zone prototype.',25,false,true),
 ('collaboration','Bringing a new collaboration','Proposed value from the existing Legend Zone prototype.',50,false,true),
 ('initiative','Leading a successful initiative','Proposed value from the existing Legend Zone prototype.',100,false,true)
on conflict(rule_key) do nothing;
alter table public.contribution_rules enable row level security;
revoke all on public.contribution_rules from anon, authenticated;
grant select on public.contribution_rules to authenticated;
create policy "Active members read contribution rule labels" on public.contribution_rules for select to authenticated using((select public.is_active_member()));

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id),
  rule_id uuid references public.contribution_rules(id),
  title text not null check(char_length(title) between 3 and 180),
  description text not null default '' check(char_length(description)<=3000),
  evidence_url text,
  evidence_path text,
  status text not null default 'submitted' check(status in ('submitted','approved','rejected','reversed')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_comment text,
  unique(id,member_id),
  check(reviewed_by is null or reviewed_by <> member_id),
  check(evidence_url is null or evidence_url ~* '^https?://')
);
create index if not exists contributions_member_date_idx on public.contributions(member_id,submitted_at desc);
create index if not exists contributions_status_date_idx on public.contributions(status,submitted_at desc);
alter table public.contributions enable row level security;
revoke all on public.contributions from anon, authenticated;
grant select,insert on public.contributions to authenticated;
create policy "Members view own contributions" on public.contributions for select to authenticated using(member_id=(select auth.uid()) and (select public.is_active_member()));
create policy "Contribution managers view all" on public.contributions for select to authenticated using((select public.has_operation_permission('contributions.manage')));
create policy "Members submit own contributions" on public.contributions for insert to authenticated with check(member_id=(select auth.uid()) and (select public.is_active_member()) and status='submitted' and reviewed_by is null and reviewed_at is null and review_comment is null);

-- Append-only verified XP ledger. All inserts/reversals happen inside guarded RPCs.
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id),
  contribution_id uuid references public.contributions(id),
  points integer not null check(points between -10000 and 10000 and points <> 0),
  transaction_type text not null check(transaction_type in ('award','reversal','adjustment')),
  description text not null check(char_length(description) between 3 and 500),
  source_key text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reverses_id uuid references public.xp_ledger(id),
  check((transaction_type='reversal' and points<0 and reverses_id is not null) or (transaction_type<>'reversal' and reverses_id is null))
);
create index if not exists xp_ledger_member_date_idx on public.xp_ledger(member_id,created_at desc);
create index if not exists xp_ledger_date_idx on public.xp_ledger(created_at desc);
alter table public.xp_ledger enable row level security;
revoke all on public.xp_ledger from anon, authenticated;
grant select on public.xp_ledger to authenticated;
create policy "Members view own verified XP" on public.xp_ledger for select to authenticated using(member_id=(select auth.uid()) and (select public.is_active_member()));
create policy "XP managers view ledger" on public.xp_ledger for select to authenticated using((select public.has_operation_permission('contributions.manage')));

create or replace view public.member_xp_totals with (security_barrier=true, security_invoker=true) as
 select m.id as member_id, m.full_name, m.profile_photo_url, m.designation, m.committee,
        coalesce(sum(x.points),0)::bigint as total_xp
 from public.members m left join public.xp_ledger x on x.member_id=m.id
 where m.membership_status='active' group by m.id,m.full_name,m.profile_photo_url,m.designation,m.committee;
revoke all on public.member_xp_totals from public,anon,authenticated;
grant select on public.member_xp_totals to authenticated;

create table if not exists public.member_leaderboard_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_in boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.member_leaderboard_preferences enable row level security;
revoke all on public.member_leaderboard_preferences from anon,authenticated;
grant select on public.member_leaderboard_preferences to authenticated;
create policy "Members read own leaderboard privacy" on public.member_leaderboard_preferences for select to authenticated using(user_id=(select auth.uid()) and (select public.is_active_member()));

create table if not exists public.club_level_rules (
  id uuid primary key default gen_random_uuid(),
  level_key text not null unique,
  title text not null,
  min_xp bigint not null check(min_xp>=0),
  enabled boolean not null default false,
  is_proposed_default boolean not null default true,
  sort_order integer not null default 0,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
-- Prototype thresholds are explicitly described in src/data/legendZone.ts as partly invented demo values.
-- Do not activate these until the club approves every threshold.
insert into public.club_level_rules(level_key,title,min_xp,enabled,is_proposed_default,sort_order) values
 ('rookie-legend','Rookie Legend',0,false,true,1),
 ('rising-legend','Rising Legend',50,false,true,2),
 ('impact-machine','Impact Machine',150,false,true,3),
 ('trailblazer','Trailblazer',300,false,true,4),
 ('legendary-status','Legendary Status',500,false,true,5)
on conflict(level_key) do nothing;
alter table public.club_level_rules enable row level security;
revoke all on public.club_level_rules from anon,authenticated;
grant select on public.club_level_rules to authenticated;
create policy "Active members read proposed levels" on public.club_level_rules for select to authenticated using((select public.is_active_member()));

create table if not exists public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  achievement_key text not null unique,
  title text not null,
  description text not null default '',
  icon_key text not null default 'award',
  criteria jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  requires_manual_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.achievement_definitions(achievement_key,title,description,icon_key,criteria,enabled,requires_manual_review) values
 ('first-step','First Step','Suggested achievement; criteria require club approval.','star','{"type":"approved_contribution_count","minimum":1}'::jsonb,false,true),
 ('active-legend','Active Legend','Suggested achievement; criteria require club approval.','trophy','{"type":"approved_contribution_count","minimum":5}'::jsonb,false,true),
 ('team-player','Team Player','Suggested achievement; criteria require club approval.','users','{"type":"distinct_contribution_types","minimum":3}'::jsonb,false,true),
 ('volunteer-champion','Volunteer Champion','Suggested achievement; criteria require club approval.','handshake','{"type":"rule_count","rule_key":"volunteering","minimum":3}'::jsonb,false,true),
 ('collaboration-builder','Collaboration Builder','Suggested achievement; criteria require club approval.','handshake','{"type":"rule_count","rule_key":"collaboration","minimum":1}'::jsonb,false,true),
 ('initiative-leader','Initiative Leader','Suggested achievement; criteria require club approval.','award','{"type":"rule_count","rule_key":"initiative","minimum":1}'::jsonb,false,true)
on conflict(achievement_key) do nothing;
alter table public.achievement_definitions enable row level security;
revoke all on public.achievement_definitions from anon,authenticated;
grant select on public.achievement_definitions to authenticated;
create policy "Members read achievement catalogue" on public.achievement_definitions for select to authenticated using((select public.is_active_member()));

create table if not exists public.member_achievements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id),
  achievement_id uuid not null references public.achievement_definitions(id),
  status text not null default 'pending' check(status in ('pending','unlocked','rejected','revoked')),
  progress numeric(5,2) not null default 0 check(progress between 0 and 100),
  awarded_by uuid references auth.users(id),
  awarded_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  unique(member_id,achievement_id)
);
alter table public.member_achievements enable row level security;
revoke all on public.member_achievements from anon,authenticated;
grant select on public.member_achievements to authenticated;
create policy "Members view own achievements" on public.member_achievements for select to authenticated using(member_id=(select auth.uid()) and (select public.is_active_member()));
create policy "Achievement managers view all" on public.member_achievements for select to authenticated using((select public.has_operation_permission('gamification.manage')));

create table if not exists public.member_level_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id),
  level_rule_id uuid not null references public.club_level_rules(id),
  achieved_at timestamptz not null default now(),
  total_xp bigint not null check(total_xp>=0),
  recorded_by uuid references auth.users(id),
  unique(member_id,level_rule_id)
);
alter table public.member_level_history enable row level security;
revoke all on public.member_level_history from anon,authenticated;
grant select on public.member_level_history to authenticated;
create policy "Members view own level history" on public.member_level_history for select to authenticated using(member_id=(select auth.uid()) and (select public.is_active_member()));
create policy "Gamification managers view level history" on public.member_level_history for select to authenticated using((select public.has_operation_permission('gamification.manage')));

-- Administrative audit is append-only for application roles. Trigger functions own insert access.
create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action_type text not null,
  target_entity text not null,
  target_id text,
  change_summary jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_target_idx on public.admin_audit_logs(target_entity,target_id,created_at desc);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon,authenticated;
grant select on public.admin_audit_logs to authenticated;
create policy "Authorized administrators read audit history" on public.admin_audit_logs for select to authenticated using((select public.has_operation_permission('audit.read')) or (select public.has_member_role(array['super_admin'])));

create or replace function public.write_admin_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_data jsonb; new_data jsonb; target text; actor uuid;
begin
 old_data := case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 new_data := case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
 -- Never persist private contact details, auth metadata, evidence contents or tokens in audit snapshots.
 old_data := old_data - 'email' - 'phone' - 'password' - 'access_token' - 'refresh_token' - 'raw_user_meta_data' - 'evidence_url' - 'evidence_path';
 new_data := new_data - 'email' - 'phone' - 'password' - 'access_token' - 'refresh_token' - 'raw_user_meta_data' - 'evidence_url' - 'evidence_path';
 if tg_table_name='members' then
  old_data := old_data - 'bio' - 'skills' - 'interests' - 'profile_photo_url' - 'joining_date' - 'created_at' - 'updated_at';
  new_data := new_data - 'bio' - 'skills' - 'interests' - 'profile_photo_url' - 'joining_date' - 'created_at' - 'updated_at';
 elsif tg_table_name='contributions' then
  old_data := old_data - 'description' - 'title'; new_data := new_data - 'description' - 'title';
 elsif tg_table_name='documents' then
  old_data := old_data - 'storage_path'; new_data := new_data - 'storage_path';
 elsif tg_table_name='task_submissions' then
  old_data := old_data - 'submission_text' - 'attachment_path'; new_data := new_data - 'submission_text' - 'attachment_path';
 end if;
 target := coalesce(new_data->>'id',old_data->>'id',new_data->>'user_id',old_data->>'user_id',new_data->>'member_id',old_data->>'member_id');
 actor := coalesce((select auth.uid()),nullif(new_data->>'invited_by','')::uuid,nullif(old_data->>'invited_by','')::uuid);
 insert into public.admin_audit_logs(actor_id,action_type,target_entity,target_id,change_summary)
 values(actor,lower(tg_op)||'.'||tg_table_name,'public.'||tg_table_name,target,jsonb_build_object('before',old_data,'after',new_data));
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
revoke all on function public.write_admin_audit() from public,anon,authenticated;

-- Sensitive member/role/configuration/XP mutations are logged by database triggers.
drop trigger if exists audit_member_changes on public.members;
create trigger audit_member_changes after update on public.members for each row when (old.membership_status is distinct from new.membership_status or old.designation is distinct from new.designation or old.committee is distinct from new.committee or old.membership_id is distinct from new.membership_id) execute function public.write_admin_audit();
drop trigger if exists audit_member_role_changes on public.member_roles;
create trigger audit_member_role_changes after insert or update or delete on public.member_roles for each row execute function public.write_admin_audit();
drop trigger if exists audit_member_permission_changes on public.member_permissions;
create trigger audit_member_permission_changes after insert or update or delete on public.member_permissions for each row execute function public.write_admin_audit();
drop trigger if exists audit_contribution_changes on public.contributions;
create trigger audit_contribution_changes after update on public.contributions for each row when (old.status is distinct from new.status) execute function public.write_admin_audit();
drop trigger if exists audit_xp_awards on public.xp_ledger;
create trigger audit_xp_awards after insert on public.xp_ledger for each row execute function public.write_admin_audit();
drop trigger if exists audit_achievement_changes on public.member_achievements;
create trigger audit_achievement_changes after insert or update on public.member_achievements for each row execute function public.write_admin_audit();
drop trigger if exists audit_rule_changes on public.contribution_rules;
create trigger audit_rule_changes after update on public.contribution_rules for each row execute function public.write_admin_audit();
drop trigger if exists audit_gamification_settings_changes on public.club_gamification_settings;
create trigger audit_gamification_settings_changes after update on public.club_gamification_settings for each row execute function public.write_admin_audit();
drop trigger if exists audit_level_rule_changes on public.club_level_rules;
create trigger audit_level_rule_changes after update on public.club_level_rules for each row execute function public.write_admin_audit();
drop trigger if exists audit_achievement_definition_changes on public.achievement_definitions;
create trigger audit_achievement_definition_changes after update on public.achievement_definitions for each row execute function public.write_admin_audit();
drop trigger if exists audit_invitation_changes on public.member_invitations;
create trigger audit_invitation_changes after insert or update on public.member_invitations for each row execute function public.write_admin_audit();
drop trigger if exists audit_attendance_corrections on public.attendance_audit;
create trigger audit_attendance_corrections after insert on public.attendance_audit for each row execute function public.write_admin_audit();
drop trigger if exists audit_event_changes on public.events;
create trigger audit_event_changes after insert or update or delete on public.events for each row execute function public.write_admin_audit();
drop trigger if exists audit_task_changes on public.tasks;
create trigger audit_task_changes after insert or update or delete on public.tasks for each row execute function public.write_admin_audit();
drop trigger if exists audit_task_submission_reviews on public.task_submissions;
create trigger audit_task_submission_reviews after update of review_status on public.task_submissions for each row when (old.review_status is distinct from new.review_status) execute function public.write_admin_audit();
drop trigger if exists audit_task_submission_created on public.task_submissions;
create trigger audit_task_submission_created after insert on public.task_submissions for each row execute function public.write_admin_audit();
drop trigger if exists audit_task_assignment_changes on public.task_assignments;
create trigger audit_task_assignment_changes after insert or update or delete on public.task_assignments for each row execute function public.write_admin_audit();
drop trigger if exists audit_event_registration_changes on public.event_registrations;
create trigger audit_event_registration_changes after insert or update on public.event_registrations for each row execute function public.write_admin_audit();
drop trigger if exists audit_contribution_submissions on public.contributions;
create trigger audit_contribution_submissions after insert on public.contributions for each row execute function public.write_admin_audit();
drop trigger if exists audit_announcement_changes on public.announcements;
create trigger audit_announcement_changes after insert or update or delete on public.announcements for each row execute function public.write_admin_audit();
drop trigger if exists audit_document_changes on public.documents;
create trigger audit_document_changes after insert or delete on public.documents for each row execute function public.write_admin_audit();

-- Audit reason for attendance corrections already exists in Phase 2 attendance_audit.
-- Expand the Phase 2 permission vocabulary additively.
alter table public.member_permissions drop constraint if exists member_permissions_permission_check;
alter table public.member_permissions add constraint member_permissions_permission_check check(permission in ('events.manage','attendance.manage','tasks.manage','documents.manage','announcements.manage','members.manage','board.manage','contributions.manage','gamification.manage','analytics.read','audit.read'));
create policy "Super administrators and board managers view permission assignments" on public.member_permissions for select to authenticated using((select public.has_member_role(array['super_admin'])) or (select public.has_operation_permission('board.manage')));

-- Require reasoned role changes through the audited Phase 3 wrapper.
revoke execute on function public.set_member_role(uuid,text,boolean) from authenticated;

-- Member privacy is opt-in for public-to-members leaderboard display.
create or replace function public.set_leaderboard_opt_in(opt_in boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 insert into public.member_leaderboard_preferences(user_id,opted_in,updated_at) values((select auth.uid()),opt_in,now())
 on conflict(user_id) do update set opted_in=excluded.opted_in,updated_at=now();
end; $$;
revoke all on function public.set_leaderboard_opt_in(boolean) from public,anon;
grant execute on function public.set_leaderboard_opt_in(boolean) to authenticated;

create or replace function public.get_my_gamification()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; total bigint; current_level public.club_level_rules%rowtype; next_level public.club_level_rules%rowtype;
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 select coalesce(sum(points),0)::bigint into total from public.xp_ledger where member_id=(select auth.uid());
 select * into current_level from public.club_level_rules where enabled and min_xp<=total order by min_xp desc limit 1;
 select * into next_level from public.club_level_rules where enabled and min_xp>total order by min_xp asc limit 1;
 select jsonb_build_object(
  'xp_enabled',s.xp_enabled,'achievements_enabled',s.achievements_enabled,'leaderboard_enabled',s.leaderboard_enabled,
  'total_xp',case when s.xp_enabled then total else 0 end,
  'current_level',case when s.xp_enabled and current_level.id is not null then current_level.title else null end,
  'next_level',case when s.xp_enabled and next_level.id is not null then next_level.title else null end,
  'next_level_xp',case when s.xp_enabled and next_level.id is not null then next_level.min_xp else null end,
  'level_progress',case when s.xp_enabled and current_level.id is not null and next_level.id is not null then round(((total-current_level.min_xp)::numeric/nullif(next_level.min_xp-current_level.min_xp,0))*100,2) when s.xp_enabled and current_level.id is not null then 100 else 0 end,
  'xp_remaining',case when s.xp_enabled and next_level.id is not null then greatest(next_level.min_xp-total,0) else null end,
  'leaderboard_opted_in',coalesce(p.opted_in,false)
 ) into result from public.club_gamification_settings s left join public.member_leaderboard_preferences p on p.user_id=(select auth.uid()) where s.singleton;
 return coalesce(result,'{}'::jsonb);
end; $$;
revoke all on function public.get_my_gamification() from public,anon;
grant execute on function public.get_my_gamification() to authenticated;

create or replace function public.get_member_leaderboard(period_key text, page_size integer default 20, page_offset integer default 0)
returns table(rank bigint,display_name text,profile_photo_url text,total_xp bigint,is_self boolean)
language plpgsql stable security definer set search_path = '' as $$
declare start_at timestamptz; end_at timestamptz;
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 if not exists(select 1 from public.club_gamification_settings where singleton and xp_enabled and leaderboard_enabled) then return; end if;
 if period_key is null or period_key not in ('monthly','annual','all_time') then raise exception 'Invalid leaderboard period' using errcode='22023'; end if;
 if page_size is null or page_offset is null or page_size<1 or page_size>100 or page_offset<0 then raise exception 'Invalid pagination' using errcode='22023'; end if;
 start_at := case when period_key='monthly' then date_trunc('month',now()) when period_key='annual' then date_trunc('year',now()) else '-infinity'::timestamptz end;
 end_at := case when period_key='monthly' then start_at+interval '1 month' when period_key='annual' then start_at+interval '1 year' else 'infinity'::timestamptz end;
 return query
 with totals as (
  select m.id,m.full_name,m.profile_photo_url,coalesce(sum(x.points),0)::bigint xp
  from public.members m join public.member_leaderboard_preferences p on p.user_id=m.id and p.opted_in
  left join public.xp_ledger x on x.member_id=m.id and x.created_at>=start_at and x.created_at<end_at
  where m.membership_status='active' group by m.id,m.full_name,m.profile_photo_url
 ), ranked as (
  select dense_rank() over(order by t.xp desc) r,t.* from totals t
 )
 select r.r,r.full_name,r.profile_photo_url,r.xp,(r.id=(select auth.uid()))
 from ranked r order by r.xp desc,r.full_name asc offset page_offset limit page_size;
end; $$;
revoke all on function public.get_member_leaderboard(text,integer,integer) from public,anon;
grant execute on function public.get_member_leaderboard(text,integer,integer) to authenticated;

create or replace function public.get_my_leaderboard_rank(period_key text)
returns table(rank bigint,total_xp bigint,opted_in boolean)
language plpgsql stable security definer set search_path = '' as $$
declare start_at timestamptz; end_at timestamptz; own_opt_in boolean; own_total bigint;
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 if period_key is null or period_key not in ('monthly','annual','all_time') then raise exception 'Invalid leaderboard period' using errcode='22023'; end if;
 if not exists(select 1 from public.club_gamification_settings where singleton and xp_enabled and leaderboard_enabled) then return query select null::bigint,0::bigint,false; return; end if;
 select coalesce(opted_in,false) into own_opt_in from public.member_leaderboard_preferences where user_id=(select auth.uid());
 own_opt_in:=coalesce(own_opt_in,false);
 start_at:=case when period_key='monthly' then date_trunc('month',now()) when period_key='annual' then date_trunc('year',now()) else '-infinity'::timestamptz end;
 end_at:=case when period_key='monthly' then start_at+interval '1 month' when period_key='annual' then start_at+interval '1 year' else 'infinity'::timestamptz end;
 select coalesce(sum(points),0)::bigint into own_total from public.xp_ledger where member_id=(select auth.uid()) and created_at>=start_at and created_at<end_at;
 if not own_opt_in then return query select null::bigint,own_total,false; return; end if;
 return query with totals as (
  select m.id,coalesce(sum(x.points),0)::bigint xp from public.members m join public.member_leaderboard_preferences p on p.user_id=m.id and p.opted_in
  left join public.xp_ledger x on x.member_id=m.id and x.created_at>=start_at and x.created_at<end_at
  where m.membership_status='active' group by m.id
 ), ranked as (select id,dense_rank() over(order by xp desc) r,xp from totals)
 select r.r,r.xp,true from ranked r where r.id=(select auth.uid());
end; $$;
revoke all on function public.get_my_leaderboard_rank(text) from public,anon;
grant execute on function public.get_my_leaderboard_rank(text) to authenticated;

-- A contribution submission is never an XP award. Approval and award are separate, privileged steps.
create or replace function public.review_contribution(target_contribution uuid, decision text, review_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.contributions%rowtype;
begin
 if not (select public.has_operation_permission('contributions.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if decision is null or decision not in ('approved','rejected') then raise exception 'Invalid review decision' using errcode='22023'; end if;
 if char_length(trim(coalesce(review_reason,'')))<5 then raise exception 'A contribution review reason is required'; end if;
 select * into c from public.contributions where id=target_contribution for update;
 if not found or c.status<>'submitted' then raise exception 'Contribution is not awaiting review'; end if;
 if c.member_id=(select auth.uid()) then raise exception 'Self-approval is prohibited' using errcode='42501'; end if;
 update public.contributions set status=decision,reviewed_by=(select auth.uid()),reviewed_at=now(),review_comment=left(coalesce(review_reason,''),1000) where id=target_contribution;
 if decision='approved' then perform public.refresh_achievement_progress_for_member(c.member_id); end if;
 insert into public.notifications(user_id,title,message,category,link)
 values(c.member_id,case when decision='approved' then 'Contribution approved' else 'Contribution needs attention' end,
        case when decision='approved' then 'Your contribution was verified. XP is not automatic and remains subject to the club rules.' else 'Your contribution was not approved. '||left(coalesce(review_reason,''),500) end,
        'contribution','/member-dashboard/contributions/');
end; $$;
revoke all on function public.review_contribution(uuid,text,text) from public,anon;
grant execute on function public.review_contribution(uuid,text,text) to authenticated;

create or replace function public.award_contribution_xp(target_contribution uuid, award_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.contributions%rowtype; rule public.contribution_rules%rowtype; points_value integer; ledger_id uuid; source text;
begin
 if not (select public.has_operation_permission('gamification.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if not exists(select 1 from public.club_gamification_settings where singleton and xp_enabled) then raise exception 'XP awarding is disabled pending club approval'; end if;
 if char_length(trim(coalesce(award_reason,'')))<5 then raise exception 'An XP award explanation is required'; end if;
 select * into c from public.contributions where id=target_contribution for update;
 if not found or c.status<>'approved' then raise exception 'Only approved contributions may receive XP'; end if;
 if c.member_id=(select auth.uid()) then raise exception 'Self-awarding is prohibited' using errcode='42501'; end if;
 if exists(select 1 from public.xp_ledger where contribution_id=c.id and transaction_type='award') then raise exception 'Contribution already awarded' using errcode='23505'; end if;
 if c.rule_id is null then raise exception 'Contribution has no configured XP rule'; end if;
 select * into rule from public.contribution_rules where id=c.rule_id and enabled;
 if not found then raise exception 'Contribution XP rule is disabled'; end if;
 points_value := rule.xp_value;
 if points_value<=0 then raise exception 'XP rule must award a positive value'; end if;
 source := 'contribution:'||c.id::text;
 insert into public.xp_ledger(member_id,contribution_id,points,transaction_type,description,source_key,created_by)
 values(c.member_id,c.id,points_value,'award',left(coalesce(nullif(trim(award_reason),''),c.title),500),source,(select auth.uid())) returning id into ledger_id;
 insert into public.notifications(user_id,title,message,category,link)
 values(c.member_id,'Verified XP awarded',points_value||' XP has been added for: '||c.title,'gamification','/member-dashboard/contributions/');
 return ledger_id;
end; $$;
revoke all on function public.award_contribution_xp(uuid,text) from public,anon;
grant execute on function public.award_contribution_xp(uuid,text) to authenticated;

create or replace function public.reverse_xp_award(target_ledger uuid, reversal_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare original public.xp_ledger%rowtype; new_id uuid;
begin
 if not (select public.has_operation_permission('gamification.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if char_length(trim(coalesce(reversal_reason,'')))<5 then raise exception 'A clear reversal reason is required'; end if;
 select * into original from public.xp_ledger where id=target_ledger for update;
 if not found or original.points<=0 or original.transaction_type<>'award' then raise exception 'Only original positive awards can be reversed'; end if;
 if exists(select 1 from public.xp_ledger where reverses_id=target_ledger) then raise exception 'Award already reversed' using errcode='23505'; end if;
 insert into public.xp_ledger(member_id,contribution_id,points,transaction_type,description,source_key,created_by,reverses_id)
 values(original.member_id,original.contribution_id,-original.points,'reversal',left(trim(reversal_reason),500),'reversal:'||original.id::text,(select auth.uid()),original.id) returning id into new_id;
 insert into public.notifications(user_id,title,message,category,link) values(original.member_id,'XP adjustment',original.points||' XP was reversed. Reason: '||left(trim(reversal_reason),300),'gamification','/member-dashboard/contributions/');
 return new_id;
end; $$;
revoke all on function public.reverse_xp_award(uuid,text) from public,anon;
grant execute on function public.reverse_xp_award(uuid,text) to authenticated;

create or replace function public.review_achievement(target_member uuid,target_achievement uuid,decision text,review_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare existing public.member_achievements%rowtype; definition public.achievement_definitions%rowtype; measured numeric; minimum numeric;
begin
 if not (select public.has_operation_permission('gamification.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if target_member=(select auth.uid()) then raise exception 'Self-approval is prohibited' using errcode='42501'; end if;
 if decision is null or decision not in ('unlocked','rejected','revoked') then raise exception 'Invalid achievement decision' using errcode='22023'; end if;
 if char_length(trim(coalesce(review_reason,'')))<5 then raise exception 'An achievement review reason is required'; end if;
 if not exists(select 1 from public.club_gamification_settings where singleton and achievements_enabled) then raise exception 'Achievements are disabled'; end if;
 select * into definition from public.achievement_definitions where id=target_achievement and enabled and requires_manual_review;
 if not found then raise exception 'Achievement is not active for manual review'; end if;
 if decision='unlocked' then
  minimum:=greatest(coalesce((definition.criteria->>'minimum')::numeric,1),1);
  if definition.criteria->>'type'='approved_contribution_count' then select count(*) into measured from public.contributions where member_id=target_member and status='approved';
  elsif definition.criteria->>'type'='distinct_contribution_types' then select count(distinct r.rule_key) into measured from public.contributions c join public.contribution_rules r on r.id=c.rule_id where c.member_id=target_member and c.status='approved';
  elsif definition.criteria->>'type'='rule_count' then select count(*) into measured from public.contributions c join public.contribution_rules r on r.id=c.rule_id where c.member_id=target_member and c.status='approved' and r.rule_key=definition.criteria->>'rule_key';
  else measured:=0; end if;
  if measured<minimum then raise exception 'Verified contribution criteria are not yet satisfied'; end if;
 end if;
 insert into public.member_achievements(member_id,achievement_id,status,progress,awarded_by,awarded_at,review_note)
 values(target_member,target_achievement,decision,case when decision='unlocked' then 100 else 0 end,(select auth.uid()),case when decision='unlocked' then now() else null end,left(coalesce(review_reason,''),1000))
 on conflict(member_id,achievement_id) do update set status=excluded.status,progress=excluded.progress,awarded_by=excluded.awarded_by,awarded_at=excluded.awarded_at,review_note=excluded.review_note;
 insert into public.notifications(user_id,title,message,category,link) values(target_member,'Achievement update','Your achievement status was updated: '||decision||'. '||left(coalesce(review_reason,''),300),'achievement','/member-dashboard/achievements/');
end; $$;
revoke all on function public.review_achievement(uuid,uuid,text,text) from public,anon;
grant execute on function public.review_achievement(uuid,uuid,text,text) to authenticated;

-- Phase 2 allowed reviewers to PATCH their own reviewed_by field directly; route all reviews through this guarded RPC.
revoke update(review_status,reviewed_by,reviewed_at,review_comment) on public.task_submissions from authenticated;
create or replace function public.review_task_submission(target_submission uuid,new_status text,review_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare submission public.task_submissions%rowtype;
begin
 if not (select public.has_operation_permission('tasks.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if new_status is null or new_status not in ('Approved','Rejected') then raise exception 'Invalid review status' using errcode='22023'; end if;
 if char_length(trim(coalesce(review_reason,'')))<5 then raise exception 'A task review reason is required'; end if;
 select * into submission from public.task_submissions where id=target_submission for update;
 if not found or submission.review_status<>'Submitted' then raise exception 'Submission is not awaiting review'; end if;
 if submission.user_id=(select auth.uid()) then raise exception 'Self-review is prohibited' using errcode='42501'; end if;
 update public.task_submissions set review_status=new_status,reviewed_by=(select auth.uid()),reviewed_at=now(),review_comment=left(coalesce(review_reason,''),1000) where id=target_submission;
end; $$;
revoke all on function public.review_task_submission(uuid,text,text) from public,anon;
grant execute on function public.review_task_submission(uuid,text,text) to authenticated;

-- Board term snapshots preserve prior designation/committee assignments without inventing official values.
create table if not exists public.member_board_term_history (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references auth.users(id),
 designation text,
 committee text,
 valid_from timestamptz not null default now(),
 valid_to timestamptz,
 changed_by uuid references auth.users(id),
 change_reason text
);
create index if not exists board_term_member_date_idx on public.member_board_term_history(member_id,valid_from desc);
create unique index if not exists board_term_member_valid_from_uidx on public.member_board_term_history(member_id,valid_from);
alter table public.member_board_term_history enable row level security;
revoke all on public.member_board_term_history from anon,authenticated;
grant select on public.member_board_term_history to authenticated;
create policy "Authorized administrators view board history" on public.member_board_term_history for select to authenticated using((select public.has_operation_permission('board.manage')) or (select public.has_member_role(array['super_admin'])));
insert into public.member_board_term_history(member_id,designation,committee,valid_from,change_reason)
select id,designation,committee,coalesce(updated_at,created_at),'Initial snapshot from current membership record'
from public.members where designation is not null or committee is not null
on conflict do nothing;

create or replace function public.track_board_assignment_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if old.designation is distinct from new.designation or old.committee is distinct from new.committee then
  update public.member_board_term_history set valid_to=now() where member_id=new.id and valid_to is null;
  insert into public.member_board_term_history(member_id,designation,committee,valid_from,changed_by,change_reason)
  values(new.id,new.designation,new.committee,now(),(select auth.uid()),'Administrative designation/committee update');
 end if;
 return new;
end; $$;
revoke all on function public.track_board_assignment_history() from public,anon,authenticated;
drop trigger if exists members_board_term_history on public.members;
create trigger members_board_term_history after update of designation,committee on public.members for each row execute function public.track_board_assignment_history();

-- Progress is computed from verified/approved contribution rows, never browser state.
create or replace function public.refresh_achievement_progress_for_member(target_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; minimum numeric; count_value numeric; rule_value text; progress_value numeric; final_status text; prior_status text;
begin
 if not exists(select 1 from public.club_gamification_settings where singleton and achievements_enabled) then return; end if;
 for a in select * from public.achievement_definitions where enabled loop
  minimum := greatest(coalesce((a.criteria->>'minimum')::numeric,1),1);
  rule_value := a.criteria->>'rule_key';
  if a.criteria->>'type'='approved_contribution_count' then
   select count(*) into count_value from public.contributions where member_id=target_member and status='approved';
  elsif a.criteria->>'type'='distinct_contribution_types' then
   select count(distinct r.rule_key) into count_value from public.contributions c join public.contribution_rules r on r.id=c.rule_id where c.member_id=target_member and c.status='approved';
  elsif a.criteria->>'type'='rule_count' then
   select count(*) into count_value from public.contributions c join public.contribution_rules r on r.id=c.rule_id where c.member_id=target_member and c.status='approved' and r.rule_key=rule_value;
  else count_value := 0;
  end if;
  progress_value := least(100,(count_value/minimum)*100);
  final_status := case when not a.requires_manual_review and progress_value>=100 then 'unlocked' else 'pending' end;
  select status into prior_status from public.member_achievements where member_id=target_member and achievement_id=a.id;
  insert into public.member_achievements(member_id,achievement_id,status,progress,awarded_at)
  values(target_member,a.id,final_status,progress_value,case when final_status='unlocked' then now() else null end)
  on conflict(member_id,achievement_id) do update set
   progress=excluded.progress,
   status=case when public.member_achievements.status in ('unlocked','revoked','rejected') then public.member_achievements.status else excluded.status end,
   awarded_at=case when public.member_achievements.status='unlocked' then public.member_achievements.awarded_at else excluded.awarded_at end;
  if final_status='unlocked' and prior_status is distinct from 'unlocked' then
   insert into public.notifications(user_id,title,message,category,link)
   values(target_member,'Achievement unlocked','You have unlocked: '||a.title,'achievement','/member-dashboard/achievements/');
  end if;
 end loop;
end; $$;
revoke all on function public.refresh_achievement_progress_for_member(uuid) from public,anon,authenticated;

create or replace function public.refresh_my_achievement_progress()
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 perform public.refresh_achievement_progress_for_member((select auth.uid()));
end; $$;
revoke all on function public.refresh_my_achievement_progress() from public,anon;
grant execute on function public.refresh_my_achievement_progress() to authenticated;

create or replace function public.get_my_achievements()
returns table(achievement_id uuid,achievement_key text,title text,description text,icon_key text,criteria jsonb,enabled boolean,status text,progress numeric,awarded_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 return query select d.id,d.achievement_key,d.title,d.description,d.icon_key,d.criteria,d.enabled,
  coalesce(ma.status,'pending'),coalesce(ma.progress,0),ma.awarded_at
 from public.achievement_definitions d left join public.member_achievements ma on ma.achievement_id=d.id and ma.member_id=(select auth.uid())
 where d.enabled or exists(select 1 from public.member_achievements own where own.achievement_id=d.id and own.member_id=(select auth.uid())) order by d.title;
end; $$;
revoke all on function public.get_my_achievements() from public,anon;
grant execute on function public.get_my_achievements() to authenticated;

create or replace function public.track_member_level_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare total bigint;
begin
 if not exists(select 1 from public.club_gamification_settings where singleton and xp_enabled) then return new; end if;
 select coalesce(sum(points),0)::bigint into total from public.xp_ledger where member_id=new.member_id;
 insert into public.member_level_history(member_id,level_rule_id,achieved_at,total_xp,recorded_by)
 select new.member_id,l.id,now(),total,new.created_by from public.club_level_rules l where l.enabled and l.min_xp<=total
 on conflict(member_id,level_rule_id) do nothing;
 return new;
end; $$;
revoke all on function public.track_member_level_progress() from public,anon,authenticated;
drop trigger if exists xp_ledger_level_progress on public.xp_ledger;
create trigger xp_ledger_level_progress after insert on public.xp_ledger for each row execute function public.track_member_level_progress();

-- Invitation acceptance notification is generated from the invitation ledger transition.
create or replace function public.notify_invitation_accepted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare account_id uuid;
begin
 if old.invitation_status is distinct from new.invitation_status and new.invitation_status='accepted' then
  select id into account_id from auth.users where lower(email)=lower(new.email) limit 1;
  if account_id is not null then
   insert into public.notifications(user_id,title,message,category,link)
   values(account_id,'Invitation accepted','Your club invitation has been linked to your member account.','membership','/member-dashboard/');
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.notify_invitation_accepted() from public,anon,authenticated;
drop trigger if exists member_invitation_accepted_notification on public.member_invitations;
create trigger member_invitation_accepted_notification after update of invitation_status on public.member_invitations for each row execute function public.notify_invitation_accepted();

-- Super-admin-only settings/rule management. These RPCs audit through table triggers.
create or replace function public.configure_gamification(enable_xp boolean,enable_achievements boolean,enable_leaderboard boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not (select public.has_member_role(array['super_admin'])) then raise exception 'Only super administrators can approve gamification policy' using errcode='42501'; end if;
 update public.club_gamification_settings set xp_enabled=enable_xp,achievements_enabled=enable_achievements,leaderboard_enabled=enable_leaderboard,
  approved_by=(select auth.uid()),approved_at=now(),updated_at=now() where singleton;
end; $$;
revoke all on function public.configure_gamification(boolean,boolean,boolean) from public,anon;
grant execute on function public.configure_gamification(boolean,boolean,boolean) to authenticated;

create or replace function public.configure_contribution_rule(target_rule uuid,new_xp integer,is_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not (select public.has_member_role(array['super_admin'])) then raise exception 'Only super administrators can approve XP rules' using errcode='42501'; end if;
 if new_xp<0 or new_xp>10000 then raise exception 'Invalid XP value' using errcode='22023'; end if;
 update public.contribution_rules set xp_value=new_xp,enabled=is_enabled,updated_by=(select auth.uid()),updated_at=now() where id=target_rule;
 if not found then raise exception 'Rule not found'; end if;
end; $$;
revoke all on function public.configure_contribution_rule(uuid,integer,boolean) from public,anon;
grant execute on function public.configure_contribution_rule(uuid,integer,boolean) to authenticated;

create or replace function public.configure_level_rule(target_rule uuid,new_title text,new_min_xp bigint,is_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not (select public.has_member_role(array['super_admin'])) then raise exception 'Only super administrators can approve level thresholds' using errcode='42501'; end if;
 if new_min_xp<0 or char_length(trim(new_title))<2 then raise exception 'Invalid level definition' using errcode='22023'; end if;
 update public.club_level_rules set title=left(trim(new_title),100),min_xp=new_min_xp,enabled=is_enabled,updated_by=(select auth.uid()),updated_at=now() where id=target_rule;
 if not found then raise exception 'Level not found'; end if;
 if exists(select 1 from public.club_level_rules a join public.club_level_rules b on a.id<>b.id and a.enabled and b.enabled where a.min_xp=b.min_xp) then raise exception 'Enabled levels must have unique XP thresholds'; end if;
end; $$;
revoke all on function public.configure_level_rule(uuid,text,bigint,boolean) from public,anon;
grant execute on function public.configure_level_rule(uuid,text,bigint,boolean) to authenticated;

create or replace function public.admin_update_member(target_member uuid,new_full_name text,new_designation text,new_committee text,new_status text,change_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_designation text; old_committee text;
begin
 if not (select public.has_operation_permission('members.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if char_length(trim(coalesce(new_full_name,'')))<2 or new_status is null or new_status not in ('active','suspended','inactive') then raise exception 'Invalid member details' using errcode='22023'; end if;
 if target_member=(select auth.uid()) and new_status<>'active' then raise exception 'Administrators cannot suspend themselves'; end if;
 if new_status<>'active' and exists(select 1 from public.member_roles where user_id=target_member and role='super_admin') and (select count(*) from public.member_roles r join public.members m on m.id=r.user_id where r.role='super_admin' and m.membership_status='active')<=1 then raise exception 'Cannot deactivate the last active super administrator'; end if;
 select designation,committee into old_designation,old_committee from public.members where id=target_member for update;
 if not found then raise exception 'Member not found'; end if;
 if char_length(trim(coalesce(change_reason,'')))<5 then raise exception 'A reason is required for membership changes'; end if;
 update public.members set full_name=left(trim(new_full_name),120),designation=nullif(left(trim(coalesce(new_designation,'')),120),''),committee=nullif(left(trim(coalesce(new_committee,'')),120),''),membership_status=new_status,updated_at=now() where id=target_member;
 if not found then raise exception 'Member not found'; end if;
 insert into public.admin_audit_logs(actor_id,action_type,target_entity,target_id,change_summary,reason)
 values((select auth.uid()),'member.update','public.members',target_member::text,jsonb_build_object('full_name',left(trim(new_full_name),120),'designation',new_designation,'committee',new_committee,'membership_status',new_status),left(trim(change_reason),1000));
 if new_status<>'active' then insert into public.notifications(user_id,title,message,category) values(target_member,'Membership status updated','Your membership status has changed. Please contact the club administrator if you need assistance.','membership'); end if;
 if old_designation is distinct from new_designation or old_committee is distinct from new_committee then insert into public.notifications(user_id,title,message,category) values(target_member,'Board assignment updated','Your designation or committee assignment has been updated.','membership'); end if;
end; $$;
revoke all on function public.admin_update_member(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.admin_update_member(uuid,text,text,text,text,text) to authenticated;

create or replace function public.admin_set_member_role(target_user_id uuid,target_role text,should_grant boolean,change_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare changed boolean;
begin
 if not (select public.has_member_role(array['super_admin'])) then raise exception 'Only super administrators can change member roles' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(912345678);
 if target_user_id is null or target_role is null or target_role not in ('member','board_member','admin','super_admin') or should_grant is null then raise exception 'Invalid role' using errcode='22023'; end if;
 if char_length(trim(coalesce(change_reason,'')))<5 then raise exception 'A role change reason is required'; end if;
 if should_grant then insert into public.member_roles(user_id,role) values(target_user_id,target_role) on conflict(user_id,role) do nothing; changed:=found;
 else
  if target_role='super_admin' and (select count(*) from public.member_roles where role='super_admin')<=1 then raise exception 'Cannot revoke the last super administrator role' using errcode='42501'; end if;
  if target_role='super_admin' and exists(select 1 from public.members where id=target_user_id and membership_status='active') and (select count(*) from public.member_roles r join public.members m on m.id=r.user_id where r.role='super_admin' and m.membership_status='active')<=1 then raise exception 'Cannot revoke the last active super administrator' using errcode='42501'; end if;
  if target_user_id=(select auth.uid()) and target_role='super_admin' then raise exception 'Cannot revoke your own super administrator role' using errcode='42501'; end if;
  delete from public.member_roles where user_id=target_user_id and role=target_role; changed:=found;
 end if;
 if not coalesce(changed,false) then return; end if;
 insert into public.admin_audit_logs(actor_id,action_type,target_entity,target_id,change_summary,reason)
 values((select auth.uid()),case when should_grant then 'role.grant' else 'role.revoke' end,'public.member_roles',target_user_id::text,jsonb_build_object('role',target_role,'granted',should_grant),left(trim(change_reason),1000));
 insert into public.notifications(user_id,title,message,category)
 values(target_user_id,'Member role updated','Your club account role has been updated. Contact an administrator if you have questions.','membership');
end; $$;
revoke all on function public.admin_set_member_role(uuid,text,boolean,text) from public,anon;
grant execute on function public.admin_set_member_role(uuid,text,boolean,text) to authenticated;

create or replace function public.grant_board_permission(target_user uuid,permission_name text,should_grant boolean,change_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare changed boolean;
begin
 if not (select public.has_member_role(array['super_admin'])) then raise exception 'Only super administrators can change operational permissions' using errcode='42501'; end if;
 if target_user is null or permission_name is null or should_grant is null or permission_name not in ('events.manage','attendance.manage','tasks.manage','documents.manage','announcements.manage','members.manage','board.manage','contributions.manage','gamification.manage','analytics.read','audit.read') then raise exception 'Invalid permission' using errcode='22023'; end if;
 if not exists(select 1 from public.member_roles where user_id=target_user and role='board_member') then raise exception 'Target account is not a board member'; end if;
 if char_length(trim(coalesce(change_reason,'')))<5 then raise exception 'A permission change reason is required'; end if;
 if should_grant then insert into public.member_permissions(user_id,permission,granted_by) values(target_user,permission_name,(select auth.uid())) on conflict(user_id,permission) do nothing; changed:=found;
 else delete from public.member_permissions where user_id=target_user and permission=permission_name; changed:=found; end if;
 if not coalesce(changed,false) then return; end if;
 insert into public.admin_audit_logs(actor_id,action_type,target_entity,target_id,change_summary,reason) values((select auth.uid()),case when should_grant then 'permission.grant' else 'permission.revoke' end,'public.member_permissions',target_user::text,jsonb_build_object('permission',permission_name,'granted',should_grant),left(trim(change_reason),1000));
end; $$;
revoke all on function public.grant_board_permission(uuid,text,boolean,text) from public,anon;
grant execute on function public.grant_board_permission(uuid,text,boolean,text) to authenticated;

create or replace function public.configure_achievement(target_achievement uuid,new_title text,new_description text,new_criteria jsonb,new_enabled boolean,new_manual_review boolean,new_icon_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not (select public.has_member_role(array['super_admin'])) then raise exception 'Only super administrators can configure achievement policy' using errcode='42501'; end if;
 if char_length(trim(coalesce(new_title,'')))<2 or new_criteria is null or jsonb_typeof(new_criteria) is distinct from 'object' or new_criteria->>'type' not in ('approved_contribution_count','distinct_contribution_types','rule_count') then raise exception 'Invalid achievement definition' using errcode='22023'; end if;
 if coalesce((new_criteria->>'minimum')::numeric,1)<1 then raise exception 'Achievement minimum must be positive'; end if;
 if new_criteria->>'type'='rule_count' and not exists(select 1 from public.contribution_rules where rule_key=new_criteria->>'rule_key') then raise exception 'Achievement references an unknown contribution rule'; end if;
 update public.achievement_definitions set title=left(trim(new_title),120),description=left(coalesce(new_description,''),1000),criteria=new_criteria,enabled=new_enabled,requires_manual_review=new_manual_review,icon_key=left(coalesce(new_icon_key,'award'),40),updated_by=(select auth.uid()),updated_at=now() where id=target_achievement;
 if not found then raise exception 'Achievement not found'; end if;
end; $$;
revoke all on function public.configure_achievement(uuid,text,text,jsonb,boolean,boolean,text) from public,anon;
grant execute on function public.configure_achievement(uuid,text,text,jsonb,boolean,boolean,text) to authenticated;

create or replace function public.refresh_my_level_history()
returns void language plpgsql security definer set search_path = '' as $$
declare total bigint;
begin
 if not (select public.is_active_member()) then raise exception 'Active membership required' using errcode='42501'; end if;
 if not exists(select 1 from public.club_gamification_settings where singleton and xp_enabled) then return; end if;
 select coalesce(sum(points),0)::bigint into total from public.xp_ledger where member_id=(select auth.uid());
 insert into public.member_level_history(member_id,level_rule_id,achieved_at,total_xp,recorded_by)
 select (select auth.uid()),l.id,now(),total,(select auth.uid()) from public.club_level_rules l where l.enabled and l.min_xp<=total
 on conflict(member_id,level_rule_id) do nothing;
end; $$;
revoke all on function public.refresh_my_level_history() from public,anon;
grant execute on function public.refresh_my_level_history() to authenticated;

create or replace function public.get_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not (select public.has_operation_permission('analytics.read')) and not (select public.has_operation_permission('members.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 select jsonb_build_object(
  'members',jsonb_build_object('total',(select count(*) from public.members),'active',(select count(*) from public.members where membership_status='active'),'inactive',(select count(*) from public.members where membership_status='inactive'),'suspended',(select count(*) from public.members where membership_status='suspended'),'board',(select count(distinct user_id) from public.member_roles where role='board_member')),
  'events',jsonb_build_object('upcoming',(select count(*) from public.events where status='published' and starts_at>=now()),'registrations',(select count(*) from public.event_registrations where status in ('registered','attended'))),
  'attendance',jsonb_build_object('present',(select count(*) from public.attendance_records where attendance_status='present'),'late',(select count(*) from public.attendance_records where attendance_status='late'),'absent',(select count(*) from public.attendance_records where attendance_status='absent')),
  'tasks',jsonb_build_object('pending',(select count(*) from public.tasks where status in ('Assigned','In Progress','Submitted')),'completed',(select count(*) from public.tasks where status='Approved')),
  'contributions',jsonb_build_object('pending',(select count(*) from public.contributions where status='submitted'),'approved',(select count(*) from public.contributions where status='approved')),
  'monthly_members',(select coalesce(jsonb_agg(jsonb_build_object('month',mth,'count',cnt) order by mth),'[]'::jsonb) from (select to_char(date_trunc('month',created_at),'YYYY-MM') mth,count(*) cnt from public.members where created_at>=date_trunc('month',now())-interval '11 months' group by 1) q),
  'monthly_events',(select coalesce(jsonb_agg(jsonb_build_object('month',mth,'registrations',cnt) order by mth),'[]'::jsonb) from (select to_char(date_trunc('month',registered_at),'YYYY-MM') mth,count(*) cnt from public.event_registrations where registered_at>=date_trunc('month',now())-interval '11 months' group by 1) q),
  'monthly_tasks',(select coalesce(jsonb_agg(jsonb_build_object('month',mth,'approved',cnt) order by mth),'[]'::jsonb) from (select to_char(date_trunc('month',updated_at),'YYYY-MM') mth,count(*) cnt from public.tasks where status='Approved' and updated_at>=date_trunc('month',now())-interval '11 months' group by 1) q),
  'monthly_attendance',(select coalesce(jsonb_agg(jsonb_build_object('month',mth,'marked',cnt) order by mth),'[]'::jsonb) from (select to_char(date_trunc('month',marked_at),'YYYY-MM') mth,count(*) cnt from public.attendance_records where marked_at>=date_trunc('month',now())-interval '11 months' group by 1) q),
  'monthly_contributions',(select coalesce(jsonb_agg(jsonb_build_object('month',mth,'approved',cnt) order by mth),'[]'::jsonb) from (select to_char(date_trunc('month',reviewed_at),'YYYY-MM') mth,count(*) cnt from public.contributions where status='approved' and reviewed_at>=date_trunc('month',now())-interval '11 months' group by 1) q),
  'committee_participation',(select coalesce(jsonb_agg(jsonb_build_object('committee',committee,'attendance_records',cnt) order by committee),'[]'::jsonb) from (select coalesce(m.committee,'Unassigned') committee,count(*) cnt from public.attendance_records a join public.members m on m.id=a.user_id where a.attendance_status in ('present','late') group by 1) q),
  'achievement_distribution',(select coalesce(jsonb_agg(jsonb_build_object('achievement',d.title,'unlocked',cnt) order by d.title),'[]'::jsonb) from (select achievement_id,count(*) cnt from public.member_achievements where status='unlocked' group by achievement_id) x join public.achievement_definitions d on d.id=x.achievement_id),
  'gamification',(select jsonb_build_object('xp_enabled',xp_enabled,'achievements_enabled',achievements_enabled,'leaderboard_enabled',leaderboard_enabled) from public.club_gamification_settings where singleton)
 ) into result;
 return result;
end; $$;
revoke all on function public.get_admin_overview() from public,anon;
grant execute on function public.get_admin_overview() to authenticated;

create or replace function public.get_admin_members(search_text text default '',status_filter text default 'all',designation_filter text default 'all',committee_filter text default 'all',page_size integer default 50,page_offset integer default 0)
returns table(id uuid,membership_id text,full_name text,email text,designation text,committee text,membership_status text,joining_date date,roles text[])
language plpgsql stable security definer set search_path = '' as $$
begin
 if not (select public.has_operation_permission('members.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if page_size is null or page_offset is null or page_size<1 or page_size>100 or page_offset<0 then raise exception 'Invalid pagination' using errcode='22023'; end if;
 return query select m.id,m.membership_id,m.full_name,m.email,m.designation,m.committee,m.membership_status,m.joining_date,
  coalesce(array_agg(r.role) filter(where r.role is not null),'{}'::text[])
 from public.members m left join public.member_roles r on r.user_id=m.id
 where (status_filter='all' or m.membership_status=status_filter)
 and (designation_filter='all' or coalesce(m.designation,'')=designation_filter)
 and (committee_filter='all' or coalesce(m.committee,'')=committee_filter)
 and (search_text='' or m.full_name ilike '%'||left(search_text,80)||'%' or m.membership_id ilike '%'||left(search_text,80)||'%' or coalesce(m.committee,'') ilike '%'||left(search_text,80)||'%')
 group by m.id order by m.full_name limit page_size offset page_offset;
end; $$;
revoke all on function public.get_admin_members(text,text,text,text,integer,integer) from public,anon;
grant execute on function public.get_admin_members(text,text,text,text,integer,integer) to authenticated;

create or replace function public.get_admin_contributions()
returns table(id uuid,member_id uuid,member_name text,rule_id uuid,rule_title text,title text,description text,evidence_url text,status text,submitted_at timestamptz,reviewed_by uuid,review_comment text,xp_ledger_id uuid,awarded_points bigint,xp_reversed boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not (select public.has_operation_permission('contributions.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 return query select c.id,c.member_id,m.full_name,c.rule_id,r.title,c.title,c.description,c.evidence_url,c.status,c.submitted_at,c.reviewed_by,c.review_comment,ledger.id,ledger.points,coalesce(ledger.reversed,false)
 from public.contributions c join public.members m on m.id=c.member_id left join public.contribution_rules r on r.id=c.rule_id
 left join lateral (select x.id,x.points,exists(select 1 from public.xp_ledger reversal where reversal.reverses_id=x.id) as reversed from public.xp_ledger x where x.contribution_id=c.id and x.transaction_type='award' limit 1) ledger on true
 order by c.submitted_at desc limit 200;
end; $$;
revoke all on function public.get_admin_contributions() from public,anon;
grant execute on function public.get_admin_contributions() to authenticated;

create or replace function public.get_admin_achievements()
returns table(id uuid,member_id uuid,member_name text,achievement_id uuid,achievement_title text,status text,progress numeric,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not (select public.has_operation_permission('gamification.manage')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 return query select ma.id,ma.member_id,m.full_name,ma.achievement_id,d.title,ma.status,ma.progress,ma.created_at
 from public.member_achievements ma join public.members m on m.id=ma.member_id join public.achievement_definitions d on d.id=ma.achievement_id
 where ma.status='pending' and d.enabled and d.requires_manual_review order by ma.created_at desc limit 200;
end; $$;
revoke all on function public.get_admin_achievements() from public,anon;
grant execute on function public.get_admin_achievements() to authenticated;

create or replace function public.get_member_activity(target_member uuid,page_size integer default 50)
returns table(id bigint,actor_id uuid,action_type text,target_entity text,target_id text,reason text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not (select public.has_operation_permission('members.manage')) and not (select public.has_operation_permission('audit.read')) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if page_size is null or page_size<1 or page_size>100 then raise exception 'Invalid pagination' using errcode='22023'; end if;
 return query select a.id,a.actor_id,a.action_type,a.target_entity,a.target_id,a.reason,a.created_at
 from public.admin_audit_logs a
 where a.target_id=target_member::text
    or a.change_summary->'after'->>'member_id'=target_member::text
    or a.change_summary->'after'->>'user_id'=target_member::text
    or exists(select 1 from public.attendance_audit aa join public.attendance_records ar on ar.id=aa.attendance_record_id where ar.user_id=target_member and a.target_id=aa.id::text)
 order by a.created_at desc limit page_size;
end; $$;
revoke all on function public.get_member_activity(uuid,integer) from public,anon;
grant execute on function public.get_member_activity(uuid,integer) to authenticated;

create or replace function public.get_admin_audit(page_size integer default 100,page_offset integer default 0)
returns table(id bigint,actor_id uuid,action_type text,target_entity text,target_id text,change_summary jsonb,reason text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not (select public.has_operation_permission('audit.read')) and not (select public.has_member_role(array['super_admin'])) then raise exception 'Insufficient privileges' using errcode='42501'; end if;
 if page_size is null or page_offset is null or page_size<1 or page_size>200 or page_offset<0 then raise exception 'Invalid pagination' using errcode='22023'; end if;
 return query select a.id,a.actor_id,a.action_type,a.target_entity,a.target_id,a.change_summary,a.reason,a.created_at from public.admin_audit_logs a order by a.created_at desc limit page_size offset page_offset;
end; $$;
revoke all on function public.get_admin_audit(integer,integer) from public,anon;
grant execute on function public.get_admin_audit(integer,integer) to authenticated;

-- Board roles are retained as the Phase 1 role record plus explicit current operational grants.
-- This migration deliberately does not create an assumed official committee/designation catalogue.

create table if not exists public.announcement_notification_deliveries (
 announcement_id uuid not null references public.announcements(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(announcement_id,user_id)
);
alter table public.announcement_notification_deliveries enable row level security;
revoke all on public.announcement_notification_deliveries from anon,authenticated;

create or replace function public.notify_new_announcement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.published_at is not null and new.published_at<=now() and (new.expires_at is null or new.expires_at>now()) then
  with recipients as (
   insert into public.announcement_notification_deliveries(announcement_id,user_id)
   select new.id,m.id from public.members m
   where m.membership_status='active'
    and (new.audience='all' or new.audience='members' or (new.audience='board' and exists(select 1 from public.member_roles r where r.user_id=m.id and r.role in ('board_member','admin','super_admin'))) or (new.audience='admins' and exists(select 1 from public.member_roles r where r.user_id=m.id and r.role in ('admin','super_admin'))))
   on conflict(announcement_id,user_id) do nothing returning user_id
  )
  insert into public.notifications(user_id,title,message,category,link)
  select recipients.user_id,new.title,left(new.message,1000),'announcement','/member-dashboard/announcements/' from recipients;
 end if;
 return new;
end; $$;
revoke all on function public.notify_new_announcement() from public,anon,authenticated;
drop trigger if exists announcement_notifications_insert on public.announcements;
create trigger announcement_notifications_insert after insert on public.announcements for each row execute function public.notify_new_announcement();
drop trigger if exists announcement_notifications_update on public.announcements;
create trigger announcement_notifications_update after update of published_at,expires_at,audience,title,message on public.announcements for each row execute function public.notify_new_announcement();

-- Performance indexes for admin analytics and directory/search workflows.
create index if not exists members_joining_date_idx on public.members(joining_date);
create index if not exists members_committee_idx on public.members(committee) where committee is not null;
create index if not exists members_designation_idx on public.members(designation) where designation is not null;
create index if not exists attendance_records_marked_at_idx on public.attendance_records(marked_at desc);
create index if not exists tasks_status_updated_idx on public.tasks(status,updated_at desc);
create index if not exists event_registrations_registered_idx on public.event_registrations(registered_at desc);

commit;
