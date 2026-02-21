-- مایگریشن: فعال‌سازی دسترسی personal_notes برای اپ با احراز هویت سفارشی
-- برنامه از app_users استفاده می‌کند نه Supabase Auth، پس auth.uid() همیشه null است
-- و پالیسی‌های قبلی (user_id = auth.uid()) دسترسی INSERT/SELECT را مسدود می‌کنند.

-- گزینه ۱: غیرفعال کردن RLS (ساده‌ترین - برنامه با user_id در کوئری فیلتر می‌کند)
ALTER TABLE public.personal_notes DISABLE ROW LEVEL SECURITY;

-- گزینه ۲ (اختیاری): اگر می‌خواهید RLS فعال بماند، حذف پالیسی‌های قدیمی و اضافه کردن پالیسی برای anon:
-- DROP POLICY IF EXISTS "notes_owner_select" ON public.personal_notes;
-- DROP POLICY IF EXISTS "notes_owner_insert" ON public.personal_notes;
-- DROP POLICY IF EXISTS "notes_owner_update" ON public.personal_notes;
-- DROP POLICY IF EXISTS "notes_owner_delete" ON public.personal_notes;
-- CREATE POLICY "notes_anon_all" ON public.personal_notes FOR ALL TO anon USING (true) WITH CHECK (true);
