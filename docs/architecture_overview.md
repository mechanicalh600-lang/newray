# نمای کلی معماری نرم‌افزار

## ورود و مسیریابی
- **ورود:** `index.html` → `index.tsx` → `App.tsx`
- **مسیریابی:** فقط داخل `App.tsx` با `react-router-dom` (HashRouter + Routes). همهٔ مسیرها و کامپوننت‌های صفحه در همین فایل تعریف شده‌اند.
- **لاگین:** صفحهٔ `/login`؛ بعد از لاگین به `/` (داشبورد) هدایت می‌شود. صفحات دیگر با شرط `user` محافظت شده‌اند.

## ساختار پوشه‌ها
- **`/components`** – کامپوننت‌های مشترک (Layout, SmartTable, ReportRouteResolver, SqlQueryBuilderModal و غیره)
- **`/pages`** – هر صفحهٔ اپ (Dashboard, WorkOrders, Reports و غیره). زیرپوشهٔ `admin` برای AdminPanel و AdminForms و تنظیمات ادمین
- **`/contexts`** – AppContext (وضعیت کاربر، اسپلش، دارک‌مود و …)، UserContext
- **`/services`** – reportDefinitions، reportTemplates، dynamicReports، userColumnPreferences
- **`/utils`** – توابع کمکی و گزارش
- **`/supabaseClient.ts`** – کلاینت Supabase
- **`/constants.ts`** – MENU_ITEMS (منوی سایدبار)، TABLE_LABELS و مقادیر ثابت
- **`/workflowStore.ts`** – وضعیت کارتابل و پیام

## منو و مسیرها
- منوی سایدبار از **`constants.ts`** → **`MENU_ITEMS`** می‌آید. هر آیتم `path` دارد (مثلاً `/work-orders`, `/reports`).
- این مسیرها باید با **مسیرهای تعریف‌شده در `App.tsx`** یکی باشند تا با کلیک روی منو به صفحهٔ درست برود.
- گزارش‌های پویا (تعریف‌شده در report_definitions) به صورت زیرمنو در همان گروه «گزارشات» از `getActiveReportDefinitions()` اضافه می‌شوند.

## گزارش‌های با مسیر ثابت
برای مسیرهایی مثل `/control-room`, `/shift-report`, `/production-report`, … از **`ReportRouteResolver`** استفاده می‌شود: اگر به آن مسیر یک «تعریف گزارش» منتشرشده وصل شده باشد، همان فرم پویا نمایش داده می‌شود؛ وگرنه کامپوننت پیش‌فرض (مثلاً ControlRoomReport، ShiftHandover).

## وابستگی‌های مهم
- **Layout** از `constants` (MENU_ITEMS)، `contexts/UserContext`، `workflowStore`، `services/reportDefinitions` استفاده می‌کند.
- **App** از `contexts/AppContext` و تمام صفحات را از `./pages/...` به صورت lazy بار می‌گیرد.
- هیچ پوشهٔ **`src`** در ریشهٔ پروژه استفاده نمی‌شود؛ همهٔ کد در ریشه (components، pages، …) است.

## نکته
- قبلاً فایل **`routes.tsx`** وجود داشت که استفاده نمی‌شد و با مسیریابی داخل `App.tsx` تداخل داشت؛ حذف شده است.
