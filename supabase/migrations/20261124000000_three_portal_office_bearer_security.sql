-- Three independent portals: only the active President, Vice President and Secretary
-- recorded in this private table receive administrative authorization.
-- Apply after 20261123000000_members_hub_phase3_admin_gamification.sql.
begin;

create table if not exists public.club_office_bearers (
  user_id uuid primary key references auth.users(id) on delete restrict,
  position text not null check (position in ('President','Vice President','Secretary')),
  active boolean not null default true,
  appointed_by uuid references auth.users(id),
  appointment_reason text not null check (char_length(trim(appointment_reason)) between 5 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists club_office_bearers_one_active_holder_per_position
  on public.club_office_bearers(position) where active;
alter table public.club_office_bearers enable row level security;
revoke all on public.club_office_bearers from public, anon, authenticated;
grant all on public.club_office_bearers to service_role;
-- Do not delete existing administrator role assignments here. The authorization
-- function below requires BOTH the admin role and the private active office-bearer
-- record. Legacy super_admin rows are ignored and cannot authorize any operation.

comment on table public.club_office_bearers is
  'Private, trusted administrative allowlist. Provision only through the Supabase SQL editor/service role after verifying the current club office bearers.';

-- This function is the sole source of administrative eligibility. The table has no
-- client grants or policies; a browser cannot appoint or promote itself.
create or replace function public.is_office_bearer_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.club_office_bearers ob
    join public.members m on m.id = ob.user_id
    join public.member_roles mr on mr.user_id = ob.user_id and mr.role = 'admin'
    where ob.user_id = (select auth.uid())
      and ob.active = true
      and ob.position in ('President','Vice President','Secretary')
      and m.membership_status = 'active'
  );
$$;
revoke all on function public.is_office_bearer_admin() from public, anon;
grant execute on function public.is_office_bearer_admin() to authenticated;

-- Preserve ordinary member/BOD role checks, but legacy admin/super_admin role rows
-- no longer confer any privilege unless the account is in the office-bearer allowlist.
create or replace function public.has_member_role(required_roles text[])
returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists (
      select 1 from public.member_roles r
      where r.user_id = (select auth.uid())
        and r.role = any(array_remove(array_remove(required_roles, 'admin'), 'super_admin'))
    )
    or (
      ('admin' = any(required_roles) or 'super_admin' = any(required_roles))
      and (select public.is_office_bearer_admin())
    );
$$;
revoke all on function public.has_member_role(text[]) from public, anon;
grant execute on function public.has_member_role(text[]) to authenticated;

-- Administrative operations are not delegated by granular BOD permissions.
-- This closes all existing RPC/RLS paths that previously treated board permission
-- grants or stale admin role rows as sufficient for privileged management.
create or replace function public.has_operation_permission(permission_name text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select public.is_active_member())
     and (select public.is_office_bearer_admin())
     and permission_name in (
       'events.manage','attendance.manage','tasks.manage','documents.manage',
       'announcements.manage','members.manage','board.manage','contributions.manage',
       'gamification.manage','analytics.read','audit.read'
     );
$$;
revoke all on function public.has_operation_permission(text) from public, anon;
grant execute on function public.has_operation_permission(text) to authenticated;

-- Close the older Phase 1 role-management RPC, which checked the raw legacy role table.
create or replace function public.set_member_role(target_user_id uuid, target_role text, should_grant boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (select public.is_office_bearer_admin()) then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;
  if target_user_id is null or target_role not in ('member','board_member') or should_grant is null then
    raise exception 'Invalid role' using errcode = '22023';
  end if;
  if target_role = 'member' and not should_grant then
    raise exception 'Use membership status management to suspend or deactivate a member; the base member role is required' using errcode = '42501';
  end if;
  if should_grant then
    insert into public.member_roles(user_id, role) values (target_user_id, target_role)
    on conflict (user_id, role) do nothing;
  else
    delete from public.member_roles where user_id = target_user_id and role = target_role;
  end if;
end;
$$;
revoke all on function public.set_member_role(uuid,text,boolean) from public, anon;
grant execute on function public.set_member_role(uuid,text,boolean) to authenticated;


-- Prevent any future browser RPC from recreating legacy admin/super_admin role rows.
create or replace function public.admin_set_member_role(target_user_id uuid,target_role text,should_grant boolean,change_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare changed boolean;
begin
  if not (select public.is_office_bearer_admin()) then
    raise exception 'Only the President, Vice President or Secretary may change member roles' using errcode='42501';
  end if;
  if target_user_id is null or target_role not in ('member','board_member') or should_grant is null then
    raise exception 'Administrative eligibility is managed separately in the private office-bearer register' using errcode='22023';
  end if;
  if char_length(trim(coalesce(change_reason,'')))<5 then
    raise exception 'A role change reason is required' using errcode='22023';
  end if;
  if target_role = 'member' and not should_grant then
    raise exception 'Use membership status management to suspend or deactivate a member; the base member role is required' using errcode='42501';
  end if;
  if should_grant then
    insert into public.member_roles(user_id,role) values(target_user_id,target_role)
    on conflict(user_id,role) do nothing;
    changed:=found;
  else
    delete from public.member_roles where user_id=target_user_id and role=target_role;
    changed:=found;
  end if;
  if not coalesce(changed,false) then return; end if;
  insert into public.admin_audit_logs(actor_id,action_type,target_entity,target_id,change_summary,reason)
  values((select auth.uid()),case when should_grant then 'role.grant' else 'role.revoke' end,
    'public.member_roles',target_user_id::text,jsonb_build_object('role',target_role,'granted',should_grant),left(trim(change_reason),1000));
  insert into public.notifications(user_id,title,message,category)
  values(target_user_id,'Member role updated','Your club account role has been updated. Contact an administrator if you have questions.','membership');
end;
$$;
revoke all on function public.admin_set_member_role(uuid,text,boolean,text) from public, anon;
grant execute on function public.admin_set_member_role(uuid,text,boolean,text) to authenticated;

-- Announcement delivery uses the new allowlist for the admins-only audience and
-- points member notifications at the migrated route namespace.
create or replace function public.notify_new_announcement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published_at is not null and new.published_at<=now() and (new.expires_at is null or new.expires_at>now()) then
    with recipients as (
      insert into public.announcement_notification_deliveries(announcement_id,user_id)
      select new.id,m.id from public.members m
      where m.membership_status='active'
        and (
          new.audience in ('all','members')
          or (new.audience='board' and exists(select 1 from public.member_roles r where r.user_id=m.id and r.role='board_member'))
          or (new.audience='admins' and exists(select 1 from public.club_office_bearers ob where ob.user_id=m.id and ob.active=true))
        )
      on conflict(announcement_id,user_id) do nothing returning user_id
    )
    insert into public.notifications(user_id,title,message,category,link)
    select recipients.user_id,new.title,left(new.message,1000),'announcement','/members/dashboard/announcements/' from recipients;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_new_announcement() from public, anon, authenticated;

-- Normalize both historical and future notification links to the new member route namespace.
create or replace function public.normalize_member_portal_notification_link()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.link like '/member-dashboard/%' then
    new.link := replace(new.link, '/member-dashboard/', '/members/dashboard/');
  end if;
  return new;
end;
$$;
revoke all on function public.normalize_member_portal_notification_link() from public, anon, authenticated;
drop trigger if exists notifications_normalize_member_portal_link on public.notifications;
create trigger notifications_normalize_member_portal_link
before insert or update of link on public.notifications
for each row execute function public.normalize_member_portal_notification_link();
update public.notifications
set link = replace(link, '/member-dashboard/', '/members/dashboard/')
where link like '/member-dashboard/%';

-- Legacy granular BOD permission rows remain for audit/history compatibility but
-- cannot grant access to administrative RPCs after this migration.
comment on table public.member_permissions is
  'Legacy granular operational grants retained for backward compatibility. Administrative authorization is now exclusively office-bearer based.';

commit;
