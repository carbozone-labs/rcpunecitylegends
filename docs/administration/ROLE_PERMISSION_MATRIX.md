# Role and Permission Matrix

| Capability | President | Secretary | Vice President | Other BOD |
|---|---:|---:|---:|---:|
| Members Portal | Yes | Yes | Yes | Yes |
| Administration Portal | Yes | Yes | Yes | No |
| View permitted member directory | Yes | Yes | Yes | Yes |
| Manage members and invitations | Yes | Yes | Yes | No |
| Change member roles | Yes | Yes | Yes | No |
| Manage events/attendance/tasks/documents/announcements | Yes | Yes | Yes | Only through existing granted BOD permissions |
| Manage gamification settings | Yes | Yes | Yes | No |
| View administrative audit history | Yes | Yes | Yes | No |
| Update own allowed profile fields | Yes | Yes | Yes | Yes |

## Trusted role assignment

- Every spreadsheet BOD account receives `board_member`.
- Only the exact `Club President`, `Club Secretary`, and `Vice President` designations receive `admin`.
- Administrative authorization also requires an active matching row in the private `club_office_bearers` table and an active member profile.
- The `club_office_bearers` table is not browser-writable.
- Normal BOD permissions do not confer administrative access.
- The Admin role is not editable through ordinary profile updates.

Database enforcement is authoritative. Navigation visibility is only a user-interface convenience.
