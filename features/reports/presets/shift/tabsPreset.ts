import { ReportTabSchema } from '../../../../services/reportDefinitions';

/** ۹ تب گزارش شیفت — برای DynamicReportRuntime بدون وابستگی به ReportFormDesign */
export const SHIFT_TABS_PRESET: ReportTabSchema[] = [
  { id: 'tab-1', label: 'اطلاعات شیفت', color: '#2563eb', icon: 'users' },
  { id: 'tab-2', label: 'خوراک', color: '#16a34a', icon: 'factory' },
  { id: 'tab-3', label: 'بالمیل', color: '#059669', icon: 'door' },
  { id: 'tab-4', label: 'هیدروسیکلون', color: '#0d9488', icon: 'cpu' },
  { id: 'tab-5', label: 'درام مگنت', color: '#0891b2', icon: 'magnet' },
  { id: 'tab-6', label: 'فیلتر کنسانتره', color: '#6366f1', icon: 'filter' },
  { id: 'tab-7', label: 'تیکنر', color: '#0284c7', icon: 'droplets' },
  { id: 'tab-8', label: 'فیلتر بازیافت', color: '#78716c', icon: 'recycle' },
  { id: 'tab-9', label: 'توقفات و پمپ', color: '#d97706', icon: 'clock' },
];
