-- توابع کمکی برای ابزار گزارش لیستی: لیست جداول و ستون‌ها و کلیدهای خارجی
-- در Supabase SQL Editor اجرا کنید.

-- لیست همهٔ جداول و ویوها از همهٔ schemaهای غیر سیستمی (public + هر schema دیگر)
create or replace function public.list_public_tables()
returns table(table_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select (case when n.nspname = 'public' then c.relname::text else (n.nspname || '.' || c.relname)::text end)
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    and n.nspname not like 'pg_temp_%'
    and c.relkind in ('r', 'v')
  order by n.nspname, c.relname;
end;
$$;

-- نام qualified: "tablename" (public) یا "schema.tablename"
create or replace function public.list_table_columns(qualified_tname text)
returns table(column_name text, data_type text, is_nullable text)
language plpgsql
security definer
set search_path = public
as $$
declare
  p_schema text;
  p_tname text;
  tbl_oid oid;
begin
  if position('.' in qualified_tname) > 0 then
    p_schema := split_part(qualified_tname, '.', 1);
    p_tname := split_part(qualified_tname, '.', 2);
  else
    p_schema := 'public';
    p_tname := qualified_tname;
  end if;
  select c.oid into tbl_oid
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = p_schema and c.relname = p_tname and c.relkind in ('r', 'v');
  if tbl_oid is null then
    return;
  end if;
  return query
  select a.attname::text, pg_catalog.format_type(a.atttypid, a.atttypmod), case when a.attnotnull then 'NO' else 'YES' end
  from pg_catalog.pg_attribute a
  where a.attrelid = tbl_oid and a.attnum > 0 and not a.attisdropped
  order by a.attnum;
end;
$$;

create or replace function public.list_foreign_keys(qualified_tname text)
returns table(
  constraint_name text,
  column_name text,
  foreign_table text,
  foreign_column text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  p_schema text;
  p_tname text;
begin
  if position('.' in qualified_tname) > 0 then
    p_schema := split_part(qualified_tname, '.', 1);
    p_tname := split_part(qualified_tname, '.', 2);
  else
    p_schema := 'public';
    p_tname := qualified_tname;
  end if;
  return query
  select
    tc.constraint_name::text,
    kcu.column_name::text,
    (ccu.table_schema || '.' || ccu.table_name)::text as foreign_table,
    ccu.column_name::text as foreign_column
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = p_schema and tc.table_name = p_tname
  order by tc.constraint_name, kcu.ordinal_position;
end;
$$;

-- اجرای فقط کوئری SELECT (حداکثر ۵۰۰ رکورد) برای نمایش نتایج آنلاین در ابزار SQL
create or replace function public.exec_read_only_query(query_text text)
returns setof json
language plpgsql
security definer
set search_path = public
as $$
declare
  q text;
  limited text;
begin
  q := trim(query_text);
  if q = '' or upper(left(q, 6)) <> 'SELECT' then
    raise exception 'فقط کوئری SELECT مجاز است.';
  end if;
  if q ~ ';\s*$' then
    q := regexp_replace(q, ';\s*$', '');
  end if;
  limited := q || ' LIMIT 500';
  return query execute 'SELECT row_to_json(t) FROM (' || limited || ') AS t';
end;
$$;

grant execute on function public.list_public_tables() to anon, authenticated;
grant execute on function public.list_table_columns(text) to anon, authenticated;
grant execute on function public.list_foreign_keys(text) to anon, authenticated;
grant execute on function public.exec_read_only_query(text) to anon, authenticated;
