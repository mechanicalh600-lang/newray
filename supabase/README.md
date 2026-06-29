# مایگریشن‌های Supabase / PostgreSQL

این پوشه شامل اسکریپت‌های SQL اضافه بر اسکیمای اصلی است.

## PostgreSQL لوکال (newray)

```powershell
# restore اولیه (یک بار)
.\scripts\restore-supabase-backup.ps1

# اعمال همه migrationها (به ترتیب نام فایل)
$env:POSTGRES_PASSWORD = '...'
.\scripts\apply-all-migrations.ps1

# بررسی سلامت schema
.\scripts\check-db-schema.ps1
```

## ترتیب اجرا (Supabase Cloud / دستی)

1. **اسکیمای پایه:** ابتدا محتوای فایل `dbSchema.ts` (در ریشه پروژه) را در SQL Editor اجرا کنید تا جداول و ساختار اولیه ساخته شود.

2. **مایگریشن‌ها:** سپس به‌صورت اختیاری اسکریپت‌های داخل `migrations/` را اجرا کنید. هر فایل را می‌توانید جداگانه در SQL Editor اجرا کنید. اگر جدول یا ستون از قبل وجود داشته باشد، معمولاً با `IF NOT EXISTS` یا `ADD COLUMN IF NOT EXISTS` خطا نمی‌گیرید.

## فایل‌های کلیدی

| فایل | هدف |
|------|-----|
| `supabase_migration_reports_phase2.sql` | `production_reports`, `control_room_reports` |
| `supabase_migration_missions_factory_exit_service_repair.sql` | مأموریت، خروج کالا، خدمات/تعمیرات |
| `supabase_migration_db_hardening.sql` | ایندکس FK، RLS delete، audit triggers |
| `supabase_migration_sync_tracking_codes_and_rls.sql` | تکمیل RPC کد رهگیری + RLS messages |

## نکات

- `supabase_verify_app_settings.sql` فقط یک کوئری SELECT است (بررسی تنظیمات)؛ برای ساخت جدول نیازی به آن نیست.
- `sql_data_change_audit.sql` جدول و تریگرهای audit را برای تغییرات داده اضافه می‌کند.
- جدول legacy `report_control_room` نگه داشته شده؛ اپ از `control_room_reports` استفاده می‌کند.
- در PostgreSQL ۱۱ و بالاتر تریگرها با `EXECUTE FUNCTION` تعریف شده‌اند؛ در نسخه‌های قدیمی‌تر در صورت خطا به `EXECUTE PROCEDURE` تغییر دهید.
