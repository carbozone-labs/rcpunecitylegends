-- Corrective hardening for the three-portal authorization contract.
-- Safe to apply after 20261124000000_three_portal_office_bearer_security.sql.
-- Restores only the three explicitly appointed active office-bearers; it never
-- promotes arbitrary members and never grants super_admin.
begin;

alter table public.member_invitations
  add column if not exists role text not null default 'member';
update public.member_invitations set role = 'member' where role is null;
alter table public.member_invitations drop constraint if exists member_invitations_role_check;
alter table public.member_invitations
  add constraint member_invitations_role_check check (role in ('member', 'board_member'));

-- Keep the auth.users invitation trigger aligned with the requested invitation role.
create or replace function public.provision_invited_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare invitation public.member_invitations%rowtype;
begin
  if new.email is null then return new; end if;
  select * into invitation
  from public.member_invitations i
  where i.email = lower(trim(new.email))
    and i.invitation_status = 'pending'
    and i.expires_at > now()
  order by i.created_at desc
  limit 1
  for update;
  if not found then return new; end if;

  insert into public.members(id, membership_id, full_name, email, joining_date, membership_status)
  values (new.id, invitation.membership_id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), invitation.full_name, split_part(new.email, '@', 1)),
    lower(trim(new.email)), current_date, 'active')
  on conflict (id) do nothing;

  delete from public.member_roles
    where user_id = new.id
      and role in ('member', 'board_member')
      and role <> case when invitation.role = 'board_member' then 'board_member' else 'member' end;
  insert into public.member_roles(user_id, role)
  values (new.id, case when invitation.role = 'board_member' then 'board_member' else 'member' end)
  on conflict (user_id, role) do nothing;
  update public.member_invitations set invitation_status = 'accepted' where id = invitation.id;
  return new;
end;
$$;
revoke all on function public.provision_invited_member() from public, anon, authenticated;

insert into public.member_roles(user_id, role)
select ob.user_id, 'admin'
from public.club_office_bearers ob
join public.members m on m.id = ob.user_id
where ob.active = true
  and ob.position in ('President', 'Vice President', 'Secretary')
  and m.membership_status = 'active'
on conflict (user_id, role) do nothing;

create or replace function public.is_office_bearer_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.club_office_bearers ob
    join public.members m on m.id = ob.user_id
    join public.member_roles mr on mr.user_id = ob.user_id and mr.role = 'admin'
    where ob.user_id = (select auth.uid())
      and ob.active = true
      and ob.position in ('President', 'Vice President', 'Secretary')
      and m.membership_status = 'active'
  );
$$;
revoke all on function public.is_office_bearer_admin() from public, anon;
grant execute on function public.is_office_bearer_admin() to authenticated;

-- A stale super_admin row is not a valid role and cannot be granted through the
-- application. Preserve audit history; remove only this unused authorization row.
delete from public.member_roles where role = 'super_admin';

-- Remove the obsolete role value from the database constraint after all legacy
-- rows are removed. The three supported roles remain unchanged.
alter table public.member_roles drop constraint if exists member_roles_role_check;
alter table public.member_roles
  add constraint member_roles_role_check check (role in ('member', 'board_member', 'admin'));

commit;
