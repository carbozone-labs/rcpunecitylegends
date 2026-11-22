import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const migration = read('supabase/migrations/20261123000000_members_hub_phase3_admin_gamification.sql');
const admin = read('src/components/members-hub/AdminConsole.tsx');
const gamification = read('src/components/members-hub/GamificationView.tsx');
const roleClient = read('src/lib/members-hub/admin.ts');
const taskClient = read('src/lib/members-hub/operations.ts');

test('Phase 3 adds a new migration and leaves prior migration files intact', () => {
  assert.ok(fs.existsSync(path.join(root,'supabase/migrations/20261121000000_create_members_hub.sql')));
  assert.ok(fs.existsSync(path.join(root,'supabase/migrations/20261122000000_members_hub_phase2_operations.sql')));
  assert.match(migration,/begin;[\s\S]*commit;/);
});
test('gamification defaults remain disabled and proposed rules are not auto-enabled', () => {
  assert.match(migration,/xp_enabled boolean not null default false/);
  assert.match(migration,/achievements_enabled boolean not null default false/);
  assert.match(migration,/leaderboard_enabled boolean not null default false/);
  assert.match(migration,/\('attendance'.*10,false,true\)/);
  assert.match(migration,/\('volunteering'.*25,false,true\)/);
  assert.match(migration,/\('collaboration'.*50,false,true\)/);
  assert.match(migration,/\('initiative'.*100,false,true\)/);
});
test('XP ledger is append-only to browser roles and has duplicate protection', () => {
  assert.match(migration,/revoke all on public\.xp_ledger from anon, authenticated/);
  assert.match(migration,/source_key text not null unique/);
  assert.match(migration,/reverses_id uuid references public\.xp_ledger/);
  assert.match(migration,/award_contribution_xp/);
  assert.match(migration,/reverse_xp_award/);
});
test('contribution evidence URLs are limited to HTTP(S)', () => {
  assert.match(migration,/check\(evidence_url is null or evidence_url ~\* '\^https\?:\/\/'\)/);
});
test('contribution approval blocks self-approval and requires manager permission', () => {
  assert.match(migration,/has_operation_permission\('contributions\.manage'\)/);
  assert.match(migration,/Self-approval is prohibited/);
  assert.match(migration,/Only approved contributions may receive XP/);
});
test('role changes require super admin and a reasoned audited RPC', () => {
  assert.match(migration,/admin_set_member_role/);
  assert.match(migration,/Only super administrators can change member roles/);
  assert.match(migration,/A role change reason is required/);
  assert.match(migration,/revoke execute on function public\.set_member_role\(uuid,text,boolean\) from authenticated/);
});
test('role changes protect the last active super administrator', () => {
  assert.match(migration,/Cannot revoke the last active super administrator/);
  assert.match(migration,/Cannot deactivate the last active super administrator/);
});
test('board permissions are granular and super-admin controlled', () => {
  assert.match(migration,/grant_board_permission/);
  assert.match(migration,/Only super administrators can change operational permissions/);
  assert.match(migration,/permission_name not in \('events\.manage'/);
});
test('member leaderboard is opt-in and excludes inactive members', () => {
  assert.match(migration,/member_leaderboard_preferences/);
  assert.match(migration,/p\.opted_in/);
  assert.match(migration,/m\.membership_status='active'/);
  assert.match(migration,/period_key not in \('monthly','annual','all_time'\)/);
});
test('achievement unlocks require approved contribution criteria and manual review', () => {
  assert.match(migration,/refresh_my_achievement_progress/);
  assert.match(migration,/requires_manual_review/);
  assert.match(migration,/Verified contribution criteria are not yet satisfied/);
});
test('admin statistics and member data are returned through guarded RPCs', () => {
  assert.match(migration,/get_admin_overview/);
  assert.match(migration,/get_admin_members/);
  assert.match(migration,/has_operation_permission\('analytics\.read'\)/);
  assert.match(migration,/has_operation_permission\('members\.manage'\)/);
});
test('Phase 3 SECURITY DEFINER functions set an empty search_path', () => {
  const blocks = migration.match(/create or replace function[\s\S]*?as \$\$/gi) || [];
  const privileged = blocks.filter(block => /security definer/i.test(block));
  assert.ok(privileged.length >= 15);
  for (const block of privileged) assert.match(block,/set search_path = ''/i);
});
test('audit log has no browser write grants and uses append-only access', () => {
  assert.match(migration,/revoke all on public\.admin_audit_logs from anon,authenticated/);
  assert.match(migration,/Authorized administrators read audit history/);
  assert.match(migration,/write_admin_audit/);
});
test('task reviews now use a guarded RPC and prevent self-review', () => {
  assert.match(migration,/review_task_submission/);
  assert.match(migration,/Self-review is prohibited/);
  assert.match(taskClient,/rpc\/review_task_submission/);
  assert.doesNotMatch(taskClient,/patch\("task_submissions"/);
});
test('admin UI contains real database-backed operations and no demo member labels', () => {
  assert.match(admin,/get_admin_overview|adminApi\.overview/);
  assert.match(admin,/invite-member/);
  assert.match(admin,/Export CSV/);
  assert.doesNotMatch(admin,/Demo Member [A-Z]/);
});
test('member gamification views use protected RPCs and opt-in leaderboard', () => {
  assert.match(gamification,/get_my_gamification/);
  assert.match(gamification,/get_member_leaderboard/);
  assert.match(gamification,/set_leaderboard_opt_in/);
  assert.doesNotMatch(gamification,/demoMembers|sampleActivities/);
});
test('admin role and permission operations use Phase 3 protected RPCs', () => {
  assert.match(roleClient,/admin_set_member_role/);
  assert.match(roleClient,/grant_board_permission/);
  assert.match(roleClient,/configure_gamification/);
});
