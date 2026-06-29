# استقرار روی سرور داخلی کارخانه (شبکه LAN)

این سند برای نصب **بدون اینترنت** روی یک سرور Windows/Linux داخل کارخانه است.

## معماری

```
[مرورگر کاربران] ──LAN──► [Nginx/IIS :80]
                              ├── /          → فایل‌های static (dist/)
                              ├── /rest/v1   → API محلی (:3000)
                              └── /storage/v1 → فایل‌های آپلود (:3000)
                                    │
                                    ▼
                              [PostgreSQL :5432]
                              database: newray
```

## پیش‌نیاز روی سرور

| نرم‌افزار | نسخه پیشنهادی |
|-----------|----------------|
| Node.js | 20 LTS |
| PostgreSQL | 16+ (یا 18) |
| Nginx یا IIS | برای سرو static + reverse proxy |

---

## مرحله ۱ — دیتابیس (یک بار)

روی سروری که PostgreSQL نصب است:

```powershell
# بازیابی بکاپ (در صورت مهاجرت از Supabase)
$env:POSTGRES_PASSWORD = '...'
.\scripts\restore-supabase-backup.ps1

# اعمال migrationها
.\scripts\apply-all-migrations.ps1
.\scripts\check-db-schema.ps1
```

---

## مرحله ۲ — بیلد فرانت (روی سیستم دارای Node یا همان سرور)

فایل `.env.production` در ریشه پروژه:

```env
# آدرس عمومی سرور داخلی — همان چیزی که کاربران در مرورگر می‌زنند
VITE_SUPABASE_URL=http://192.168.1.50
VITE_SUPABASE_ANON_KEY=local-production-anon-key-change-me
VITE_INTERNAL_NETWORK=true
VITE_BASE_URL=/
# VITE_GEMINI_API_KEY=   ← خالی بماند (دستیار AI غیرفعال)
```

```powershell
npm ci
npm run build
```

خروجی: پوشه **`dist/`** — همین را روی سرور کپی کنید.

> فونت Vazirmatn داخل `public/fonts/` است و در بیلد داخل `dist/fonts/` کپی می‌شود — **نیازی به Google Fonts نیست.**

---

## مرحله ۳ — API محلی (همیشه روشن)

فایل `.env.local` یا متغیرهای محیطی سرویس:

```env
POSTGRES_PASSWORD=...
POSTGRES_DB=newray
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
LOCAL_API_PORT=3000
```

```powershell
node scripts/local-api-server.mjs
```

برای production از **PM2** (Linux) یا **NSSM / Task Scheduler** (Windows) استفاده کنید تا با ری‌استارت سرور بالا بیاید.

---

## مرحله ۴ — Nginx (نمونه)

فایل `scripts/nginx-internal.example.conf` را کپی و IP/مسیر `dist` را تنظیم کنید.

خلاصه:
- `root` → مسیر `dist`
- `try_files` برای SPA (HashRouter: معمولاً `index.html` کافی است)
- `proxy_pass` برای `/rest/v1`، `/storage/v1` و `/auth/v1` → `http://127.0.0.1:3000`

---

## مرحله ۵ — تست

```powershell
npm run db:smoke
```

از یک PC دیگر در LAN:
- `http://192.168.1.50/` → صفحه لاگین
- لاگین با کاربر `app_users`

---

## نکات امنیت (شبکه داخلی)

1. **PostgreSQL** فقط روی `127.0.0.1` گوش دهد (نه کل LAN).
2. پورت **3000** فقط از localhost در دسترس باشد؛ کاربران فقط پورت 80/443 را ببینند.
3. `VITE_SUPABASE_ANON_KEY` در بیلد embed می‌شود — برای LAN قابل قبول است؛ auth واقعی سمت سرور در نسخه‌های بعد.
4. **دستیار AI (Gemini)** بدون اینترنت کار نمی‌کند — با خالی گذاشتن `VITE_GEMINI_API_KEY` غیرفعال است.

---

## به‌روزرسانی نسخه

1. بکاپ PostgreSQL
2. `npm run build` با همان `.env.production`
3. جایگزینی `dist/`
4. `npm run db:migrate` در صورت migration جدید
5. ری‌استارت API
