-- مایگریشن: افزودن ستون WBS (ساختار شکست کار) به جدول projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wbs jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN projects.wbs IS 'ساختار شکست کار (Work Breakdown Structure) - آرایه‌ای از آیتم‌ها با id, code, title, parentId, order';
