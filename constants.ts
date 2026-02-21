
import { BarChart3, Wrench, Package, ClipboardCheck, Archive, Users, Settings, ShoppingCart, Lightbulb, FileSignature, Inbox, Briefcase, Award, GitMerge, ListChecks, MessageSquare, PieChart, Clipboard, Files, ChevronDown, StickyNote, Factory, CalendarRange, Monitor, FlaskConical, Warehouse, Scale, ShieldCheck, Cog, FileText, Timer, GraduationCap, LineChart, Database, BookOpen, LayoutDashboard, HardHat, List, FolderOpen, Sliders, LayoutTemplate, FileSpreadsheet, AlertTriangle, History, FormInput } from 'lucide-react';
import { TABLE_LABELS, EntityType } from './pages/admin/adminConfig';

export const APP_VERSION = "3.0.0";

const mk = (key: EntityType, icon: any) => ({ id: key, title: TABLE_LABELS[key], icon, path: `/admin/${key}` });

const adminSubmenu = [
  { id: 'admin-users', title: 'مدیریت کاربران', icon: FolderOpen, path: '#' as const, submenu: [mk('user_groups', Users), mk('app_users', Users)] as const },
  { id: 'admin-org', title: 'مدیریت سازمان', icon: FolderOpen, path: '#' as const, submenu: [mk('shifts', Factory), mk('shift_types', Factory), mk('personnel', Users), mk('org_chart', Factory), mk('locations', Factory), mk('evaluation_periods', Factory), mk('evaluation_criteria', Factory)] as const },
  { id: 'admin-equipment', title: 'مدیریت تجهیزات', icon: FolderOpen, path: '#' as const, submenu: [mk('equipment_classes', Wrench), mk('equipment_groups', Wrench), mk('equipment', Wrench), mk('equipment_local_names', Wrench), mk('equipment_tree', Wrench)] as const },
  { id: 'admin-parts', title: 'مدیریت قطعات', icon: FolderOpen, path: '#' as const, submenu: [mk('part_categories_main', Package), mk('part_categories_sub', Package), mk('part_categories_sub_sub', Package), mk('parts', Package), mk('measurement_units', Package)] as const },
  { id: 'admin-workorders', title: 'مدیریت دستور کارها', icon: FolderOpen, path: '#' as const, submenu: [mk('work_activity_types', ListChecks), mk('work_types', ListChecks), mk('work_order_priorities', ListChecks), mk('activity_cards', ListChecks), mk('checklist_items', ListChecks), mk('work_order_status', ListChecks), mk('maintenance_plans', ListChecks), mk('production_plans', ListChecks)] as const },
];

