# Members Hub — Security Notes (Phase 1)

## Controls implemented
- No service-role key is referenced by client code or `.env.example`.
- Auth is email/password; browser session restoration, refresh, logout, recovery token parsing and password update are implemented.
- Public registration UI is absent; invite provisioning uses a JWT-authenticated Edge Function.
- Invitation email is normalized and matched to the authenticated Auth user; pending invitations expire after seven days.
- Default role assignment occurs only for an unexpired matching invitation. Browser users cannot write `member_roles` or `member_invitations`.
- `members` grants allow only `phone`, `bio`, `skills`, and `interests` updates. Club-managed identity/assignment/status fields are not granted for browser updates.
- Own-profile RLS is enabled. Admin/super_admin may read member profiles; board_member receives no implicit access.
- Elevated role writes are limited to `set_member_role`, which checks `auth.uid()` against `super_admin`; users cannot grant themselves roles.
- SECURITY DEFINER functions use an empty `search_path`, qualified object names, and revoked public execution.
- Existing `enquiry_admins` and enquiry function remain independent.
- React renders profile text as escaped text; no HTML injection or `dangerouslySetInnerHTML` is used in the hub.

## Important operational requirements
- Disable Supabase public signups and require email confirmation in Dashboard. This is a project-level setting and cannot be enforced by static website code.
- Restrict Auth redirect allow-list to club-owned origins and exact callback paths.
- Configure Edge Function secrets only in Supabase. Restrict CORS `ALLOWED_ORIGIN` to the production domain (add a separate local development deployment/setting if needed).
- Use Supabase Auth rate limits and SMTP configuration; monitor invite abuse.
- Do not rely on client route redirects for security. RLS and grants are authoritative.
- No profile photo upload is enabled. Add a private bucket and storage RLS before enabling it.
- Existing static export means there is no server-side middleware to protect HTML. Sensitive data is never embedded into exported HTML; API reads require a valid token and RLS.

## Known limits / items for hardening
- The frontend uses browser localStorage for the Auth session. Protect member devices and avoid shared/public computers; consider a server-backed BFF only if the hosting architecture later changes.
- Invitation acceptance for a pre-existing Auth user is performed by that same user calling the Edge Function with `{action:"accept"}` after sign-in. A custom UI for that claim step is not included yet.
- The seven-day database expiry must be aligned with Supabase Auth invite expiry in Dashboard.
- Profile photos are not uploadable in Phase 1.
- The initial super_admin must be bootstrapped by a trusted project owner using the SQL in `MEMBERS_HUB_SETUP.md`.
- Run `supabase/tests/members_hub_rls.sql` in a non-production Supabase project after replacing the fixture UUIDs with four test users (member A, member B, admin, super_admin). The script rolls back and tests private row isolation, immutable membership ID, role write denial, admin self-promotion denial and authorized super_admin role assignment. Perform a production SQL/RLS review and live two-account tests before inviting real members.
