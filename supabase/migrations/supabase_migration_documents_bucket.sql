-- مایگریشن: ایجاد باکت Storage برای اسناد فنی
-- در Supabase: Dashboard > Storage > New Bucket
-- نام باکت: technical-documents
-- Public: بله (برای لینک مستقیم فایل‌ها)
-- File size limit: 10 MB
-- Allowed MIME: application/pdf, image/jpeg, image/png

-- یا اجرای دستی در SQL Editor (در صورت پشتیبانی):
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('technical-documents', 'technical-documents', true, 10485760, 
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])
ON CONFLICT (id) DO NOTHING;
*/
