#!/usr/bin/env node
/** Safe Supabase CLI orchestration. Never runs db reset or deletes remote data. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const action = process.argv[2] ?? 'help';
const isWindows = process.platform === 'win32';

function projectRef() {
  if (process.env.SUPABASE_PROJECT_REF?.trim()) return process.env.SUPABASE_PROJECT_REF.trim();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  if (match) return match[1];
  const tempRef = resolve(root, 'supabase/.temp/project-ref');
  if (existsSync(tempRef)) return readFileSync(tempRef, 'utf8').trim();
  throw new Error('Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL to identify the target Supabase project.');
}

function quoteWindowsArg(value) {
  const text = String(value);
  if (!/^[a-zA-Z0-9._-]+$/.test(text)) throw new Error(`Unsafe Supabase CLI argument: ${text}`);
  return `"${text}"`;
}

function run(args) {
  // npx is used intentionally: `npx supabase ...` works without a global CLI install.
  const command = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npx';
  const commandArgs = isWindows
    ? ['/d', '/s', '/c', `npx --yes supabase ${args.map(quoteWindowsArg).join(' ')}`]
    : ['--yes', 'supabase', ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  if (result.error) throw new Error(`Could not start Supabase CLI through npx: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Supabase CLI exited with status ${result.status ?? 'unknown'}. No further steps were run.`);
}

try {
  if (action === 'setup') {
    const ref = projectRef();
    console.log(`Linking Supabase project ${ref} (no database reset will be performed).`);
    run(['link', '--project-ref', ref]);
    run(['db', 'push', '--linked', '--yes']);
    console.log('Database migrations applied. Run `npm run db:verify` to inspect migration status.');
  } else if (action === 'push') {
    run(['db', 'push', '--linked', '--yes']);
  } else if (action === 'verify') {
    run(['migration', 'list', '--remote']);
  } else if (action === 'functions') {
    run(['functions', 'deploy', 'submit-enquiry']);
    run(['functions', 'deploy', 'invite-member']);
  } else {
    console.log('Usage: node scripts/database/supabase-cli.mjs <setup|push|verify|functions>');
    process.exitCode = action === 'help' ? 0 : 2;
  }
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
