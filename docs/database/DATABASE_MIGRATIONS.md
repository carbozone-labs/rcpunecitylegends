# Database Migration Guide

1. Confirm the intended Supabase project reference.
2. Check local and remote migration histories before applying anything.
3. Apply the supplied timestamped migrations in order.
4. Never edit, rename, delete, or reorder migrations already applied remotely.
5. Review `20261126000000_provision_bod_roster.sql` before applying it; it is a new pending migration.
6. Back up the production project before schema changes.
7. After applying, verify the sequence, columns, function grants, and function execution rights.
8. Run the BOD provisioning script only after the migration is confirmed on the intended project.

No migration was applied to a live database during this task.
