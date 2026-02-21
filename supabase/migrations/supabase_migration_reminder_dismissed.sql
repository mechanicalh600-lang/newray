-- ستون برای «متوجه شدم» - یادداشت انجام نشده می‌ماند ولی دیگر آلارم نمی‌زند
-- این اسکریپت را در SQL Editor در Supabase اجرا کنید
ALTER TABLE public.personal_notes ADD COLUMN IF NOT EXISTS reminder_dismissed boolean DEFAULT false;
