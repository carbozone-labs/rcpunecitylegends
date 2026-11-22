# Portal boundaries

The project uses one Next.js App Router deployment with three independent experiences. Route groups are intentionally not moved into a different filesystem layout because route paths are part of the public URL contract and the project is statically exported for cPanel hosting.

- Public website: public routes under `src/app` and public chrome in `src/components/layout/SiteFrame.tsx`.
- Members Portal: `/members/login/` and `/members/dashboard/`; shared member UI lives in `src/components/members-hub/`.
- Administration Portal: `/board-admin/login/` and `/board-admin/**`; its shell is separate and its data operations are backed by protected Supabase RPCs.

Shared browser authentication adapter: `src/lib/supabase/browser.ts`. Server-side database authorization is enforced by Supabase functions and RLS, not by hiding navigation or client state.
