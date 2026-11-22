# Production Readiness Audit — BOD 2026–2027

**Project:** Rotaract Club of Pune City Legends — Next.js 15 / Supabase  
**Audit date:** 2026-11-22  
**Scope:** Uploaded project archive and supplied BOD CSV  
**Production mutation status:** None. No Auth users, database rows, migrations, or production settings were changed.

## Executive status

| Area | Status | Evidence / limitation |
|---|---|---|
| Project archive inspection | Completed | 583 non-dependency project files extracted and inspected |
| BOD spreadsheet validation | Completed | 16 records; required fields present; no duplicate or malformed email syntax found |
| Provisioner local dry run | Completed | 16 valid; 3 expected admins; 13 expected board members; no password output |
| Remote Auth inventory | Not tested | No Supabase URL/service-role environment variables or CLI project link was present in the supplied archive/runtime |
| Production schema audit | Not tested | Requires read-only access to the linked production database |
| Remote migration history | Not tested | `supabase/.temp/project-ref` and remote CLI auth were not included |
| Local security tests | Completed | 54/54 Node tests passed after adding a regression test |
| Real login / RLS tests | Not tested | No production Auth accounts were provisioned; no authenticated test sessions available |
| Production migration / provisioning | Awaiting approval and preflight | No production mutation performed |

## BOD spreadsheet validation

- Total data rows: 16
- Valid rows: 16
- Missing mandatory fields: 0
- Duplicate normalized email addresses: 0
- Invalid email syntax: 0
- Password field populated: 16/16 (values intentionally excluded from this report)
- Administrative designations: exactly one Club President, one Vice President, and one Club Secretary
- Expected access mapping: 3 `admin`, 13 `board_member`
- Two members have the designation `Editor`; this is a designation duplication only and does not confer admin access.

Email syntax does not prove mailbox ownership or deliverability. Names and email addresses were not silently corrected.

## Expected role mapping

| First name | Last name | Designation | Expected role |
|---|---|---|---|
| Shreya | Kotkar | Club President | admin |
| Ayushi | Gupta | Club Secretary | admin |
| Sahil | Deole | Vice President | admin |
| Rohit | Thakare | Treasurer | board_member |
| Asawari | Nikam | Professional Service Director (PDD) | board_member |
| Shrinidhi | Gundewar | Club Service Director (CSD) | board_member |
| Aditi | Shrinewar | Community Service Director (CMD) | board_member |
| Arya | Kalambe | ISD & PRO | board_member |
| Shruti | Khedkar | Co-CSD & Co-ISD | board_member |
| Mohit | Teke | Editor | board_member |
| Prassana | Tayde | Sports Representative | board_member |
| Rohit | Pawar | IRRRO | board_member |
| Atharv | Yadav | World Rotaract Week Chairperson | board_member |
| Chaitrali | Khedkar | Editor | board_member |
| Shamal | Dhandgavhal | DEI & MD | board_member |
| Samruddhi | Desale | Sergeant-at-Arms (SAA) | board_member |

## Local project findings

1. Existing Next.js 15 project and Supabase migration architecture are present; no rebuild is required.
2. Existing BOD provisioning script uses the Supabase Auth Admin REST API server-side, defaults to dry-run, reuses confirmed existing Auth users, and does not overwrite their passwords.
3. The provisioning SQL RPC is `SECURITY DEFINER`, checks `auth.role() = 'service_role'`, and is granted only to `service_role`.
4. Existing admin eligibility is based on both the `admin` role and an active private office-bearer row for President, Vice President, or Secretary.
5. Normal BOD role assignment is designed around `board_member`; the provisioning RPC removes `admin` from normal BOD roster users.
6. `.gitignore` excludes environment secrets and BOD credential spreadsheets. No `.env`, `.env.local`, or Supabase CLI link metadata was included in the uploaded archive.
7. Seven migrations are present, ending with `20261126000000_provision_bod_roster.sql`. This migration is dated after the audit date and must not be presumed deployed.

## Security findings and prepared correction

### Task visibility correlation

The Phase 2 task visibility policy uses `a.task_id = id` inside a subquery over `public.task_assignments a`. Because `id` is unqualified and the inner table also has an `id` column, it can bind to the inner assignment row rather than the outer task row. A candidate migration has been added to explicitly correlate `a.task_id = public.tasks.id`.

### Enquiry administrator authorization

The existing `is_enquiry_admin()` function checks only the private `public.enquiry_admins` table. That is a separate authorization list from the three-office-bearer Admin Portal allowlist. The candidate migration changes enquiry access to use `public.is_office_bearer_admin()` so enquiry access follows the same three-person administrative boundary. Confirm this intended policy against production requirements before applying.

Candidate migration: `supabase/migrations/20261124010000_harden_enquiry_and_task_visibility.sql`.

**Dependency:** The candidate migration must only be considered after confirming that `20261124000000_three_portal_office_bearer_security.sql` is in the remote migration history. Do not push it blindly.

## Provisioning dry-run result

The local dry-run completed without contacting Supabase:

- Spreadsheet records: 16
- Valid records: 16
- Invalid records: 0
- Duplicate emails: 0
- Expected admins: 3
- Expected normal BOD: 13
- Existing Auth accounts: UNKNOWN (remote inventory not available)
- Accounts to create: UNKNOWN until a read-only remote Auth inventory is completed

The provisioning script was updated so that, when `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` are available in the local process environment, dry-run can perform a read-only Auth user inventory and report existing vs. to-create accounts. It does not create accounts in dry-run mode.

## Local automated test result

Command: `node --test tests/*.test.mjs`

Result: **54 passed, 0 failed**. These are local source/static behavior tests. They do not prove production schema state, live RLS enforcement, or successful user logins.

## Modified files in this audit copy

- `scripts/provisioning/provision-bod-members.mjs` — dry-run can optionally inventory existing Auth users using server-side credentials without making changes.
- `supabase/migrations/20261124010000_harden_enquiry_and_task_visibility.sql` — candidate migration for task visibility correlation and enquiry admin allowlist alignment.
- `tests/three-portals-security.test.mjs` — regression test for both security corrections.
- `docs/reports/PRODUCTION_READINESS_AUDIT_2026-11-22.md` — this report.

## Required before production approval

1. Restore access to the intended linked Supabase project in the local environment (Supabase CLI login/link or securely configured server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`). Do not send the service-role key in chat.
2. Run and review remote migration history before applying any local migration.
3. Run a read-only production catalog audit covering all requested tables, constraints, indexes, triggers, functions, policies, grants, and Auth configuration.
4. Compare the remote schema and migration history with all local migration files; identify exactly which migrations are pending and inspect any drift.
5. Run the enhanced dry-run with remote Auth inventory and inspect the count of existing accounts, confirmed status, banned status, and duplicates.
6. Review the candidate migration and the existing `20261126000000_provision_bod_roster.sql`, especially the explicit reconciliation behavior for pre-existing admin/office-bearer rows.
7. Obtain explicit approval before applying migrations, creating Auth users, or writing/updating any production member, role, permission, or office-bearer rows.

## Production changes

**None.** No production SQL was executed. No Supabase Auth user was created, updated, or deleted. No existing production row or migration history was changed.
