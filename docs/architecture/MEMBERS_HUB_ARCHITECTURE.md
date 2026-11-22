> **Architecture update:** This earlier phase document is superseded by `THREE_PORTAL_ARCHITECTURE.md` and `THREE_PORTAL_IMPLEMENTATION_REPORT.md`. The current admin allowlist is President, Vice President and Secretary only; do not follow any legacy super-admin or granular BOD access instructions below.

# Legends Members Hub — Architecture (Phase 1)

## Repository discovery
- Next.js 15 / React 19 / TypeScript / Tailwind / Framer Motion / Lucide.
- `next.config.mjs` uses `output: "export"` and `trailingSlash: true`; hosting is static cPanel.
- Existing Supabase integration is the `submit-enquiry` Edge Function and `enquiries` migration. `enquiry_admins` remains separate and untouched.
- The old `/legend-zone` prototype uses `.zone.tsx` routes and is disabled by `src/config/features.ts`; it remains disabled and unchanged.

## Runtime topology
Browser (static exported Next.js pages) → Supabase Auth REST + PostgREST using only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` → PostgreSQL RLS. Trusted invitation provisioning runs in `supabase/functions/invite-member` using the Edge Function's server-side service-role secret. No Next.js API route or server action is required at runtime.

The browser auth adapter is deliberately small and uses Supabase's documented Auth/PostgREST HTTP endpoints. It persists the session in browser localStorage and refreshes expiring sessions. This is not a security boundary: all database access remains governed by SQL grants and RLS.

## Routes
- `/members/login/` — sign-in, password recovery initiation, invitation/recovery token callback.
- `/members/dashboard/` — member overview and coming-soon module placeholders.
- `/members/dashboard/profile/` — approved self-service profile fields.
- `/members/dashboard/settings/` — password update and role-aware admin notice.

## Identity and authorization
`members.id` is the corresponding `auth.users.id`; no second profile UUID is generated. `member_roles` is separate from editable profile fields. Browser users can read only their own role rows and cannot write role or invitation rows. `set_member_role` requires the caller to hold `super_admin`. `admin` and `super_admin` can read member profiles; board members have no implicit administrative rights. `enquiry_admins` is not mapped to these roles.

## Invitation lifecycle
The trusted Edge Function authenticates the caller, checks `admin`/`super_admin`, writes a pending invitation, then calls `auth.admin.inviteUserByEmail`. A narrowly scoped `auth.users` trigger provisions the default `member` role and profile only when the invitation email matches and is unexpired. Existing Auth accounts can claim their own pending invitation by calling the Edge Function with `{ "action": "accept" }` while authenticated as the same email. Invitation validity is seven days at issuance; configure Supabase Auth invite expiry to no more than seven days as well.

## Static deployment
Upload the contents of `out/` to the web root. Browser-side session checks are convenience navigation only; they do not secure the database. Supabase Auth URL allow-list must include the production login and dashboard URLs and the local development callback URLs.
