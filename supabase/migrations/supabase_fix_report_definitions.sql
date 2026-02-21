-- اجرای این فایل در Supabase SQL Editor برای اطمینان از ساختار صحیح جدول report_definitions
-- Run this in Supabase SQL Editor to ensure report_definitions table has correct structure

-- حذف جدول قبلی و ساخت مجدد (داده‌های قبلی پاک می‌شود!)
-- DROP TABLE IF EXISTS report_records CASCADE;
-- DROP TABLE IF EXISTS report_definitions CASCADE;

-- یا برای حفظ داده‌ها، فقط ستون‌های缺少 را اضافه کنید
-- Alternatively, add missing columns without dropping:

-- ایجاد جدول در صورت عدم وجود
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'گزارشات',
  is_active boolean NOT NULL DEFAULT true,
  form_schema jsonb NOT NULL DEFAULT '{"tabs":[],"fields":[],"groups":[],"sections":[]}'::jsonb,
  list_schema jsonb NOT NULL DEFAULT '{"columns":[]}'::jsonb,
  template_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_source jsonb NOT NULL DEFAULT '{"mode":"generic","table":"report_records"}'::jsonb,
  version int NOT NULL DEFAULT 1,
  published_version int NOT NULL DEFAULT 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- اطمینان از وجود unique constraint روی slug (برای upsert)
CREATE UNIQUE INDEX IF NOT EXISTS ux_report_definitions_slug ON public.report_definitions(slug);

-- RLS و دسترسی
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_definitions_select_open ON public.report_definitions;
CREATE POLICY report_definitions_select_open ON public.report_definitions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS report_definitions_insert_open ON public.report_definitions;
CREATE POLICY report_definitions_insert_open ON public.report_definitions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS report_definitions_update_open ON public.report_definitions;
CREATE POLICY report_definitions_update_open ON public.report_definitions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.report_definitions TO anon, authenticated;
