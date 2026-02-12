-- =========================================================
-- NewRay Data Change Audit (Supabase/PostgreSQL)
-- Creates audit table + trigger function + triggers
-- =========================================================

create table if not exists public.data_change_audit (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by text,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index if not exists idx_data_change_audit_table_name on public.data_change_audit(table_name);
create index if not exists idx_data_change_audit_changed_at on public.data_change_audit(changed_at desc);
create index if not exists idx_data_change_audit_record_id on public.data_change_audit(record_id);

alter table public.data_change_audit enable row level security;

drop policy if exists data_change_audit_select_open on public.data_change_audit;
drop policy if exists data_change_audit_insert_open on public.data_change_audit;

create policy data_change_audit_select_open
on public.data_change_audit
for select
to anon, authenticated
using (true);

create policy data_change_audit_insert_open
on public.data_change_audit
for insert
to anon, authenticated
with check (true);

grant select, insert on public.data_change_audit to anon, authenticated;

create or replace function public.audit_data_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
begin
  actor := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claim.email', true), ''),
    'app-local-user'
  );

  if tg_op = 'INSERT' then
    insert into public.data_change_audit (table_name, record_id, operation, changed_by, old_data, new_data)
    values (tg_table_name, new.id::text, 'INSERT', actor, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.data_change_audit (table_name, record_id, operation, changed_by, old_data, new_data)
    values (tg_table_name, coalesce(new.id::text, old.id::text), 'UPDATE', actor, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.data_change_audit (table_name, record_id, operation, changed_by, old_data, new_data)
    values (tg_table_name, old.id::text, 'DELETE', actor, to_jsonb(old), null);
    return old;
  end if;

  return null;
end;
$$;

-- Attach trigger to target tables
do $$
declare
  t text;
  tables text[] := array[
    'user_groups','personnel','org_chart','app_users','locations',
    'equipment_classes','equipment_groups','equipment','equipment_local_names',
    'evaluation_periods','evaluation_criteria','measurement_units','equipment_tree',
    'part_categories','parts','activity_cards','checklist_items','maintenance_plans','production_plans',
    'shift_reports','lab_reports','warehouse_reports','work_orders','part_requests','cartable_items','system_logs',
    'report_definitions','report_records'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('drop trigger if exists trg_audit_%I on public.%I', t, t);
      execute format(
        'create trigger trg_audit_%I after insert or update or delete on public.%I
         for each row execute function public.audit_data_change()',
        t, t
      );
    end if;
  end loop;
end $$;
