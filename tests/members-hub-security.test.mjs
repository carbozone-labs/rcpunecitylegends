import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration = readFileSync(new URL('../supabase/migrations/20261121000000_create_members_hub.sql', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/lib/supabase/browser.ts', import.meta.url), 'utf8');
const edge = readFileSync(new URL('../supabase/functions/invite-member/index.ts', import.meta.url), 'utf8');

test('member tables have RLS and browser grants are least privilege', () => {
  for (const table of ['members','member_roles','member_invitations']) assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(migration, /grant update\(phone, bio, skills, interests\) on public\.members to authenticated/);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete|all)\s+on\s+public\.member_roles\s+to\s+authenticated/i);
  assert.match(migration, /create policy "Members read own profile"[\s\S]*?id = \(select auth\.uid\(\)\)/);
});

test('role changes require super_admin and cannot be written through browser grants', () => {
  assert.match(migration, /r\.role = 'super_admin'/);
  assert.match(migration, /create or replace function public\.set_member_role/);
  assert.match(migration, /revoke all on function public\.set_member_role\(uuid,text,boolean\) from public, anon/);
  assert.match(migration, /grant execute on function public\.set_member_role\(uuid,text,boolean\) to authenticated/);
});

test('invitation workflow authenticates caller and enforces role/email/expiry', () => {
  assert.match(edge, /admin\.auth\.getUser\(token\)/);
  assert.match(edge, /club_office_bearers/);
  assert.match(edge, /payload\.action === "accept"/);
  assert.match(edge, /expires_at/);
  assert.match(migration, /i\.email = lower\(trim\(new\.email\)\).*i\.invitation_status = 'pending'.*i\.expires_at > now\(\)/s);
});

test('browser client contains no service-role credential or public registration endpoint', () => {
  assert.doesNotMatch(client, /SERVICE_ROLE|service_role/i);
  assert.doesNotMatch(client, /\/signup/);
});
