-- RPC برای اجرای کوئری سفارشی سلول ماتریس (فقط SELECT، مقدار تکی)
-- اجرا در Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_report_matrix_cell_value(query_sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF query_sql IS NULL OR trim(query_sql) = '' THEN
    RETURN '';
  END IF;
  IF query_sql !~* '^\s*SELECT\s+' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  IF query_sql ~* '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE)\s' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  EXECUTE query_sql INTO result;
  RETURN COALESCE(result::text, '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN '';
END;
$$;

-- Grant execute to authenticated and anon (for report forms)
GRANT EXECUTE ON FUNCTION public.get_report_matrix_cell_value(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_matrix_cell_value(text) TO anon;
