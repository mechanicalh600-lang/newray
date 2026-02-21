-- گزارش معماری دیتابیس برای مقایسه با CMMS تجاری (SQL Server)
-- در Supabase SQL Editor اجرا کنید:
--   ۱) ابتدا این migration را اجرا کنید (ایجاد تابع).
--   ۲) سپس: SELECT * FROM public.get_database_architecture_report() ORDER BY section, sort_key;
--
-- خلاصهٔ سریع (تعدادها) بدون تابع:
-- SELECT
--   (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables_count,
--   (SELECT count(*) FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE') AS columns_count,
--   (SELECT count(*) FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'PRIMARY KEY') AS primary_keys_count,
--   (SELECT count(*) FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY') AS foreign_keys_count,
--   (SELECT count(*) FROM pg_index ix JOIN pg_class c ON c.oid = ix.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r') AS indexes_count,
--   (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'v') AS views_count,
--   (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public') AS functions_count,
--   (SELECT count(*) FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT tg.tgisinternal) AS triggers_count;

create or replace function public.get_database_architecture_report()
returns table(
  section text,
  sort_key text,
  name text,
  details jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) جداول (فقط schema عمومی و غیر سیستمی)
  return query
  select
    'Tables'::text,
    (n.nspname || '.' || c.relname)::text,
    (n.nspname || '.' || c.relname)::text,
    jsonb_build_object(
      'schema', n.nspname,
      'table_name', c.relname,
      'relkind', case c.relkind when 'r' then 'table' when 'v' then 'view' else c.relkind::text end
    )
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    and n.nspname not like 'pg_temp_%'
    and c.relkind in ('r', 'v')
  order by n.nspname, c.relname;

  -- 2) ستون‌ها (جدول، ستون، نوع، nullable، پیش‌فرض)
  return query
  select
    'Columns'::text,
    (t.table_schema || '.' || t.table_name || '.' || c.column_name)::text,
    (t.table_schema || '.' || t.table_name || '.' || c.column_name)::text,
    jsonb_build_object(
      'schema', t.table_schema,
      'table_name', t.table_name,
      'column_name', c.column_name,
      'data_type', c.data_type,
      'udt_name', c.udt_name,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default,
      'ordinal_position', c.ordinal_position
    )
  from information_schema.tables t
  join information_schema.columns c on c.table_schema = t.table_schema and c.table_name = t.table_name
  where t.table_schema not in ('pg_catalog', 'information_schema')
    and t.table_type = 'BASE TABLE'
  order by t.table_schema, t.table_name, c.ordinal_position;

  -- 3) کلیدهای اصلی
  return query
  select
    'PrimaryKeys'::text,
    (tc.table_schema || '.' || tc.table_name || '.' || tc.constraint_name)::text,
    (tc.table_schema || '.' || tc.table_name)::text,
    jsonb_build_object(
      'schema', tc.table_schema,
      'table_name', tc.table_name,
      'constraint_name', tc.constraint_name,
      'columns', (
        select jsonb_agg(kcu.column_name order by kcu.ordinal_position)
        from information_schema.key_column_usage kcu
        where kcu.constraint_name = tc.constraint_name
          and kcu.table_schema = tc.table_schema
      )
    )
  from information_schema.table_constraints tc
  where tc.constraint_type = 'PRIMARY KEY'
    and tc.table_schema not in ('pg_catalog', 'information_schema')
  order by tc.table_schema, tc.table_name;

  -- 4) کلیدهای خارجی
  return query
  select
    'ForeignKeys'::text,
    (tc.table_schema || '.' || tc.table_name || '.' || tc.constraint_name)::text,
    (tc.table_schema || '.' || tc.table_name || '.' || kcu.column_name)::text,
    jsonb_build_object(
      'referencing_schema', tc.table_schema,
      'referencing_table', tc.table_name,
      'referencing_column', kcu.column_name,
      'referenced_schema', ccu.table_schema,
      'referenced_table', ccu.table_name,
      'referenced_column', ccu.column_name,
      'constraint_name', tc.constraint_name
    )
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema not in ('pg_catalog', 'information_schema')
  order by tc.table_schema, tc.table_name, kcu.ordinal_position;

  -- 5) ایندکس‌ها
  return query
  select
    'Indexes'::text,
    (n.nspname || '.' || t.relname || '.' || i.relname)::text,
    (n.nspname || '.' || t.relname || '.' || i.relname)::text,
    jsonb_build_object(
      'schema', n.nspname,
      'table_name', t.relname,
      'index_name', i.relname,
      'is_unique', ix.indisunique,
      'is_primary', ix.indisprimary,
      'columns', (
        select jsonb_agg(a.attname order by a.attnum)
        from pg_catalog.pg_attribute a
        where a.attrelid = i.oid and a.attnum > 0 and not a.attisdropped
      )
    )
  from pg_catalog.pg_index ix
  join pg_catalog.pg_class i on i.oid = ix.indexrelid
  join pg_catalog.pg_class t on t.oid = ix.indrelid
  join pg_catalog.pg_namespace n on n.oid = t.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    and n.nspname not like 'pg_temp_%'
    and t.relkind = 'r'
  order by n.nspname, t.relname, i.relname;

  -- 6) ویوها (در PostgreSQL view هم با relkind='v' هست؛ خلاصه برای بخش جدا)
  return query
  select
    'Views'::text,
    (n.nspname || '.' || c.relname)::text,
    (n.nspname || '.' || c.relname)::text,
    jsonb_build_object(
      'schema', n.nspname,
      'view_name', c.relname
    )
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    and n.nspname not like 'pg_temp_%'
    and c.relkind = 'v'
  order by n.nspname, c.relname;

  -- 7) توابع (کاربری در schema public)
  return query
  select
    'Functions'::text,
    (n.nspname || '.' || p.proname)::text,
    (n.nspname || '.' || p.proname)::text,
    jsonb_build_object(
      'schema', n.nspname,
      'function_name', p.proname,
      'return_type', pg_catalog.format_type(p.prorettype, -1)
    )
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not p.prokind = 'a'  -- exclude aggregates if needed
  order by n.nspname, p.proname;

  -- 8) تریگرها
  return query
  select
    'Triggers'::text,
    (tg.tgname || '.' || c.relname)::text,
    (n.nspname || '.' || c.relname || '.' || tg.tgname)::text,
    jsonb_build_object(
      'schema', n.nspname,
      'table_name', c.relname,
      'trigger_name', tg.tgname
    )
  from pg_catalog.pg_trigger tg
  join pg_catalog.pg_class c on c.oid = tg.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
    and not tg.tgisinternal
  order by n.nspname, c.relname, tg.tgname;

  return;
end;
$$;

comment on function public.get_database_architecture_report() is 'گزارش معماری دیتابیس برای مقایسه با CMMS و اسکیمای SQL Server';
grant execute on function public.get_database_architecture_report() to anon, authenticated;
