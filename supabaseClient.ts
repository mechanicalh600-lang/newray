import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
  || (typeof window !== 'undefined' ? window.location.origin : '');
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/** Base URL for REST examples (e.g. Integration page). Empty when env is not set. */
export const supabaseRestBaseUrl = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/rest/v1`
  : '';

if (!supabaseConfigured) {
  console.warn(
    'VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را در .env.local تنظیم کنید. برای dev محلی: npm run dev:local و npm run dev'
  );
}

let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
  });
} catch (e) {
  console.warn('Supabase client init failed:', e);
  supabase = createClient(supabaseUrl, supabaseKey);
}
export { supabase };
