> **Architecture update:** Historical phase report. The current three-portal routes and authorization model are documented in `THREE_PORTAL_ARCHITECTURE.md`; use `THREE_PORTAL_IMPLEMENTATION_REPORT.md` for the current implementation status.

# Legends Members Hub — Phase 1 Delivery Report

**Scope:** Authentication, invitation provisioning, role foundation, private member profile and dashboard.  
**Hosting model:** Next.js static export + Supabase Auth/PostgreSQL/Edge Functions.  
**Report status:** Source implementation complete; production integration and static build verification remain pending external environment access.

## 1. Discovery report
Inspected the uploaded repository's package manifest, Next.js config, feature flag, existing Legend Zone routes/components/data/helper, app layout, navigation data, Supabase config, existing enquiry migration and Edge Function, environment example and deployment docs.

Findings:
- Existing site uses Next.js 15.5.28, React 19, TypeScript, Tailwind, Framer Motion and Lucide.
- `output: "export"`, `trailingSlash: true`; no persistent Next.js server is available on GoDaddy cPanel.
- Existing Legend Zone is disabled through `src/config/features.ts`; prototype routes use `.zone.tsx` extensions.
- Existing Supabase integration is the public `submit-enquiry` Edge Function and `enquiries`/`enquiry_admins` migration.
- Existing `.env`, `.env.local`, and `.env.production` were present in the upload. They were not overwritten. They are excluded from the delivery archive for credential hygiene.

## 2. Implemented files
- `src/lib/supabase/browser.ts` — browser Auth/PostgREST adapter, token persistence/refresh, recovery callback, profile reads/updates, invitation claim.
- `src/components/members-hub/AuthProvider.tsx` — session/profile/role state.
- `src/components/members-hub/LoginForm.tsx` — email/password login, show/hide, forgot password and invitation/recovery token callback.
- `src/components/members-hub/MemberShell.tsx` — authenticated shell, role-aware navigation, logout and suspended/inactive status handling.
- `src/components/members-hub/DashboardView.tsx` — personalized dashboard, profile completion, membership data and future-module empty states.
- `src/app/member-login/`, `src/app/member-dashboard/`, `/profile/`, `/settings/` — static-export-compatible routes.
- `src/data/club.ts` — public Member Login navigation entry.
- `supabase/migrations/20261121000000_create_members_hub.sql` — members, roles, invitations, RLS, grants, triggers and restricted role function.
- `supabase/functions/invite-member/index.ts` — authenticated admin invitation and existing-account claim workflow.
- `tests/members-hub-security.test.mjs` — static security design assertions.
- `supabase/tests/members_hub_rls.sql` — rollback-only manual two-member/admin/super-admin RLS integration test (requires fixture UUIDs).
- `scripts/utilities/ts-loader.mjs` — TypeScript loader for the existing content-audit script under Node ESM.

## 3. Database/security model
- `members.id` is the Auth user UUID and the profile's primary key.
- `member_roles` has no browser write grants; own roles are readable only by the signed-in user.
- `members` browser updates are column-granted only for phone, bio, skills and interests.
- `members` profile reads are own-row only, with an additional admin/super_admin read policy.
- `member_invitations` has no anon/authenticated grants or policies.
- `set_member_role` requires the caller to hold `super_admin`; only that role can grant/revoke roles.
- Invite provisioning matches normalized Auth email and checks pending status + expiry.
- `enquiry_admins` remains separate and unchanged.

## 4. Test results (actually executed)
| Check | Result | Notes |
|---|---|---|
| `npm run test:members-hub` | PASS | 4 static security assertions passed |
| `npm run typecheck` | PASS | `tsc --noEmit` completed |
| `npm run lint` | PASS | ESLint reported no warnings/errors; Next reports `next lint` deprecated |
| `npm run check:content` | PASS | 196 image refs, 14 events, 7 partners, 18 people and 3 leadership years; no errors |
| `npm run build` | BLOCKED | Next.js could not load Linux SWC binary; archive only had Windows SWC binary and registry network lookup failed (`EAI_AGAIN registry.npmjs.org`) |
| Supabase migration apply | PENDING | No live database migration execution performed |
| Live login/invitation/RLS two-account tests | PENDING | Supabase project credentials/configuration were not used for live integration |
| Existing enquiry form regression | NOT LIVE-VERIFIED | Existing source and migration were preserved; no production submission was made |

The security tests are source-level checks, not substitutes for executing PostgreSQL RLS tests against a real Supabase project.

## 5. Manual configuration still required
1. Apply the new SQL migration in Supabase.
2. Disable public Auth signups and require email confirmation.
3. Configure Site URL, exact redirect allow-list and invite expiry.
4. Set `ALLOWED_ORIGIN`, `INVITE_REDIRECT_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` as Supabase Edge Function secrets.
5. Deploy `invite-member` with JWT verification enabled.
6. Bootstrap the first `super_admin` using the SQL in `MEMBERS_HUB_SETUP.md`.
7. Configure website build variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
8. Build on a machine with the matching Linux SWC package (or install dependencies with network access), then upload `out/` to cPanel.
9. Test with two real accounts, including suspended account, member isolation, admin invitation, existing-account claim, expired invite and attempted role escalation.

## 6. Known limitations
- Profile photo upload is deliberately disabled until a private Storage bucket and user-scoped policies are configured.
- Full administrative management UI is not part of Phase 1. Invitation operations are exposed only through the protected Edge Function.
- Static HTML routes cannot be protected server-side on cPanel. All member data requests depend on Auth and RLS; client redirects are UX only.
- Supabase public signup disablement, SMTP, redirect allow-list, migration application and Edge Function deployment are external project settings and have not been changed.
- The browser auth adapter uses localStorage. Use only trusted devices and sign out from shared computers.

## 7. Phase 2 readiness
Ready foundations: stable Auth UUID identity, four-role model, private profile table, invitation ledger, RLS boundaries, role-check function, Edge Function invitation endpoint, static route architecture and empty states for future modules.

Not yet ready to turn on Phase 2 modules until live migration and RLS tests pass. Phase 2 can add event participation and attendance tables with policies based on the verified role model; do not add client-only authorization or reuse prototype XP/leaderboard data.
