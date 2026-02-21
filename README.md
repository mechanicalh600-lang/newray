# رای‌نو (NewRay)

سیستم یکپارچه مدیریت نگهداری و تعمیرات، گزارشات، HSE و اداری. رابط کاربری فارسی و RTL.

## پیش‌نیازها

- Node.js (نسخه 18 یا بالاتر)
- پروژه Supabase (برای دیتابیس و احراز هویت)

## نصب و اجرا

1. وابستگی‌ها را نصب کنید:
   ```bash
   npm install
   ```

2. فایل محیطی را بسازید (از `.env.example` کپی کنید):
   ```bash
   cp .env.example .env.local
   ```

3. در `.env.local` مقادیر را پر کنید:
   - `VITE_SUPABASE_URL` — آدرس پروژه Supabase
   - `VITE_SUPABASE_ANON_KEY` — کلید anon از Supabase (Project Settings > API)
   - `VITE_GEMINI_API_KEY` — (اختیاری) برای دستیار هوشمند
   - `VITE_ERROR_INGEST_URL` — (اختیاری) آدرس ارسال خطا برای دیباگ
   - `VITE_BASE_URL` — مسیر پایه در دپلوی (مثلاً `/` یا `/app/`)

4. اسکیمای دیتابیس را در Supabase اجرا کنید:
   - محتوای `dbSchema.ts` را در SQL Editor اجرا کنید، یا
   - اسکریپت‌های داخل پوشه `supabase/migrations/` را به ترتیب اجرا کنید.

5. اپ را اجرا کنید:
   ```bash
   npm run dev
   ```

## اسکریپت‌ها

| دستور | توضیح |
|--------|--------|
| `npm run dev` | سرور توسعه |
| `npm run build` | بیلد تولید |
| `npm run preview` | پیش‌نمایش بیلد |
| `npm run deploy` | دپلوی روی GitHub Pages |
| `npm run build:liara` | بیلد برای استقرار روی لیارا |

## ساختار پروژه

- `App.tsx` — نقطه ورود اپ و روتینگ
- `contexts/AppContext.tsx` — وضعیت کاربر، تم، نشست و خروج خودکار
- `components/` — کامپوننت‌های مشترک (Layout، SmartTable، …)
- `pages/` — صفحات و ماژول‌ها
- `services/` — سرویس‌های گزارش، قالب و ترجیحات ستون
- `dbSchema.ts` — اسکیمای اولیه Supabase (مستند + قابل اجرا در SQL Editor)
- `supabase/migrations/` — مایگریشن‌های اضافه (ایندکس، جداول جدید و …)

## نسخه

نسخه فعلی در `constants.ts` تحت `APP_VERSION` تعریف شده است.
