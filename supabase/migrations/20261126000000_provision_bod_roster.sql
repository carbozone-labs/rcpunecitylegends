-- BOD roster provisioning foundation.
-- Apply after 20261125000000_require_admin_role_and_restore_verified_office_bearers.sql.
-- This migration adds first/last name fields and a service-role-only transactional
-- provisioning RPC. It does not create Auth users or modify existing member rows.

begin;

alter table public.members
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.members
  drop constraint if exists members_first_name_length_check,
  drop constraint if exists members_last_name_length_check;

alter table public.members
  add constraint members_first_name_length_check
    check (first_name is null or char_length(trim(first_name)) between 1 and 80),
  add constraint members_last_name_length_check
    check (last_name is null or char_length(trim(last_name)) between 1 and 80);

comment on column public.members.first_name is 'BOD/member first name; retained separately from full_name when supplied.';
comment on column public.members.last_name is 'BOD/member surname; retained separately from full_name when supplied.';
comment on column public.members.membership_id is 'Unique member identifier. BOD IDs use RCPL-BOD-2026-NNN where a new ID is required.';

create sequence if not exists public.bod_member_id_seq
  start with 1 increment by 1 minvalue 1 cache 1;

-- Start after all existing BOD-format identifiers in members and invitations.
select setval(
  'public.bod_member_id_seq'::regclass,
  coalesce((
    select max(matched_id) + 1
    from (
      select substring(membership_id from '^RCPL-BOD-2026-([0-9]+)$')::bigint as matched_id
      from public.members
      where membership_id ~ '^RCPL-BOD-2026-[0-9]+$'
      union all
      select substring(membership_id from '^RCPL-BOD-2026-([0-9]+)$')::bigint as matched_id
      from public.member_invitations
      where membership_id ~ '^RCPL-BOD-2026-[0-9]+$'
    ) existing_ids
  ), 1),
  false
);

revoke all on sequence public.bod_member_id_seq from public, anon, authenticated;

-- Shared, concurrency-safe ID allocator for future BOD invitations and roster
-- provisioning. Only trusted service-role workflows may allocate identifiers.
create or replace function public.next_bod_member_id()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  return 'RCPL-BOD-2026-' || lpad(nextval('public.bod_member_id_seq')::text, 3, '0');
end;
$$;
revoke all on function public.next_bod_member_id() from public, anon, authenticated;
grant execute on function public.next_bod_member_id() to service_role;

