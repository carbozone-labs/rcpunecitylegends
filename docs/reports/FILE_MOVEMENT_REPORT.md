# File Movement Report

Documentation and scripts were relocated by purpose. No existing application route, static asset, Supabase migration, archive item, or review-needed item was deleted.

| Original Path | New Path | Reason | Verification |
|---|---|---|---|
| `MEMBERS_HUB_ARCHITECTURE.md` | `docs/architecture/MEMBERS_HUB_ARCHITECTURE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_FINAL_ARCHITECTURE.md` | `docs/architecture/MEMBERS_HUB_FINAL_ARCHITECTURE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `THREE_PORTAL_ARCHITECTURE.md` | `docs/architecture/THREE_PORTAL_ARCHITECTURE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_DATABASE_REFERENCE.md` | `docs/database/MEMBERS_HUB_DATABASE_REFERENCE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_EVENTS.md` | `docs/database/MEMBERS_HUB_EVENTS.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_ADMIN_GUIDE.md` | `docs/administration/MEMBERS_HUB_ADMIN_GUIDE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_MEMBER_GUIDE.md` | `docs/administration/MEMBERS_HUB_MEMBER_GUIDE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_PORTAL_GUIDE.md` | `docs/administration/MEMBERS_PORTAL_GUIDE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `OFFICE_BEARER_ADMIN_GUIDE.md` | `docs/administration/OFFICE_BEARER_ADMIN_GUIDE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_ATTENDANCE.md` | `docs/attendance/MEMBERS_HUB_ATTENDANCE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `DEPLOY.md` | `docs/deployment/DEPLOY.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `GITHUB_DEPLOY.md` | `docs/deployment/GITHUB_DEPLOY.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `HOSTINGER_DEPLOY.md` | `docs/deployment/HOSTINGER_DEPLOY.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_DEPLOYMENT_GUIDE.md` | `docs/deployment/MEMBERS_HUB_DEPLOYMENT_GUIDE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `SUPABASE_CHECKLIST.md` | `docs/deployment/SUPABASE_CHECKLIST.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `SETUP_ENQUIRY_SYSTEM.md` | `docs/deployment/SETUP_ENQUIRY_SYSTEM.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_SECURITY.md` | `docs/security/MEMBERS_HUB_SECURITY.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_SECURITY_AUDIT.md` | `docs/security/MEMBERS_HUB_SECURITY_AUDIT.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_OPERATIONS_SECURITY.md` | `docs/security/MEMBERS_HUB_OPERATIONS_SECURITY.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_PHASE1_REPORT.md` | `docs/reports/MEMBERS_HUB_PHASE1_REPORT.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_PHASE2_REPORT.md` | `docs/reports/MEMBERS_HUB_PHASE2_REPORT.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_FINAL_REPORT.md` | `docs/reports/MEMBERS_HUB_FINAL_REPORT.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `THREE_PORTAL_IMPLEMENTATION_REPORT.md` | `docs/reports/THREE_PORTAL_IMPLEMENTATION_REPORT.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_TASKS.md` | `docs/development/MEMBERS_HUB_TASKS.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `MEMBERS_HUB_SETUP.md` | `docs/development/MEMBERS_HUB_SETUP.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `HOW_TO_UPDATE.md` | `docs/development/HOW_TO_UPDATE.md` | Categorized project documentation | Destination exists; internal Markdown links checked |
| `scripts/check-content.mjs` | `scripts/validation/check-content.mjs` | Categorized utility/validation scripts | Destination exists; package references updated |
| `scripts/audit-event-photos.mjs` | `scripts/validation/audit-event-photos.mjs` | Categorized utility/validation scripts | Destination exists; package references updated |
| `scripts/ts-loader.mjs` | `scripts/utilities/ts-loader.mjs` | Categorized utility/validation scripts | Destination exists; package references updated |
| `scripts/setup-keys.ps1` | `scripts/utilities/setup-keys.ps1` | Categorized utility/validation scripts | Destination exists; package references updated |

## Summary

- Documentation files moved: 26
- Script files moved: 4
- Original supplied migrations preserved: 6; one new migration added.
- Source code files modified: `src/lib/supabase/browser.ts` (profile type/query), `src/components/members-hub/AdminConsole.tsx` (auto-generated BOD invitation ID), and `supabase/functions/invite-member/index.ts` (service-role sequence allocation for new BOD invitations).
- Configuration modified: `package.json`, `.gitignore`, and documentation references in `README.md`, `docs/README.md`, and workflow/docs files.
- Existing `src/`, `public/`, `archive/`, `review-needed/`, and `supabase/` directory conventions preserved.
- No existing file intentionally deleted.

## New files created

- `docs/reports/INITIAL_CODEBASE_AUDIT.md`
- `docs/reports/BEFORE_PROJECT_STRUCTURE.md`
- `docs/reports/AFTER_PROJECT_STRUCTURE.md`
- `docs/reports/BOD_MEMBER_ID_MAPPING.md`
- `docs/reports/BOD_SPREADSHEET_VALIDATION.md`
- `docs/reports/BOD_ACCOUNT_PROVISIONING_REPORT.md` — prepared with NOT EXECUTED status; the provisioning script replaces it after a successful live run.
- `docs/reports/TEST_RESULTS.md`
- `docs/reports/FINAL_IMPLEMENTATION_REPORT.md`
- `docs/reports/FILE_MOVEMENT_REPORT.md`
- `docs/security/SECURITY_AUDIT.md`
- `docs/security/AUTHENTICATION_SECURITY.md`
- `docs/administration/BOD_PROVISIONING_GUIDE.md`
- `docs/administration/ROLE_PERMISSION_MATRIX.md`
- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/architecture/APPLICATION_ARCHITECTURE.md`
- `docs/architecture/FOLDER_STRUCTURE.md`
- `docs/database/DATABASE_SCHEMA.md`
- `docs/database/DATABASE_MIGRATIONS.md`
- `docs/database/RLS_POLICIES.md`
- `docs/deployment/ENVIRONMENT_CONFIGURATION.md`
- `supabase/migrations/20261126000000_provision_bod_roster.sql`
- `scripts/provisioning/provision-bod-members.mjs`
- `tests/bod-provisioning-security.test.mjs`

## Manual review

- Review the proposed Member ID mapping against live `public.members` records before applying provisioning; the script preserves existing IDs and the database sequence generates IDs only for new profiles.
- Review current admin/office-bearer assignments. `--reconcile-admins` is intentionally opt-in and should only be used after club approval.
- Validate the new SQL migration on a staging Supabase project before production.
- Install dependencies and run lint, typecheck, build, and live RLS/login tests in a network-enabled environment.