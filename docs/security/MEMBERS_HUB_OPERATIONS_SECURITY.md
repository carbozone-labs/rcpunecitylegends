# Operations Security

- All operational tables use RLS and begin with revoked browser privileges; only required table/column grants are reintroduced.
- Board access is permission-specific via `member_permissions` and `has_operation_permission`.
- Event registration and attendance marking are constrained database functions with fixed empty `search_path` and explicit grants.
- Attendance corrections are auditable.
- The directory is a narrow projection without email, phone, auth IDs or membership identifiers.
- Documents use a private Storage bucket, 20 MB limit, MIME allowlist and short-lived signed download URLs. Metadata audience and Storage object policies are both enforced.
- Notifications are user-scoped and clients cannot insert notification rows.
- Never put service-role keys or email-provider secrets in public environment variables.

Review policies against your actual Supabase project and run the SQL policy tests before production rollout.
