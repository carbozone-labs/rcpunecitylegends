-- Legends Members Hub / Phase 1
-- Apply after 20261108000000_create_enquiries.sql. Does not alter enquiry_admins or enquiry policies.
begin;

create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  membership_id text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null unique check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) between 7 and 20),
  profile_photo_url text,
  designation text,
  committee text,
  joining_date date,
  membership_status text not null default 'active' check (membership_status in ('active','suspended','inactive')),
  bio text check (bio is null or char_length(bio) <= 500),
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists members_status_idx on public.members(membership_status);
create index if not exists members_name_idx on public.members using gin (to_tsvector('simple', full_name));

create table if not exists public.member_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('member','board_member','admin','super_admin')),
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
create index if not exists member_roles_user_id_idx on public.member_roles(user_id);

create table if not exists public.member_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  full_name text not null check (char_length(full_name) between 2 and 120),
  membership_id text not null,
  invited_by uuid not null references auth.users(id),
  invitation_status text not null default 'pending' check (invitation_status in ('pending','accepted','expired','revoked')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint member_invitations_email_normalized check (email = lower(trim(email)))
);
create unique index if not exists member_invitations_pending_email_idx on public.member_invitations(email) where invitation_status = 'pending';
create unique index if not exists member_invitations_membership_id_idx on public.member_invitations(membership_id) where invitation_status in ('pending','accepted');
create index if not exists member_invitations_expiry_idx on public.member_invitations(expires_at) where invitation_status = 'pending';

alter table public.members enable row level security;
alter table public.member_roles enable row level security;
alter table public.member_invitations enable row level security;
revoke all on public.members, public.member_roles, public.member_invitations from anon, authenticated;
grant select on public.members to authenticated;
grant update(phone, bio, skills, interests) on public.members to authenticated;
grant select on public.member_roles to authenticated;

-- Private member data: each account can see only its own row. Admins have only the explicitly scoped access below.
create policy "Members read own profile" on public.members for select to authenticated using (id = (select auth.uid()));
create policy "Members update approved profile fields" on public.members for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Role list is private to the account holder. The client cannot insert, update or delete roles.
create policy "Users read own roles" on public.member_roles for select to authenticated using (user_id = (select auth.uid()));

-- SECURITY DEFINER is used only for narrowly scoped authorization checks / auth provisioning.
-- Empty search_path and fully qualified names prevent object-shadowing attacks.
create or replace function public.has_member_role(required_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.member_roles r where r.user_id = (select auth.uid()) and r.role = any(required_roles));
$$;
revoke all on function public.has_member_role(text[]) from public, anon;
grant execute on function public.has_member_role(text[]) to authenticated;
create policy "Admins read member profiles" on public.members for select to authenticated using ((select public.has_member_role(array['admin','super_admin'])));

create or replace function public.provision_invited_member()
returns trigger language plpgsql security definer set search_path = '' as $$
declare invitation public.member_invitations%rowtype;
begin
  if new.email is null then return new; end if;
  select * into invitation from public.member_invitations i
   where i.email = lower(trim(new.email)) and i.invitation_status = 'pending' and i.expires_at > now()
   order by i.created_at desc limit 1 for update;
  if not found then return new; end if;
  insert into public.members(id, membership_id, full_name, email, joining_date, membership_status)
  values (new.id, invitation.membership_id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), invitation.full_name, split_part(new.email, '@', 1)),
    lower(trim(new.email)), current_date, 'active')
  on conflict (id) do nothing;
  insert into public.member_roles(user_id, role) values (new.id, 'member') on conflict do nothing;
  update public.member_invitations set invitation_status = 'accepted' where id = invitation.id;
  return new;
end;
$$;
revoke all on function public.provision_invited_member() from public, anon, authenticated;
drop trigger if exists on_auth_user_invited_member on auth.users;
create trigger on_auth_user_invited_member after insert on auth.users for each row execute function public.provision_invited_member();

-- Elevated role management is exclusively super_admin-authorized; no client table writes are granted.
create or replace function public.set_member_role(target_user_id uuid, target_role text, should_grant boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.member_roles r where r.user_id = (select auth.uid()) and r.role = 'super_admin'
  ) then raise exception 'Insufficient privileges' using errcode = '42501'; end if;
  if target_role not in ('member','board_member','admin','super_admin') then raise exception 'Invalid role' using errcode = '22023'; end if;
  if should_grant then
    insert into public.member_roles(user_id, role) values (target_user_id, target_role) on conflict (user_id, role) do nothing;
  else
    if target_user_id = (select auth.uid()) and target_role = 'super_admin' then raise exception 'Cannot revoke your own super_admin role' using errcode = '42501'; end if;
    delete from public.member_roles where user_id = target_user_id and role = target_role;
  end if;
end;
$$;
revoke all on function public.set_member_role(uuid,text,boolean) from public, anon;
grant execute on function public.set_member_role(uuid,text,boolean) to authenticated;


create or replace function public.touch_member_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.touch_member_updated_at() from public, anon, authenticated;
drop trigger if exists members_touch_updated_at on public.members;
create trigger members_touch_updated_at before update on public.members for each row execute function public.touch_member_updated_at();

create or replace function public.sync_member_auth_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.members set email = lower(trim(new.email)) where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_member_auth_email() from public, anon, authenticated;
drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change after update of email on auth.users for each row execute function public.sync_member_auth_email();

-- No invitation rows are exposed through PostgREST. Only the trusted Edge Function (service role) manages them.
comment on table public.member_invitations is 'Private invitation ledger. No anon/authenticated grants or policies; trusted Edge Function only.';
comment on table public.member_roles is 'Role assignments are immutable to browser clients; use set_member_role as super_admin.';
comment on table public.members is 'Private member profile. Browser users can update phone, bio, skills and interests only.';
commit;
