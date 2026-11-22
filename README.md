# Rotaract Club of Pune City Legends

Next.js 15 / React 19 public website with separate Members and Administration portal experiences backed by Supabase Cloud. Static export supports cPanel hosting and GitHub Pages.

## Local setup

1. Use Node.js 20 LTS or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These values are intentionally public browser configuration.
5. Run `npm run dev`.

## Validation

- `npm run typecheck` — TypeScript.
- `npm run lint` — ESLint via Next.js.
- `npm run test:members-hub` — source-level portal and security regression tests.
- `npm run build` — production static export into `out/`.

## Portals

- Public website: `/` and other public pages.
- Members Portal: `/members/login/`, `/members/dashboard/`.
- Administration Portal: `/board-admin/login/`, `/board-admin/dashboard/`.

The public navigation intentionally contains no portal login links. Administration requires both the `admin` role and an active President, Vice President, or Secretary row in the private `club_office_bearers` table. Authorized administrators can invite General Members or Ordinary BOD Members.

## Supabase

For CLI-driven database setup, migration verification, Edge Function deployment, and secure Resend configuration, follow [Automated Supabase Setup](docs/deployment/AUTOMATED_SETUP.md). The repository exposes `npm run db:setup`, `npm run db:push`, `npm run db:verify`, `npm run db:seed`, and `npm run functions:deploy`.


Review and apply migrations in timestamp order. The corrective migration `20261125000000_require_admin_role_and_restore_verified_office_bearers.sql` restores the `admin` role only for verified active office-bearers, enforces the two-factor authorization rule, and removes the obsolete `super_admin` role value. See `docs/security/AUTHORIZATION_MODEL.md` and `docs/deployment/PRODUCTION_CHECKLIST.md`.

Never put `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in website environment files. Keep them in Supabase Edge Function secrets.

## Documentation

See `docs/README.md` for categorized guides. BOD roster provisioning is documented in `docs/administration/BOD_PROVISIONING_GUIDE.md`; the script defaults to dry-run and requires explicit production credentials to apply.

For the GitHub Pages site and its required Supabase URL/CORS settings, see [GitHub Pages deployment](docs/deployment/GITHUB_PAGES_DEPLOY.md).

## BOD roster provisioning

Run `npm run provision:bod -- --input "path/to/BOD.csv"` for a dry run. Production changes require `--apply`, the new reviewed Supabase migration, and local `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` environment variables. See `docs/administration/BOD_PROVISIONING_GUIDE.md`.
