# Legends Members Hub — Security Audit (Phases 1–3)

## Scope and method

Reviewed the supplied Phase 2 repository archive, the Phase 1/2 migrations, browser Supabase adapter, AuthProvider, invitation Edge Function, Phase 2 operations data layer, member routes, and the new Phase 3 source/migration. Executed Node source-contract tests and TypeScript transpile syntax checks. No Supabase project credentials, PostgreSQL connection, Supabase CLI or `psql` binary were available; live RLS and database execution are therefore not certified or claimed.

## Findings addressed in this implementation

1. **Task review write path (Phase 2):** the previous client PATCH updated `review_status`, `reviewed_by`, `reviewed_at` and `review_comment` directly. Phase 3 revokes those column update grants and introduces `review_task_submission`, which checks `tasks.manage`, verifies the submission is awaiting review and blocks self-review. The Phase 2 client now uses this RPC.
2. **Role change audit/reason:** the Phase 1 `set_member_role` function did not accept a reason. Authenticated execution is revoked and replaced in the UI by `admin_set_member_role`, super-admin-only, reason-required, audited, and protective of the last super-admin.
3. **Board permission management:** explicit per-user grants are super-admin-only, reason-required, and audited. Board members do not receive implicit global operational permissions.
4. **Gamification trust boundary:** member submissions cannot insert XP ledger rows or modify approved totals. XP is a separate guarded RPC operation, requires approved contribution and enabled policy/rule, rejects self-awards and duplicate awards, and supports immutable reversals.
5. **Achievement trust boundary:** progress is calculated from approved contribution rows. Automatic unlock only applies to enabled definitions configured without manual review. Manual unlock checks criteria and is restricted to authorized reviewers; self-approval is blocked.
6. **Leaderboard privacy:** opt-in is per member, only active opted-in members are listed, and public ranking RPCs omit Auth UUIDs. Members can retrieve their own rank separately.
7. **Audit integrity:** audit table browser mutation grants are revoked. Triggers log role, permission, membership, attendance, contribution, XP, achievement, invitation and Phase 2 operational changes. Snapshots omit email, phone, credentials, tokens, evidence URLs and selected private profile fields.
8. **Board history:** designation/committee history is retained rather than relying only on the current member profile fields.
9. **Admin data access:** member lists, aggregate statistics, audit history and contribution queues use guarded database functions.
10. **Invitation and enquiry boundaries:** existing service-role invitation provisioning stays in the Edge Function. The enquiry admin model remains separate.

## Security controls present in source

- Supabase Auth bearer session and refresh-on-401 behavior in the existing browser adapter.
- RLS on member, role, operational and Phase 3 tables.
- Narrow browser grants for profile and operational data.
- Database-side checks for membership status, role, granular permissions and self-review/self-award restrictions.
- `SECURITY DEFINER` functions in Phase 3 declare `SET search_path = ''`.
- Static frontend contains only Supabase URL/public anon key; no service-role key or email-provider secret.
- Private Storage buckets and short-lived signed URLs remain the Phase 2 model.
- React renders untrusted strings as text; new UI does not use `dangerouslySetInnerHTML`.
- Search filters are bound RPC parameters; no dynamic SQL is built from browser text.

## Tests actually executed

- `npm run test:members-hub`: **29/29 passed** (Node source/security contract tests).
- TypeScript `transpileModule` syntax check: **30 TypeScript/TSX files, 0 syntax diagnostics** (not a typecheck).
- Full `npm run typecheck`: not completed; dependency type packages are incomplete because `npm ci` timed out.
- `npm run lint`: not completed; local Next CLI is unavailable.
- `npm run check:content`: **passed** — no content errors; a temporary loader link to globally installed TypeScript was used because `npm ci` could not complete.
- `npm run build`: not completed; local Next CLI is unavailable.
- `supabase/tests/members_hub_phase3_security.sql`: authored but **not executed** because no PostgreSQL/Supabase CLI/database connection is available.

## Required live penetration/regression checks

Run these with separate real accounts in a staging Supabase project:

- Member A cannot read Member B profile, contributions, XP ledger, notifications, task submissions or attendance.
- Board member with only `events.manage` cannot manage attendance, tasks, members, XP or documents.
- Admin cannot grant `super_admin` or grant board permissions.
- Only a super admin can change roles, permissions and gamification policy.
- Self-review, self-award, duplicate award and duplicate reversal fail.
- A suspended member loses access to member RPCs and leaderboard.
- Leaderboard opt-out immediately excludes the account.
- Storage objects remain private; expired signed URLs stop working.
- Invitation expiry, existing-account claim and wrong-email claim are tested.
- Event registration capacity race and task review are retested.
- Enquiry submission and public routes remain functional.

## Remaining risks / limitations

- Browser Auth session material is stored in localStorage in the existing Phase 1 client. This is compatible with the static hosting constraint but increases the impact of any future XSS. Use trusted devices, CSP/security headers and keep dependencies updated.
- Supabase/PostgREST and Auth provider rate limits are not a custom per-user rate-limiting layer for all RPCs. Add edge/API rate controls if abuse patterns require them.
- No dedicated email notification delivery or scheduled reminders were added; in-app notifications are database-backed. Email/cron remains external configuration/work. Contribution evidence currently accepts HTTPS links only; a dedicated private evidence upload bucket is not configured.
- The migration has not been run against a live PostgreSQL instance. SQL syntax/catalog behavior, RLS interactions and grants require staging execution before production.
- Static route guards are UX only; RLS/RPC policies remain the authorization boundary.
- No enterprise security certification or independent penetration test is claimed.
