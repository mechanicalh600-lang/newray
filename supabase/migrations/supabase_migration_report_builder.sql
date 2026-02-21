-- Dynamic Report Builder (Form + Runtime) migration
-- Safe and idempotent

create extension if not exists pgcrypto;

create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'گزارشات',
  is_active boolean not null default true,
  form_schema jsonb not null default '{"fields":[]}'::jsonb,
  list_schema jsonb not null default '{"columns":[]}'::jsonb,
  template_schema jsonb not null default '{}'::jsonb,
  data_source jsonb not null default '{"mode":"generic","table":"report_records"}'::jsonb,
  version int not null default 1,
  published_version int not null default 0,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_records (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.report_definitions(id) on delete cascade,
  tracking_code text,
  report_date text,
  payload jsonb not null default '{}'::jsonb,
  payload_version int not null default 1,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_report_definitions_slug on public.report_definitions(slug);
create index if not exists ix_report_definitions_active on public.report_definitions(is_active);
create index if not exists ix_report_definitions_updated_at on public.report_definitions(updated_at desc);
create index if not exists ix_report_records_definition_id on public.report_records(definition_id);
create index if not exists ix_report_records_report_date on public.report_records(report_date);
create index if not exists ix_report_records_created_at on public.report_records(created_at desc);

create or replace function public.set_report_builder_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_report_definitions_updated_at on public.report_definitions;
create trigger trg_report_definitions_updated_at
before update on public.report_definitions
for each row execute function public.set_report_builder_updated_at();

drop trigger if exists trg_report_records_updated_at on public.report_records;
create trigger trg_report_records_updated_at
before update on public.report_records
for each row execute function public.set_report_builder_updated_at();

alter table public.report_definitions enable row level security;
alter table public.report_records enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_definitions' and policyname='report_definitions_select_open') then
    create policy report_definitions_select_open on public.report_definitions for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_definitions' and policyname='report_definitions_insert_open') then
    create policy report_definitions_insert_open on public.report_definitions for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_definitions' and policyname='report_definitions_update_open') then
    create policy report_definitions_update_open on public.report_definitions for update to anon, authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_select_open') then
    create policy report_records_select_open on public.report_records for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_insert_open') then
    create policy report_records_insert_open on public.report_records for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_update_open') then
    create policy report_records_update_open on public.report_records for update to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_delete_open') then
    create policy report_records_delete_open on public.report_records for delete to anon, authenticated using (true);
  end if;
end $$;

grant select, insert, update on public.report_definitions to anon, authenticated;
grant select, insert, update, delete on public.report_records to anon, authenticated;
