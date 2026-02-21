-- ==========================================
-- کوئری بررسی تنظیمات نشست کاربری
-- اجرا در SQL Editor Supabase
-- ==========================================

-- بررسی مقدار فعلی نشست کاربری (همین مقدار برای همه کاربران اعمال می‌شود)
SELECT 
  id,
  org_name,
  session_timeout_minutes AS "مدت_نشست_دقیقه",
  created_at
FROM app_settings
ORDER BY created_at
LIMIT 1;

-- در صورت خالی بودن جدول، رکورد پیش‌فرض:
-- INSERT INTO app_settings (org_name, session_timeout_minutes)
-- SELECT 'شرکت توسعه معدنی و صنعتی صبانور', 5
-- WHERE NOT EXISTS (SELECT 1 FROM app_settings);

-- 5. به‌روزرسانی مدت نشست برای همه کاربران (مثال: ۱۰ دقیقه):
-- UPDATE app_settings 
-- SET session_timeout_minutes = 10 
-- WHERE id = (SELECT id FROM app_settings ORDER BY created_at LIMIT 1);
