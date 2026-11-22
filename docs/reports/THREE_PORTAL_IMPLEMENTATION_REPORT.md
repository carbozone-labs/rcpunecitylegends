# Three-Portal Implementation Report

## Delivered in this source update

### Public website
- Removed the Member Login item from the shared public navigation data, which also removes it from the mobile menu and footer navigation.
- Public website chrome is now rendered only on public routes. Members and Administration routes no longer display the public navbar, footer, mobile dock or pointer effects.
- Public pages and existing club design components remain in place.

### Members Portal
- Added `/members/login/` and `/members/dashboard/` with the existing member pages migrated under the new route namespace.
- Preserved profile, attendance, events, registrations, tasks, contributions, announcements, documents, achievements, leaderboard, directory and settings pages.
- Removed administrative management controls from member-facing operational pages.
- Removed the Admin Portal shortcut from the Members Portal sidebar and removed the old administrative notice from member settings.
- Old `/member-login/`, `/member-dashboard/` and nested member dashboard routes now show static-export-compatible client redirects to the new routes.

### Administration Portal
- Added a separate `/board-admin/login/` experience and `/board-admin/dashboard/` overview.
- Migrated member management, contributions, gamification and audit pages into `/board-admin/`.
- Added separate office-bearer-only management routes for events, attendance, tasks, documents and announcements under `/board-admin/operations/`.
- Admin navigation and authorization are separate from the Members Portal. An office bearer can still sign in independently to the Members Portal.
- Old `/admin/` and nested admin routes now show static-export-compatible client redirects to their `/board-admin/` equivalents.

### Database and Edge Function security
- Added `20261124000000_three_portal_office_bearer_security.sql`.
- Added private `public.club_office_bearers` allowlist with only President, Vice President and Secretary positions.
- Added `public.is_office_bearer_admin()` as the trusted authorization check.
- Replaced role/permission helper behavior so legacy `admin` and `super_admin` rows and granular BOD permissions cannot grant administrative access.
- Deleted legacy `admin` and `super_admin` role rows while preserving Auth users and member profiles.
- Restricted role assignment RPCs so browser callers cannot recreate legacy admin roles.
- Updated the announcement notification trigger to use the new allowlist for the admins-only audience and normalized old notification links.
- Updated the invitation Edge Function to verify the private office-bearer allowlist instead of trusting role labels.
- RLS remains enabled; browser roles have no direct access to the office-bearer table. Only the service role used by the trusted Edge Function has table privileges.

## New routes

### Public
- `/` and all existing public routes remain public and unchanged in purpose.

### Members
- `/members/`
- `/members/login/`
- `/members/dashboard/`
- `/members/dashboard/profile/`
- `/members/dashboard/settings/`
- `/members/dashboard/events/`
- `/members/dashboard/attendance/`
- `/members/dashboard/tasks/`
- `/members/dashboard/directory/`
- `/members/dashboard/documents/`
- `/members/dashboard/announcements/`
- `/members/dashboard/contributions/`
- `/members/dashboard/achievements/`
- `/members/dashboard/leaderboard/`

### Administration
- `/board-admin/`
- `/board-admin/login/`
- `/board-admin/dashboard/`
- `/board-admin/members/`
- `/board-admin/contributions/`
- `/board-admin/gamification/`
- `/board-admin/audit/`
- `/board-admin/operations/events/`
- `/board-admin/operations/attendance/`
- `/board-admin/operations/tasks/`
- `/board-admin/operations/documents/`
- `/board-admin/operations/announcements/`

## Access matrix

| Account category | Members Portal | Administration Portal |
|---|---:|---:|
| Active general member | Yes | No |
| Active committee member | Yes | No |
| Active ordinary BOD member | Yes | No |
| Active President in office-bearer allowlist | Yes | Yes |
| Active Vice President in office-bearer allowlist | Yes | Yes |
| Active Secretary in office-bearer allowlist | Yes | Yes |
| Inactive/suspended member | No | No |
| Public visitor | No | No |

## How office-bearers are authorized

The three accounts must first be active Members Portal accounts. A trusted operator verifies their identity with the club, obtains each exact `auth.users.id`, and inserts those UUIDs into `public.club_office_bearers`. The app checks the allowlist through `is_office_bearer_admin()`; it does not trust localStorage, user metadata or profile designation text. No identities or email addresses were assumed in this change.

## Verification results

- Node-based static/security tests: **38 passed, 0 failed** on the final source state using Node’s built-in test runner.
- Supabase SQL integration test added at `supabase/tests/three_portals_security.sql`; it has not been run against a live or local Supabase database in this environment.
- TypeScript check and Next.js production/static build could not be completed because `npm ci` could not download packages from `registry.npmjs.org` (DNS/network unavailable). No successful build is claimed.
- No production Supabase migration has been applied from this environment.

## Required manual configuration before production

1. Install dependencies with `npm ci` in a network-enabled environment.
2. Configure `.env.local` with the correct public Supabase URL and anon/publishable key.
3. Apply migrations in chronological order using `npx supabase db push`.
4. Verify the current President, VP and Secretary with the club and provision their exact existing Auth UUIDs using the instructions in `THREE_PORTAL_ARCHITECTURE.md`.
5. Deploy the updated `invite-member` Edge Function.
6. Add the new `/members/login/` redirect URL to Supabase Auth allowed redirect URLs and update `INVITE_REDIRECT_URL` to the new route.
7. Run TypeScript, Node tests, Supabase SQL tests and `npm run build` before uploading `out/` to GoDaddy cPanel.
8. Test all three user categories (general member, ordinary BOD, each of the three office bearers) using separate real accounts.
