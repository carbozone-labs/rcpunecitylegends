# Application Architecture

## Existing source organization

- `src/app/` — Next.js App Router pages and layouts.
- `src/components/` — reusable UI and feature components, including Members Hub shells.
- `src/lib/` — Supabase browser adapter, portal APIs, SEO, animation, and site utilities.
- `src/data/` — content datasets for the public site and optional features.
- `src/config/` — feature flags.
- `src/types/` — shared TypeScript types.
- `public/` — static images, icons, fonts, and assets.
- `supabase/migrations/` — ordered database schema/security migrations.
- `supabase/functions/` — deployed Edge Functions.
- `scripts/` — local validation, utilities, and provisioning scripts.
- `tests/` — source-level Node regression tests.
- `docs/` — architecture, administration, database, deployment, security, testing, and reports.

Next.js route files remain in framework-compatible locations. The existing compatibility route trees are preserved pending a separate route deprecation review.
