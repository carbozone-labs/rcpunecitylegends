# Security Audit

**Scope:** Supplied source ZIP plus changes in this working copy.  
**Date:** 2026-11-21  
**Evidence:** Source inspection, static scans, and 53 Node source-level tests.  
**Important:** No production Supabase credentials, live Auth sessions, or remote database access were supplied. This is not a live penetration test.

## Executive result

The repository contains a useful database-backed authorization foundation: browser roles cannot write the private office-bearer allowlist, administrative RPCs validate trusted office-bearer status, and the browser uses only the public anon key. The BOD provisioning change adds a service-role-only transaction and a dry-run-first provisioning script.

**Architecture limitation:** The application is configured for Next.js static export and cPanel static hosting. Consequently, Next.js server components cannot perform per-request session authorization, and there are no Next.js route handlers or server actions in this build. Admin page shells use client-side session checks for presentation. Confidential data and operations must therefore remain protected by Supabase RLS, guarded RPCs, and Edge Functions. If server-rendered route protection is mandatory, hosting must move to an SSR-capable platform; that is a deployment architecture change and was not silently introduced.

## Security checks

| # | Check | Status | Evidence / remaining work |
|---:|---|---|---|
| 1 | Authentication bypass | WARNING | Supabase Auth is used; bypass testing with live identities was not available. |
| 2 | Unauthorized Admin access | PASS (source-level) | Trusted `is_office_bearer_admin()` check and 3-portal source tests. Verify with live sessions. |
| 3 | Direct URL access | WARNING | Client portal shell gates display; static HTML routes are not server-rendered protected. Supabase must deny all sensitive data/actions. |
| 4 | API authorization | PASS (source-level) | Guarded RPCs and Edge Function caller checks found. Live JWT tests still required. |
| 5 | Server action authorization | NOT APPLICABLE | No Next.js `"use server"` actions found; static export retained. |
| 6 | Role escalation | PASS (source-level) | Browser cannot write roles/office-bearer table; role-management RPCs use trusted admin checks. |
| 7 | Self-role modification | PASS (source-level) | Role writes are not granted to browser roles; protected RPC validation exists. |
| 8 | Supabase RLS bypass | WARNING | RLS is enabled in supplied migrations and source tests pass; no live policy execution test. |
| 9 | Service-role key exposure | PASS (source scan) | No embedded Supabase service key pattern found; key used only by Edge Function server environment and local provisioning environment. |
| 10 | Environment variable exposure | PASS (source scan) | ZIP contains placeholder `.env.example` files only. Live hosting variables were not inspected. |
| 11 | SQL injection | WARNING | RPC parameters are typed and parameterized; no live penetration test or full SQL static analyzer was run. |
| 12 | XSS | NOT TESTED | Requires dependency-backed/static and browser testing. |
| 13 | CSRF | NOT TESTED | Browser API uses bearer tokens; full browser threat-model validation not performed. |
| 14 | Session validation/expiration | WARNING | Supabase token refresh and session restore exist; expiry/revocation behavior not tested with live sessions. |
| 15 | Password handling | PASS (source-level) | Provisioner never logs/writes passwords; existing Auth passwords are preserved; new passwords are sent only to Supabase Auth Admin API. |
| 16 | Duplicate Member ID generation | PASS (design/source-level) | Unique existing `membership_id` plus new database sequence; actual remote collisions require migration and live execution. |
| 17 | Duplicate account creation | PASS (design/source-level) | Provisioner lists/reuses Auth users and compensates newly created identities on DB failure. Live API race test not run. |
| 18 | Unauthorized profile modification | PASS (source-level) | Existing profile update grants are column-scoped and self-row constrained; live RLS test required. |
| 19 | Sensitive data exposure | WARNING | Public directory and protected RPC design inspected; live API responses and deployed bundles not audited. |
| 20 | Database privilege escalation | PASS (source-level) | Private allowlist and service-role-only provisioning RPC; validate on production database. |
| 21 | Broken access control | WARNING | Backend authorization design exists, but static page route protection is client-side by architecture. |
| 22 | Insecure direct object references | NOT TESTED | Requires authenticated multi-user API tests. |
| 23 | Session expiration | NOT TESTED | No live refresh/revocation test. |
| 24 | Dependency vulnerabilities | NOT TESTED | `npm ci` timed out; dependency installation and `npm audit` could not be completed. |
| 25 | Production build security | BLOCKED | Build could not run because Next.js dependencies were unavailable in the workspace. |

## Secret scan

- ZIP includes `.env.example` and `supabase/functions/.env.example`; no local production `.env` files were present.
- No JWT-like token or Supabase secret-key pattern was detected in scanned source/config/documentation files.
- A Resend key prefix appears only as a visibly fake placeholder in setup documentation.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public browser configuration by design.
- `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` must remain in Supabase Edge Function secrets or a secure local process environment, never in website bundles.

## Required production verification

1. Confirm the remote migration history before applying `20261126000000_provision_bod_roster.sql`.
2. Inspect all current `admin` role rows and active `club_office_bearers` rows.
3. Run provisioning dry-run, review the roster, then apply only with approved reconciliation.
4. Test login for President, Secretary, Vice President, Treasurer, and at least one other BOD account.
5. With a normal BOD JWT, attempt `/board-admin/`, admin RPCs, role writes, office-bearer reads/writes, and another member's profile update.
6. Verify RLS and RPC denials directly against the production project.
7. Run dependency audit, lint, typecheck, and static production build in a network-enabled environment.
8. If server-side route rendering is mandatory, approve a migration away from static hosting before implementing server-only Next.js authorization.
