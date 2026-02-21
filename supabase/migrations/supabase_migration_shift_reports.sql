-- Shift reports hardening migration
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.shift_reports (
  id uuid primary key default gen_random_uuid(),
  tracking_code text,
  shift_date text,
  shift_name text,
  shift_type text,
  shift_duration text,
  supervisor_id uuid references public.app_users(id),
  supervisor_name text,
  total_production_a numeric default 0,
  total_production_b numeric default 0,
  full_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shift_reports
  add column if not exists updated_at timestamptz not null default now();

alter table public.shift_reports
  alter column full_data set default '{}'::jsonb;

update public.shift_reports
set full_data = '{}'::jsonb
where full_data is null;

alter table public.shift_reports
  alter column full_data set not null;

create unique index if not exists ux_shift_reports_tracking_code
  on public.shift_reports (tracking_code)
  where tracking_code is not null and tracking_code <> '';

create index if not exists ix_shift_reports_shift_date
  on public.shift_reports (shift_date);

create index if not exists ix_shift_reports_shift_type
  on public.shift_reports (shift_type);

create index if not exists ix_shift_reports_created_at
  on public.shift_reports (created_at desc);

create index if not exists ix_shift_reports_supervisor_id
  on public.shift_reports (supervisor_id);

create or replace function public.set_shift_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_shift_reports_updated_at on public.shift_reports;
create trigger trg_shift_reports_updated_at
before update on public.shift_reports
for each row
execute function public.set_shift_reports_updated_at();

alter table public.shift_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_reports'
      and policyname = 'shift_reports_select_anon_auth'
  ) then
    create policy shift_reports_select_anon_auth
      on public.shift_reports
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_reports'
      and policyname = 'shift_reports_insert_anon_auth'
  ) then
    create policy shift_reports_insert_anon_auth
      on public.shift_reports
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_reports'
      and policyname = 'shift_reports_update_anon_auth'
  ) then
    create policy shift_reports_update_anon_auth
      on public.shift_reports
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end
$$;

grant select, insert, update on table public.shift_reports to anon, authenticated;
