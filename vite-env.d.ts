
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_API_KEY: string;
  BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
