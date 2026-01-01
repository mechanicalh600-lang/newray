
import { BarChart3, Wrench, Package, ClipboardCheck, Archive, Users, Settings, ShoppingCart, Lightbulb, FileSignature, Inbox, Briefcase, Award, GitMerge, ListChecks, MessageSquare, PieChart, Clipboard, Files, ChevronDown, StickyNote, Factory } from 'lucide-react';

export const APP_VERSION = "2.5.0";

export const MENU_ITEMS = [
  { id: 'dashboard', title: 'داشبورد', icon: BarChart3, path: '/' },
  { 
    id: 'reports-group', 
    title: 'گزارشات', 
    icon: Files, 
    path: '#', // Parent doesn't navigate directly usually, or redirects to first child
    submenu: [
      { id: 'shiftreport', title: 'گزارش شیفت', icon: Clipboard, path: '/shift-report' },
      { id: 'productionreport', title: 'گزارش تولید', icon: Factory, path: '/production-report' },
      { id: 'reports', title: 'گزارش‌ساز', icon: PieChart, path: '/reports' },
    ]
  },
  { id: 'inbox', title: 'کارتابل من', icon: Inbox, path: '/inbox' },
  { id: 'messages', title: 'پیام‌ها', icon: MessageSquare, path: '/messages' },
  { id: 'notes', title: 'یادداشت‌های من', icon: StickyNote, path: '/notes' },
  { id: 'workorders', title: 'دستور کارها', icon: Wrench, path: '/work-orders' },
  { id: 'projects', title: 'پروژه‌ها', icon: Briefcase, path: '/projects' },
  { id: 'performance', title: 'امتیاز عملکرد', icon: Award, path: '/performance' },
  { id: 'partrequest', title: 'درخواست قطعه', icon: Package, path: '/part-requests' },
  { id: 'inspections', title: 'برنامه نت', icon: ClipboardCheck, path: '/inspections' },
  { id: 'documents', title: 'اسناد فنی', icon: Archive, path: '/documents' },
  { id: 'meetings', title: 'صورتجلسات', icon: FileSignature, path: '/meetings' },
  { id: 'suggestions', title: 'پیشنهادات فنی', icon: Lightbulb, path: '/suggestions' },
  { id: 'purchases', title: 'درخواست خرید', icon: ShoppingCart, path: '/purchases' },
  { 
    id: 'system-settings', 
    title: 'تنظیمات نرم افزار', 
    icon: Settings, 
    path: '#', 
    role: 'ADMIN',
    submenu: [
      { id: 'admin', title: 'مدیریت اطلاعات پایه', icon: Users, path: '/admin' },
      { id: 'workflow', title: 'طراحی فرآیند', icon: GitMerge, path: '/workflow-designer' },
    ]
  },
  { id: 'settings', title: 'تنظیمات', icon: Settings, path: '/settings' },
];

export const MOCK_CHART_DATA = [
  { name: 'پمپ‌ها', value: 400 },
  { name: 'نوارنقاله‌ها', value: 300 },
  { name: 'سنگ‌شکن‌ها', value: 300 },
  { name: 'الکتروموتورها', value: 200 },
];

export const MOCK_LINE_DATA = [
  { name: 'فروردین', uv: 400, pv: 2400 },
  { name: 'اردیبهشت', uv: 300, pv: 1398 },
  { name: 'خرداد', uv: 200, pv: 9800 },
  { name: 'تیر', uv: 278, pv: 3908 },
  { name: 'مرداد', uv: 189, pv: 4800 },
  { name: 'شهریور', uv: 239, pv: 3800 },
];
