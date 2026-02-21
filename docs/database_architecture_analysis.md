# تحلیل معماری دیتابیس (ساختار، کلیدهای خارجی، ایندکس، نوع فیلد)

بر اساس خروجی کوئری گزارش معماری و اسکیمای پروژه.

---

## ۱. نقشهٔ کلیدهای خارجی (FK)

جداول و ستون‌هایی که به جدول دیگر ارجاع می‌دهند:

| جدول مبدأ | ستون FK | جدول مقصد | ستون مقصد | حذف (ON DELETE) |
|-----------|---------|-----------|-----------|------------------|
| work_orders | requester_id | app_users | id | (default) |
| work_orders | equipment_id | equipment | id | (default) |
| work_orders | location_id | locations | id | (default) |
| pm_plans | equipment_id | equipment | id | (default) |
| shift_reports | supervisor_id | app_users | id | (default) |
| report_records | definition_id | report_definitions | id | CASCADE |
| personal_notes | user_id | app_users | id | (default) |
| projects | manager_id | personnel | id | (default) |
| part_requests | requester_id | app_users | id | (default) |
| purchase_requests | requester_id | app_users | id | (default) |
| equipment_boms | equipment_id | equipment | id | CASCADE |
| equipment_boms | part_id | parts | id | CASCADE |
| lab_reports | operator_id | app_users | id | (default) |
| warehouse_reports | part_id | parts | id | (default) |
| warehouse_reports | operator_id | app_users | id | (default) |
| scale_reports | operator_id | app_users | id | (default) |
| personnel_skills | personnel_id | personnel | id | CASCADE |
| evaluation_criteria | org_unit_id | org_chart | id | SET NULL |
| performance_evaluations | personnel_id | personnel | id | SET NULL |
| technical_suggestions | user_id | app_users | id | (default) |
| meeting_minutes | (بدون FK) | — | — | — |
| work_permits | requester_id | app_users | id | (default) |
| work_permits | equipment_id | equipment | id | (default) |
| work_permits | approver_id | app_users | id | (default) |
| personnel | org_unit_id | org_chart | id | (default) |
| parts | stock_unit_id | measurement_units | id | (default) |
| parts | consumption_unit_id | measurement_units | id | (default) |
| announcement_acknowledgments | user_id | app_users | id | CASCADE |
| announcement_acknowledgments | app_settings_id | app_settings | id | CASCADE |
| user_column_preferences | user_id | app_users | id | CASCADE |
| equipment | class_id | equipment_classes | id | (default) |
| equipment | group_id | equipment_groups | id | (default) |
| equipment | location_id | locations | id | (default) |
| equipment_groups | class_id | equipment_classes | id | (default) |
| checklist_items | activity_card_id | activity_cards | id | (در DB) |

**خلاصه:** هستهٔ ارجاعات حول `app_users`, `equipment`, `personnel`, `parts`, `org_chart`, `report_definitions` است. زنجیره‌های اصلی: equipment → equipment_groups → equipment_classes؛ work_orders / pm_plans / work_permits → equipment و app_users.

---

## ۲. پوشش ایندکس روی ستون‌های FK و فیلتر

PostgreSQL برای هر **PRIMARY KEY** و **UNIQUE** خودش ایندکس می‌سازد؛ برای **Foreign Key** به‌طور پیش‌فرض ایندکس نمی‌سازد. JOIN و حذف/به‌روزرسانی روی جدول والد روی ستون FK در جدول فرزند انجام می‌شود؛ بدون ایندکس در جداول بزرگ کند می‌شود.

### ایندکس‌های موجود (از migrations)

- **report_records:** definition_id, report_date, created_at  
- **shift_reports:** shift_date, shift_type, created_at, supervisor_id  
- **production_reports:** report_date, created_at  
- **control_room_reports:** report_date, shift, created_at  
- **report_control_room:** report_date, created_at  
- **report_definitions:** is_active, updated_at  
- **equipment:** created_at  
- **equipment_groups:** created_at, class_id  
- **equipment_classes:** created_at  
- **personnel:** created_at  
- **personnel_skills:** personnel_id, skill_name, level  
- **performance_evaluations:** personnel_id, period  
- **parts:** name, created_at  
- **part_categories:** created_at, parent_id  
- **app_users:** created_at  
- **org_chart:** created_at, parent_id  
- **locations:** created_at  
- **shifts:** sort_order  
- **evaluation_criteria:** created_at  
- **coding_formats:** linked_to, sort_order  
- **technical_suggestions:** tracking_code, status, created_at  
- **meeting_minutes:** meeting_date, created_at  
- **data_change_audit:** table_name, changed_at, record_id  
- **user_column_preferences:** user_id, page_key  

