-- مایگریشن: اعلان سراسری و ثبت «متوجه شدم»
-- این اسکریپت را در SQL Editor در Supabase اجرا کنید.

-- نسخه اعلان (برای نمایش مجدد هنگام تغییر متن)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS announcement_version integer DEFAULT 1;

-- جدول ثبت اعلام «متوجه شدم»
CREATE TABLE IF NOT EXISTS announcement_acknowledgments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  app_settings_id uuid NOT NULL REFERENCES app_settings(id) ON DELETE CASCADE,
  acknowledged_version integer NOT NULL DEFAULT 1,
  acknowledged_at timestamptz DEFAULT now(),
  CONSTRAINT uq_announcement_ack_user_settings UNIQUE (user_id, app_settings_id)
);

-- افزایش نسخه اعلان هنگام تغییر متن یا فعال/غیرفعال شدن
CREATE OR REPLACE FUNCTION bump_announcement_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.announcement_message IS DISTINCT FROM NEW.announcement_message)
     OR (OLD.announcement_active IS DISTINCT FROM NEW.announcement_active) THEN
    NEW.announcement_version := COALESCE(OLD.announcement_version, 0) + 1;
  ELSE
    NEW.announcement_version := OLD.announcement_version;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_app_settings_announcement_version ON app_settings;
CREATE TRIGGER tr_app_settings_announcement_version
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION bump_announcement_version();
