# BOD Roster Provisioning Guide

## What this adds

The authoritative 2026–2027 roster source supplied for this update is `Legends with Gmail ID 2026-2027 - Sheet2.csv` (16 records). The BOD roster uses the existing `public.members` profile and `membership_id` identifier. The migration adds separate `first_name` and `last_name` fields and a database sequence for new `RCPL-BOD-2026-NNN` IDs. Existing `membership_id` values and membership status are preserved.

Every roster member receives `board_member`. Only the exact `Club President`, `Club Secretary`, and `Vice President` designations receive the additional `admin` role and an active private `club_office_bearers` row.

## Before provisioning

1. Back up the intended Supabase project.
2. Verify the target project URL and confirm the remote migration history.
3. Review `docs/reports/BOD_SPREADSHEET_VALIDATION.md` and `docs/reports/BOD_MEMBER_ID_MAPPING.md`.
4. Confirm the three office-bearer names and email addresses with the club.
5. Apply migrations in timestamp order, including `20261126000000_provision_bod_roster.sql`.
6. Keep the CSV outside the repository. Never commit the spreadsheet or any production service-role key.

## Dry run

From the project root:

```powershell
node .\scripts\provision-bod-members.mjs --input "C:\secure-path\Legends with Gmail ID 2026-2027 - Sheet2.csv"
```

Dry run is the default. It validates the CSV and reports the expected role counts without connecting to Supabase or modifying accounts.

## Apply

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only in the local terminal environment. Do not put the service-role key in `.env.local`, `.env.production`, source code, or GitHub.

```powershell
$env:SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY"
node .\scripts\provision-bod-members.mjs --input "C:\secure-path\Legends with Gmail ID 2026-2027 - Sheet2.csv" --apply
```

The script reuses existing email-confirmed, non-banned Auth identities and does not change their passwords. Existing unconfirmed or currently banned identities are stopped for manual review. It creates missing Auth identities with the spreadsheet password through the Supabase Auth Admin API. Passwords are not printed, logged, or written into the report. The database roster changes are performed in one transaction through the service-role-only RPC.

### Existing administrators

By default, the database RPC refuses to displace any other admin role or active office-bearer record. Inspect the current production admin/office-bearer inventory first. Only if the club has approved replacing those assignments, rerun with:

```powershell
node .\scripts\provision-bod-members.mjs --input "C:\secure-path\Legends with Gmail ID 2026-2027 - Sheet2.csv" --apply --reconcile-admins
```

This explicit flag deactivates active office-bearer rows outside the three supplied accounts and removes admin roles outside the three supplied accounts. It does not delete those users or their profiles.

## Transaction and recovery behavior

Supabase Auth user creation and PostgreSQL changes do not share a transaction. If the database RPC fails, the script attempts to delete only Auth identities created during that run. It never deletes reused Auth identities. If compensation fails, the script prints the affected Auth user ID for manual review.

The database RPC validates the Auth user ID/email mapping, rejects duplicate identities, preserves existing membership IDs and account status, and enforces exactly three admin role rows and exactly three active office-bearer rows. Future Ordinary BOD invitations also receive IDs from the same database sequence; the Admin invitation form no longer accepts a manually entered BOD ID. A designated admin with an inactive/suspended profile causes the entire database transaction to roll back.

## After provisioning

- Review `docs/reports/BOD_ACCOUNT_PROVISIONING_REPORT.md`.
- Test all three office-bearer logins and at least two normal BOD logins.
- Attempt direct admin route and protected RPC access using a normal BOD session.
- Verify role and profile reads with authenticated user JWTs.
- Remove the local CSV and clear terminal environment variables after the credential handoff.
