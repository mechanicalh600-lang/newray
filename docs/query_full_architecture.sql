-- کوئری گزارش کامل معماری دیتابیس (جداول، ستون‌ها و نوع، PK، FK، ایندکس)
-- در Supabase SQL Editor اجرا کنید و خروجی را کپی و در چت قرار دهید تا تحلیل شود.
-- خروجی: section, schema_name, table_name, name, info_1, info_2, info_3

SELECT * FROM (
  SELECT 'TABLE'::text AS section, t.table_schema AS schema_name, t.table_name AS table_name, ''::text AS name, ''::text AS info_1, ''::text AS info_2, ''::text AS info_3
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'

  UNION ALL

  SELECT 'COLUMN'::text, c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, COALESCE(LEFT(c.column_default::text, 80), '')
  FROM information_schema.columns c
  JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'

  UNION ALL

  SELECT 'PK'::text, tc.table_schema, tc.table_name, tc.constraint_name,
    (SELECT string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) FROM information_schema.key_column_usage kcu WHERE kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema),
    ''::text, ''::text
  FROM information_schema.table_constraints tc
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'

  UNION ALL

  SELECT 'FK'::text, tc.table_schema, tc.table_name, kcu.column_name,
    ccu.table_schema || '.' || ccu.table_name, ccu.column_name, tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'

  UNION ALL

  SELECT 'INDEX'::text, n.nspname::text, t.relname::text, i.relname::text,
    CASE WHEN ix.indisunique THEN 'UNIQUE' ELSE 'NONUNIQUE' END,
    CASE WHEN ix.indisprimary THEN 'PRIMARY' ELSE '' END,
    (SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_catalog.pg_attribute a WHERE a.attrelid = i.oid AND a.attnum > 0 AND NOT a.attisdropped)
  FROM pg_catalog.pg_index ix
  JOIN pg_catalog.pg_class i ON i.oid = ix.indexrelid
  JOIN pg_catalog.pg_class t ON t.oid = ix.indrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relkind = 'r'
) sub
ORDER BY section, schema_name, table_name, name;
