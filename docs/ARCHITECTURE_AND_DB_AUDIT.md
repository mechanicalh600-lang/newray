# معماری نرم‌افزار رای‌نو و گزارش ممیزی پایگاه داده

## ۱. ساختار پروژه

```
NewRay/
├── App.tsx, index.tsx, routes.tsx    # نقطه ورود و روتینگ
├── components/                       # کامپوننت‌های مشترک
│   ├── Layout.tsx                   # لایه اصلی + سایدبار
│   ├── DataPage.tsx                 # قالب صفحه لیست + اکشن‌ها
│   ├── SmartTable.tsx               # جدول با فیلتر، مرتب‌سازی، انتخاب
│   ├── DynamicFormRenderer.tsx      # رندر فرم‌های داینامیک
│   ├── ReportRouteResolver.tsx      # رزولور مسیر گزارشات (داینامیک vs پیش‌فرض)
│   └── ...
├── pages/                           # صفحات اصلی
│   ├── Dashboard.tsx               # داشبورد
│   ├── Reports.tsx                 # گزارش‌ساز پویا
│   ├── DynamicReportRuntime.tsx    # رانتایم فرم داینامیک
│   ├── ReportFormDesign.tsx        # طراحی فرم گزارش
│   ├── ShiftHandover.tsx           # گزارشات شیفت
│   ├── ControlRoomReport.tsx       # گزارشات اتاق کنترل (fallback)
│   ├── WarehouseReport.tsx         # گزارشات انبار
│   └── admin/                      # پنل ادمین
├── services/
│   ├── reportDefinitions.ts       # CRUD تعاریف گزارش
│   ├── dynamicReports.ts           # رکوردهای گزارش داینامیک
│   ├── reportTemplates.ts         # قالب‌های چاپ
│   └── userColumnPreferences.ts   # ذخیره ستون‌های انتخابی کاربر
├── workflowStore.ts                # دستورکار، شیفت، پیام‌ها
├── supabaseClient.ts               # اتصال Supabase
├── dbSchema.ts                     # شِمای SQL (اجرا در Supabase)
└── scripts/
    └── database_health_check.sql   # کوئری سلامت دیتابیس
```

---

## ۲. معماری داده

### ۲.۱ بک‌اند
- **Supabase (PostgreSQL)** برای دیتا، احراز هویت (اختیاری)، Storage
- **RLS** روی جداول با پالیسی باز (anon/authenticated) برای سادگی MVP
- توابع `get_next_tracking_code` و `get_next_shift_code_from_prefix` برای تولید کد

### ۲.۲ جریان گزارشات
1. **ReportRouteResolver** با مسیر (مثلاً `/control-room`) لود می‌شود.
2. `getReportDefinitionByModulePath(path)` تعریف فعالی که `template_schema.modulePath === path` دارد را پیدا می‌کند.
3. اگر پیدا شد → **DynamicReportRuntime** با همان تعریف.
4. اگر نیامد → کامپوننت Fallback (مثل `ControlRoomReport`).

### ۲.۳ جداول کلیدی

| جدول | کاربرد |
|------|--------|
| `app_settings` | تنظیمات سازمان، لوگو، زمان قطع نشست |
| `app_users` | کاربران و نقش‌ها |
| `coding_formats` | پیشوند کد و اتصال به منو |
| `report_definitions` | تعریف فرم‌های داینامیک |
| `report_records` | رکوردهای گزارشات داینامیک |
| `shift_reports` | گزارشات شیفت |
| `control_room_reports` | گزارشات اتاق کنترل (legacy) |
| `warehouse_reports` | گزارشات انبار |
| `work_orders` | دستور کارها |
| `cartable_items` | صندوق کار + منبع کد برای برخی ماژول‌ها |
| `system_logs` | لاگ سیستم |
| `data_change_audit` | ممیزی تغییرات |

---

## ۳. نقاط ضعف و پیشنهادها

### ۳.۱ امنیت
- **کلید Supabase** در کد (`supabaseClient.ts`) هاردکد است. برای production حتماً از متغیر محیطی استفاده شود.
- RLS روی اکثر جدول‌ها باز است (`USING (true)`). برای محیط واقعی پالیسی‌های محدودکننده لازم است.

### ۳.۲ داده
- جدول‌های `app_users`, `equipment`, `personnel` و ... در `dbSchema.ts` تعریف نشده‌اند؛ احتمالاً از migrationهای جدا یا Admin ساخته می‌شوند.
- `part_categories` در Inventory استفاده می‌شود؛ در admin سه جدول `part_categories_main/sub/sub_sub` هست. تطابق نام‌ها و سطوح را بررسی کنید.
- `cartable_items` در `get_next_tracking_code` و workflowStore استفاده می‌شود؛ در schema اصلی دیده نشد. باید حتماً وجود داشته باشد.

### ۳.۳ کد
- **کپی بودن پوشه `src/`** با `pages/` و `components/` در ریشه؛ احتمال تداخل و ناهماهنگی در تغییرات.
- fallback به localStorage در `reportDefinitions` وقتی Supabase خطا می‌دهد؛ برای چند کاربره مناسب نیست.

### ۳.۴ دیتابیس
- قبل از بهره‌برداری اجرای `scripts/database_health_check.sql` پیشنهاد می‌شود.
- جداول `system_logs` و `cartable_items` برای عملکرد برخی بخش‌ها الزامی‌اند.
- اگر migrationهای جداگانه دارید، ترتیب اجرای آن‌ها مهم است.

---

## ۴. چک‌لیست آماده‌سازی بهره‌برداری

- [ ] اجرای `database_health_check.sql` و رفع هشدارها
- [ ] حداقل یک رکورد در `app_settings`
- [ ] حداقل یک کاربر ادمین در `app_users`
- [ ] رکوردهای `coding_formats` برای مسیرهای اصلی گزارش
- [ ] تعریف (و در صورت نیاز انتشار) فرم‌های داینامیک در `report_definitions` با `modulePath` صحیح
- [ ] اطمینان از وجود `system_logs` و `cartable_items`
- [ ] انتقال کلید Supabase به `.env` و عدم commit آن
- [ ] بررسی و تست مسیرهای `/control-room`, `/shift-report`, `/warehouse-report` و سایر گزارشات
