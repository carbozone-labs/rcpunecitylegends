# Environment Configuration

## Browser-visible website configuration

The static website requires:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_PATH` only when hosting under a subpath, such as `/rcpunecitylegends` on GitHub Pages.

These values are embedded into the static website by design. The Supabase anon/publishable key is not a secret; RLS must protect all data and operations.

For GitHub Pages, see [GitHub Pages deployment](GITHUB_PAGES_DEPLOY.md) for the required Actions and Supabase settings.

## Server-only secrets

Never put these in `NEXT_PUBLIC_*` variables or website environment files:
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

They belong in Supabase Edge Function secrets. The BOD provisioning script accepts `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the local process environment only. Do not commit them.

See `.env.example`, `SUPABASE_CHECKLIST.md`, and `BOD_PROVISIONING_GUIDE.md`.
