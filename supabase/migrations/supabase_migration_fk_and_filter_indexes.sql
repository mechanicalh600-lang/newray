-- ایندکس‌های پیشنهادی بر اساس تحلیل معماری: FKها و ستون‌های فیلتر/جستجو
-- فقط ایندکس‌هایی که در migrations قبلی نبودند اضافه می‌شوند (IF NOT EXISTS)

-- ========== کارت‌های کار و دستور کار ==========
CREATE INDEX IF NOT EXISTS ix_work_orders_requester_id ON public.work_orders (requester_id);
CREATE INDEX IF NOT EXISTS ix_work_orders_equipment_id ON public.work_orders (equipment_id);
CREATE INDEX IF NOT EXISTS ix_work_orders_location_id ON public.work_orders (location_id);
CREATE INDEX IF NOT EXISTS ix_work_orders_status ON public.work_orders (status);
CREATE INDEX IF NOT EXISTS ix_work_orders_request_date ON public.work_orders (request_date);
CREATE INDEX IF NOT EXISTS ix_work_orders_tracking_code ON public.work_orders (tracking_code) WHERE tracking_code IS NOT NULL AND tracking_code <> '';
CREATE INDEX IF NOT EXISTS ix_work_orders_created_at ON public.work_orders (created_at DESC);

-- ========== برنامه نت (PM) ==========
CREATE INDEX IF NOT EXISTS ix_pm_plans_equipment_id ON public.pm_plans (equipment_id);
CREATE INDEX IF NOT EXISTS ix_pm_plans_is_active ON public.pm_plans (is_active) WHERE is_active = true;

-- ========== یادداشت‌های شخصی ==========
CREATE INDEX IF NOT EXISTS ix_personal_notes_user_id ON public.personal_notes (user_id);

-- ========== پروژه‌ها ==========
CREATE INDEX IF NOT EXISTS ix_projects_manager_id ON public.projects (manager_id);
CREATE INDEX IF NOT EXISTS ix_projects_status ON public.projects (status);

-- ========== درخواست قطعه و خرید ==========
CREATE INDEX IF NOT EXISTS ix_part_requests_requester_id ON public.part_requests (requester_id);
CREATE INDEX IF NOT EXISTS ix_part_requests_status ON public.part_requests (status);
CREATE INDEX IF NOT EXISTS ix_part_requests_tracking_code ON public.part_requests (tracking_code) WHERE tracking_code IS NOT NULL AND tracking_code <> '';

CREATE INDEX IF NOT EXISTS ix_purchase_requests_requester_id ON public.purchase_requests (requester_id);
CREATE INDEX IF NOT EXISTS ix_purchase_requests_status ON public.purchase_requests (status);

-- ========== BOM تجهیزات ==========
CREATE INDEX IF NOT EXISTS ix_equipment_boms_equipment_id ON public.equipment_boms (equipment_id);
CREATE INDEX IF NOT EXISTS ix_equipment_boms_part_id ON public.equipment_boms (part_id);

-- ========== گزارشات (اپراتور و قطعه) ==========
CREATE INDEX IF NOT EXISTS ix_lab_reports_operator_id ON public.lab_reports (operator_id);
CREATE INDEX IF NOT EXISTS ix_lab_reports_report_date ON public.lab_reports (report_date);

CREATE INDEX IF NOT EXISTS ix_warehouse_reports_part_id ON public.warehouse_reports (part_id);
CREATE INDEX IF NOT EXISTS ix_warehouse_reports_operator_id ON public.warehouse_reports (operator_id);
CREATE INDEX IF NOT EXISTS ix_warehouse_reports_report_date ON public.warehouse_reports (report_date);

CREATE INDEX IF NOT EXISTS ix_scale_reports_operator_id ON public.scale_reports (operator_id);
CREATE INDEX IF NOT EXISTS ix_scale_reports_report_date ON public.scale_reports (report_date);

-- ========== مجوز کار ==========
CREATE INDEX IF NOT EXISTS ix_work_permits_requester_id ON public.work_permits (requester_id);
CREATE INDEX IF NOT EXISTS ix_work_permits_equipment_id ON public.work_permits (equipment_id);
CREATE INDEX IF NOT EXISTS ix_work_permits_approver_id ON public.work_permits (approver_id);
CREATE INDEX IF NOT EXISTS ix_work_permits_status ON public.work_permits (status);

-- ========== تجهیزات (کلاس، گروه، محل) ==========
CREATE INDEX IF NOT EXISTS ix_equipment_class_id ON public.equipment (class_id);
CREATE INDEX IF NOT EXISTS ix_equipment_group_id ON public.equipment (group_id);
CREATE INDEX IF NOT EXISTS ix_equipment_location_id ON public.equipment (location_id);

-- ========== اعلان «متوجه شدم» ==========
CREATE INDEX IF NOT EXISTS ix_announcement_ack_user_id ON public.announcement_acknowledgments (user_id);
CREATE INDEX IF NOT EXISTS ix_announcement_ack_app_settings_id ON public.announcement_acknowledgments (app_settings_id);

-- ========== کارتابل (در صورت وجود جدول) ==========
-- فقط اگر جدول cartable_items وجود دارد اجرا می‌شود
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cartable_items') THEN
    CREATE INDEX IF NOT EXISTS ix_cartable_items_status ON public.cartable_items (status);
    CREATE INDEX IF NOT EXISTS ix_cartable_items_module ON public.cartable_items (module);
    CREATE INDEX IF NOT EXISTS ix_cartable_items_tracking_code ON public.cartable_items (tracking_code) WHERE tracking_code IS NOT NULL AND tracking_code <> '';
    CREATE INDEX IF NOT EXISTS ix_cartable_items_assignee_id ON public.cartable_items (assignee_id);
    CREATE INDEX IF NOT EXISTS ix_cartable_items_created_at ON public.cartable_items (created_at DESC);
  END IF;
END $$;

-- ========== گزارشات HSE ==========
CREATE INDEX IF NOT EXISTS ix_hse_reports_status ON public.hse_reports (status);
CREATE INDEX IF NOT EXISTS ix_hse_reports_type ON public.hse_reports (type) WHERE type IS NOT NULL;

-- ========== قطعات (واحد اندازه‌گیری) ==========
CREATE INDEX IF NOT EXISTS ix_parts_stock_unit_id ON public.parts (stock_unit_id) WHERE stock_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_parts_consumption_unit_id ON public.parts (consumption_unit_id) WHERE consumption_unit_id IS NOT NULL;
