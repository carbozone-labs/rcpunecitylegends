#!/usr/bin/env node
/**
 * Backwards-compatible entry point for the secure CSV-driven BOD provisioner.
 * No Auth UUIDs, roster records, or credentials are hardcoded here.
 * Usage: node scripts/provision-bod.mjs --input "path/to/BOD.csv" [--apply]
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["scripts/provisioning/provision-bod-members.mjs", ...process.argv.slice(2)],
  { stdio: "inherit", cwd: process.cwd(), env: process.env }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
