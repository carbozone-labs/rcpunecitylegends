# Members and Administration Portals — Supabase Setup

This document replaces the earlier single-admin bootstrap instructions. Follow `THREE_PORTAL_ARCHITECTURE.md` for the full route, migration and office-bearer provisioning procedure.

## Supabase Auth

In Supabase Dashboard → Authentication → Providers → Email:
- Enable Email provider.
- Disable public sign-ups.
- Require email confirmation.
- Set invite-link expiry to seven days or less.
- Set password minimum length to at least 12 characters where supported.

In Authentication → URL Configuration, set the production Site URL and allow-list:
- `https://rcpunecitylegends.org/members/login/`
- `https://rcpunecitylegends.org/members/dashboard/settings/`
- `https://rcpunecitylegends.org/board-admin/login/`
- `http://localhost:3000/members/login/`
- `http://localhost:3000/members/dashboard/settings/`
- `http://localhost:3000/board-admin/login/`

Use only club-controlled origins.

## Frontend environment

Copy `.env.example` to `.env.local` for local development. Only these public browser values belong in the static website:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never add service-role, SMTP, Resend or provider secrets to `NEXT_PUBLIC_*` variables.

## Edge Function secrets

Set the following in Supabase Edge Function secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGIN=https://rcpunecitylegends.org`
- `INVITE_REDIRECT_URL=https://rcpunecitylegends.org/members/login/`

Deploy `invite-member` only after applying the office-bearer migration. It checks the private `club_office_bearers` table and does not accept legacy admin role strings. Keep `submit-enquiry` independently configured.

## Administrative provisioning

Do not create a first super-admin role. The new system has no super-admin bootstrap. Verify the current President, Vice President and Secretary with the club, find their exact existing Auth UUIDs and provision them into `public.club_office_bearers` using the procedure in `THREE_PORTAL_ARCHITECTURE.md`. The table is private and browser clients cannot modify it.

## Development and deployment

```bash
npm ci
npm run dev
npm run typecheck
npm run test:members-hub
npm run build
```

Upload the generated `out/` contents to GoDaddy cPanel `public_html/`.
