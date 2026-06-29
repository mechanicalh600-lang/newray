-- DB hardening: indexes, tracking codes, RLS delete, grants, audit triggers
-- Idempotent — safe to re-run on newray

-- ========== 1. FK indexes still missing ==========
CREATE INDEX IF NOT EXISTS ix_app_users_personnel_id ON public.app_users (personnel_id);
CREATE INDEX IF NOT EXISTS ix_cartable_items_initiator_id ON public.cartable_items (initiator_id);
CREATE INDEX IF NOT EXISTS ix_checklist_items_activity_card_id ON public.checklist_items (activity_card_id);
CREATE INDEX IF NOT EXISTS ix_equipment_local_names_class_id ON public.equipment_local_names (class_id);
CREATE INDEX IF NOT EXISTS ix_equipment_local_names_group_id ON public.equipment_local_names (group_id);
CREATE INDEX IF NOT EXISTS ix_equipment_runtime_hours_created_by ON public.equipment_runtime_hours (created_by);
CREATE INDEX IF NOT EXISTS ix_equipment_tree_equipment_id ON public.equipment_tree (equipment_id);
CREATE INDEX IF NOT EXISTS ix_equipment_tree_parent_id ON public.equipment_tree (parent_id);
CREATE INDEX IF NOT EXISTS ix_locations_parent_id ON public.locations (parent_id);
CREATE INDEX IF NOT EXISTS ix_maintenance_plans_equipment_id ON public.maintenance_plans (equipment_id);
CREATE INDEX IF NOT EXISTS ix_meeting_minutes_creator_id ON public.meeting_minutes (creator_id);
CREATE INDEX IF NOT EXISTS ix_org_chart_manager_id ON public.org_chart (manager_id);
CREATE INDEX IF NOT EXISTS ix_org_chart_parent_id ON public.org_chart (parent_id);
CREATE INDEX IF NOT EXISTS ix_part_categories_parent_id ON public.part_categories (parent_id);
CREATE INDEX IF NOT EXISTS ix_part_request_items_part_id ON public.part_request_items (part_id);
CREATE INDEX IF NOT EXISTS ix_part_request_items_request_id ON public.part_request_items (request_id);
CREATE INDEX IF NOT EXISTS ix_part_requests_work_order_id ON public.part_requests (work_order_id);
CREATE INDEX IF NOT EXISTS ix_parts_category_id ON public.parts (category_id);
CREATE INDEX IF NOT EXISTS ix_performance_evaluations_evaluator_id ON public.performance_evaluations (evaluator_id);
CREATE INDEX IF NOT EXISTS ix_personnel_org_unit_id ON public.personnel (org_unit_id);
CREATE INDEX IF NOT EXISTS ix_project_attachments_project_id ON public.project_attachments (project_id);
CREATE INDEX IF NOT EXISTS ix_project_milestones_project_id ON public.project_milestones (project_id);
CREATE INDEX IF NOT EXISTS ix_project_objectives_project_id ON public.project_objectives (project_id);
CREATE INDEX IF NOT EXISTS ix_technical_suggestions_user_id ON public.technical_suggestions (user_id);
CREATE INDEX IF NOT EXISTS ix_personnel_missions_personnel_id ON public.personnel_missions (personnel_id);
CREATE INDEX IF NOT EXISTS ix_service_repair_requests_equipment_id ON public.service_repair_requests (equipment_id);

