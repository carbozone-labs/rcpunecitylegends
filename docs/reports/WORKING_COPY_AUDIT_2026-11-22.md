# Working-copy audit and delivery status

**Project:** Rotaract Club of Pune City Legends  
**Input:** `rcpunecitylegend.zip`  
**Date:** 2026-11-22  
**Status:** Source audit and safe setup improvements completed; production readiness is not claimed.

## Source archive findings

- The ZIP is a valid archive with 1,430 entries and approximately 155 MB uncompressed.
- The project is Next.js 15 / React 19 with TypeScript and Supabase.
- The site is configured for `output: "export"` and cPanel static hosting. It has no Next.js API route handlers. Privileged server-side operations therefore belong in Supabase Edge Functions, guarded SQL RPCs, and RLS; static-export route gating is not a server-side security boundary.
- The repository already contains public enquiry handling, Supabase Auth, Admin and Members/BOD portal code, seven timestamped migrations, two Edge Functions, BOD provisioning, and source-level security tests.
- Existing documentation describes a 16-record BOD roster, but no Excel/CSV roster was present in the newly supplied ZIP or as a separate upload in this task. No actual member accounts were provisioned.

## Changes made in this working copy

- Added `npm run db:setup`, `db:push`, and `db:verify` wrappers for the Supabase CLI. The setup flow links the selected project and applies migrations; it never calls `db reset`.
- Added `npm run db:seed` as a safe forwarding command to the existing dry-run-first BOD provisioning utility.
- Added `npm run functions:deploy` for the existing `submit-enquiry` and `invite-member` Edge Functions.
- Added `docs/deployment/AUTOMATED_SETUP.md` documenting CLI authentication, database migration, Edge Function deployment, Resend secrets, BOD import, and production verification boundaries.
- Removed local `.env.local`, Supabase CLI `.temp` state, old static `out/` build output, and timestamped backup copies from the delivery package. The public `.env.example` remains.
- Preserved the existing application source, migrations, tests, docs, public assets, and archived event assets.

## Verification performed

| Check | Result |
|---|---|
| ZIP integrity / source inventory | Passed |
| Existing Node security/regression suite | 53 passed, 0 failed |
| New Supabase CLI wrapper JavaScript syntax | Passed |
| New package scripts present | Passed |
| `db:seed` forwarding and dry-run mode | Passed with synthetic test data; no database calls |
| `npm ci` | Timed out in this environment |
| TypeScript / ESLint / Next.js production build | Not run; dependencies were not installed |
| Live Supabase migrations / Auth / RLS | Not run; no authorized project session/credentials provided |
| Resend delivery / sender-domain verification | Not run; no Resend credentials or DNS verification available |
| Real BOD roster import | Not run; roster spreadsheet/CSV not supplied in this task |

## Important compatibility notes

- The existing database/member provisioning implementation uses the established `RCPL-BOD-2026-NNN` identifier format and a database sequence. It was retained to avoid silently changing permanent IDs or breaking existing records. This differs from the illustrative `RC_001` format in the new brief; changing the live identifier convention should be an explicit migration decision after checking existing production IDs.
- Existing enquiry email automation sends a club notification and records notification status. The source reviewed does not establish that applicant confirmation emails or an automated notification retry queue are implemented; these must not be represented as verified features.
- The public site is static-exported. Moving privileged application logic into Next.js server routes would conflict with the current cPanel deployment model. Continue to enforce permissions in Supabase RLS/RPC/Edge Functions unless hosting is changed.

## Required before production sign-off

1. Install dependencies in a network-enabled environment and run `npm ci`, `npm run typecheck`, lint, and `npm run build`.
2. Authenticate Supabase CLI, link the correct production project, review all migrations, then run `npm run db:setup` and `npm run db:verify`.
3. Configure Resend and other Edge Function secrets in Supabase, deploy the functions, and test delivery using the verified sender domain.
4. Supply the actual BOD roster, run a dry-run import, review all names/designations/IDs, and only then provision using the documented explicit apply process.
5. Test President, Vice President, Secretary, ordinary BOD, and general-member sessions against real production RLS policies and verify unauthorized access is denied.
6. Deploy the generated `out/` directory to staging and test all public and portal flows before production.
