-- RLS hardening migration
-- Date: 2026-02-10
-- Purpose:
-- 1) Remove temporary/open policies
-- 2) Apply safe baseline policies
-- 3) Apply table-specific policies for sensitive tables

begin;

-- Ensure helper schema/table exist for policy snapshots.
create schema if not exists security;

create table if not exists security.policy_backups (
  id bigserial primary key,
  snapshot_id uuid not null,
  captured_at timestamptz not null default now(),
  schemaname text not null,
  tablename text not null,
  policyname text not null,
  permissive text not null,
  cmd text not null,
  roles text[] not null,
  qual text,
  with_check text
);

-- Helper function used in admin policies.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.id = auth.uid()
      and au.role = 'ADMIN'
  );
$$;

-- Keep function callable by authenticated users only.
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- Enable RLS on all public tables.
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t.tablename);
  end loop;
end $$;

-- Baseline policies for all public tables except sensitive tables with custom rules.
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('app_users', 'messages', 'personal_notes', 'system_logs')
  loop
    execute format('drop policy if exists %I on public.%I;', 'auth_all_temp', t.tablename);
    execute format('drop policy if exists %I on public.%I;', 'read_auth', t.tablename);
    execute format('drop policy if exists %I on public.%I;', 'admin_all', t.tablename);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      'read_auth',
      t.tablename
    );

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());',
      'admin_all',
      t.tablename
    );
  end loop;
end $$;

-- =========================
-- app_users (self or admin)
-- =========================
drop policy if exists "auth_all_temp" on public.app_users;
drop policy if exists "read_auth" on public.app_users;
drop policy if exists "admin_all" on public.app_users;
drop policy if exists "app_users_select_self_or_admin" on public.app_users;
drop policy if exists "app_users_update_self_or_admin" on public.app_users;
drop policy if exists "app_users_insert_admin_only" on public.app_users;
drop policy if exists "app_users_delete_admin_only" on public.app_users;

create policy "app_users_select_self_or_admin"
on public.app_users
for select
to authenticated
using (id = auth.uid() or public.is_current_user_admin());

create policy "app_users_update_self_or_admin"
on public.app_users
for update
to authenticated
using (id = auth.uid() or public.is_current_user_admin())
with check (id = auth.uid() or public.is_current_user_admin());

create policy "app_users_insert_admin_only"
on public.app_users
for insert
to authenticated
with check (public.is_current_user_admin());

create policy "app_users_delete_admin_only"
on public.app_users
for delete
to authenticated
using (public.is_current_user_admin());

-- ==================================
-- personal_notes (owner-only access)
-- ==================================
drop policy if exists "auth_all_temp" on public.personal_notes;
drop policy if exists "read_auth" on public.personal_notes;
drop policy if exists "admin_all" on public.personal_notes;
drop policy if exists "notes_owner_select" on public.personal_notes;
drop policy if exists "notes_owner_insert" on public.personal_notes;
drop policy if exists "notes_owner_update" on public.personal_notes;
drop policy if exists "notes_owner_delete" on public.personal_notes;

create policy "notes_owner_select"
on public.personal_notes
for select
to authenticated
using (user_id = auth.uid());

create policy "notes_owner_insert"
on public.personal_notes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "notes_owner_update"
on public.personal_notes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notes_owner_delete"
on public.personal_notes
for delete
to authenticated
using (user_id = auth.uid());

-- =====================================
-- messages (participant-based access)
-- sender_id / receiver_id are text
-- =====================================
drop policy if exists "auth_all_temp" on public.messages;
drop policy if exists "read_auth" on public.messages;
drop policy if exists "admin_all" on public.messages;
drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_insert_sender_only" on public.messages;
drop policy if exists "messages_update_sender_or_receiver" on public.messages;
drop policy if exists "messages_delete_sender_only" on public.messages;

create policy "messages_select_participants"
on public.messages
for select
to authenticated
using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text);

create policy "messages_insert_sender_only"
on public.messages
for insert
to authenticated
with check (sender_id = auth.uid()::text);

create policy "messages_update_sender_or_receiver"
on public.messages
for update
to authenticated
using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text)
with check (sender_id = auth.uid()::text or receiver_id = auth.uid()::text);

create policy "messages_delete_sender_only"
on public.messages
for delete
to authenticated
using (sender_id = auth.uid()::text);

-- ====================
-- system_logs explicit
-- ====================
drop policy if exists "auth_all_temp" on public.system_logs;
drop policy if exists "read_auth" on public.system_logs;
drop policy if exists "admin_all" on public.system_logs;
drop policy if exists "Allow authenticated insert access" on public.system_logs;
drop policy if exists "Allow authenticated read access" on public.system_logs;

create policy "Allow authenticated insert access"
on public.system_logs
for insert
to authenticated
with check (true);

create policy "Allow authenticated read access"
on public.system_logs
for select
to authenticated
using (true);

commit;

