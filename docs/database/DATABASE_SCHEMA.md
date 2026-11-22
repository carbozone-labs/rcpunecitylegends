# Database Schema Overview

The application reuses the supplied Supabase schema. The primary member profile is `public.members`, keyed by `auth.users.id`. `membership_id` is unique and serves as the member identifier. `member_roles` stores the separate role assignments. `club_office_bearers` is a private allowlist for the three administrative positions.

The new migration `20261126000000_provision_bod_roster.sql` (pending remote application) adds `first_name` and `last_name`, creates a database sequence for newly assigned `RCPL-BOD-2026-NNN` identifiers, and adds a service-role-only transactional roster provisioning RPC.

The application does not create a duplicate BOD profile table. Existing membership IDs and account statuses are preserved when an existing profile is updated.

See `MEMBERS_HUB_DATABASE_REFERENCE.md` and `DATABASE_MIGRATIONS.md`.
