-- ایندکس‌های بهینه‌ساز برای مدیریت اطلاعات پایه
-- این ایندکس‌ها کوئری‌های ORDER BY created_at و sort_order را سرعت می‌بخشند

-- تجهیزات
CREATE INDEX IF NOT EXISTS ix_equipment_created_at ON public.equipment (created_at DESC);

-- پرسنل
CREATE INDEX IF NOT EXISTS ix_personnel_created_at ON public.personnel (created_at DESC);

-- قطعات (name قبلاً در ix_parts_name هست)
CREATE INDEX IF NOT EXISTS ix_parts_created_at ON public.parts (created_at DESC);

-- گروه‌های قطعات
CREATE INDEX IF NOT EXISTS ix_part_categories_created_at ON public.part_categories (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_part_categories_parent ON public.part_categories (parent_id) WHERE parent_id IS NOT NULL;

-- کاربران سیستم
CREATE INDEX IF NOT EXISTS ix_app_users_created_at ON public.app_users (created_at DESC);

-- شاخص‌های ارزیابی
CREATE INDEX IF NOT EXISTS ix_evaluation_criteria_created_at ON public.evaluation_criteria (created_at DESC);

-- شیفت‌ها
CREATE INDEX IF NOT EXISTS ix_shifts_sort_order ON public.shifts (sort_order);

-- کلاس‌ها و گروه‌های تجهیزات
CREATE INDEX IF NOT EXISTS ix_equipment_classes_created_at ON public.equipment_classes (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_equipment_groups_created_at ON public.equipment_groups (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_equipment_groups_class ON public.equipment_groups (class_id);

-- چارت سازمانی
CREATE INDEX IF NOT EXISTS ix_org_chart_created_at ON public.org_chart (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_org_chart_parent ON public.org_chart (parent_id) WHERE parent_id IS NOT NULL;

-- محل‌های استقرار
CREATE INDEX IF NOT EXISTS ix_locations_created_at ON public.locations (created_at DESC);
