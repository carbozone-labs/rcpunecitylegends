# RLS and Database Authorization

The supplied migrations enable RLS on member and operational tables, grant limited browser access, and use narrowly scoped `SECURITY DEFINER` functions with an empty `search_path` for protected operations.

The three-portal authorization model requires both:
- an `admin` row in `public.member_roles`; and
- an active `public.club_office_bearers` row for President, Vice President, or Secretary, with an active member profile.

The private office-bearer table is not granted to `anon` or `authenticated`. The new BOD provisioning RPC is executable only by `service_role`.

These are source/migration findings. Verify actual policies and grants on the target Supabase project after migration.