-- Query helpers
CREATE INDEX IF NOT EXISTS ix_shift_reports_supervisor_id ON public.shift_reports (supervisor_id);
CREATE INDEX IF NOT EXISTS ix_shift_reports_shift_date ON public.shift_reports (shift_date);
CREATE INDEX IF NOT EXISTS ix_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS ix_messages_receiver_id ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS ix_hse_reports_tracking_code ON public.hse_reports (tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_lab_reports_tracking_code ON public.lab_reports (tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_scale_reports_tracking_code ON public.scale_reports (tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_warehouse_reports_tracking_code ON public.warehouse_reports (tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_projects_tracking_code ON public.projects (tracking_code) WHERE tracking_code IS NOT NULL;

-- ========== 2. app_settings prefix columns ==========
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS control_room_prefix text DEFAULT 'CR-';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS production_report_prefix text DEFAULT 'PR-';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS lab_report_prefix_col text DEFAULT 'LAB-';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS scale_report_prefix_col text DEFAULT 'SC-';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS warehouse_report_prefix_col text DEFAULT 'WH-';

-- ========== 3. Complete tracking code generator ==========
CREATE OR REPLACE FUNCTION public.get_next_tracking_code(prefix_input text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  last_code text;
  next_num integer;
BEGIN
  SELECT tracking_code INTO last_code
  FROM cartable_items
  WHERE tracking_code LIKE prefix_input || '%'
  ORDER BY tracking_code DESC
  LIMIT 1;

  IF last_code IS NULL AND prefix_input = 'PTW' THEN
    SELECT tracking_code INTO last_code FROM work_permits ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input IN ('HSE', 'HSE-') THEN
    SELECT tracking_code INTO last_code FROM hse_reports WHERE tracking_code LIKE 'HSE%' ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'SUG' THEN
    SELECT tracking_code INTO last_code FROM technical_suggestions ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'MT' THEN
    SELECT tracking_code INTO last_code FROM meeting_minutes ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'PR' THEN
    SELECT tracking_code INTO last_code FROM part_requests ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'MIS' THEN
    SELECT tracking_code INTO last_code FROM personnel_missions ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'FEX' THEN
    SELECT tracking_code INTO last_code FROM factory_goods_exits ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'SRV' THEN
    SELECT tracking_code INTO last_code FROM service_repair_requests ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'CR-' THEN
    SELECT tracking_code INTO last_code FROM control_room_reports ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'PR-' THEN
    SELECT tracking_code INTO last_code FROM production_reports ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input IN ('LAB', 'LAB-') THEN
    SELECT tracking_code INTO last_code FROM lab_reports WHERE tracking_code LIKE 'LAB%' ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input IN ('SC-', 'SCL') THEN
    SELECT tracking_code INTO last_code FROM scale_reports WHERE tracking_code LIKE 'SC%' OR tracking_code LIKE 'SCL%' ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'WH-' THEN
    SELECT tracking_code INTO last_code FROM warehouse_reports WHERE tracking_code LIKE 'WH%' ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'PROJ' THEN
    SELECT tracking_code INTO last_code FROM projects WHERE tracking_code LIKE 'PROJ%' OR tracking_code LIKE 'P%' ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'WO' THEN
    SELECT tracking_code INTO last_code FROM work_orders ORDER BY tracking_code DESC LIMIT 1;
  END IF;
  IF last_code IS NULL AND prefix_input = 'T' THEN
    SELECT tracking_code INTO last_code FROM shift_reports WHERE tracking_code LIKE 'T%' ORDER BY tracking_code DESC LIMIT 1;
  END IF;

  IF last_code IS NULL THEN
    next_num := 1;
  ELSE
    BEGIN
      next_num := to_number(right(last_code, 4), '9999') + 1;
    EXCEPTION WHEN OTHERS THEN
      next_num := 1;
    END;
  END IF;

  RETURN prefix_input || lpad(next_num::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_tracking_code(text) TO anon, authenticated, service_role;

-- ========== 4. DELETE policies for tables missing them ==========
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.cmd = 'DELETE'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.cmd = 'ALL'
      )
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (true)',
        r.tbl || '_delete_open', r.tbl
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- equipment_runtime_hours: enable RLS with open policy (custom auth app)
ALTER TABLE public.equipment_runtime_hours ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'equipment_runtime_hours' AND policyname = 'equipment_runtime_hours_all'
  ) THEN
    CREATE POLICY equipment_runtime_hours_all ON public.equipment_runtime_hours
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ========== 5. Grants on all public tables + functions ==========
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', r.tablename);
  END LOOP;
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- ========== 6. Audit triggers on new operational tables ==========
DO $$
DECLARE
  t text;
  tables text[] := array[
    'production_reports', 'control_room_reports',
    'personnel_missions', 'factory_goods_exits', 'service_repair_requests',
    'equipment_runtime_hours', 'user_column_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_data_change()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ========== 7. production_reports / control_room_reports DELETE grant ==========
GRANT DELETE ON public.production_reports, public.control_room_reports TO anon, authenticated;
