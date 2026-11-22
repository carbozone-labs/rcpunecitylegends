import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const migration=readFileSync(new URL('../supabase/migrations/20261122000000_members_hub_phase2_operations.sql',import.meta.url),'utf8');
const shell=readFileSync(new URL('../src/components/members-hub/MemberShell.tsx',import.meta.url),'utf8');
const operationsManager=readFileSync(new URL('../src/components/members-hub/OperationsManager.tsx',import.meta.url),'utf8');
const operations=readFileSync(new URL('../src/lib/members-hub/operations.ts',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/invite-member/index.ts',import.meta.url),'utf8');
test('Phase 2 creates the operational schema with RLS enabled',()=>{
 for(const table of ['events','event_registrations','attendance_sessions','attendance_records','attendance_audit','tasks','task_assignments','task_submissions','task_status_history','announcements','notifications','documents']) assert.ok(migration.includes(`'${table}'`),`${table} must be included in RLS enable loop`);
 assert.match(migration,/alter table public\.%I enable row level security/);
});
test('event capacity and registration operations are database-atomic',()=>{
 assert.match(migration,/select \* into e from public\.events where id=target_event for update/);
 assert.match(migration,/unique\(event_id,user_id\)/);
 assert.match(migration,/registration_deadline/);
 assert.match(migration,/e\.status <> 'published'/);
 assert.match(migration,/function public\.register_for_event/);
});
test('admin-published upcoming events are the same records listed for members',()=>{
 assert.match(operations,/events:\(\)=>get\("events",`select=\*&status=eq\.published&starts_at=gte\./);
 assert.match(operationsManager,/status:"published"/);
 assert.match(migration,/create policy "Members view published events"/);
});
test('event creation rejects titles outside the database constraint before inserting',()=>{
 assert.match(migration,/char_length\(title\) between 3 and 180/);
 assert.match(operations,/normalizeEventTitle\(value\.title\)/);
 assert.match(operations,/Event title must be between 3 and 180 characters/);
});
test('attendance marking requires operational permission and writes audit',()=>{
 assert.match(migration,/function public\.mark_attendance/);
 assert.match(migration,/has_operation_permission\('attendance\.manage'\)/);
 assert.match(migration,/insert into public\.attendance_audit/);
});
test('directory view does not expose private contact fields',()=>{
 const view=migration.match(/create or replace view public\.member_directory[\s\S]*?;/)?.[0]||'';
 assert.match(view,/full_name,profile_photo_url,designation,committee,skills,bio/);
 assert.doesNotMatch(view,/email|phone|membership_id/);
});
test('documents are stored in a private, bounded bucket',()=>{
 assert.match(migration,/values\('members-documents','members-documents',false,20971520/);
 assert.match(migration,/storage\.objects/);
 assert.match(migration,/file_size between 1 and 20971520/);
});
test('member navigation points to implemented Phase 2 routes',()=>{
 for(const route of ['events','attendance','tasks','directory','documents','announcements']) assert.ok(existsSync(new URL(`../src/app/members/dashboard/${route}/page.tsx`,import.meta.url)));
 for(const route of ['/members/dashboard/events/','/members/dashboard/attendance/','/members/dashboard/tasks/','/members/dashboard/directory/','/members/dashboard/documents/','/members/dashboard/announcements/']) assert.ok(shell.includes(route));
});
test('browser data adapter uses authenticated requests and no service role key',()=>{
 assert.match(operations,/register_for_event/);
 assert.match(operations,/cancel_event_registration/);
 const browser=readFileSync(new URL('../src/lib/supabase/browser.ts',import.meta.url),'utf8');
 assert.doesNotMatch(browser,/SERVICE_ROLE|service_role/i);
});
test('Phase 1 invitation acceptance tolerates auth-trigger pre-provisioning without relinking identities',()=>{
 assert.match(edge,/may already have provisioned this exact invitation/);
 assert.match(edge,/existingMember\.membership_id !== invite\.membership_id/);
 assert.match(edge,/ignoreDuplicates: true/);
});
