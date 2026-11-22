# BOD Spreadsheet Validation

**Authoritative source:** `Legends with Gmail ID 2026-2027 - Sheet2.csv`
**Rows detected:** 16
**Credential values:** Password column is present; values are intentionally not reproduced.

## Validation results

| Check | Result |
|---|---:|
| Data rows | 16 |
| Missing first names | 0 |
| Missing surnames | 0 |
| Missing email addresses | 0 |
| Missing passwords | 0 |
| Missing designations | 0 |
| Duplicate normalized email addresses | 0 |
| Basic email syntax failures | 0 |
| Required office-bearers | 1 President, 1 Secretary, 1 Vice President |

Basic email syntax validation does not prove that an address exists or is controlled by the named person. Verify email ownership during account activation.

## Authorized office-bearer mapping

| Spreadsheet row | Name | Designation | Expected access |
|---:|---|---|---|
| 1 | Shreya Kotkar | Club President | `board_member` + `admin` |
| 2 | Ayushi Gupta | Club Secretary | `board_member` + `admin` |
| 4 | Sahil Deole | Vice President | `board_member` + `admin` |

All other 13 records receive `board_member` only. Designation mapping is exact; other designations are not promoted.

## Data handling

- First name and surname remain separate source fields.
- Full name is composed as first name + surname for the existing profile schema.
- Email addresses are normalized to lowercase for account lookup.
- Passwords are excluded from this report, Member ID mapping, source code, and provisioning logs.
- The CSV is not bundled into the updated project ZIP.
- This file-level validation does not confirm that production Auth users exist or that production database records were changed.

## Provisioning status

No production Supabase account or database changes are claimed by this validation report. Run the dry-run command in `docs/administration/BOD_PROVISIONING_GUIDE.md`, review the output, then apply only after confirming the target project and migration state.
