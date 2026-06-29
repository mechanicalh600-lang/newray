-- تکمیل get_next_tracking_code + RLS برای messages/personal_notes
-- اجرا پس از migrationهای phase2 و missions

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
  IF last_code IS NULL AND prefix_input = 'HSE' THEN
    SELECT tracking_code INTO last_code FROM hse_reports ORDER BY tracking_code DESC LIMIT 1;
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

-- personal_notes: اپ auth.uid() ندارد
ALTER TABLE public.personal_notes DISABLE ROW LEVEL SECURITY;

-- messages: RLS فعال بود ولی policy نداشت
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_anon_all'
  ) THEN
    CREATE POLICY messages_anon_all ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.report_control_room IS
  'Legacy wide schema for form builder; app uses control_room_reports (full_data jsonb). Kept for compatibility.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personnel_missions, public.factory_goods_exits, public.service_repair_requests TO anon, authenticated;
