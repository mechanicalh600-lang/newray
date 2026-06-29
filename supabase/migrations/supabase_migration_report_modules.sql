-- ثبت ماژول‌های گزارش (صفحات گزارش قابل افزودن توسط ادمین)
-- Safe and idempotent

create extension if not exists pgcrypto;

create table if not exists public.report_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  icon text not null default 'filetext',
  path text not null unique,
  description text not null default '',
  sort_order int not null default 500,
  is_builtin boolean not null default false,
  is_active boolean not null default true,
  definition_slug text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_report_modules_active on public.report_modules(is_active);
create index if not exists ix_report_modules_sort on public.report_modules(sort_order, title);
create index if not exists ix_report_modules_definition_slug on public.report_modules(definition_slug);

create or replace function public.set_report_modules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_report_modules_updated_at on public.report_modules;
create trigger trg_report_modules_updated_at
before update on public.report_modules
for each row execute function public.set_report_modules_updated_at();

alter table public.report_modules enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_modules' and policyname='report_modules_select_open') then
    create policy report_modules_select_open on public.report_modules for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_modules' and policyname='report_modules_insert_open') then
    create policy report_modules_insert_open on public.report_modules for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_modules' and policyname='report_modules_update_open') then
    create policy report_modules_update_open on public.report_modules for update to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_modules' and policyname='report_modules_delete_open') then
    create policy report_modules_delete_open on public.report_modules for delete to anon, authenticated using (not is_builtin);
  end if;
end $$;

grant select, insert, update, delete on public.report_modules to anon, authenticated;

-- seed ۹ گزارش پیش‌فرض (بدون بازنویسی ردیف‌های موجود)
insert into public.report_modules (slug, title, icon, path, sort_order, is_builtin, is_active, definition_slug)
values
  ('control-room', 'گزارش اتاق کنترل', 'monitor', '/control-room', 1, true, true, 'control-room'),
  ('shift-report', 'گزارش شیفت', 'clipboard', '/shift-report', 2, true, true, 'shift-report'),
  ('lab-report', 'گزارش آزمایشگاه', 'flask', '/lab-report', 3, true, true, 'lab-report'),
  ('scale-report', 'گزارش باسکول', 'scale', '/scale-report', 4, true, true, 'scale-report'),
  ('production-report', 'گزارش جامع تولید', 'factory', '/production-report', 5, true, true, 'production-report'),
  ('warehouse-report', 'گزارش انبار', 'warehouse', '/warehouse-report', 6, true, true, 'warehouse-report'),
  ('hse-report', 'گزارش ایمنی و بهداشت', 'hardhat', '/hse-report', 7, true, true, 'hse-report'),
  ('reports', 'گزارش‌ساز پویا', 'piechart', '/reports', 8, true, true, 'reports'),
  ('list-report', 'گزارش لیستی', 'spreadsheet', '/list-report', 9, true, true, 'list-report')
on conflict (slug) do nothing;
