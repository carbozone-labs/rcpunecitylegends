#!/usr/bin/env node
/**
 * Secure, idempotent BOD account provisioning.
 *
 * Default mode is dry-run. Apply only after reviewing the migration and the live
 * Supabase preflight. Existing Auth passwords are never changed. Password values
 * from the CSV are sent only to Supabase Auth when creating a missing identity;
 * they are never logged, persisted, or written to reports.
 *
 * Usage:
 *   node scripts/provisioning/provision-bod-members.mjs --input "path/to/BOD.csv"
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/provisioning/provision-bod-members.mjs --input BOD.csv --apply
 *   Add --reconcile-admins only after reviewing existing admin/office-bearer rows.
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN_DESIGNATIONS = new Map([
  ["club president", "President"],
  ["club secretary", "Secretary"],
  ["vice president", "Vice President"],
]);

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") {
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else if (ch !== "\r") field += ch;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("CSV must contain a header and at least one data row.");
  const headers = rows.shift().map((v) => v.trim().replace(/^\uFEFF/, ""));
  return rows.map((values, index) => {
    const obj = Object.fromEntries(headers.map((h, i) => [h, h === "Password" ? (values[i] ?? "") : (values[i] ?? "").trim()]));
    obj.__row = index + 2;
    return obj;
  });
}

function validateRows(rows) {
  const required = ["First Name", "Surname", "Gmail ID", "Password", "Designation"];
  const seenEmails = new Set();
  const admins = { "club president": 0, "club secretary": 0, "vice president": 0 };
  const normalized = rows.map((row) => {
    for (const key of required) if (!row[key]) throw new Error(`CSV row ${row.__row}: missing ${key}.`);
    const email = row["Gmail ID"].trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`CSV row ${row.__row}: invalid email syntax.`);
    if (seenEmails.has(email)) throw new Error(`CSV row ${row.__row}: duplicate email detected.`);
    seenEmails.add(email);
    const designation = row.Designation.trim();
    const adminKey = designation.toLowerCase();
    if (Object.hasOwn(admins, adminKey)) admins[adminKey]++;
    return {
      row: row.__row,
      first_name: row["First Name"].trim(),
      last_name: row.Surname.trim(),
      full_name: `${row["First Name"].trim()} ${row.Surname.trim()}`,
      email,
      password: row.Password,
      designation,
      office_position: ADMIN_DESIGNATIONS.get(adminKey) ?? null,
    };
  });
  if (normalized.length < 3 || Object.values(admins).some((count) => count !== 1)) {
    throw new Error("The roster must contain exactly one Club President, one Club Secretary, and one Vice President.");
  }
  return normalized;
}

async function api(path, serviceKey, init = {}, baseUrl = process.env.SUPABASE_URL) {
  if (!baseUrl) throw new Error("Supabase URL is required for the requested read-only Auth inventory.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { /* omit unparseable server details */ }
  if (!response.ok) {
    // Do not echo request bodies or provider messages: they may contain user data.
    const safeRpcError =
      path === "/rest/v1/rpc/provision_bod_roster" && body && typeof body === "object"
        ? [body.code, body.message]
            .filter((value) => typeof value === "string")
            .map((value) => value.replace(/[\r\n]+/g, " ").slice(0, 240))
            .join(": ")
        : "";
    throw new Error(
      `Supabase request failed (${response.status}) for ${path.split("?")[0]}.${safeRpcError ? ` ${safeRpcError}` : ""}`,
    );
  }
  return body;
}

async function listAuthUsers(serviceKey, baseUrl = process.env.SUPABASE_URL) {
  const found = new Map();
  for (let page = 1; page <= 100; page++) {
    const result = await api(`/auth/v1/admin/users?page=${page}&per_page=1000`, serviceKey, {}, baseUrl);
    const users = Array.isArray(result.users) ? result.users : [];
    for (const user of users) if (user.email) found.set(user.email.toLowerCase(), user);
    if (users.length < 1000) return found;
  }
  throw new Error("Auth user pagination exceeded the safety limit; stop and review the account inventory.");
}

