-- Manual integration test for a Supabase SQL Editor session (run as project owner).
-- Replace the four UUID constants below with EXISTING test accounts/profiles:
-- member_a = ordinary member, member_b = another member, admin_a = admin, super_admin_a = super_admin.
-- This script rolls back all changes. It must be run only in a non-production test project.
begin;

-- Ordinary member A: own profile is visible; member B's profile and private role are not.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;
do $$
begin
  if not exists (select 1 from public.members where id = '11111111-1111-4111-8111-111111111111') then
    raise exception 'Fixture error: member A profile missing';
  end if;
  if exists (select 1 from public.members where id = '22222222-2222-4222-8222-222222222222') then
    raise exception 'RLS FAILURE: member A can read member B';
  end if;
  begin
    update public.members set membership_id = 'ATTACKER-ID' where id = '11111111-1111-4111-8111-111111111111';
    raise exception 'SECURITY FAILURE: member changed membership_id';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.member_roles(user_id, role) values ('11111111-1111-4111-8111-111111111111', 'admin');
    raise exception 'SECURITY FAILURE: member assigned own admin role';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- An admin cannot promote themselves to super_admin.
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;
do $$
begin
  begin
    perform public.set_member_role('33333333-3333-4333-8333-333333333333', 'super_admin', true);
    raise exception 'SECURITY FAILURE: admin promoted themselves to super_admin';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Only the super_admin fixture can grant an elevated role.
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set local role authenticated;
do $$
begin
  perform public.set_member_role('22222222-2222-4222-8222-222222222222', 'board_member', true);
end $$;
reset role;
rollback;
