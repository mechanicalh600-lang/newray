
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  // مسیر مطلق از ریشه تا سرور لیارا درست فایل‌های assets را سرو کند
  base: process.env.VITE_BASE_URL ?? '/', 
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  }
});
