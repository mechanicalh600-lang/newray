-- ماژول‌های فرآیند + تعریف گردش کار + تاریخچه + cartable_items
-- Safe and idempotent

create extension if not exists pgcrypto;

-- ── process_modules ──
create table if not exists public.process_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  module_key text not null unique,
  title text not null,
  icon text not null default 'workflow',
  entity_table text not null default '',
  entity_status_field text not null default 'status',
  form_route text not null default '',
  description text not null default '',
  sort_order int not null default 500,
  is_builtin boolean not null default false,
  is_active boolean not null default true,
  active_workflow_id uuid,
  condition_fields jsonb not null default '[]'::jsonb,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_process_modules_active on public.process_modules(is_active);
create index if not exists ix_process_modules_sort on public.process_modules(sort_order, title);
create index if not exists ix_process_modules_module_key on public.process_modules(module_key);

-- ── workflow_definitions ──
create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  process_module_slug text not null references public.process_modules(slug) on update cascade,
  title text not null,
  version int not null default 1,
  definition_json jsonb not null default '{"steps":[]}'::jsonb,
  is_active boolean not null default false,
  is_published boolean not null default false,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_workflow_definitions_process on public.workflow_definitions(process_module_slug);
create index if not exists ix_workflow_definitions_active on public.workflow_definitions(process_module_slug, is_active);

-- ── workflow_history ──
create table if not exists public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  cartable_item_id uuid not null,
  step_id text not null,
  step_title text,
  step_status_code text,
  action_id text,
  action_label text,
  actor_id text not null,
  actor_name text,
  comment text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ix_workflow_history_cartable on public.workflow_history(cartable_item_id, created_at desc);

-- ── cartable_items (if missing) ──
create table if not exists public.cartable_items (
  id uuid primary key default gen_random_uuid(),
  workflow_id text not null,
  tracking_code text,
  module text not null,
  title text not null,
  description text not null default '',
  current_step_id text not null,
  initiator_id text not null,
  assignee_role text not null,
  assignee_id text,
  status text not null default 'PENDING',
  data jsonb not null default '{}'::jsonb,
  entity_id text,
  entity_table text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_cartable_items_status on public.cartable_items(status);
create index if not exists ix_cartable_items_module on public.cartable_items(module);
create index if not exists ix_cartable_items_assignee_id on public.cartable_items(assignee_id);
create index if not exists ix_cartable_items_initiator_id on public.cartable_items(initiator_id);
create index if not exists ix_cartable_items_created_at on public.cartable_items(created_at desc);

-- updated_at triggers
create or replace function public.set_process_modules_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_process_modules_updated_at on public.process_modules;
create trigger trg_process_modules_updated_at
before update on public.process_modules for each row execute function public.set_process_modules_updated_at();

create or replace function public.set_workflow_definitions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_workflow_definitions_updated_at on public.workflow_definitions;
create trigger trg_workflow_definitions_updated_at
before update on public.workflow_definitions for each row execute function public.set_workflow_definitions_updated_at();

create or replace function public.set_cartable_items_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_cartable_items_updated_at on public.cartable_items;
create trigger trg_cartable_items_updated_at
before update on public.cartable_items for each row execute function public.set_cartable_items_updated_at();

-- RLS (open policies for dev — align with report_modules)
alter table public.process_modules enable row level security;
alter table public.workflow_definitions enable row level security;
alter table public.workflow_history enable row level security;
alter table public.cartable_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='process_modules' and policyname='process_modules_select_open') then
    create policy process_modules_select_open on public.process_modules for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='process_modules' and policyname='process_modules_write_open') then
    create policy process_modules_write_open on public.process_modules for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_definitions' and policyname='workflow_definitions_select_open') then
    create policy workflow_definitions_select_open on public.workflow_definitions for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_definitions' and policyname='workflow_definitions_write_open') then
    create policy workflow_definitions_write_open on public.workflow_definitions for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_history' and policyname='workflow_history_select_open') then
    create policy workflow_history_select_open on public.workflow_history for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_history' and policyname='workflow_history_write_open') then
    create policy workflow_history_write_open on public.workflow_history for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='cartable_items' and policyname='cartable_items_select_open') then
    create policy cartable_items_select_open on public.cartable_items for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='cartable_items' and policyname='cartable_items_write_open') then
    create policy cartable_items_write_open on public.cartable_items for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.process_modules to anon, authenticated;
grant select, insert, update, delete on public.workflow_definitions to anon, authenticated;
grant select, insert, update, delete on public.workflow_history to anon, authenticated;
grant select, insert, update, delete on public.cartable_items to anon, authenticated;

-- seed فرآیندهای پیش‌فرض
insert into public.process_modules (slug, module_key, title, icon, entity_table, entity_status_field, form_route, sort_order, is_builtin, is_active, condition_fields)
values
  ('work-order', 'WORK_ORDER', 'دستور کار', 'wrench', 'work_orders', 'status', '/work-orders', 1, true, true, '[{"key":"work_type","label":"نوع کار"},{"key":"priority","label":"اولویت"}]'::jsonb),
  ('part-request', 'PART_REQUEST', 'درخواست قطعه', 'package', 'part_requests', 'status', '/part-requests', 2, true, true, '[{"key":"urgency","label":"فوریت"}]'::jsonb),
  ('suggestion', 'SUGGESTION', 'پیشنهادات فنی', 'lightbulb', 'technical_suggestions', 'status', '/suggestions', 3, true, true, '[]'::jsonb),
  ('purchase', 'PURCHASE', 'درخواست خرید', 'shoppingcart', 'purchase_requests', 'status', '/purchases', 4, true, true, '[]'::jsonb),
  ('performance', 'PERFORMANCE', 'امتیاز عملکرد', 'award', 'performance_scores', 'status', '/performance', 5, true, true, '[]'::jsonb),
  ('meeting', 'MEETING', 'صورتجلسات', 'filesignature', 'meeting_minutes', 'status', '/meetings', 6, true, true, '[]'::jsonb),
  ('project', 'PROJECT', 'کنترل پروژه', 'briefcase', 'projects', 'status', '/projects', 7, true, true, '[]'::jsonb),
  ('permit', 'PERMIT', 'مجوز کار (PTW)', 'hardhat', 'work_permits', 'status', '/permits', 8, true, true, '[]'::jsonb)
on conflict (slug) do nothing;