export const MENU_ITEMS = [
  { id: 'dashboard', title: 'داشبورد', icon: BarChart3, path: '/' },
  
  // --- Reports Group ---
  { 
    id: 'reports-group', 
    title: 'گزارشات', 
    icon: Files, 
    path: '#',
    submenu: [
      { id: 'control-room', title: 'گزارش اتاق کنترل', icon: Monitor, path: '/control-room' },
      { id: 'shiftreport', title: 'گزارش شیفت', icon: Clipboard, path: '/shift-report' },
      { id: 'productionreport', title: 'گزارش جامع تولید', icon: Factory, path: '/production-report' },
      { id: 'lab-report', title: 'گزارش آزمایشگاه', icon: FlaskConical, path: '/lab-report' },
      { id: 'warehouse-report', title: 'گزارش انبار', icon: Warehouse, path: '/warehouse-report' },
      { id: 'scale-report', title: 'گزارش باسکول', icon: Scale, path: '/scale-report' },
      { id: 'hse-report', title: 'گزارش ایمنی و بهداشت', icon: HardHat, path: '/hse-report' },
      { id: 'reports', title: 'گزارش‌ساز پویا', icon: PieChart, path: '/reports' },
      { id: 'list-report', title: 'گزارش لیستی', icon: FileSpreadsheet, path: '/list-report' },
    ]
  },

  { id: 'work-calendar', title: 'تقویم کاری', icon: CalendarRange, path: '/work-calendar' },
  { id: 'inbox', title: 'کارتابل من', icon: Inbox, path: '/inbox' },
  { id: 'messages', title: 'پیام‌ها', icon: MessageSquare, path: '/messages' },
  { id: 'notes', title: 'یادداشت‌های من', icon: StickyNote, path: '/notes' },
  
  // --- Maintenance Group ---
  {
    id: 'maintenance-group',
    title: 'مدیریت نت',
    icon: Wrench,
    path: '#',
    submenu: [
      { id: 'workorders', title: 'دستور کارها', icon: ListChecks, path: '/work-orders' },
      { id: 'pm-scheduler', title: 'زمان‌بندی نت (PM)', icon: Timer, path: '/pm-scheduler' },
      { id: 'kpis', title: 'شاخص‌های فنی (KPI)', icon: LineChart, path: '/kpis' },
      { id: 'inspections', title: 'بازرسی فنی', icon: ClipboardCheck, path: '/inspections' },
    ]
  },

  // --- HSE Group ---
  {
    id: 'hse-group',
    title: 'ایمنی و بهداشت',
    icon: ShieldCheck,
    path: '#',
    submenu: [
      { id: 'permits', title: 'مجوز کار (PTW)', icon: FileSignature, path: '/permits' },
    ]
  },

  // --- Engineering Group ---
  {
    id: 'engineering-group',
    title: 'دفتر فنی مهندسی',
    icon: Cog,
    path: '#',
    submenu: [
      { id: 'bom', title: 'درخت تجهیز (BOM)', icon: GitMerge, path: '/bom' },
      { id: 'projects', title: 'کنترل پروژه', icon: Briefcase, path: '/projects' },
      { id: 'documents', title: 'اسناد فنی', icon: Archive, path: '/documents' },
      { id: 'suggestions', title: 'پیشنهادات فنی', icon: Lightbulb, path: '/suggestions' },
      { id: 'meetings', title: 'صورتجلسات', icon: FileText, path: '/meetings' },
    ]
  },

  // --- Supply Chain Group ---
  {
    id: 'supply-group',
    title: 'زنجیره تامین',
    icon: ShoppingCart,
    path: '#',
    submenu: [
      { id: 'inventory', title: 'موجودی انبار', icon: Warehouse, path: '/inventory' },
      { id: 'partrequest', title: 'درخواست کالا', icon: Package, path: '/part-requests' },
      { id: 'purchases', title: 'درخواست خرید', icon: ShoppingCart, path: '/purchases' },
    ]
  },

  // --- HR & Admin ---
  { 
    id: 'hr-group', 
    title: 'اداری و پرسنلی', 
    icon: Users, 
    path: '#',
    submenu: [
      { id: 'training-courses', title: 'دوره‌های آموزشی', icon: BookOpen, path: '/training-courses' },
      { id: 'training', title: 'ماتریس مهارت و آموزش', icon: GraduationCap, path: '/training' },
      { id: 'performance', title: 'امتیاز عملکرد', icon: Award, path: '/performance' },
    ]
  },

  // --- Base Info Management (Promoted to Main Sidebar) ---
  {
    id: 'base-info',
    title: 'مدیریت اطلاعات پایه',
    icon: Database,
    path: '#',
    role: 'ADMIN',
    submenu: adminSubmenu
  },

  // --- Settings ---
  { 
    id: 'system-settings', 
    title: 'تنظیمات سیستم', 
    icon: Settings, 
    path: '#', 
    role: 'ADMIN',
    submenu: [
      { id: 'app-config', title: 'تنظیمات نرم‌افزار', icon: Sliders, path: '/system-config' },
      { id: 'workflow', title: 'طراحی فرآیند', icon: GitMerge, path: '/workflow-designer' },
      { id: 'report-template-design', title: 'طراحی قالب گزارش', icon: LayoutTemplate, path: '/report-template-design' },
      { id: 'report-form-design', title: 'طراحی فرم گزارش', icon: FormInput, path: '/report-form-design' },
      { id: 'import-tool-settings', title: 'تنظیمات ابزار ورود اطلاعات', icon: FileSpreadsheet, path: '/data-entry-tool-settings' },
      { id: 'software-errors', title: 'خطاهای نرم‌افزار', icon: AlertTriangle, path: '/software-errors' },
      { id: 'data-change-tracking', title: 'ردیابی تغییرات اطلاعات', icon: History, path: '/data-change-tracking' },
      { id: 'integration', title: 'یکپارچه‌سازی (API)', icon: Database, path: '/integration' },
    ]
  },
  { id: 'settings', title: 'تنظیمات کاربری', icon: Settings, path: '/settings' },
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