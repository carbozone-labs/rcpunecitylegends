import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261126000000_provision_bod_roster.sql", import.meta.url), "utf8");
const provisioner = readFileSync(new URL("../scripts/provisioning/provision-bod-members.mjs", import.meta.url), "utf8");
const browser = readFileSync(new URL("../src/lib/supabase/browser.ts", import.meta.url), "utf8");
const inviteFunction = readFileSync(new URL("../supabase/functions/invite-member/index.ts", import.meta.url), "utf8");
const adminConsole = readFileSync(new URL("../src/components/members-hub/AdminConsole.tsx", import.meta.url), "utf8");

test("BOD provisioning extends the existing member profile instead of creating a duplicate profile table", () => {
  assert.match(migration, /alter table public\.members\s+add column if not exists first_name text,\s+add column if not exists last_name text/i);
  assert.doesNotMatch(migration, /create table(?: if not exists)? public\.bod_members/i);
  assert.match(migration, /membership_id/);
});

test("BOD Member IDs use a database sequence and preserve existing identifiers", () => {
  assert.match(migration, /create sequence if not exists public\.bod_member_id_seq/i);
  assert.match(migration, /nextval\('public\.bod_member_id_seq'\)/i);
  assert.match(migration, /-- Preserve every existing membership identifier and account status/i);
  assert.match(migration, /RCPL-BOD-2026-/);
});

test("the provisioning RPC is service-role-only and transactional", () => {
  assert.match(migration, /begin;/i);
  assert.match(migration, /coalesce\(\(select auth\.role\(\)\), ''\) <> 'service_role'/i);
  assert.match(migration, /revoke all on function public\.provision_bod_roster\(jsonb, boolean\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.provision_bod_roster\(jsonb, boolean\) to service_role/i);
  assert.match(migration, /commit;/i);
});

test("exactly one President, Secretary and Vice President are required", () => {
  assert.match(migration, /v_president_count <> 1 or v_secretary_count <> 1 or v_vp_count <> 1/i);
  assert.match(migration, /Final admin role count must be exactly three/i);
  assert.match(migration, /Final active office-bearer count must be exactly three/i);
});

test("normal BOD users receive board_member and cannot retain admin role", () => {
  assert.match(migration, /values \(v_user_id, 'board_member'\)/i);
  assert.match(migration, /where mr\.user_id = v_user_id and mr\.role = 'admin'/i);
  assert.match(migration, /where ob\.user_id = v_user_id and ob\.active = true/i);
});

test("provisioning qualifies user_id columns to avoid output-variable ambiguity", () => {
  assert.match(migration, /#variable_conflict use_column/);
  assert.match(migration, /update public\.club_office_bearers as ob[\s\S]*?ob\.user_id not in/i);
  assert.match(migration, /delete from public\.member_roles as mr[\s\S]*?mr\.user_id not in/i);
  assert.match(migration, /update public\.club_office_bearers as ob[\s\S]*?ob\.user_id in/i);
});

test("existing Auth identities are reused without changing their passwords", () => {
  assert.match(provisioner, /if \(user\) \{[\s\S]*?authCounts\.existing\+\+;/);
  assert.match(provisioner, /password: row\.password/);
  assert.match(provisioner, /email_confirm: true/);
  assert.match(provisioner, /never changed|Existing Auth passwords are never changed/i);
});

test("dry-run is the default and production apply requires explicit flags and server secrets", () => {
  assert.match(provisioner, /const apply = args\.includes\("--apply"\)/);
  assert.match(provisioner, /DRY RUN ONLY/);
  assert.match(provisioner, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(provisioner, /--reconcile-admins/);
});

test("passwords are excluded from provisioning reports and browser profile selection includes first/last name", () => {
  assert.doesNotMatch(provisioner, /row\.password\s*[|,]\s*["'`]Password["'`]/);
  assert.match(provisioner, /Passwords were not written to this report/);
  assert.match(browser, /first_name: string \| null; last_name: string \| null;/);
  assert.match(browser, /select=id,membership_id,first_name,last_name,full_name,email/);
});

test("existing Auth accounts must be confirmed and not currently banned", () => {
  assert.match(provisioner, /email_confirmed_at \?\? user\.confirmed_at/);
  assert.match(provisioner, /currently banned/);
});

test("CSV parsing preserves password bytes instead of trimming credential values", () => {
  assert.match(provisioner, /h === "Password" \? \(values\[i\] \?\? ""\) : \(values\[i\] \?\? ""\)\.trim\(\)/);
  assert.match(provisioner, /for \(const row of rows\) row\.password = ""/);
});

test("compensation never deletes Auth identities after the database transaction committed", () => {
  assert.match(provisioner, /let databaseCommitted = false/);
  assert.match(provisioner, /databaseCommitted = true/);
  assert.match(provisioner, /if \(!databaseCommitted\) \{/);
  assert.match(provisioner, /the database transaction committed, but a later reporting step failed/);
});

test("future BOD invitations allocate Member IDs from the shared database sequence", () => {
  assert.match(migration, /create or replace function public\.next_bod_member_id\(\)/i);
  assert.match(migration, /grant execute on function public\.next_bod_member_id\(\) to service_role/i);
  assert.match(inviteFunction, /admin\.rpc\("next_bod_member_id"\)/);
  assert.match(inviteFunction, /if \(role === "board_member"\)/);
  assert.match(inviteFunction, /membership_id: membershipId/);
  assert.match(adminConsole, /disabled=\{inviteRole==="board_member"\}/);
  assert.match(adminConsole, /Auto-generated BOD ID/);
});
