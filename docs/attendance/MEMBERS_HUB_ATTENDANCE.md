# Attendance

Attendance sessions live in `attendance_sessions`; individual outcomes are in `attendance_records`; every mark/correction is appended to `attendance_audit`. Members can read their own records. Authorized coordinators create sessions and call `mark_attendance(session_id,user_id,status,reason)`. The RPC requires `attendance.manage` (or admin/super_admin), validates the status and writes the audit entry atomically. Members cannot self-mark attendance. QR check-in is deferred.
