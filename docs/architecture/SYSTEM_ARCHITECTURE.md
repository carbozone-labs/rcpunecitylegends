# System Architecture

## Runtime boundaries

- Next.js 15 App Router and React 19 produce a static export for cPanel hosting.
- Public website pages and portal shells are built into static HTML/JS/CSS assets.
- Supabase Auth handles identities and sessions.
- The browser uses the public Supabase URL and anon key.
- Supabase PostgreSQL stores member profiles, roles, operational data, and authorization state.
- RLS and guarded RPC functions enforce access to protected records and operations.
- Supabase Edge Functions handle privileged workflows such as invitations and enquiry submission.
- Service-role credentials are server-side only.

## Portal boundaries

- Public website: public club information.
- Members Portal: authenticated active member/BOD access.
- Administration Portal: authenticated active office bearers with both `admin` role and private allowlist record.

See `PORTAL_BOUNDARIES.md`, `../security/AUTHORIZATION_MODEL.md`, and `../security/SECURITY_AUDIT.md`.

## Static hosting constraint

Static export does not execute Next.js server components, middleware, route handlers, or server actions at request time. The current portal shell can hide UI based on session state, but backend data and operations must be protected independently by Supabase. SSR-level route authorization requires an approved hosting architecture change.
