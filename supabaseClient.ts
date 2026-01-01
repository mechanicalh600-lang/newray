
import { createClient } from '@supabase/supabase-js';

// --- 1. Define Fallbacks (Default values to prevent crashes) ---
// These are used if environment variables are missing or undefined.
// Please update these with your actual Supabase credentials if .env is failing.
const DEFAULT_URL = "https://krgznynrljnvxwhvsdxj.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3pueW5ybGpudnh3aHZzZHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzI3MzMsImV4cCI6MjA4MTkwODczM30.OUjiO0YpbSHSfD9gQ6T6RugFNdGPvJPhMzTQBkbgI5c"; 

// --- 2. Safe Environment Variable Access ---
// This function ensures we never crash even if import.meta.env is undefined.
function getEnv(key: string): string | undefined {
  try {
    // Check if 'import.meta' exists and has 'env' property before accessing
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (err) {
    console.warn(`Error accessing environment variable ${key}:`, err);
  }
  return undefined;
}

// --- 3. Resolve Credentials ---
const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Priority: Environment Variable > Hardcoded Fallback
const supabaseUrl = envUrl || DEFAULT_URL;
const supabaseKey = envKey || DEFAULT_KEY;

// --- 4. Initialize Client ---
if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.warn("Supabase Client Warning: Missing or invalid URL/Key. Connection may fail.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);
