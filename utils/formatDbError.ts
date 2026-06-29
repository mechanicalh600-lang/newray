/** پیام خطای قابل‌فهم برای خطاهای Supabase / API محلی */

export function formatDbError(err: unknown): string {
  if (!err) return 'خطای ناشناخته';

  if (typeof err === 'string') return err;

  const e = err as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    error_description?: string;
  };

  const parts = [e.message, e.details, e.hint, e.error_description].filter(Boolean);
  const msg = parts.join(' — ');

  if (
    !msg ||
    /fetch|network|failed to fetch|load failed|ECONNREFUSED|ECONNRESET|502|503|504|500|Internal Server Error|Unable to connect|NetworkError/i.test(
      msg
    )
  ) {
    return 'اتصال به پایگاه داده برقرار نیست. PostgreSQL و API محلی را اجرا کنید: npm run dev:stack (یا در دو ترمینال: npm run dev:local و npm run dev).';
  }

  return msg || 'خطای ناشناخته';
}
