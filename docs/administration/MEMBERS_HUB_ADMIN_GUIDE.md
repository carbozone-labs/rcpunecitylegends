# Administration Portal — Office-Bearer Guide

## Who can sign in?

Only the active President, Vice President and Secretary whose exact Supabase Auth user IDs are present in the private `public.club_office_bearers` table. BOD membership, committee membership and legacy `admin` / `super_admin` role labels do not grant administrative access.

## Sign in

1. Open `/board-admin/login/`.
2. Use the same invited Supabase account used for the Members Portal.
3. The application verifies the account through `is_office_bearer_admin()` and requires active membership.
4. Authorized users are sent to `/board-admin/dashboard/`. Unauthorized users see: **You are not authorized to access the Administration Portal.**

## Administrative modules

- Overview and analytics: `/board-admin/dashboard/`
- Member invitations, membership status, board records and role labels: `/board-admin/members/`
- Contribution verification and XP: `/board-admin/contributions/`
- Gamification rules and achievements: `/board-admin/gamification/`
- Event management: `/board-admin/operations/events/`
- Attendance management: `/board-admin/operations/attendance/`
- Task assignment and review: `/board-admin/operations/tasks/`
- Private document management: `/board-admin/operations/documents/`
- Announcements: `/board-admin/operations/announcements/`
- Audit history: `/board-admin/audit/`

All privileged operations are checked by PostgreSQL RLS and protected RPCs. The UI is not the security boundary.

## Member Portal remains separate

President, VP and Secretary can also sign in separately at `/members/login/`. Their member session opens the normal Members Portal and does not automatically open the Administration Portal. No admin shortcut is displayed in the Members Portal.

## Provisioning and removal

A trusted database operator verifies appointments with club leadership and maintains `club_office_bearers` in the Supabase SQL editor. To revoke access, set the relevant row's `active` value to `false`; database checks then deny privileged operations. Do not use localStorage, user metadata or a free-text designation field to grant access.
