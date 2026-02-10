
import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials for development as requested
const supabaseUrl = 'https://krgznynrljnvxwhvsdxj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3pueW5ybGpudnh3aHZzZHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzI3MzMsImV4cCI6MjA4MTkwODczM30.OUjiO0YpbSHSfD9gQ6T6RugFNdGPvJPhMzTQBkbgI5c';

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase Configuration Missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env file.");
}

// Create client with better configuration for stability
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
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
