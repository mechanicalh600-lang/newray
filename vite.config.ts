
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  // استفاده از کلید ارائه شده توسط کاربر
  const apiKey = env.VITE_GOOGLE_API_KEY || "AIzaSyBbrl8wKH28MYJn0yx2AZO6fqQUyhlm-KI";
  
  return {
    plugins: [react()],
    base: '/Dastyar/', 
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', 'recharts'],
            'supabase': ['@supabase/supabase-js'],
            'genai': ['@google/genai']
          }
        }
      }
    }
  };
});