async function writeReport(rows, authCounts, provisioned) {
  const reportPath = resolve(ROOT, "docs/reports/BOD_ACCOUNT_PROVISIONING_REPORT.md");
  const reportRows = provisioned.map((row) =>
    `| ${row.member_id} | ${row.full_name} | ${row.designation} | ${row.email} | ${row.access_role} |`,
  );
  const content = [
    "# BOD Account Provisioning Report", "",
    `**Generated:** ${new Date().toISOString()}`, "",
    "## Summary", "",
    `- Spreadsheet records: ${rows.length}`,
    `- Existing Auth accounts reused: ${authCounts.existing}`,
    `- New Auth accounts created: ${authCounts.created}`,
    `- Admin accounts: ${provisioned.filter((r) => r.access_role === "admin").length}`,
    `- Normal BOD accounts: ${provisioned.filter((r) => r.access_role === "bod").length}`,
    `- Member IDs assigned/preserved: ${provisioned.length}`,
    `- Database transaction: successful`, "",
    "## Provisioned roster", "",
    "| Member ID | Full Name | Designation | Email | Access |",
    "|---|---|---|---|---|",
    ...reportRows, "",
    "## Credential handling", "",
    "Passwords were not written to this report. Existing Auth passwords were not changed. New Auth users were created through the Supabase Auth Admin API; password storage is managed by Supabase Auth. The input CSV must be stored securely and removed from shared/download folders after the club completes its credential handoff.", "",
    "## Verification boundary", "",
    "This report records the response from the transactional provisioning RPC. It does not replace a separate authenticated login/RLS test for each of the three office bearers and representative normal BOD accounts.", "",
  ].join("\n");
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, content, "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const valueAfter = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const input = valueAfter("--input");
  const apply = args.includes("--apply");
  const reconcile = args.includes("--reconcile-admins");
  if (!input) throw new Error('Provide the CSV path with --input "path/to/BOD.csv".');
  if (reconcile && !apply) throw new Error("--reconcile-admins is valid only together with --apply.");
  const csv = await readFile(resolve(process.cwd(), input), "utf8");
  const rows = validateRows(parseCsv(csv));

  console.log(`Validated ${rows.length} BOD records. No passwords will be displayed.`);
  console.log(`Expected Admin accounts: ${rows.filter((r) => r.office_position).length}`);
  console.log(`Expected Normal BOD accounts: ${rows.filter((r) => !r.office_position).length}`);

  if (!apply) {
    console.log("DRY RUN ONLY: no accounts or database records will be created or changed.");
    const dryRunUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dryRunKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (dryRunUrl && dryRunKey) {
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(dryRunUrl)) {
        throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must identify the intended HTTPS Supabase project.");
      }
      const existingUsers = await listAuthUsers(dryRunKey, dryRunUrl);
      const existingRows = rows.filter((row) => existingUsers.has(row.email));
      const toCreateRows = rows.filter((row) => !existingUsers.has(row.email));
      console.log(`Remote Auth inventory checked (read-only): ${existingUsers.size} existing Auth users found in the project.`);
      console.log(`BOD accounts already existing: ${existingRows.length}`);
      console.log(`BOD accounts to be created: ${toCreateRows.length}`);
      console.log(`Existing BOD emails: ${existingRows.length ? existingRows.map((row) => row.email).join(", ") : "none"}`);
    } else {
      console.log("Remote Auth inventory: NOT CHECKED (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment for a read-only check).");
      console.log("BOD accounts already existing: UNKNOWN");
      console.log("BOD accounts to be created: UNKNOWN until remote Auth inventory is checked");
    }
    console.log(`Spreadsheet records: ${rows.length}`);
    console.log(`Valid records: ${rows.length}`);
    console.log("Invalid records: 0");
    console.log("Duplicate emails: 0");
    console.log(`Expected Admin accounts: ${rows.filter((r) => r.office_position).length}`);
    console.log(`Expected Normal BOD accounts: ${rows.filter((r) => !r.office_position).length}`);
    rows.forEach((r, index) => {
      console.log(`${String(index + 1).padStart(3, "0")}  ${r.full_name}  |  ${r.designation}  |  ${r.email}`);
    });
    console.log("Review the roster and remote preflight before requesting approval for --apply.");
    for (const row of rows) row.password = "";
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local process environment.");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) throw new Error("SUPABASE_URL must be the HTTPS URL of the intended Supabase project.");

  const usersByEmail = await listAuthUsers(serviceKey);
  const newlyCreated = [];
  const authCounts = { existing: 0, created: 0 };
  const rpcMembers = [];
  let databaseCommitted = false;

  try {
    for (const row of rows) {
      let user = usersByEmail.get(row.email);
      if (user) {
        const confirmedAt = user.email_confirmed_at ?? user.confirmed_at ?? null;
        if (!confirmedAt) {
          throw new Error(`Existing Auth account for CSV row ${row.row} is not email-confirmed; verify ownership before provisioning.`);
        }
        if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
          throw new Error(`Existing Auth account for CSV row ${row.row} is currently banned; manual review required.`);
        }
        authCounts.existing++;
      } else {
        const created = await api("/auth/v1/admin/users", serviceKey, {
          method: "POST",
          body: JSON.stringify({
            email: row.email,
            password: row.password,
            email_confirm: true,
            user_metadata: { full_name: row.full_name },
          }),
        });
        user = created.user ?? created;
        if (user.id) newlyCreated.push(user.id);
        if (!user.id || user.email?.toLowerCase() !== row.email) {
          throw new Error(`Supabase did not return the expected Auth identity for CSV row ${row.row}.`);
        }
        authCounts.created++;
        usersByEmail.set(row.email, user);
      }
      rpcMembers.push({
        user_id: user.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        designation: row.designation,
      });
    }

    const provisioned = await api("/rest/v1/rpc/provision_bod_roster", serviceKey, {
      method: "POST",
      body: JSON.stringify({ p_members: rpcMembers, p_reconcile_admins: reconcile }),
    });
    databaseCommitted = true;

    if (!Array.isArray(provisioned) || provisioned.length !== rows.length) {
      throw new Error("The provisioning RPC did not return the complete roster.");
    }
    const details = provisioned.map((item) => {
      const row = rows.find((candidate) => usersByEmail.get(candidate.email)?.id === item.user_id);
      if (!row) throw new Error("The provisioning RPC returned an unknown Auth user.");
      return { ...item, full_name: row.full_name, designation: row.designation, email: row.email };
    });
    await writeReport(rows, authCounts, details);
    console.log("BOD roster provisioning completed successfully.");
    console.log(`Existing Auth accounts reused: ${authCounts.existing}`);
    console.log(`New Auth accounts created: ${authCounts.created}`);
    console.log(`Admin accounts: ${details.filter((r) => r.access_role === "admin").length}`);
    console.log(`Normal BOD accounts: ${details.filter((r) => r.access_role === "bod").length}`);
    console.log("A password-free report was written to docs/reports/BOD_ACCOUNT_PROVISIONING_REPORT.md.");
  } catch (error) {
    // Auth and PostgreSQL cannot share one transaction. Remove only identities
    // created by this run if the database transaction did not commit.
    if (!databaseCommitted) {
      for (const id of newlyCreated.reverse()) {
        try { await api(`/auth/v1/admin/users/${encodeURIComponent(id)}`, serviceKey, { method: "DELETE" }); }
        catch { console.error(`WARNING: compensation could not remove newly created Auth identity ${id}; review it manually.`); }
      }
    } else {
      console.error("WARNING: the database transaction committed, but a later reporting step failed. Do not delete/recreate accounts; inspect the roster and regenerate the report.");
    }
    throw error;
  } finally {
    // Reduce accidental in-process retention of spreadsheet password strings.
    for (const row of rows) row.password = "";
  }
}

main().catch((error) => {
  console.error(`Provisioning stopped: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
