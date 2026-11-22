# Three-Portal Deployment Guide

This guide supersedes the earlier single Members Hub deployment workflow. The current route and security architecture is documented in `THREE_PORTAL_ARCHITECTURE.md`.

## 1. Before deployment

- Back up the production Supabase database and private Storage objects.
- Verify the correct Supabase project URL and public anon/publishable key.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Supabase Edge Function secrets.
- Confirm public email/password signup remains disabled. Member access is invitation-only.
- Configure Supabase Auth redirect URLs for `/members/login/` and `/members/dashboard/settings/`.
- Set `INVITE_REDIRECT_URL` to `https://rcpunecitylegends.org/members/login/`.

## 2. Apply migrations

Apply all migrations in chronological order. Existing applied migrations must not be replayed. The newest migration is:

`supabase/migrations/20261124000000_three_portal_office_bearer_security.sql`

Use a staging project first. From the project directory:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Then run `supabase/tests/three_portals_security.sql` with the Supabase database test workflow. The new migration preserves Auth users and member profiles, but deletes legacy `admin` and `super_admin` role rows because they no longer represent trusted eligibility.

## 3. Provision the three office bearers

Only the active President, Vice President and Secretary may enter `/board-admin/login/`. Verify the current role holders with club leadership and confirm each person has an active Members Portal account. Use the SQL procedure in `THREE_PORTAL_ARCHITECTURE.md` to find exact Auth UUIDs and insert them into the private `club_office_bearers` table. Do not invent emails, UUIDs or credentials.

## 4. Deploy Edge Functions

After the database migration, deploy the updated invitation function:

```bash
npx supabase functions deploy invite-member
```

Keep its service-role secret in Supabase Edge Function secrets only. Keep the enquiry Edge Function and its permissions independent.

## 5. Build the static website

Run on a machine with package registry access and Node.js 18.18+:

```bash
npm ci
npm run typecheck
npm run test:members-hub
npm run build
```

`next.config.mjs` retains `output: "export"` and `trailingSlash: true`. Verify the generated `out/` folder includes `members/login/index.html`, `members/dashboard/index.html`, `board-admin/login/index.html`, `board-admin/dashboard/index.html`, plus the nested member and admin pages. Upload the **contents** of `out/` to GoDaddy cPanel `public_html/`. Do not upload `.env.local`, `.env.production`, `.git`, `node_modules` or service credentials.

## 6. Release checks

- Public desktop/mobile/footer navigation has no Member Login or Admin Login entry.
- Public site pages and enquiry form still work.
- Active invited members can sign in to `/members/login/`.
- Ordinary BOD members are denied at `/board-admin/login/` and direct admin URLs.
- President, VP and Secretary can sign in to the Admin Portal and separately use the Members Portal.
- Admin RPCs and RLS-protected resources reject ordinary members/BOD users.
- Member event registration, task submissions, profile and private document access still work.
- Invitation Edge Function denies callers not present in `club_office_bearers`.
- No service-role key or private provider secret appears in frontend assets.

## 7. Rollback

If a frontend release fails, restore the previous static `out/` backup but keep the new database security migration active. Do not restore legacy admin authorization functions or role grants. Any database rollback must be a separately reviewed forward migration that preserves the three-person office-bearer restriction.
