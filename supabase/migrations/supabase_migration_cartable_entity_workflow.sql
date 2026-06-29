-- جداول تکمیلی گردش کار، خوانده‌شدن کارتابل، و ماژول‌های فرآیند
-- Safe and idempotent

-- ── فیلدهای گردش کار برای اسناد فنی ──
alter table public.technical_documents add column if not exists status text not null default 'PENDING';
alter table public.technical_documents add column if not exists tracking_code text;
alter table public.technical_documents add column if not exists requester_id text;
alter table public.technical_documents add column if not exists requester_name text;

create index if not exists ix_technical_documents_status on public.technical_documents(status);
create index if not exists ix_technical_documents_tracking on public.technical_documents(tracking_code)
  where tracking_code is not null and tracking_code <> '';

-- ── خوانده‌شدن آیتم‌های کارتابل (به ازای هر کاربر) ──
create table if not exists public.cartable_item_reads (
  id uuid primary key default gen_random_uuid(),
  cartable_item_id uuid not null references public.cartable_items(id) on delete cascade,
  user_id text not null,
  read_at timestamptz not null default now(),
  unique (cartable_item_id, user_id)
);

create index if not exists ix_cartable_item_reads_user on public.cartable_item_reads(user_id);
create index if not exists ix_cartable_item_reads_item on public.cartable_item_reads(cartable_item_id);

alter table public.cartable_item_reads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cartable_item_reads' and policyname = 'cartable_item_reads_all'
  ) then
    create policy cartable_item_reads_all on public.cartable_item_reads
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.cartable_item_reads to anon, authenticated;

-- ── اصلاح entity_table امتیاز عملکرد ──
update public.process_modules
set entity_table = 'performance_evaluations', updated_at = now()
where module_key = 'PERFORMANCE' and entity_table <> 'performance_evaluations';

update public.process_modules
set title = 'پروژه‌ها', updated_at = now()
where module_key = 'PROJECT';

-- ── ماژول‌های جدید (مأموریت، خروج کالا، اسناد فنی) ──
insert into public.process_modules (
  slug, module_key, title, icon, entity_table, entity_status_field, form_route,
  sort_order, is_builtin, is_active, condition_fields
)
values
  (
    'mission', 'MISSION', 'مأموریت', 'map-pin', 'personnel_missions', 'status', '/missions',
    9, true, true, '[]'::jsonb
  ),
  (
    'factory-exit', 'FACTORY_EXIT', 'خروج کالا از کارخانه', 'truck', 'factory_goods_exits', 'status', '/factory-exit',
    10, true, true, '[]'::jsonb
  ),
  (
    'tech-doc', 'TECH_DOC', 'اسناد فنی', 'filetext', 'technical_documents', 'status', '/documents',
    11, true, true, '[{"key":"type","label":"نوع سند"}]'::jsonb
  )
on conflict (slug) do update set
  title = excluded.title,
  entity_table = excluded.entity_table,
  form_route = excluded.form_route,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
