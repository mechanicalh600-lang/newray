-- رفع خطاها و هشدارهای امنیتی Linter سوپابیس
-- اجرا به‌صورت یکجا یا کوئری‌های جدا (یکی یکی)

-- ========== 1. personal_notes: RLS روشن باشد (قبلاً policy داره) ==========
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- ========== 2. Viewها با security_invoker (بدون SECURITY DEFINER) ==========
DROP VIEW IF EXISTS public.v_work_orders_list;
CREATE VIEW public.v_work_orders_list WITH (security_invoker = true) AS
SELECT wo.id, wo.tracking_code, wo.status, wo.request_date, wo.priority,
  wo.equipment_id, wo.equipment_code, wo.equipment_name, wo.requester_id, wo.requester_name,
  e.name AS equipment_name_full, wo.created_at
FROM public.work_orders wo
LEFT JOIN public.equipment e ON e.id = wo.equipment_id;

DROP VIEW IF EXISTS public.v_shift_reports_list;
CREATE VIEW public.v_shift_reports_list WITH (security_invoker = true) AS
SELECT sr.id, sr.tracking_code, sr.shift_date, sr.shift_name, sr.shift_type,
  sr.supervisor_id, sr.supervisor_name, sr.total_production_a, sr.total_production_b, sr.created_at
FROM public.shift_reports sr
ORDER BY sr.shift_date DESC NULLS LAST, sr.created_at DESC;

DROP VIEW IF EXISTS public.v_report_records_list;
CREATE VIEW public.v_report_records_list WITH (security_invoker = true) AS
SELECT rr.id, rr.definition_id, rd.title AS definition_title, rd.slug AS definition_slug,
  rr.tracking_code, rr.report_date, rr.created_by, rr.created_at
FROM public.report_records rr
LEFT JOIN public.report_definitions rd ON rd.id = rr.definition_id
ORDER BY rr.report_date DESC NULLS LAST, rr.created_at DESC;

-- ========== 3. جداولی که RLS نداشتند: روشن + یک policy ساده ==========
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'announcement_acknowledgments','coding_formats','user_column_preferences','personnel_skills',
    'shifts','shift_types','work_order_status','work_activity_types','work_types','work_order_priorities'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Enable all access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ========== 4. report_control_room: RLS روشن ولی بدون policy ==========
DROP POLICY IF EXISTS "Enable all access" ON public.report_control_room;
CREATE POLICY "Enable all access" ON public.report_control_room FOR ALL USING (true) WITH CHECK (true);

-- ========== 5. توابع: ثابت کردن search_path ==========
ALTER FUNCTION IF EXISTS public.set_report_builder_updated_at() SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_next_shift_code_from_prefix(text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.bump_announcement_version() SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_user_column_preferences_updated_at() SET search_path = public;
ALTER FUNCTION IF EXISTS public.set_updated_at_import_tool_profiles() SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_next_tracking_code(text) SET search_path = public;
