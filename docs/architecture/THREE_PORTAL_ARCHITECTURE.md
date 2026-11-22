# Three-Portal Architecture — Rotaract Club of Pune City Legends

## Portal entry points

| Experience | Entry route | Authentication | Access |
|---|---|---|---|
| Public club website | `/` | None | Everyone |
| Members Portal | `/members/login/` | Supabase Auth | Invited, active members, including BOD and office bearers |
| Members dashboard | `/members/dashboard/` | Supabase Auth + active member record | Invited, active members |
| Administration Portal | `/board-admin/login/` | Supabase Auth + private office-bearer allowlist | President, Vice President, Secretary only |
| Administration dashboard | `/board-admin/dashboard/` | Same trusted authorization check | President, Vice President, Secretary only |

The Members and Administration portals use the same Supabase identity but have separate login experiences, route namespaces, layouts, navigation and authorization checks. Signing in to the Members Portal does not redirect a user into the Administration Portal.

## Authorization model

- `member_roles.member` and `member_roles.board_member` continue to identify ordinary membership/BOD status.
- `club_office_bearers` is the sole source of administrative eligibility.
- The table permits only `President`, `Vice President`, and `Secretary`, one active holder per position and one position per user.
- `is_office_bearer_admin()` checks the signed-in user against that private table and requires an active member record.
- Legacy `admin` and `super_admin` role rows are deleted by migration `20261124000000_three_portal_office_bearer_security.sql`. Member/Auth records are not deleted.
- Administrative RLS policies and RPCs resolve through `has_member_role()` / `has_operation_permission()`, which now require office-bearer eligibility. Granular BOD permission rows are retained for history but no longer grant administrative access.
- The office-bearer table has RLS enabled, no browser grants and no browser policies. Provisioning is done by an authorized operator in the Supabase SQL editor after identity verification.
- The Edge Function that sends member invitations checks the same private office-bearer allowlist. Legacy role strings do not authorize invitations.

## Route migration

| Previous route | New route / status |
|---|---|
| `/member-login/` | `/members/login/` (legacy root redirects) |
| `/member-dashboard/` | `/members/dashboard/` (legacy root redirects) |
| `/admin/` | `/board-admin/dashboard/` (legacy root redirects) |
| `/admin/members/` | `/board-admin/members/` |
| `/admin/contributions/` | `/board-admin/contributions/` |
| `/admin/gamification/` | `/board-admin/gamification/` |
| `/admin/audit/` | `/board-admin/audit/` |

The public navigation and footer are generated from the public navigation data only. Member and admin login links are not part of the public navigation. Portal routes suppress the public navbar, footer, mobile dock and public pointer effects.

## Local development

1. Install Node.js 18.18+ and the project dependencies:
   ```bash
   npm ci
   ```
2. Copy `.env.example` to `.env.local` and configure only the Supabase project URL and public anon/publishable key in the `NEXT_PUBLIC_` variables. Never put a service-role key in a `NEXT_PUBLIC_` variable or in browser code.
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open `/` for the public site, `/members/login/` for member login and `/board-admin/login/` for office-bearer login.

## Supabase migration and provisioning

Apply migrations in chronological order, including:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The latest required migration is `20261124000000_three_portal_office_bearer_security.sql`. Apply it before deploying the updated `invite-member` Edge Function.

### Provision the three office bearers

Do not guess email addresses or create accounts for the President, VP or Secretary. First verify the current office bearers with the club and confirm each already has an active Members Portal profile. In the Supabase SQL editor, find the exact Auth UUIDs from the verified emails:

```sql
select u.id, u.email, m.full_name, m.membership_status
from auth.users u
join public.members m on m.id = u.id
where lower(u.email) in (lower('VERIFIED_PRESIDENT_EMAIL'), lower('VERIFIED_VP_EMAIL'), lower('VERIFIED_SECRETARY_EMAIL'));
```

Review the returned names, emails and status with the club before proceeding. Replace the UUID placeholders below with the exact verified UUIDs returned above:

```sql
insert into public.club_office_bearers
  (user_id, position, active, appointed_by, appointment_reason)
values
  ('VERIFIED_PRESIDENT_AUTH_UUID', 'President', true, null, 'Verified current club office bearer appointment'),
  ('VERIFIED_VP_AUTH_UUID', 'Vice President', true, null, 'Verified current club office bearer appointment'),
  ('VERIFIED_SECRETARY_AUTH_UUID', 'Secretary', true, null, 'Verified current club office bearer appointment');
```

If the rows already exist, use a reviewed `update` rather than blindly inserting duplicates. The constraints prevent two active users from holding the same position. Keep this table private; do not grant browser insert/update/delete access. The migration intentionally does not guess who holds the three positions.

Verify the provisioned users using a signed-in session for each account and the `is_office_bearer_admin()` RPC. The function returns `true` only for the matching active office bearer.

## Production deployment — GoDaddy cPanel static hosting

The project retains `output: "export"` and `trailingSlash: true`.

```bash
npm ci
npm run typecheck
npm run test:members-hub
npm run build
```

Upload the contents of `out/` to the domain's `public_html/` directory. Do not upload `.env.local`, service-role keys, SQL credentials or local development files. Configure Supabase Auth redirect URLs for the production `/members/login/` URL and the deployed site origin. Keep the Supabase public anon/publishable key in the frontend environment only; RLS and RPCs enforce authorization.

Deploy the invitation Edge Function after applying the new migration:

```bash
npx supabase functions deploy invite-member
```

## Security verification checklist

- Public desktop/mobile/footer navigation contains no member or admin login entry.
- `/members/login/` and `/members/dashboard/` work for invited active members.
- Ordinary members and ordinary BOD members are denied at `/board-admin/` even if they retain stale client state or legacy role values.
- Only the three allowlisted active office bearers pass `is_office_bearer_admin()`.
- Direct calls to admin RPCs and administrative RLS-protected resources are denied to ordinary members/BOD users.
- The Edge Function rejects invitation requests unless the caller is an active office bearer.
- Browser devtools show only the Supabase URL and anon/publishable key; no service-role secret.
- Static build exports `/members/` and `/board-admin/` route trees successfully.

## Rollback

The security migration is additive except for deleting obsolete `admin`/`super_admin` role rows; it does not delete Auth users or member profiles. If a frontend deployment has a regression, restore the previous static `out/` backup while retaining the database security migration. Do **not** restore the previous database authorization functions or re-grant legacy admin roles, as that would reopen the privilege-escalation paths this migration closes. Any database rollback must be a separately reviewed forward migration that preserves the three-office-bearer restriction.
