# Authorization model

## Allowed roles
- `member`: Members Portal only.
- `board_member`: Members Portal only.
- `admin`: Members Portal plus Administration Portal only when the account also has an active `club_office_bearers` row with position `President`, `Vice President`, or `Secretary` and an active member profile.

No `super_admin` role is supported by the corrective migration. The office-bearer table is not writable by browser roles. Administrative RPCs must validate the trusted office-bearer authorization function internally.

## Required production verification
Apply reviewed migrations to the intended Supabase Cloud project, then test all three office-bearer accounts and both non-admin member categories using real authenticated sessions. The source ZIP cannot establish live database state.
