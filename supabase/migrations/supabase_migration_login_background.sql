-- پس‌زمینه قابل تنظیم برای صفحه لاگین (Data URL یا URL تصویر)
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS login_background text;

COMMENT ON COLUMN public.app_settings.login_background IS 'تصویر پس‌زمینه صفحه ورود';
