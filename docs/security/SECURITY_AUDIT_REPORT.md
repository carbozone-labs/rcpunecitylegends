# Security audit report

## Scope inspected

The supplied archive's application source, Supabase migrations, Edge Functions, RLS smoke tests, portal route components, browser auth adapter, deployment configuration, environment templates, and existing member-hub security tests were inspected. Generated `.next`, `out`, dependency folders, and the local environment file were excluded from the final source package.

## Findings and changes

1. **Admin role mismatch:** the three-portal migration removed both `admin` and `super_admin` rows while the intended role contract requires `admin`. The migration was corrected not to delete valid `admin` rows. A follow-up migration restores `admin` only for active users in the trusted President/VP/Secretary allowlist.
2. **Incomplete admin predicate:** the previous `is_office_bearer_admin()` predicate did not require the `admin` role. It now requires the `admin` role, an active office-bearer row with one of the three exact positions, and an active member profile.
3. **Legacy super-admin:** the corrective migration deletes obsolete `super_admin` role rows and tightens the role constraint to `member`, `board_member`, and `admin`. Legacy SQL policy references are harmless only because the updated `has_member_role()` maps legacy elevated checks to the protected office-bearer predicate; no super-admin row can grant access.
4. **Member login:** login and portal shell now verify an active profile and an allowed member role. The invitation flow now lets authorized office-bearers choose General Member or Ordinary BOD, persists that role on the invitation, and provisions the matching role at acceptance. The Edge Function now requires both the `admin` role and the active exact office-bearer designation.
5. **Auth provider resilience:** an administrative RPC failure no longer discards a successfully loaded member profile and role list. Admin access remains denied on RPC failure.
6. **Secrets hygiene:** `.env.local` was removed from the deliverable; `.env.example` contains placeholders only. `.next`, old static export output, and `node_modules` are not shipped.
7. **Theme preference:** Light, Dark, and System modes are available, persist locally, and respond to system color-scheme changes.

## Existing protections retained

- Browser adapter uses the public anon key and authenticated bearer token; no service-role key is referenced by the client.
- Office-bearer table has RLS enabled and browser privileges revoked.
- Protected administrative operations are performed through guarded RPCs and RLS.
- Existing invitation, audit, event, attendance, document, task, and gamification migrations were retained.

## Limitations / production actions

- The supplied ZIP cannot prove the live Supabase migration state, current test-account records, or actual JWT claims. Apply the corrective migration only after reviewing the target project and then verify the three designated accounts through real application sessions.
- No live Supabase credentials or database connection were used. RLS SQL tests were updated but not executed against production.
- A full Next.js production build could not download the Linux SWC binary because the build environment could not reach `registry.npmjs.org`. TypeScript and ESLint did run successfully.
- Static export cannot provide Next.js server middleware as a security boundary. All private data and mutations must remain protected by Supabase RLS/RPC and Edge Function authorization.
