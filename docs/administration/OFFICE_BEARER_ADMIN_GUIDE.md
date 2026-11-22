# Office-Bearer Administration Guide

## Who can use the Administration Portal?

Only three active club accounts may use `/board-admin/login/`:

1. President
2. Vice President
3. Secretary

BOD membership, committee membership, `board_member`, old `admin` or old `super_admin` labels do not independently authorize administrative access.

## Sign in

1. Open `/board-admin/login/`.
2. Sign in using the same invited Supabase account used for the Members Portal.
3. The application checks the protected `club_office_bearers` table and active membership status.
4. Approved office bearers are sent to `/board-admin/dashboard/`.
5. All other users see: **You are not authorized to access the Administration Portal.**

## Members Portal access

President, VP and Secretary can still sign in separately at `/members/login/` and use the normal member dashboard. The Members Portal does not display an Admin Portal shortcut.

## Provisioning and changes

Only a trusted database operator should update `club_office_bearers` in the Supabase SQL editor after verifying the current club appointment. Never use localStorage, user metadata, a client-side designation field or the public member profile to appoint an administrator. When an office bearer leaves the role, set `active = false` promptly; subsequent RPC and RLS checks will deny privileged operations.

## Sensitive operations

Member invitations, role changes, attendance management, event/task administration, contribution verification, gamification configuration, analytics and audit access remain protected by database authorization checks. The user interface is not the security boundary.
