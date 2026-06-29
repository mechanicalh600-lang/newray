import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Monitor,
  Clipboard,
  FlaskConical,
  Scale,
  Factory,
  Warehouse,
  HardHat,
  PieChart,
  FileSpreadsheet,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Wrench,
  Users,
  CalendarRange,
  BarChart3,
  Package,
  Truck,
  Hammer,
  Award,
  Bell,
  Building2,
  Layers,
  Target,
  ClipboardCheck,
} from 'lucide-react';

/** آیکون‌های قابل انتخاب برای ماژول گزارش */
export const REPORT_MODULE_ICON_OPTIONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'filetext', label: 'سند', Icon: FileText },
  { id: 'monitor', label: 'مانیتور', Icon: Monitor },
  { id: 'clipboard', label: 'کلیپبورد', Icon: Clipboard },
  { id: 'flask', label: 'آزمایشگاه', Icon: FlaskConical },
  { id: 'scale', label: 'ترازو', Icon: Scale },
  { id: 'factory', label: 'کارخانه', Icon: Factory },
  { id: 'warehouse', label: 'انبار', Icon: Warehouse },
  { id: 'hardhat', label: 'ایمنی', Icon: HardHat },
  { id: 'piechart', label: 'نمودار', Icon: PieChart },
  { id: 'spreadsheet', label: 'جدول', Icon: FileSpreadsheet },
  { id: 'graduation', label: 'آموزش', Icon: GraduationCap },
  { id: 'book', label: 'کتاب', Icon: BookOpen },
  { id: 'shield', label: 'HSE', Icon: ShieldCheck },
  { id: 'wrench', label: 'تعمیرات', Icon: Wrench },
  { id: 'users', label: 'پرسنل', Icon: Users },
  { id: 'calendar', label: 'تقویم', Icon: CalendarRange },
  { id: 'chart', label: 'آمار', Icon: BarChart3 },
  { id: 'package', label: 'کالا', Icon: Package },
  { id: 'truck', label: 'حمل', Icon: Truck },
  { id: 'hammer', label: 'خدمات', Icon: Hammer },
  { id: 'award', label: 'عملکرد', Icon: Award },
  { id: 'bell', label: 'اعلان', Icon: Bell },
  { id: 'building', label: 'ساختمان', Icon: Building2 },
  { id: 'layers', label: 'لایه‌ها', Icon: Layers },
  { id: 'target', label: 'هدف', Icon: Target },
  { id: 'checklist', label: 'چک‌لیست', Icon: ClipboardCheck },
];

const ICON_MAP = new Map(REPORT_MODULE_ICON_OPTIONS.map(o => [o.id, o.Icon]));

export function resolveReportModuleIcon(iconId?: string | null): LucideIcon {
  return ICON_MAP.get(String(iconId || 'filetext').toLowerCase()) || FileText;
}

export function getReportModuleIconLabel(iconId?: string | null): string {
  return REPORT_MODULE_ICON_OPTIONS.find(o => o.id === iconId)?.label || 'سند';
}
