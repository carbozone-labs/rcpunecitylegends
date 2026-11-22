# BOD Member ID Mapping

**Authoritative source:** `Legends with Gmail ID 2026-2027 - Sheet2.csv` (uploaded 2026–2027 roster).
**Roster rows:** 16
**Status:** Proposed IDs only. The provisioning RPC preserves an existing valid `membership_id` and allocates a new ID only for a member without an existing profile. Production assignments must be confirmed from the provisioning report after a successful database transaction.

## Role mapping

- Club President: Shreya Kotkar — `admin` + `board_member`
- Club Secretary: Ayushi Gupta — `admin` + `board_member`
- Vice President: Sahil Deole — `admin` + `board_member`
- Remaining 13 members: `board_member` only

## Proposed sequence

| Sr. No. | Proposed Member ID | First Name | Last Name | Designation | Email | Access |
|---:|---|---|---|---|---|---|
| 1 | RCPL-BOD-2026-001 | Shreya | Kotkar | Club President | rtrshreyakotkar@gmail.com | admin |
| 2 | RCPL-BOD-2026-002 | Ayushi | Gupta | Club Secretary | rtrayushigupa26@gmail.com | admin |
| 3 | RCPL-BOD-2026-003 | Rohit | Thakare | Treasurer | rtrrohitthakare29@gmail.com | bod |
| 4 | RCPL-BOD-2026-004 | Sahil | Deole | Vice President | rtr.sahildeole@gmail.com | admin |
| 5 | RCPL-BOD-2026-005 | Asawari | Nikam | Professional Service Director (PDD) | rtr.asawarinikam2026.com@gmail.com | bod |
| 6 | RCPL-BOD-2026-006 | Shrinidhi | Gundewar | Club Service Director (CSD) | rtr.shrinidhi15@gmail.com | bod |
| 7 | RCPL-BOD-2026-007 | Aditi | Shrinewar | Community Service Director (CMD) | rtr.aditi.shrinewar@gmail.com | bod |
| 8 | RCPL-BOD-2026-008 | Arya | Kalambe | ISD & PRO | rtraryakalambe@gmail.com | bod |
| 9 | RCPL-BOD-2026-009 | Shruti | Khedkar | Co-CSD & Co-ISD | rtrshrutikhedkar@gmail.com | bod |
| 10 | RCPL-BOD-2026-010 | Mohit | Teke | Editor | rtr.mohit@gmail.com | bod |
| 11 | RCPL-BOD-2026-011 | Prassana | Tayde | Sports Representative | rtr.prasanatayade@gmail.com | bod |
| 12 | RCPL-BOD-2026-012 | Rohit | Pawar | IRRRO | rtrrohitpawar@gmail.com | bod |
| 13 | RCPL-BOD-2026-013 | Atharv | Yadav | World Rotaract Week Chairperson | rtr.atharv05@gmail.com | bod |
| 14 | RCPL-BOD-2026-014 | Chaitrali | Khedkar | Editor | rtrchaitrali31@gmail.com | bod |
| 15 | RCPL-BOD-2026-015 | Shamal | Dhandgavhal | DEI & MD | rtr.shamal@gmail.com | bod |
| 16 | RCPL-BOD-2026-016 | Samruddhi | Desale | Sergeant-at-Arms (SAA) | rtr.samruddhidesale@gmail.com | bod |

## Important safeguards

- These are proposed sequence values, not a claim that production IDs have been assigned.
- Existing Member IDs and account statuses are preserved by the provisioning RPC.
- New IDs are allocated by the database sequence after checking existing BOD-format IDs.
- The uploaded CSV contains passwords. It is intentionally excluded from this project archive, reports, source code, and Git history.
- Password values are never printed by the provisioning script or written to its report.
- Verify each email address and test representative logins after provisioning.
