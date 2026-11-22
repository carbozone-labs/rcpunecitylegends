> **Architecture update:** Historical phase report. The current three-portal routes and authorization model are documented in `THREE_PORTAL_ARCHITECTURE.md`; use `THREE_PORTAL_IMPLEMENTATION_REPORT.md` for the current implementation status.

# Legends Members Hub — Phase 2 Report

## Scope delivered

Phase 2 adds member-facing Events, Attendance, Tasks, Member Directory, Document Centre, Announcements and Notifications pages under `/member-dashboard/`. It also adds role/permission-aware operational controls for event publishing, attendance sessions and audited marking, task creation/assignment, announcement publication and private document uploads.

## Phase 1 verification and compatibility repairs

- Confirmed the Phase 1 migration, browser Supabase adapter, AuthProvider, MemberShell, dashboard, invitation Edge Function, and existing enquiry Edge Function are present.
- Found the member sidebar still linked Events, Attendance, Tasks, Directory and Documents to inert `#` anchors; replaced these with real routes.
- Found the AuthProvider subscription updated the session but did not refresh the member profile/roles on a new sign-in; fixed profile/role refresh on auth changes.
- Found the directory projection used `security_invoker=true`, which inherited the own-profile-only members RLS and hid other active members; changed the projection to a restricted-column view while preserving the private base-table RLS.
- Did not modify or duplicate Phase 1 migrations, enquiry tables, enquiry policies or the enquiry Edge Function.

## New database migration

Apply `supabase/migrations/20261122000000_members_hub_phase2_operations.sql` after `20261121000000_create_members_hub.sql`. It creates operational permissions, events and registrations, attendance sessions/records/audit, tasks/assignments/submissions/history, announcements, notifications and documents. It also configures a private `members-documents` Storage bucket.

## Authorization model

- `admin` and `super_admin` roles are allowed to manage operational modules.
- Board members receive only explicit rows in `member_permissions` (for example `events.manage` or `attendance.manage`).
- Browser navigation is only a usability layer; RLS and restricted RPCs enforce access.
- Event capacity is serialized by locking the event row in `register_for_event`.
- Attendance is written through `mark_attendance`, which records an audit row.
- Document objects are private; metadata audience and object policies are checked before access.

## Known limitations / external setup

- Apply the SQL migration in the Supabase SQL editor or CLI before deploying the updated static site.
- Verify the Storage policies and bucket creation in the target Supabase project.
- Add granular `member_permissions` rows for board members; no blanket board access is granted.
- Task assignment and attendance coordinator forms accept the target member's Supabase Auth UUID; database checks require the target to be an active member. A member-picker backed by an admin-only directory endpoint is a follow-up UX improvement.
- QR check-in is intentionally not included; manual attendance marking is audited. Task submissions support optional private attachments (10 MB, allowlisted MIME types).
- Event reminders and scheduled email delivery require a scheduled Edge Function/cron and a configured email provider. Database notifications are generated for registration, assignment and task review events.
- Live Supabase RLS, Storage, concurrency and email tests require the production/staging Supabase project and are not claimed as executed locally.

## Local verification (this build environment)

- `npm run test:members-hub`: **12/12 passed** (static source/security contract tests for Phase 1 and Phase 2).
- `npm run typecheck`: **not completed** — the dependency install was interrupted; required TypeScript and React type packages are incomplete in `node_modules`.
- `npm run lint`: **not completed** — the Next.js CLI binary was not installed because `npm ci` timed out.
- `npm run check:content`: **not completed** — TypeScript package files were incomplete after the interrupted dependency installation.
- `npm run build`: **not completed** — the Next.js CLI binary was unavailable for the same reason.
- Supabase SQL/RLS/Storage tests: **pending** — no connected staging database or Supabase CLI is available in this environment. The policy test script is `supabase/tests/members_hub_phase2_rls.sql`.

The source-level tests do not prove live PostgreSQL policy behavior, successful file uploads, concurrency under load, or deployed static-export output. Run the full verification sequence after a clean `npm ci` on a machine with registry access and apply the migrations to a staging Supabase project.
