# Initial Codebase Audit

**Project:** Rotaract Club of Pune City Legends  
**Input:** `rcpunecitylegends-repaired-source.zip`  
**Audit stage:** Phase 1 — inspection only  
**Status:** Initial repository and source-level checks completed; live Supabase state not available.

## 1. Technology and deployment

| Area | Observed implementation |
|---|---|
| Framework | Next.js 15 (`next` dependency `^15.5.28`) |
| UI runtime | React 19 (`^19.3.1`) |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion |
| Icons | lucide-react |
| Data/auth | Supabase Auth + PostgREST + RPC |
| Database | Supabase PostgreSQL |
| Edge functions | `invite-member`, `submit-enquiry` |
| Deployment | Next.js `output: "export"`, trailing slash, cPanel/static hosting |
| Node requirement | `>=18.18.0`; project README recommends Node 20 LTS or newer |
| TypeScript alias | `@/*` → `src/*` |

The Next.js configuration deliberately exports a static site. No Next.js route handlers (`route.ts`) or `"use server"` server actions were found. Browser calls use the public Supabase URL and anon key; privileged work is designed to be enforced by database RLS/RPC and Supabase Edge Functions. Do not introduce Next.js server-only routes or middleware that conflict with static export.

## 2. Repository inventory

- 558 ZIP entries; approximately 101.4 MB uncompressed.
- 202 files under `src/`.
- 199 files under `public/`.
- Existing top-level directories include `.github`, `archive`, `docs`, `public`, `review-needed`, `scripts`, `src`, `supabase`, and `tests`.
- Six timestamped Supabase migrations are present, from `20261108000000_create_enquiries.sql` through `20261125000000_require_admin_role_and_restore_verified_office_bearers.sql`.
- Four Node test files are present.
- No `node_modules`, `.next`, or `out` build/dependency folders are included in the ZIP.
- Root contains numerous Markdown guides/reports that belong in categorized `docs/` folders.

## 3. Existing application areas

### Public site
The App Router includes the public landing page and pages for collaborations, contact, events, join, journey, manifesto, story, partners, team, and the optional Legend Zone.

### Portals
- Members portal: `/members/`, `/members/login/`, `/members/dashboard/` and member feature routes.
- Administration portal: `/board-admin/`, `/board-admin/login/`, `/board-admin/dashboard/` and administration feature routes.
- Legacy/compatibility route trees also exist under `/admin/`, `/member-login/`, and `/member-dashboard/`. These must be reviewed before any route cleanup; do not delete them merely because a newer route exists.

### Existing modules
The Members Hub contains member profiles/roles, invitations, events, attendance, tasks, documents, announcements, contributions, XP/achievements/leaderboard, audit history, and administration operations.

## 4. Authentication and authorization observations

- Supabase Auth is used through a custom browser adapter in `src/lib/supabase/browser.ts`.
- The browser adapter persists the Supabase session in localStorage. This is session persistence, not the trusted authorization source.
- `AuthProvider` loads the member profile and roles, then calls `is_office_bearer_admin()` separately.
- The Admin UI checks the trusted office-bearer RPC and active membership before rendering privileged navigation.
- The private `club_office_bearers` table is not granted to browser roles.
- Migration `20261124000000_three_portal_office_bearer_security.sql` requires both the `admin` role and an active President, Vice President, or Secretary allowlist record.
- Migration `20261125000000_require_admin_role_and_restore_verified_office_bearers.sql` restores the admin role only for active verified office-bearer rows and removes obsolete `super_admin` role rows.
- `invite-member` uses the service role only inside a Supabase Edge Function, verifies the caller, and checks the trusted office-bearer record for invitation operations.

**Important:** The source ZIP does not prove which Auth users, member rows, roles, office-bearer rows, or migrations currently exist in the production Supabase project. Live verification requires authorized project access and real user sessions.

## 5. Database and migration observations

- Existing member identity is represented by `public.members.id` (linked to `auth.users.id`) and unique `membership_id`.
- Existing profile columns include `full_name`, `email`, `designation`, membership status, profile details, and timestamps.
- Existing role values in the initial migration include `member`, `board_member`, `admin`, and legacy `super_admin`; the corrective migration constrains supported values to `member`, `board_member`, and `admin`.
- Existing BOD membership can use the `board_member` role; the three designated office bearers additionally require `admin` and the private allowlist.
- Avoid creating a second profile table or duplicate member identifier column without a demonstrated need. The requested BOD ID format can be represented through the existing unique membership identifier if compatibility checks confirm it.
- Never rename, reorder, overwrite, or delete any supplied migration. Add new timestamped migrations only.

## 6. Security and configuration observations

- ZIP contains `.env.example` files only; no `.env.local`, `.env.production`, or other production environment file was found.
- `.env.example` documents the public Supabase URL and anon key as browser-visible configuration and explicitly warns against putting `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in website environment files.
- A source scan found no embedded JWT-like token or Supabase secret-key pattern. A Resend key prefix appears only in documentation as an obvious placeholder example.
- `.gitignore` excludes local environment files, build output, dependency directories, and Supabase temporary state.
- This is a source scan, not a guarantee about live deployment configuration or Git history.

## 7. Folder organization issues

- Many project guides and reports remain in the root (Members Hub, three-portal, deployment, security, and setup documentation).
- `docs/` already has architecture, deployment, security, and testing folders, but does not yet provide one consistent home for all documentation.
- `scripts/` contains several root-level scripts that should be classified by purpose.
- `supabase/migrations/` is already correctly separated and contains six ordered migrations.
- `archive/` and `review-needed/` contain preserved assets and files awaiting identification; do not purge or blindly relocate them.
- Similar basenames are not automatically duplicates: multiple Next.js `page.tsx` files are required routes. `src/lib/legendZone.ts` imports from `src/data/legendZone.ts`; these are distinct utility/data layers, not a duplicate to delete.

## 8. Initial test execution

Executed from the extracted source tree:

`node --test tests/members-hub-security.test.mjs tests/members-hub-phase2.test.mjs tests/members-hub-phase3.test.mjs tests/three-portals-security.test.mjs`

**Result:** 41 tests passed, 0 failed. These are source-level Node tests. They do not establish live Supabase authentication, production RLS behavior, or successful migration execution.

The existing `docs/testing/BUILD_AND_TEST_REPORT.md` says 40 tests and records an earlier build blockage due to network/SWC download. That report is historical and must be refreshed after actual validation in the final working environment.

## 9. Risks and items requiring verification

1. Confirm actual production Auth identities and whether each spreadsheet email already exists.
2. Confirm the live migration history before applying any new migration.
3. Confirm the three office-bearer records and corresponding admin role rows in production.
4. Verify existing `membership_id` values before assigning the requested `RCPL-BOD-2026-NNN` identifiers.
5. Keep existing general member identities and role semantics intact.
6. Review compatibility/legacy portal routes before consolidating code.
7. Run dependency-backed lint, typecheck, and production build; dependencies are not included in the ZIP.
8. Confirm the cPanel static export remains buildable after changes.
9. Validate all profile and role operations against RLS with authenticated JWT sessions.
10. Keep spreadsheet passwords out of reports, source files, logs, and the delivered ZIP.

## 10. Phase 1 conclusion

The supplied repository already contains a substantial Members Hub and a three-portal authorization foundation. The safest approach is an incremental upgrade: reuse `members`, `member_roles`, `membership_id`, `club_office_bearers`, existing RLS/RPC functions, and the static-export deployment. The primary gaps to address are BOD roster provisioning/ID mapping, exact three-account office-bearer verification, documentation and script organization, and end-to-end validation.

No production database changes were made during this audit.
