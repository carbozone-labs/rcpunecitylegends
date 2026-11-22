> **Architecture update:** This earlier phase document is superseded by `THREE_PORTAL_ARCHITECTURE.md` and `THREE_PORTAL_IMPLEMENTATION_REPORT.md`. The current admin allowlist is President, Vice President and Secretary only; do not follow any legacy super-admin or granular BOD access instructions below.

# Legends Members Hub — Final Architecture (Phases 1–3)

## Deployment shape

- Next.js 15 App Router, React 19, TypeScript and Tailwind CSS.
- `output: "export"` and `trailingSlash: true` remain enabled in `next.config.mjs`.
- GoDaddy cPanel serves the generated `out/` directory. There is no persistent Next.js runtime, Next.js API route, or server action dependency.
- Browser code uses the Supabase project URL and public anon key only. PostgreSQL RLS and narrowly scoped PostgreSQL RPCs enforce authorization. Privileged Auth invitation provisioning remains in the existing `invite-member` Edge Function.
- The existing `submit-enquiry` Edge Function and `enquiry_admins` authorization remain independent.

## Routes

### Public site

Existing public routes are retained: `/`, `/events/`, `/team/`, `/contact/`, `/join/`, `/partners/`, and other existing pages.

### Member routes

- `/members/login/`
- `/members/dashboard/`
- `/members/dashboard/profile/`
- `/members/dashboard/settings/`
- `/members/dashboard/events/`
- `/members/dashboard/attendance/`
- `/members/dashboard/tasks/`
- `/members/dashboard/directory/`
- `/members/dashboard/documents/`
- `/members/dashboard/announcements/`
- `/members/dashboard/contributions/`
- `/members/dashboard/achievements/`
- `/members/dashboard/leaderboard/`

### Administrative routes

- `/board-admin/dashboard/` — database-backed overview and operational statistics.
- `/board-admin/dashboard/members/` — invitations, member records, role and board permission operations.
- `/board-admin/dashboard/contributions/` — contribution verification and approved XP awards.
- `/board-admin/dashboard/gamification/` — proposed rules, levels, achievements and policy activation.
- `/board-admin/dashboard/audit/` — append-only administrative audit history.

All routes are statically exported. Client-side redirects improve navigation only; database security is not delegated to route guards.

## Authorization model

- `member`, `board_member`, `admin`, `super_admin` remain the identity roles.
- Admin/super-admin roles receive the Phase 2 operational permissions through `has_operation_permission`.
- Board members receive individually granted permissions in `member_permissions`; no blanket board access is assumed.
- Only super administrators can grant/revoke roles, grant board permissions, and approve gamification policy/rules.
- Member self-service profile updates remain restricted to the Phase 1 approved columns.
- Administrative data retrieval and sensitive writes use permission-checked PostgreSQL functions. The browser cannot write roles, XP ledger rows, audit rows, or achievement awards directly.

## Phase 3 data flow

1. A member submits a contribution. It is stored with `submitted` status and no XP.
2. A contribution manager reviews it through `review_contribution`; self-review is rejected.
3. Approved contribution evidence updates achievement progress based on verified database records.
4. If an achievement is configured for automatic verification, its approved criteria may unlock it. Manual-review achievements remain pending for a super-admin decision.
5. XP is awarded separately through `award_contribution_xp`, only if the global XP switch and the associated rule are enabled.
6. XP is recorded in immutable `xp_ledger`. Duplicate source keys are rejected. Reversals create a compensating negative ledger entry; original rows are not deleted.
7. Level history is derived from approved thresholds and ledger totals.
8. Leaderboards expose only opted-in active members and use verified XP; period ranking uses dense ranks for ties.

## No demo data imported

`src/data/legendZone.ts` remains a disabled prototype. The fictional sample activities and demo leaderboard are not used by the authenticated dashboard and are not migrated. Existing proposed XP values (10/25/50/100) are seeded as disabled rules. Existing proposed level titles/thresholds are seeded as disabled and documented as unapproved; some thresholds were explicitly invented for the old demo. Suggested achievement names are disabled and require policy approval.

## Existing systems preserved

- Phase 1 migrations are unchanged.
- Phase 2 migration is unchanged.
- Enquiry tables, policies, Edge Function and `enquiry_admins` remain independent.
- Existing public pages and existing member operations are retained. Phase 3 additionally routes task review through a protected RPC to close a direct-review update path found during the audit.
