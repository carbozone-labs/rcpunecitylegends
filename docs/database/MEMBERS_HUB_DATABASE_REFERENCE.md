# Legends Members Hub — Database Reference

Apply migrations in chronological order:

1. `20261108000000_create_enquiries.sql` — existing public enquiry system; keep `enquiry_admins` independent.
2. `20261121000000_create_members_hub.sql` — Phase 1 members, roles, invitation ledger, profile RLS and invitation provisioning.
3. `20261122000000_members_hub_phase2_operations.sql` — Phase 2 operational permissions, events, registrations, attendance, tasks, documents, announcements and notifications.
4. `20261123000000_members_hub_phase3_admin_gamification.sql` — Phase 3 admin, audit, contribution, XP, level, achievement, board history and analytics foundation.

## Phase 3 tables/views

- `club_gamification_settings` — singleton policy switches; all disabled initially.
- `contribution_rules` — configurable XP values; seeded proposals are disabled.
- `contributions` — member-submitted evidence and review state.
- `xp_ledger` — append-only verified awards/reversals/adjustments.
- `member_leaderboard_preferences` — per-member opt-in.
- `club_level_rules` — proposed level titles and thresholds; disabled initially.
- `achievement_definitions` — configurable criteria and manual-review policy; seeded suggestions disabled.
- `member_achievements` — member progress and award history.
- `member_level_history` — immutable level threshold attainment snapshots.
- `member_board_term_history` — designation/committee assignment history.
- `admin_audit_logs` — append-only administrative audit events.
- `announcement_notification_deliveries` — deduplication ledger for audience-targeted in-app announcement notifications.
- `member_xp_totals` — security-invoker view; underlying RLS limits member visibility.

## Important RPCs

### Administration

- `get_admin_overview()`
- `get_admin_members(search_text,status_filter,designation_filter,committee_filter,page_size,page_offset)`
- `admin_update_member(target_member,new_full_name,new_designation,new_committee,new_status,change_reason)`
- `admin_set_member_role(target_user_id,target_role,should_grant,change_reason)`
- `grant_board_permission(target_user,permission_name,should_grant,change_reason)`
- `get_admin_audit(page_size,page_offset)`
- `get_member_activity(target_member,page_size)`

### Contributions and gamification

- `review_contribution(target_contribution,decision,review_reason)`
- `award_contribution_xp(target_contribution,award_reason)`
- `reverse_xp_award(target_ledger,reversal_reason)`
- `configure_gamification(enable_xp,enable_achievements,enable_leaderboard)`
- `configure_contribution_rule(target_rule,new_xp,is_enabled)`
- `configure_level_rule(target_rule,new_title,new_min_xp,is_enabled)`
- `configure_achievement(target_achievement,new_title,new_description,new_criteria,new_enabled,new_manual_review,new_icon_key)`
- `refresh_my_achievement_progress()`
- `get_my_achievements()`
- `get_my_gamification()`
- `get_member_leaderboard(period_key,page_size,page_offset)`
- `get_my_leaderboard_rank(period_key)`
- `get_my_leaderboard_rank(period_key)`
- `set_leaderboard_opt_in(opt_in)`
- `review_achievement(target_member,target_achievement,decision,review_reason)`

### Phase 2 security repair

- `review_task_submission(target_submission,new_status,review_reason)` — replaces direct client updates to task review columns and blocks self-review.

## Security model

- RLS is enabled on all Phase 3 tables.
- Browser roles have SELECT only where needed; sensitive writes are RPC-only.
- `xp_ledger` has no authenticated INSERT/UPDATE/DELETE grants.
- `admin_audit_logs` has no authenticated INSERT/UPDATE/DELETE grants.
- Every Phase 3 `SECURITY DEFINER` function uses an empty `search_path` and fully qualified application table references.
- The old unreasoned `set_member_role(uuid,text,boolean)` execution grant is revoked from `authenticated`; use the audited Phase 3 wrapper.

## Storage and Edge Functions

Phase 3 adds no new Storage bucket and no new Edge Function. It reuses the private Phase 2 document/task buckets and the existing Phase 1 `invite-member` Edge Function. The existing `submit-enquiry` Edge Function is unchanged.
