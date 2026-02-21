import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase: VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را در پنل لیارا (متغیرهای محیطی) تنظیم کنید و **یک بار استقرار مجدد** انجام دهید تا بیلد با مقادیر جدید انجام شود."
  );
}
if (supabaseKey && supabaseKey.length < 100) {
  console.warn("Supabase: به نظر می‌رسد VITE_SUPABASE_ANON_KEY ناقص است. کلید کامل را از Supabase > Project Settings > API کپی کنید.");
}

let supabase: SupabaseClient;
try {
  supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
    }
  );
} catch (e) {
  console.warn('Supabase client init failed:', e);
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}
export { supabase };
