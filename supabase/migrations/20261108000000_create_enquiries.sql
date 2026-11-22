-- RC Pune City Legends: native enquiry system
-- ---------------------------------------------------------------------------------------------------------------------
-- Creates:
--   public.enquiries       every enquiry submitted through the website (written only by the `submit-enquiry` Edge Function)
--   public.enquiry_admins  people allowed to read enquiries / change their status from a signed-in session
--   public.is_enquiry_admin()
--
-- Security model
--   * Row Level Security is ON and there is NO policy for `anon`, so website visitors can never read, change or delete
--     enquiries, even with the public anon key. Their privileges are also revoked as a second layer.
--   * The Edge Function writes with the service-role key, which bypasses RLS. That key exists only inside Supabase.
--   * Authorised administrators: either use the Supabase Dashboard (Table Editor / SQL editor), or add a signed-in user to
--     public.enquiry_admins (see SETUP_ENQUIRY_SYSTEM.md). Admins can read enquiries and change `status` only.
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.enquiries (
  id                   uuid primary key default gen_random_uuid(),
  enquiry_type         text        not null,
  full_name            text        not null,
  email                text        not null,
  phone                text,
  organisation         text,        -- Membership: college / organisation. Partnership: organisation / club name.
  city                 text,        -- Membership only
  partnership_type     text,        -- Partnership only
  subject              text,        -- General only
  message              text,        -- Membership: "why do you want to join" (optional). Partnership / General: message.
  status               text        not null default 'New',
  created_at           timestamptz not null default now(),

  -- Operational columns (not shown to visitors)
  client_submission_id uuid,        -- id made by the browser per submission; makes retries / double clicks harmless
  ip_hash              text,        -- salted SHA-256 of the visitor IP, used only for rate limiting (the IP itself is never stored)
  notification_status  text        not null default 'pending',
  notification_error   text,        -- why the email did not go out (never contains secrets); for admin follow-up
  notified_at          timestamptz,

  constraint enquiries_type_check            check (enquiry_type in ('Membership', 'Partnership', 'General')),
  constraint enquiries_status_check          check (status in ('New', 'In Review', 'Contacted', 'Closed')),
  constraint enquiries_partnership_type_check check (partnership_type is null or partnership_type in
    ('Event Partnership', 'Sponsorship', 'Community Collaboration', 'Corporate Partnership', 'Other')),
  constraint enquiries_notification_status_check check (notification_status in ('pending', 'sent', 'failed', 'skipped')),

  -- Required fields per enquiry type (mirrors the website forms; the Edge Function validates first, this is the last line of defence)
  constraint enquiries_required_fields check (
    case enquiry_type
      when 'Membership'  then phone is not null
      when 'Partnership' then phone is not null and organisation is not null and partnership_type is not null and message is not null
      when 'General'     then subject is not null and message is not null
    end
  ),
  constraint enquiries_partnership_type_only check (partnership_type is null or enquiry_type = 'Partnership'),

  -- Length limits (same numbers as the form and the Edge Function)
  constraint enquiries_full_name_len    check (char_length(full_name) between 2 and 100),
  constraint enquiries_email_len        check (char_length(email) between 3 and 254),
  constraint enquiries_phone_len        check (phone is null or char_length(phone) between 7 and 20),
  constraint enquiries_organisation_len check (organisation is null or char_length(organisation) <= 150),
  constraint enquiries_city_len         check (city is null or char_length(city) <= 100),
  constraint enquiries_subject_len      check (subject is null or char_length(subject) between 3 and 150),
  constraint enquiries_message_len      check (message is null or char_length(message) <= 2000),
  constraint enquiries_notification_error_len check (notification_error is null or char_length(notification_error) <= 500)
);

comment on table public.enquiries is 'Website enquiries (Membership / Partnership / General). Written only by the submit-enquiry Edge Function.';

-- Indexes: admin lists (newest first, by status / type), rate limiting (by email / ip hash), email follow-up, retry-safety.
create unique index if not exists enquiries_client_submission_id_key on public.enquiries (client_submission_id) where client_submission_id is not null;
create index if not exists enquiries_created_at_idx          on public.enquiries (created_at desc);
create index if not exists enquiries_status_created_at_idx   on public.enquiries (status, created_at desc);
create index if not exists enquiries_type_created_at_idx     on public.enquiries (enquiry_type, created_at desc);
create index if not exists enquiries_email_created_at_idx    on public.enquiries (lower(email), created_at desc);
create index if not exists enquiries_ip_hash_created_at_idx  on public.enquiries (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists enquiries_notification_followup_idx on public.enquiries (created_at desc) where notification_status in ('failed', 'skipped', 'pending');

-- ---------------------------------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.enquiries enable row level security;

-- Belt and braces: even if a policy were added by mistake, the public roles have no table privileges.
revoke all on public.enquiries from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Administrators (optional; the Supabase Dashboard works without this)
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.enquiry_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.enquiry_admins enable row level security;   -- no policies: nobody can read or edit this list through the API
revoke all on public.enquiry_admins from anon, authenticated;

create or replace function public.is_enquiry_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.enquiry_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_enquiry_admin() from public, anon;
grant execute on function public.is_enquiry_admin() to authenticated;

-- Signed-in admins may read enquiries and change only their `status`. Nobody but the Dashboard / service role can insert or delete.
grant select on public.enquiries to authenticated;
grant update (status) on public.enquiries to authenticated;

drop policy if exists "Admins can read enquiries" on public.enquiries;
create policy "Admins can read enquiries"
  on public.enquiries for select to authenticated
  using ((select public.is_enquiry_admin()));

drop policy if exists "Admins can update enquiry status" on public.enquiries;
create policy "Admins can update enquiry status"
  on public.enquiries for update to authenticated
  using ((select public.is_enquiry_admin()))
  with check ((select public.is_enquiry_admin()));
