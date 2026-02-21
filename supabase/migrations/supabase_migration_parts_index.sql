-- ایندکس برای بهبود کوئری موجودی انبار (مرتب‌سازی بر اساس نام)
CREATE INDEX IF NOT EXISTS ix_parts_name ON public.parts (name);
