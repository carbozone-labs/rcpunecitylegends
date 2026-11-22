# Authentication Security

- Supabase Auth is the identity provider.
- The browser adapter stores and refreshes the Supabase session; localStorage is not an authorization source.
- Member access requires a trusted profile and role.
- Administration requires the protected `is_office_bearer_admin()` RPC and an active profile.
- Database policies/RPCs, not hidden navigation, are the security boundary for sensitive data and operations.
- The provisioning workflow reuses existing Auth identities and never resets existing passwords.
- New accounts are created through Supabase Auth Admin API; passwords are not stored in application profile tables or written to reports.
- Service-role credentials are used only by trusted server-side Supabase functions or the local provisioning process.

Static export means route-level Next.js server authentication is unavailable. See `SECURITY_AUDIT.md` for the architecture limitation and production validation requirements.
