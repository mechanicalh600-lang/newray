# ماژول گزارش‌ها (`features/reports`)

## چرا `shiftReport` داخل `pages/` نیست؟

| پوشه | نقش |
|------|-----|
| **`pages/`** | فقط **صفحات مسیری** (Route) — چیزی که در `App.tsx` با URL باز می‌شود |
| **`features/reports/`** | **منطق و UI مشترک** گزارش — توسط چند صفحه import می‌شود |
| **`components/`** | اجزای UI **عمومی** (جدول، date picker، …) |
| **`services/`** | ارتباط با DB و API |

`presets/shift/` یک **صفحه** نیست؛ ماژول تخصصی گزارش شیفت است که در `ShiftHandover`، `ReportFormDesign`، `DynamicReportRuntime` و … استفاده می‌شود.

---

## معماری JSON (آینده‌نگر)

```
report_definitions (PostgreSQL)
├── form_schema   → JSON: fields, tabs, groups, renderer
├── list_schema   → JSON: ستون‌های لیست
├── template_schema → JSON: قالب چاپ (طراحی قالب گزارش)
└── report_records.payload → JSON: دادهٔ هر رکورد

services/reportDefinitions.ts  ← CRUD + types
services/dynamicReports.ts      ← ذخیره payload
services/reportTemplates.ts     ← قالب چاپ

features/reports/
├── engine/resolveFormRenderer.ts  ← انتخاب موتور رندر
├── presets/shift/                 ← UI legacy شیفت (تا مهاجرت کامل)
pages/reports/
├── ReportFormDesign.tsx           ← طراحی فرم (admin)
├── ReportTemplateDesign.tsx       ← طراحی قالب چاپ
└── DynamicReportRuntime.tsx       ← اجرای گزارش برای کاربر
```

### موتورهای رندر (`form_schema.renderer`)

| مقدار | UI | کاربرد |
|--------|-----|--------|
| `dynamic` | `DynamicFormRenderer` | **مسیر اصلی** — هر گزارش جدید از JSON |
| `shift_preset` | `ShiftReportFormContent` | گزارش شیفت فعلی (legacy) |
| *(خالی)* | auto-detect | اگر ۹ تب شیفت باشد → shift_preset |

گزارش‌های جدیدی که در «طراحی فرم گزارش» می‌سازید باید `renderer: "dynamic"` داشته باشند (پیش‌فرض).

---

## مسیر مهاجرت

1. **الان:** شیفت = preset + JSON در `report_definitions` (هر دو)
2. **بعد:** گزارش‌های مشابه شیفت فقط با `DynamicFormRenderer` + JSON
3. **آخر:** حذف `presets/shift/` وقتی همه فیلدها در schema پوشش داده شد
