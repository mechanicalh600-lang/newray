-- Phase 2 reports rollout (production + control room)
-- Safe and idempotent migration

create extension if not exists pgcrypto;

create table if not exists public.production_reports (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique,
  report_date text not null,
  total_production numeric default 0,
  status text default 'DRAFT',
  full_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.control_room_reports (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique,
  report_date text not null,
  shift text,
  operator_name text,
  status text default 'DRAFT',
  full_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_production_reports_report_date on public.production_reports (report_date);
create index if not exists ix_production_reports_created_at on public.production_reports (created_at desc);
create index if not exists ix_control_room_reports_report_date on public.control_room_reports (report_date);
create index if not exists ix_control_room_reports_shift on public.control_room_reports (shift);
create index if not exists ix_control_room_reports_created_at on public.control_room_reports (created_at desc);

create or replace function public.set_generic_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_production_reports_updated_at on public.production_reports;
create trigger trg_production_reports_updated_at
before update on public.production_reports
for each row
execute function public.set_generic_updated_at();

drop trigger if exists trg_control_room_reports_updated_at on public.control_room_reports;
create trigger trg_control_room_reports_updated_at
before update on public.control_room_reports
for each row
execute function public.set_generic_updated_at();

alter table public.production_reports enable row level security;
alter table public.control_room_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'production_reports' and policyname = 'production_reports_select_anon_auth'
  ) then
    create policy production_reports_select_anon_auth on public.production_reports for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'production_reports' and policyname = 'production_reports_insert_anon_auth'
  ) then
    create policy production_reports_insert_anon_auth on public.production_reports for insert to anon, authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'production_reports' and policyname = 'production_reports_update_anon_auth'
  ) then
    create policy production_reports_update_anon_auth on public.production_reports for update to anon, authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'control_room_reports' and policyname = 'control_room_reports_select_anon_auth'
  ) then
    create policy control_room_reports_select_anon_auth on public.control_room_reports for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'control_room_reports' and policyname = 'control_room_reports_insert_anon_auth'
  ) then
    create policy control_room_reports_insert_anon_auth on public.control_room_reports for insert to anon, authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'control_room_reports' and policyname = 'control_room_reports_update_anon_auth'
  ) then
    create policy control_room_reports_update_anon_auth on public.control_room_reports for update to anon, authenticated using (true) with check (true);
  end if;
end
$$;

grant select, insert, update on public.production_reports to anon, authenticated;
grant select, insert, update on public.control_room_reports to anon, authenticated;
