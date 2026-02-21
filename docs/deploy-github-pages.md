# دیپلوی روی GitHub Pages و اتصال به دیتابیس

برای اینکه نسخهٔ منتشرشده روی GitHub Pages به Supabase متصل باشد، باید **متغیرهای محیطی** در زمان بیلد تنظیم شوند. چون فایل `.env` در مخزن نیست، از **Secrets** مخزن استفاده می‌کنیم.

---

## مراحل

### ۱) گرفتن آدرس و کلید از Supabase

1. وارد [Supabase Dashboard](https://supabase.com/dashboard) شوید و پروژه را باز کنید.
2. بروید به **Project Settings** (آیکن چرخ‌دنده) → **API**.
3. این دو مقدار را کپی کنید:
   - **Project URL** (مثال: `https://abcdefgh.supabase.co`)
   - **anon public** (کلید عمومی؛ زیر Project API keys)

### ۲) اضافه کردن Secrets در GitHub

1. مخزن **newray** را در GitHub باز کنید.
2. بروید به **Settings** → **Secrets and variables** → **Actions**.
3. روی **New repository secret** کلیک کنید و دو مخفی بسازید:

| Name | Value |
|------|--------|
| `SUPABASE_URL` | همان Project URL از Supabase (بدون اسلش آخر) |
| `SUPABASE_ANON_KEY` | همان کلید **anon public** |

### ۳) اجرای دوبارهٔ workflow

- یا یک **commit خالی** به شاخهٔ `main` push کنید تا workflow دوباره اجرا شود.
- یا بروید به تب **Actions** → آخرین run را باز کنید → **Re-run all jobs**.

بعد از اتمام بیلد، نسخهٔ منتشرشده در آدرس زیر با دیتابیس Supabase در ارتباط خواهد بود:

**https://mechanicalh600-lang.github.io/newray/**

---

## نکته

اگر این دو Secret را اضافه نکنید، بیلد باز هم موفق می‌شود ولی در محیط منتشرشده اتصال به دیتابیس برقرار نمی‌شود (مقادیر خالی در بیلد استفاده می‌شوند).
