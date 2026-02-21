-- مایگریشن: ذخیره ترجیحات ستون‌های قابل نمایش برای هر کاربر در هر صفحه
-- این اسکریپت را در SQL Editor در Supabase اجرا کنید.

-- جدول ترجیحات ستون‌های قابل نمایش
CREATE TABLE IF NOT EXISTS user_column_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  page_key text NOT NULL,
  visible_column_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_user_column_prefs_user_page UNIQUE (user_id, page_key)
);

-- ایندکس برای جستجوی سریع
CREATE INDEX IF NOT EXISTS idx_user_column_prefs_user_id ON user_column_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_column_prefs_page_key ON user_column_preferences(page_key);

-- به‌روزرسانی خودکار updated_at
CREATE OR REPLACE FUNCTION update_user_column_preferences_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_user_column_preferences_updated ON user_column_preferences;
CREATE TRIGGER tr_user_column_preferences_updated
  BEFORE UPDATE ON user_column_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_column_preferences_updated_at();

-- RLS (اختیاری): اگر از Supabase Auth استفاده می‌کنید و app_users.id = auth.uid() است، این خطوط را اجرا کنید
-- ALTER TABLE user_column_preferences ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "user_column_preferences_all_own" ON user_column_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