create or replace function public.provision_bod_roster(
  p_members jsonb,
  p_reconcile_admins boolean default false
)
returns table(user_id uuid, member_id text, access_role text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  roster_row jsonb;
  v_user_id uuid;
  v_email text;
  v_auth_email text;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_designation text;
  v_position text;
  v_member_id text;
  v_existing_email text;
  v_existing_status text;
  v_count integer;
  v_admin_count integer;
  v_president_count integer;
  v_secretary_count integer;
  v_vp_count integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if p_members is null or jsonb_typeof(p_members) <> 'array' then
    raise exception 'BOD roster must be a JSON array' using errcode = '22023';
  end if;

  select count(*) into v_count from jsonb_array_elements(p_members);
  if v_count < 3 then
    raise exception 'At least the three designated office bearers are required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select lower(trim(value ->> 'email')) as email
      from jsonb_array_elements(p_members)
      group by lower(trim(value ->> 'email'))
      having count(*) > 1
    ) duplicates
  ) or exists (
    select 1
    from (
      select value ->> 'user_id' as user_id
      from jsonb_array_elements(p_members)
      group by value ->> 'user_id'
      having count(*) > 1
    ) duplicates
  ) then
    raise exception 'Duplicate email or Auth user in BOD roster' using errcode = '23505';
  end if;

  select count(*) filter (where lower(trim(value ->> 'designation')) = 'club president'),
         count(*) filter (where lower(trim(value ->> 'designation')) = 'club secretary'),
         count(*) filter (where lower(trim(value ->> 'designation')) = 'vice president')
    into v_president_count, v_secretary_count, v_vp_count
  from jsonb_array_elements(p_members);

  v_admin_count := v_president_count + v_secretary_count + v_vp_count;
  if v_admin_count <> 3 or v_president_count <> 1 or v_secretary_count <> 1 or v_vp_count <> 1 then
    raise exception 'Roster must contain exactly one Club President, one Club Secretary, and one Vice President' using errcode = '22023';
  end if;

  -- Refuse to silently displace an existing administrator. Reconciliation is an
  -- explicit opt-in from the operator after reviewing the production preflight.
  if not coalesce(p_reconcile_admins, false) and (
    exists (
      select 1 from public.member_roles mr
      where mr.role = 'admin'
        and mr.user_id not in (
          select (value ->> 'user_id')::uuid
          from jsonb_array_elements(p_members)
          where lower(trim(value ->> 'designation')) in ('club president','club secretary','vice president')
        )
    )
    or exists (
      select 1 from public.club_office_bearers ob
      where ob.active = true
        and ob.user_id not in (
          select (value ->> 'user_id')::uuid
          from jsonb_array_elements(p_members)
          where lower(trim(value ->> 'designation')) in ('club president','club secretary','vice president')
        )
    )
  ) then
    raise exception 'Other active administrators/office bearers exist. Review them and rerun with explicit reconciliation approval.' using errcode = '42501';
  end if;

  if coalesce(p_reconcile_admins, false) then
    update public.club_office_bearers as ob
      set active = false, updated_at = now()
      where ob.active
        and ob.user_id not in (
          select (value ->> 'user_id')::uuid
          from jsonb_array_elements(p_members)
          where lower(trim(value ->> 'designation')) in ('club president','club secretary','vice president')
        );

    delete from public.member_roles as mr
      where mr.role = 'admin'
        and mr.user_id not in (
          select (value ->> 'user_id')::uuid
          from jsonb_array_elements(p_members)
          where lower(trim(value ->> 'designation')) in ('club president','club secretary','vice president')
        );
  end if;

  -- Deactivate the target office-bearer rows first so position swaps cannot
  -- collide with the partial unique index while the transaction updates them.
  update public.club_office_bearers as ob
    set active = false, updated_at = now()
    where ob.active
      and ob.user_id in (
        select (value ->> 'user_id')::uuid
        from jsonb_array_elements(p_members)
        where lower(trim(value ->> 'designation')) in ('club president','club secretary','vice president')
      );

  for roster_row in select value from jsonb_array_elements(p_members)
  loop
    begin
      v_user_id := (roster_row ->> 'user_id')::uuid;
    exception when others then
      raise exception 'Invalid Auth user ID in BOD roster' using errcode = '22023';
    end;

    v_email := lower(trim(coalesce(roster_row ->> 'email', '')));
    v_first_name := trim(coalesce(roster_row ->> 'first_name', ''));
    v_last_name := trim(coalesce(roster_row ->> 'last_name', ''));
    v_full_name := trim(v_first_name || ' ' || v_last_name);
    v_designation := trim(coalesce(roster_row ->> 'designation', ''));

    if v_user_id is null or v_email = '' or v_first_name = '' or v_last_name = '' or v_designation = '' then
      raise exception 'Each BOD record requires user_id, email, first_name, last_name, and designation' using errcode = '22023';
    end if;
    if char_length(v_email) > 254 or char_length(v_full_name) < 2 or char_length(v_full_name) > 120 then
      raise exception 'Invalid BOD profile values' using errcode = '22023';
    end if;

    v_position := case lower(v_designation)
      when 'club president' then 'President'
      when 'club secretary' then 'Secretary'
      when 'vice president' then 'Vice President'
      else null
    end;

    select lower(trim(u.email)) into v_auth_email
    from auth.users u
    where u.id = v_user_id;

    if not found or v_auth_email is distinct from v_email then
      raise exception 'Auth user/email mapping does not match the supplied BOD roster' using errcode = '23503';
    end if;

    if exists (
      select 1 from public.members m
      where lower(m.email) = v_email and m.id <> v_user_id
    ) then
      raise exception 'Email already belongs to a different member identity' using errcode = '23505';
    end if;

    select m.email, m.membership_id, m.membership_status
      into v_existing_email, v_member_id, v_existing_status
    from public.members m
    where m.id = v_user_id
    for update;

    if found then
      if lower(v_existing_email) <> v_email then
        raise exception 'Existing profile email differs from the verified Auth email; manual review required' using errcode = '23505';
      end if;
      -- Preserve every existing membership identifier and account status.
    else
      v_member_id := public.next_bod_member_id();
      v_existing_status := 'active';
    end if;

    insert into public.members (
      id, membership_id, first_name, last_name, full_name, email,
      designation, joining_date, membership_status
    )
    values (
      v_user_id, v_member_id, v_first_name, v_last_name, v_full_name,
      v_email, v_designation, current_date, 'active'
    )
    on conflict (id) do update
      set first_name = excluded.first_name,
          last_name = excluded.last_name,
          full_name = excluded.full_name,
          designation = excluded.designation,
          updated_at = now();

    if v_position is not null and v_existing_status <> 'active' then
      raise exception 'A designated office bearer has an inactive or suspended member profile' using errcode = '42501';
    end if;

    -- All BOD accounts receive board_member; office bearers also receive admin.
    insert into public.member_roles(user_id, role)
      values (v_user_id, 'board_member')
      on conflict (user_id, role) do nothing;
    delete from public.member_roles as mr
      where mr.user_id = v_user_id and mr.role = 'member';

    if v_position is not null then
      insert into public.member_roles(user_id, role)
        values (v_user_id, 'admin')
        on conflict (user_id, role) do nothing;

      insert into public.club_office_bearers (
        user_id, position, active, appointed_by, appointment_reason
      )
      values (
        v_user_id, v_position, true, null,
        'Verified against the supplied 2026-2027 BOD roster.'
      )
      on conflict (user_id) do update
        set position = excluded.position,
            active = true,
            appointment_reason = excluded.appointment_reason,
            updated_at = now();
    else
      delete from public.member_roles as mr
        where mr.user_id = v_user_id and mr.role = 'admin';
      update public.club_office_bearers as ob
        set active = false, updated_at = now()
        where ob.user_id = v_user_id and ob.active = true;
    end if;
  end loop;

  select count(*) into v_admin_count
  from public.member_roles
  where role = 'admin';

  if v_admin_count <> 3 then
    raise exception 'Final admin role count must be exactly three; found %', v_admin_count using errcode = '23514';
  end if;

  select count(*) into v_admin_count
  from public.club_office_bearers
  where active = true
    and position in ('President','Vice President','Secretary');

  if v_admin_count <> 3 then
    raise exception 'Final active office-bearer count must be exactly three; found %', v_admin_count using errcode = '23514';
  end if;

  return query
  select
    (roster_row ->> 'user_id')::uuid,
    m.membership_id,
    case
      when lower(trim(roster_row ->> 'designation')) in ('club president','club secretary','vice president') then 'admin'
      else 'bod'
    end
  from jsonb_array_elements(p_members) as items(roster_row)
  join public.members m on m.id = (roster_row ->> 'user_id')::uuid
  order by m.membership_id;
end;
$$;

revoke all on function public.provision_bod_roster(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.provision_bod_roster(jsonb, boolean) to service_role;

commit;
