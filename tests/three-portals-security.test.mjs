import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261124000000_three_portal_office_bearer_security.sql');
const nav = read('src/data/club.ts');
const frame = read('src/components/layout/SiteFrame.tsx');
const memberShell = read('src/components/members-hub/MemberShell.tsx');
const adminShell = read('src/components/members-hub/AdminShell.tsx');
const adminLogin = read('src/components/members-hub/AdminLoginForm.tsx');
const operationsView = read('src/components/members-hub/OperationsView.tsx');
const operations = read('src/lib/members-hub/operations.ts');
const operationsManager = read('src/components/members-hub/OperationsManager.tsx');
const authClient = read('src/lib/supabase/browser.ts');
const adminApi = read('src/lib/members-hub/admin.ts');
const authProvider = read('src/components/members-hub/AuthProvider.tsx');
const inviteEdge = read('supabase/functions/invite-member/index.ts');

test('public navigation has no member or admin login entry', () => {
  assert.doesNotMatch(nav, /Member Login|Admin Login|member-login|board-admin/);
});
test('portal routes render without public website navigation and footer', () => {
  assert.match(frame, /pathname\.startsWith\("\/members\/"\)/);
  assert.match(frame, /pathname\.startsWith\("\/board-admin\/"\)/);
  assert.match(frame, /!portal && <Navbar \/>/);
  assert.match(frame, /!portal && <>/);
});
test('member navigation has no administrative shortcut', () => {
  assert.doesNotMatch(memberShell, /Admin access|\/board-admin/);
  assert.match(memberShell, /\/members\/login\//);
});
test('admin portal requires the trusted office-bearer RPC and shows the required denial', () => {
  assert.match(adminShell, /isAdmin/);
  assert.match(adminShell, /You are not authorized to access the Administration Portal\./);
  assert.match(adminLogin, /isOfficeBearerAdmin/);
  assert.match(authClient, /rpc\/is_office_bearer_admin/);
});
test('office bearer allowlist has only the three authorized positions and is not browser-writable', () => {
  assert.match(migration, /position in \('President','Vice President','Secretary'\)/);
  assert.match(migration, /alter table public\.club_office_bearers enable row level security/);
  assert.match(migration, /revoke all on public\.club_office_bearers from public, anon, authenticated/);
  assert.match(migration, /create or replace function public\.is_office_bearer_admin\(\)/);
});
test('legacy admin roles and granular BOD grants cannot authorize administrative operations', () => {
  assert.match(migration, /create or replace function public\.has_member_role/);
  assert.match(migration, /and \(select public\.is_office_bearer_admin\(\)\)/);
  assert.match(migration, /create or replace function public\.has_operation_permission/);
  assert.doesNotMatch(inviteEdge, /r\.role === "admin" \|\| r\.role === "super_admin"/);
  assert.match(inviteEdge, /club_office_bearers/);
});
test('static export configuration remains enabled', () => {
  assert.match(read('next.config.mjs'), /output:\s*"export"/);
  assert.match(read('next.config.mjs'), /trailingSlash:\s*true/);
});

test('administrative operations are available only in the Administration Portal', () => {
  assert.match(operationsManager, /const allowed=isAdmin/);
  assert.doesNotMatch(operationsView, /OperationsManager/);
  assert.match(operationsManager, /<details open className=/);
  assert.doesNotMatch(operationsManager, /open=\{module==="events"\}/);
  for (const route of ['events','attendance','tasks','documents','announcements']) {
    assert.ok(fs.existsSync(new URL(`../src/app/board-admin/operations/${route}/page.tsx`, import.meta.url)));
  }
});
test('member and admin portals use separate auth sessions and API clients', () => {
  const memberLayout = read('src/app/members/dashboard/layout.tsx');
  const adminLayout = read('src/app/board-admin/layout.tsx');
  assert.match(authClient, /createAuthClient\("legends-members-auth"\)/);
  assert.match(authClient, /createAuthClient\("legends-admin-auth"\)/);
  assert.match(authProvider, /scope = "member"/);
  assert.match(memberLayout, /<AuthProvider>/);
  assert.match(adminLayout, /<AuthProvider scope="admin">/);
  assert.match(adminLogin, /adminAuthClient\.signIn/);
  assert.match(adminApi, /adminAuthClient\.data/);
  assert.match(operations, /operations=createOperations\(authClient\)/);
  assert.match(operations, /adminOperations=createOperations\(adminAuthClient\)/);
  assert.match(operationsManager, /adminOperations\./);
});
test('source files do not contain common mojibake sequences', () => {
  const walk = (dir) => fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
  for (const file of walk('src').filter((name) => /\.(ts|tsx|js|jsx)$/.test(name))) {
    assert.doesNotMatch(read(file), /(?:Â|Ã|â€|â€¦|â†|ï¿½)/, `${file} contains corrupted text`);
  }
});
test('notification links are normalized to the new Members Portal namespace', () => {
  assert.match(migration, /normalize_member_portal_notification_link/);
  assert.match(migration, /replace\(link, '\/member-dashboard\/', '\/members\/dashboard\/'\)/);
});


test('administrator authorization requires both admin role and active office-bearer record', () => {
  assert.match(migration, /join public\.member_roles mr on mr\.user_id = ob\.user_id and mr\.role = 'admin'/);
  assert.doesNotMatch(migration, /delete from public\.member_roles where role in \('admin','super_admin'\)/);
  const corrective = read('supabase/migrations/20261125000000_require_admin_role_and_restore_verified_office_bearers.sql');
  assert.match(corrective, /insert into public\.member_roles\(user_id, role\)/);
  assert.match(corrective, /mr\.role = 'admin'/);
  assert.match(corrective, /position in \('President', 'Vice President', 'Secretary'\)/);
});

test('theme selector supports light, dark and system preference', () => {
  const toggle = read('src/components/layout/ThemeToggle.tsx');
  assert.match(toggle, /"light", "dark", "system"/);
  assert.match(toggle, /prefers-color-scheme: light/);
  assert.match(toggle, /localStorage\.setItem\("theme", value\)/);
});


test('member onboarding distinguishes general members from ordinary BOD', () => {
  const invite = read('supabase/functions/invite-member/index.ts');
  const adminUi = read('src/components/members-hub/AdminConsole.tsx');
  const migration = read('supabase/migrations/20261125000000_require_admin_role_and_restore_verified_office_bearers.sql');
  assert.match(invite, /role\?: "member" \| "board_member"/);
  assert.match(invite, /role: invitedRole/);
  assert.match(invite, /roleError \|\| !callerProfile/);
  assert.match(adminUi, /Ordinary BOD Member/);
  assert.match(adminUi, /General Member/);
  assert.match(migration, /member_invitations_role_check/);
  assert.match(invite, /club_office_bearers.*?member_roles/s);
  assert.match(invite, /role: invitedRole/);
});

test('task visibility explicitly correlates assignments to the outer task row and enquiry access uses the office-bearer allowlist', () => {
  const hardening = read('supabase/migrations/20261124010000_harden_enquiry_and_task_visibility.sql');
  assert.match(hardening, /a\.task_id\s*=\s*public\.tasks\.id/i);
  assert.doesNotMatch(hardening, /a\.task_id\s*=\s*a\.id/i);
  assert.match(hardening, /select \(select public\.is_office_bearer_admin\(\)\)/i);
  assert.match(hardening, /revoke all on function public\.is_enquiry_admin\(\) from public, anon/i);
});
