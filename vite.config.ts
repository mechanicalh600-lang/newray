
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
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/rest/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/storage/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/auth/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/pages/admin/AdminPanel') || id.includes('/pages/admin/adminConfig') || id.includes('/pages/admin/useAdminLogic')) return 'admin';
            if (id.includes('/features/reports/presets/shift/')) return 'shift-report';
            if (id.includes('/pages/reports/ReportFormDesign')) return 'report-design';
            if (id.includes('/pages/reports/ProductionReportTabs')) return 'production-tabs';
            if (id.includes('/workflowStore')) return 'workflow-store';
            if (id.includes('/services/reportDefinitions')) return 'report-definitions';
            if (id.includes('/config/adminMenu') || id.includes('/pages/admin/adminConfig')) return 'admin-menu';
            if (id.includes('/dbSchema')) return 'db-schema';
            return undefined;
          }
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('exceljs') || id.includes('/xlsx/')) return 'vendor-xlsx';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('@google/genai')) return 'vendor-ai';
          return 'vendor';
        },
      },
    },
  },
});
