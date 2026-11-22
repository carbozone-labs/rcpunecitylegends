# Automated Supabase setup

This repository uses Next.js static export for cPanel. Runtime authentication, protected data access, privileged operations, and public enquiry processing are handled by Supabase Auth, PostgreSQL RLS/RPC, and Supabase Edge Functions. Do not add Next.js API routes or server middleware unless the hosting architecture is intentionally changed.

## One-time prerequisites

- Node.js 20 LTS or newer.
- No global Supabase CLI installation or local Docker/Supabase stack is required. The project scripts invoke the CLI through `npx --yes supabase`.
- Authenticate once with `npx supabase login` (or use the CLI's supported access-token environment configuration).
- Set `SUPABASE_PROJECT_REF` or `NEXT_PUBLIC_SUPABASE_URL` in the shell to identify the intended hosted project. The project ref can be derived from the Supabase URL.

## Database setup

```bash
npm ci
npm run db:setup
npm run db:verify
```

`db:setup` links the CLI to the selected project and applies the checked-in migrations using `npx supabase db push --linked --yes`. It does not run `db reset`, drop tables, or truncate production data. Review the SQL migrations and target project before running it. If the CLI reports schema drift or a migration conflict, stop and reconcile it rather than forcing a reset.

Subsequent migration-only deployment:

```bash
npm run db:push
npm run db:verify
```

## Deploy Edge Functions

```bash
npm run functions:deploy
```

The CLI deploys `submit-enquiry` and `invite-member`. Their server-side Supabase secrets are managed in the Supabase project, never in browser environment variables.

## Configure Resend and function secrets

Set these secrets in the linked Supabase project using the Supabase Dashboard's Edge Function secrets interface or the CLI:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (must be a sender/domain verified by Resend)
- `NOTIFY_EMAIL_TO` (club inbox; comma-separated addresses are supported)
- `ALLOWED_ORIGINS` (comma-separated production website origins, without paths or trailing slash)
- `IP_HASH_SALT` (recommended random value for IP hashing)

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. Never add the service-role key or Resend key to `.env.local`, `.env.production`, client code, or a static export. The public website only needs `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at build time.

For local Edge Function development, copy `supabase/functions/.env.example` to the git-ignored `supabase/functions/.env` and fill it securely. Do not include that real file in ZIPs or commits.

## BOD roster provisioning

The roster spreadsheet/CSV must be supplied separately. Validate it first with a dry run:

```bash
npm run db:seed -- --input "path/to/BOD.csv"
```

The script requires the expected columns documented in `docs/administration/BOD_PROVISIONING_GUIDE.md`. It does not contact Supabase in dry-run mode. For production provisioning, apply and verify the roster migration first, then provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only to the local process environment and explicitly pass `--apply`. Review existing Admin assignments before considering `--reconcile-admins`. Existing Auth passwords are not reset. Never commit or share the credential spreadsheet.

## Verification boundary

A successful migration push proves only that the CLI applied migrations to the selected project. It does not prove that real users can log in, that Resend sender DNS is verified, or that every role's RLS behavior is correct. Complete the production checklist and authenticated test scenarios in `PRODUCTION_CHECKLIST.md` before announcing production readiness.
