# Security Migration Guide (RLS Hardening)

This project includes a reusable SQL migration for Row-Level Security hardening:

- File: `supabase_migration_rls_hardening.sql`
- Scope: `public` schema tables

## What the migration does

1. Ensures `security.policy_backups` exists (for policy snapshots).
2. Creates helper function `public.is_current_user_admin()`.
3. Enables RLS on all `public` tables.
4. Applies baseline policies for non-sensitive tables:
   - `read_auth` (SELECT for authenticated users)
   - `admin_all` (ALL for admins only)
5. Applies custom policies for sensitive tables:
   - `app_users` (self/admin)
   - `personal_notes` (owner-only)
   - `messages` (participant-based)
   - `system_logs` (authenticated read/insert)

## How to run

1. Open Supabase SQL Editor.
2. Paste and execute `supabase_migration_rls_hardening.sql`.
3. Verify policies:

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

## Rollback strategy

Use snapshot-based rollback from `security.policy_backups` if needed.
Store `snapshot_id` before large policy changes and regenerate restore SQL for that snapshot.

