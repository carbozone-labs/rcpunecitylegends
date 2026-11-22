# Production deployment checklist

1. Keep `output: "export"` and upload the contents of `out/` to the hosting document root after a successful build.
2. Configure only `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the build environment. These are public browser values.
3. Keep Supabase service-role and Resend secrets exclusively in Supabase Edge Function secrets.
4. Review and apply the migrations in order, including `20261125000000_require_admin_role_and_restore_verified_office_bearers.sql`.
5. Confirm the three office-bearer assignments are accurate and active before enabling Admin access.
6. Test the President, VP, Secretary, ordinary BOD, and general member accounts through the actual application.
7. Do not deploy a static export as proof of server-side route protection: privileged data and mutations must remain protected by Supabase RLS/RPC.