### FKهایی که ایندکس صریح ندارند (پیشنهاد برای اضافه کردن)

| جدول | ستون FK | دلیل |
|------|---------|------|
| work_orders | requester_id | JOIN با app_users، فیلتر بر اساس درخواست‌دهنده |
| work_orders | equipment_id | JOIN با equipment، فیلتر دستور کار هر تجهیز |
| work_orders | location_id | فیلتر بر اساس محل |
| pm_plans | equipment_id | لیست برنامه‌های هر تجهیز |
| personal_notes | user_id | لیست یادداشت‌های هر کاربر |
| projects | manager_id | لیست پروژه‌های هر مدیر |
| part_requests | requester_id | کارتابل درخواست‌ها |
| purchase_requests | requester_id | کارتابل درخواست خرید |
| equipment_boms | equipment_id, part_id | JOIN و لیست BOM |
| lab_reports | operator_id | گزارش‌های هر اپراتور |
| warehouse_reports | part_id, operator_id | فیلتر و JOIN |
| scale_reports | operator_id | گزارش‌های هر اپراتور |
| work_permits | requester_id, equipment_id, approver_id | کارتابل و فیلتر |
| equipment | class_id, group_id, location_id | فیلتر تجهیز بر اساس کلاس/گروه/محل |
| parts | stock_unit_id, consumption_unit_id | در صورت استفاده در گزارش/فیلتر |
| announcement_acknowledgments | user_id, app_settings_id | چک کردن «متوجه شدم» |

### ستون‌های فیلتر/جستجو بدون ایندکس (پیشنهاد)

| جدول | ستون | کاربرد |
|------|------|--------|
| work_orders | status | فیلتر وضعیت (داشبورد، لیست) |
| work_orders | request_date | فیلتر بازهٔ زمانی |
| work_orders | tracking_code | جستجو با کد (در صورت نبود UNIQUE) |
| cartable_items | status, module, tracking_code | کارتابل و جستجو |
| part_requests | status, tracking_code | لیست و جستجو |
| purchase_requests | status | لیست |
| projects | status | لیست |
| hse_reports | status, type | لیست و فیلتر |
| report_records | tracking_code | در صورت جستجوی مکرر |

---

## ۳. نوع فیلدها و یکدستی

- **شناسه:** همهٔ جداول دیده‌شده `id uuid` با `gen_random_uuid()` — یکدست و مناسب Supabase.  
- **تاریخ/زمان:** در اکثر جداول `created_at timestamptz` با `now()`؛ در بسیاری از گزارش‌ها `report_date`, `request_date`, `meeting_date` و غیره به‌صورت `text` است. برای فیلتر و ایندکس بهتر است در نسخهٔ بعد به `date` یا `timestamptz` مهاجرت داده شود.  
- **وضعیت و کد:** فیلدهای `status`, `tracking_code`, `work_type`, `priority` و مشابه عمدتاً `text` و بدون جدول Lookup؛ برای یکپارچگی و گزارش می‌توان جدول مرجع یا CHECK constraint تعریف کرد.  
- **Denormalization:** ستون‌هایی مثل `requester_name`, `equipment_name`, `supervisor_name` در کنار FK برای نمایش و گزارش وجود دارد؛ منطقی است ولی باید در اپ یا تریگر با منبع (app_users, equipment و غیره) همگام نگه داشته شوند.

---

## ۴. جمع‌بندی و اولویت‌ها

| موضوع | وضعیت | اقدام پیشنهادی |
|--------|--------|-----------------|
| ساختار FK | خوب | نگه داشتن و مستند کردن (همین سند). |
| ایندکس روی FK | ناقص | اضافه کردن ایندکس برای FKهای لیست‌شده در بخش ۲ (مigration جدا). |
| ایندکس روی فیلتر/جستجو | ناقص | اضافه کردن ایندکس برای status و تاریخ و tracking_code در جداول پرکاربرد. |
| نوع تاریخ | ناهمگون | در بلندمدت تبدیل ستون‌های تاریخ متنی به date/timestamptz. |
| View | ندارد | تعریف View برای داشبوردها و گزارش‌های ثابت. |

فایل migration پیشنهادی برای ایندکس‌های FK و فیلتر در ادامه اضافه می‌شود.
