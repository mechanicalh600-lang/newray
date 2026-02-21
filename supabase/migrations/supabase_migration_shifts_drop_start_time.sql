-- حذف ستون ساعت شروع از جدول شیفت‌ها
alter table shifts drop column if exists start_time;
