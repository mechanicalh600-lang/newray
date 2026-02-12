import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutTemplate,
  Plus,
  Save,
  UploadCloud,
  Trash2,
  Wand2,
  Eye,
  SlidersHorizontal,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Undo2,
  Redo2,
  ClipboardList,
  Users,
  Factory,
  Clock3,
  Settings2,
  Activity,
  Package,
  Database,
  Monitor,
  FlaskConical,
  Warehouse,
  Scale,
  ShieldCheck,
  HardHat,
  Wrench,
  AlertTriangle,
  Layers,
  BarChart3,
  FileText,
  Hash,
  Calendar,
  ListChecks,
  CheckSquare,
  Timer,
  Grid3X3,
  // ── new icons ──
  Truck,
  Flame,
  Thermometer,
  Droplets,
  Zap,
  Gauge,
  MapPin,
  Globe,
  Phone,
  Mail,
  Bell,
  Bookmark,
  Star,
  Heart,
  Flag,
  Tag,
  Key,
  Lock,
  Unlock,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Printer,
  Camera,
  Image as ImageIcon,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wind,
  Umbrella,
  Building2,
  Home,
  DoorOpen,
  CircleDollarSign,
  Banknote,
  CreditCard,
  PieChart,
  TrendingUp,
  Target,
  Award,
  Trophy,
  GraduationCap,
  BookOpen,
  Clipboard,
  FileCheck,
  FolderOpen,
  Inbox,
  Send,
  MessageSquare,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  Siren,
  Construction,
  Hammer,
  Cog,
  Cpu,
  Wifi,
  Radio,
  BatteryCharging,
  PlugZap,
  Pipette,
  TestTube2,
  Microscope,
  Stethoscope,
  HeartPulse,
  Bike,
  Car,
  Ship,
  Plane,
  Rocket,
  TreePine,
  Leaf,
  Recycle,
  Snowflake,
  CalendarDays,
  Copy,
  Check,
} from 'lucide-react';
import { DataPage } from '../components/DataPage';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import { ShiftReportFormContent } from '../components/ShiftReportFormContent';
import { MENU_ITEMS } from '../constants';
import {
  ReportDefinition,
  ReportFieldSchema,
  ReportFormGroup,
  ReportTabSchema,
  getAllReportDefinitions,
  publishReportDefinition,
  setDefinitionActiveState,
  upsertReportDefinitionDraft,
} from '../services/reportDefinitions';
import { fetchMasterData } from '../workflowStore';
import { getShamsiDate, getPersianDayName } from '../utils';
import { User } from '../types';

const blankField = (): ReportFieldSchema => ({
  id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  key: '',
  label: '',
  type: 'text',
  width: 1,
  required: false,
});

const blankTab = (): ReportTabSchema => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  label: 'تب جدید',
  color: '#800020',
  icon: 'clipboard',
});

/** ۹ تب گزارش شیفت (همان ساختار منوی گزارش شیفت) */
const SHIFT_TABS_PRESET: ReportTabSchema[] = [
  { id: 'tab-1', label: 'اطلاعات شیفت', color: '#2563eb', icon: 'users' },
  { id: 'tab-2', label: 'خوراک', color: '#16a34a', icon: 'factory' },
  { id: 'tab-3', label: 'بالمیل', color: '#059669', icon: 'activity' },
  { id: 'tab-4', label: 'هیدروسیکلون', color: '#0d9488', icon: 'activity' },
  { id: 'tab-5', label: 'درام مگنت', color: '#0891b2', icon: 'activity' },
  { id: 'tab-6', label: 'فیلتر کنسانتره', color: '#6366f1', icon: 'layers' },
  { id: 'tab-7', label: 'تیکنر', color: '#0284c7', icon: 'droplets' },
  { id: 'tab-8', label: 'فیلتر بازیافت', color: '#78716c', icon: 'recycle' },
  { id: 'tab-9', label: 'توقفات و پمپ', color: '#d97706', icon: 'clock' },
];

const COLOR_SWATCHES = ['#800020', '#4b5563', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0ea5e9', '#14b8a6', '#f59e0b', '#e11d48'];

const toSqlColumnName = (input: string) =>
  String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const toSqlTableName = (slug: string) => {
  const base = toSqlColumnName(slug.replace(/-/g, '_'));
  return `report_${base || 'new_form'}`;
};

const buildSlugFromModule = (moduleId: string, modulePath: string) => {
  const fromPath = String(modulePath || '')
    .replace(/^\/+/, '')
    .replace(/\//g, '-');
  return toSqlColumnName(fromPath || moduleId).replace(/_/g, '-');
};

const mapFieldTypeToSql = (type: ReportFieldSchema['type']) => {
  if (type === 'number') return 'numeric';
  if (type === 'checkbox') return 'boolean default false';
  if (type === 'matrix' || type === 'repeatable_list' || type === 'time_pair' || type === 'attendance') {
    return "jsonb not null default '{}'::jsonb";
  }
  return 'text';
};

/** ساعات تولید در گزارش شیفت */
const PRODUCTION_TIMES = ['07:30', '08:30', '09:30', '10:30', '11:30', '12:30', '01:30', '02:30', '03:30', '04:30', '05:30', '06:30'];

/** قالب فرم گزارش شیفت – ۹ تب مطابق منوی گزارش شیفت، با تمام فیلدهای فرم ثبت گزارش شیفت */
const SHIFT_LIKE_PRESET: ReportFieldSchema[] = [
  // ───────────────────────── تب ۱: اطلاعات شیفت ─────────────────────────
  { id: 'p1', key: 'shift_name', label: 'شیفت', type: 'select', options: [{ label: 'شیفت A', value: 'A' }, { label: 'شیفت B', value: 'B' }, { label: 'شیفت C', value: 'C' }], required: true, sectionId: 'اطلاعات پایه', tabId: 'tab-1' },
  { id: 'p2', key: 'shift_type', label: 'نوبت کاری', type: 'select', options: [{ label: 'روزکار اول', value: 'Day1' }, { label: 'روزکار دوم', value: 'Day2' }, { label: 'شب‌کار اول', value: 'Night1' }, { label: 'شب‌کار دوم', value: 'Night2' }], required: true, sectionId: 'اطلاعات پایه', tabId: 'tab-1' },
  { id: 'p3', key: 'report_date', label: 'تاریخ', type: 'date', required: true, sectionId: 'اطلاعات پایه', tabId: 'tab-1' },
  { id: 'p4', key: 'shift_duration', label: 'مدت شیفت', type: 'time', required: true, sectionId: 'اطلاعات پایه', tabId: 'tab-1', defaultValue: '12:00' },
  { id: 'p5', key: 'weekday', label: 'روز هفته', type: 'text', sectionId: 'اطلاعات پایه', tabId: 'tab-1', readOnly: true },
  { id: 'p6', key: 'supervisor_name', label: 'ثبت کننده گزارش', type: 'text', required: true, sectionId: 'اطلاعات پایه', tabId: 'tab-1', readOnly: true },
  { id: 'p7', key: 'personnel_attendance', label: 'وضعیت حضور و غیاب پرسنل', type: 'attendance', required: true, sectionId: 'وضعیت حضور و غیاب پرسنل', tabId: 'tab-1', width: 2 },
  // ───────────────────────── تب ۲: خوراک (همان جدول ثبت گزارش شیفت) ─────────────────────────
  { id: 'p8', key: 'feed_production_line_a', label: 'خوراک مصرفی خط A', type: 'matrix', sectionId: 'خوراک', tabId: 'tab-2', width: 2, matrixConfig: { rows: PRODUCTION_TIMES, columns: ['تناژ', 'نوع خوراک ۱', 'درصد ۱', 'نوع خوراک ۲', 'درصد ۲'], defaultValue: '' } },
  { id: 'p9', key: 'feed_production_line_b', label: 'خوراک مصرفی خط B', type: 'matrix', sectionId: 'خوراک', tabId: 'tab-2', width: 2, matrixConfig: { rows: PRODUCTION_TIMES, columns: ['تناژ', 'نوع خوراک ۱', 'درصد ۱', 'نوع خوراک ۲', 'درصد ۲'], defaultValue: '' } },
  { id: 'p10', key: 'feed_summary', label: 'خلاصه خوراک خط A و B', type: 'textarea', sectionId: 'خوراک', tabId: 'tab-2', width: 2, placeholder: 'نوع خوراک، درصد، زمان‌ها...' },
  { id: 'p11', key: 'total_production_a', label: 'مجموع تناژ خط A (تن)', type: 'number', sectionId: 'خوراک', tabId: 'tab-2', validation: { min: 0 }, placeholder: '0' },
  { id: 'p12', key: 'total_production_b', label: 'مجموع تناژ خط B (تن)', type: 'number', sectionId: 'خوراک', tabId: 'tab-2', validation: { min: 0 }, placeholder: '0' },
  // ───────────────────────── تب ۳: بالمیل (همان ساختار گزارش شیفت) ─────────────────────────
  { id: 'p13', key: 'ball_mills_data', label: 'وضعیت بالمیل‌ها', type: 'matrix', sectionId: 'بالمیل', tabId: 'tab-3', width: 2, matrixConfig: { rows: ['بالمیل ۱ خط A', 'بالمیل ۲ خط A', 'بالمیل ۱ خط B', 'بالمیل ۲ خط B'], columns: ['جریان 08 (A)', 'جریان 02 (A)', 'دانسیته 08', 'دانسیته 02', 'سایز گلوله', 'تعداد بشکه'], defaultValue: '' } },
  { id: 'p14', key: 'ball_mills_summary', label: 'خلاصه بالمیل', type: 'textarea', sectionId: 'بالمیل', tabId: 'tab-3', width: 2, placeholder: 'آمپر، دانسیته، شارژها، خط A و B...' },
  // ───────────────────────── تب ۴: هیدروسیکلون ─────────────────────────
  { id: 'p15', key: 'hydrocyclones_data', label: 'وضعیت هیدروسیکلون‌ها', type: 'matrix', sectionId: 'هیدروسیکلون', tabId: 'tab-4', width: 2, matrixConfig: { rows: ['هیدروسیکلون ۱ خط A', 'هیدروسیکلون ۲ خط A', 'هیدروسیکلون ۱ خط B', 'هیدروسیکلون ۲ خط B'], columns: ['فشار 08 (Bar)', 'زاویه 08', 'فشار 02 (Bar)', 'زاویه 02'], defaultValue: '' } },
  { id: 'p16', key: 'hydrocyclone_summary', label: 'خلاصه هیدروسیکلون', type: 'textarea', sectionId: 'هیدروسیکلون', tabId: 'tab-4', width: 2, placeholder: 'فشار، زاویه، سیکلون‌های فعال...' },
  // ───────────────────────── تب ۵: درام مگنت ─────────────────────────
  { id: 'p17', key: 'drum_magnet_line_a_single', label: 'درام تکی خط A', type: 'checkbox', sectionId: 'درام مگنت خط A', tabId: 'tab-5' },
  { id: 'p18', key: 'drum_magnet_line_a_upper', label: 'درام بالایی طبقاتی خط A', type: 'checkbox', sectionId: 'درام مگنت خط A', tabId: 'tab-5' },
  { id: 'p19', key: 'drum_magnet_line_a_middle', label: 'درام میانی طبقاتی خط A', type: 'checkbox', sectionId: 'درام مگنت خط A', tabId: 'tab-5' },
  { id: 'p20', key: 'drum_magnet_line_a_lower', label: 'درام پایینی طبقاتی خط A', type: 'checkbox', sectionId: 'درام مگنت خط A', tabId: 'tab-5' },
  { id: 'p21', key: 'drum_magnet_line_a_desc', label: 'توضیحات درام مگنت خط A', type: 'textarea', sectionId: 'درام مگنت خط A', tabId: 'tab-5', width: 2, placeholder: 'توضیحات...' },
  { id: 'p22', key: 'drum_magnet_line_b_single', label: 'درام تکی خط B', type: 'checkbox', sectionId: 'درام مگنت خط B', tabId: 'tab-5' },
  { id: 'p23', key: 'drum_magnet_line_b_upper', label: 'درام بالایی طبقاتی خط B', type: 'checkbox', sectionId: 'درام مگنت خط B', tabId: 'tab-5' },
  { id: 'p24', key: 'drum_magnet_line_b_middle', label: 'درام میانی طبقاتی خط B', type: 'checkbox', sectionId: 'درام مگنت خط B', tabId: 'tab-5' },
  { id: 'p25', key: 'drum_magnet_line_b_lower', label: 'درام پایینی طبقاتی خط B', type: 'checkbox', sectionId: 'درام مگنت خط B', tabId: 'tab-5' },
  { id: 'p26', key: 'drum_magnet_line_b_desc', label: 'توضیحات درام مگنت خط B', type: 'textarea', sectionId: 'درام مگنت خط B', tabId: 'tab-5', width: 2, placeholder: 'توضیحات...' },
  // ───────────────────────── تب ۶: فیلتر کنسانتره ─────────────────────────
  { id: 'p27', key: 'conc_filter_a_operator', label: 'اپراتور فیلتر کنسانتره خط A', type: 'text', sectionId: 'فیلتر کنسانتره خط A', tabId: 'tab-6', placeholder: 'انتخاب اپراتور...' },
  { id: 'p28', key: 'conc_filter_a_hours', label: 'مدت کارکرد فیلتر کنسانتره خط A', type: 'time', sectionId: 'فیلتر کنسانتره خط A', tabId: 'tab-6', placeholder: '00:00' },
  { id: 'p29', key: 'conc_filter_a_cloths', label: 'پارچه‌های فیلتر کنسانتره خط A', type: 'textarea', sectionId: 'فیلتر کنسانتره خط A', tabId: 'tab-6', width: 2, placeholder: 'پارچه‌ها...' },
  { id: 'p30', key: 'conc_filter_b_operator', label: 'اپراتور فیلتر کنسانتره خط B', type: 'text', sectionId: 'فیلتر کنسانتره خط B', tabId: 'tab-6', placeholder: 'انتخاب اپراتور...' },
  { id: 'p31', key: 'conc_filter_b_hours', label: 'مدت کارکرد فیلتر کنسانتره خط B', type: 'time', sectionId: 'فیلتر کنسانتره خط B', tabId: 'tab-6', placeholder: '00:00' },
  { id: 'p32', key: 'conc_filter_b_cloths', label: 'پارچه‌های فیلتر کنسانتره خط B', type: 'textarea', sectionId: 'فیلتر کنسانتره خط B', tabId: 'tab-6', width: 2, placeholder: 'پارچه‌ها...' },
  { id: 'p33', key: 'conc_filter_reserve_operator', label: 'اپراتور فیلتر کنسانتره رزرو', type: 'text', sectionId: 'فیلتر کنسانتره رزرو', tabId: 'tab-6', placeholder: 'انتخاب اپراتور...' },
  { id: 'p34', key: 'conc_filter_reserve_hours', label: 'مدت کارکرد فیلتر کنسانتره رزرو', type: 'time', sectionId: 'فیلتر کنسانتره رزرو', tabId: 'tab-6', placeholder: '00:00' },
  { id: 'p35', key: 'conc_filter_reserve_cloths', label: 'پارچه‌های فیلتر کنسانتره رزرو', type: 'textarea', sectionId: 'فیلتر کنسانتره رزرو', tabId: 'tab-6', width: 2, placeholder: 'پارچه‌ها...' },
  { id: 'p36', key: 'concentrate_filter_summary', label: 'خلاصه فیلتر کنسانتره', type: 'textarea', sectionId: 'فیلتر کنسانتره', tabId: 'tab-6', width: 2, placeholder: 'اپراتور، ساعت کار، پارچه‌ها...' },
  // ───────────────────────── تب ۷: تیکنر ─────────────────────────
  { id: 'p37', key: 'thickener_data', label: 'وضعیت تیکنرها', type: 'matrix', sectionId: 'تیکنر', tabId: 'tab-7', width: 2, matrixConfig: { rows: ['تیکنر ۱ خط A', 'تیکنر ۲ خط A', 'تیکنر ۳ خط A', 'تیکنر ۱ خط B', 'تیکنر ۲ خط B', 'تیکنر ۳ خط B'], columns: ['مدت کارکرد', 'خروجی کانال', 'فشار 08', 'فشار 11', 'فشار 02', 'فشار 05'], defaultValue: '' } },
  { id: 'p38', key: 'thickener_summary', label: 'خلاصه تیکنر', type: 'textarea', sectionId: 'تیکنر', tabId: 'tab-7', width: 2, placeholder: 'ساعت کار، خروجی کانال، فشار، جک...' },
  // ───────────────────────── تب ۸: فیلتر بازیافت ─────────────────────────
  { id: 'p39', key: 'rec_filter_a1_operator', label: 'اپراتور فیلتر بازیافت ۱ خط A', type: 'text', sectionId: 'فیلتر بازیافت خط A', tabId: 'tab-8', placeholder: 'انتخاب اپراتور...' },
  { id: 'p40', key: 'rec_filter_a1_hours', label: 'مدت کارکرد فیلتر بازیافت ۱ خط A', type: 'time', sectionId: 'فیلتر بازیافت خط A', tabId: 'tab-8', placeholder: '00:00' },
  { id: 'p41', key: 'rec_filter_a1_cloths', label: 'پارچه‌های فیلتر بازیافت ۱ خط A', type: 'textarea', sectionId: 'فیلتر بازیافت خط A', tabId: 'tab-8', placeholder: 'پارچه‌ها...' },
  { id: 'p42', key: 'rec_filter_a2_operator', label: 'اپراتور فیلتر بازیافت ۲ خط A', type: 'text', sectionId: 'فیلتر بازیافت خط A', tabId: 'tab-8', placeholder: 'انتخاب اپراتور...' },
  { id: 'p43', key: 'rec_filter_a2_hours', label: 'مدت کارکرد فیلتر بازیافت ۲ خط A', type: 'time', sectionId: 'فیلتر بازیافت خط A', tabId: 'tab-8', placeholder: '00:00' },
  { id: 'p44', key: 'rec_filter_a2_cloths', label: 'پارچه‌های فیلتر بازیافت ۲ خط A', type: 'textarea', sectionId: 'فیلتر بازیافت خط A', tabId: 'tab-8', placeholder: 'پارچه‌ها...' },
  { id: 'p45', key: 'rec_filter_b1_operator', label: 'اپراتور فیلتر بازیافت ۱ خط B', type: 'text', sectionId: 'فیلتر بازیافت خط B', tabId: 'tab-8', placeholder: 'انتخاب اپراتور...' },
  { id: 'p46', key: 'rec_filter_b1_hours', label: 'مدت کارکرد فیلتر بازیافت ۱ خط B', type: 'time', sectionId: 'فیلتر بازیافت خط B', tabId: 'tab-8', placeholder: '00:00' },
  { id: 'p47', key: 'rec_filter_b1_cloths', label: 'پارچه‌های فیلتر بازیافت ۱ خط B', type: 'textarea', sectionId: 'فیلتر بازیافت خط B', tabId: 'tab-8', placeholder: 'پارچه‌ها...' },
  { id: 'p48', key: 'rec_filter_b2_operator', label: 'اپراتور فیلتر بازیافت ۲ خط B', type: 'text', sectionId: 'فیلتر بازیافت خط B', tabId: 'tab-8', placeholder: 'انتخاب اپراتور...' },
  { id: 'p49', key: 'rec_filter_b2_hours', label: 'مدت کارکرد فیلتر بازیافت ۲ خط B', type: 'time', sectionId: 'فیلتر بازیافت خط B', tabId: 'tab-8', placeholder: '00:00' },
  { id: 'p50', key: 'rec_filter_b2_cloths', label: 'پارچه‌های فیلتر بازیافت ۲ خط B', type: 'textarea', sectionId: 'فیلتر بازیافت خط B', tabId: 'tab-8', placeholder: 'پارچه‌ها...' },
  { id: 'p51', key: 'recovery_filter_summary', label: 'خلاصه فیلتر بازیافت', type: 'textarea', sectionId: 'فیلتر بازیافت', tabId: 'tab-8', width: 2, placeholder: 'اپراتور، ساعت کار، پارچه‌ها...' },
  // ───────────────────────── تب ۹: توقفات و پمپ ─────────────────────────
  { id: 'p52', key: 'line_a_time_pair', label: 'کارکرد/توقف خط A', type: 'time_pair', sectionId: 'جمع زمان‌ها', tabId: 'tab-9', timePairConfig: { requireReasonWhenStop: true, reasonLabel: 'علت توقف خط A' }, validation: { totalMustEqualField: 'shift_duration' } },
  { id: 'p53', key: 'line_b_time_pair', label: 'کارکرد/توقف خط B', type: 'time_pair', sectionId: 'جمع زمان‌ها', tabId: 'tab-9', timePairConfig: { requireReasonWhenStop: true, reasonLabel: 'علت توقف خط B' }, validation: { totalMustEqualField: 'shift_duration' } },
  { id: 'p54', key: 'downtime_matrix', label: 'ماتریس توقفات', type: 'matrix', sectionId: 'جزئیات توقف', tabId: 'tab-9', width: 2, matrixConfig: { rows: ['خط A', 'خط B'], columns: ['مکانیکی', 'برقی', 'فرآیندی'], defaultValue: '0', enforceNumeric: true } },
  { id: 'p55', key: 'pump_process_active', label: 'پمپ‌های پروسس فعال', type: 'text', sectionId: 'پمپ‌ها', tabId: 'tab-9', placeholder: 'پمپ‌های ۱، ۲، ۳...' },
  { id: 'p56', key: 'pump_clean_water_active', label: 'پمپ‌های آب تمیز فعال', type: 'text', sectionId: 'پمپ‌ها', tabId: 'tab-9', placeholder: 'پمپ‌های ۱، ۲، ۳...' },
  { id: 'p57', key: 'pumps_summary', label: 'توضیحات پمپ‌ها', type: 'textarea', sectionId: 'پمپ‌ها', tabId: 'tab-9', width: 2, placeholder: 'پمپ فرآیندی، آب تمیز...' },
  { id: 'p58', key: 'shift_descriptions', label: 'توضیحات شیفت', type: 'repeatable_list', sectionId: 'تحویل شیفت', tabId: 'tab-9', width: 2, repeatableListConfig: { placeholder: 'توضیح...', minItems: 1 } },
  { id: 'p59', key: 'next_actions', label: 'اقدامات شیفت بعد', type: 'repeatable_list', sectionId: 'تحویل شیفت', tabId: 'tab-9', width: 2, repeatableListConfig: { placeholder: 'اقدام بعدی...', minItems: 1 } },
  { id: 'p60', key: 'general_notes', label: 'توضیحات عمومی', type: 'textarea', sectionId: 'تحویل شیفت', tabId: 'tab-9', width: 2 },
];

const DOWNTIME_ABC_PRESET: ReportFieldSchema[] = [
  {
    id: 'd1',
    key: 'line_a_time_pair',
    label: 'کارکرد/توقف خط A',
    type: 'time_pair',
    sectionId: 'جمع زمان‌ها',
    tabId: 'downtime',
    timePairConfig: { requireReasonWhenStop: true, reasonLabel: 'علت توقف خط A' },
    validation: { totalMustEqualField: 'shift_duration' },
  },
  {
    id: 'd2',
    key: 'line_b_time_pair',
    label: 'کارکرد/توقف خط B',
    type: 'time_pair',
    sectionId: 'جمع زمان‌ها',
    tabId: 'downtime',
    timePairConfig: { requireReasonWhenStop: true, reasonLabel: 'علت توقف خط B' },
    validation: { totalMustEqualField: 'shift_duration' },
  },
  {
    id: 'd4',
    key: 'downtime_matrix_ab',
    label: 'ماتریس توقفات خطوط A/B',
    type: 'matrix',
    sectionId: 'جزئیات توقف',
    tabId: 'downtime',
    width: 2,
    matrixConfig: { rows: ['خط A', 'خط B'], columns: ['مکانیکی', 'برقی', 'فرآیندی'], defaultValue: '0', enforceNumeric: true },
  },
];

const TAB_ICON_OPTIONS: Array<{ id: ReportTabSchema['icon']; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  /* ── General / Office ── */
  { id: 'clipboard', label: 'کلیپ‌بورد', Icon: ClipboardList },
  { id: 'clipboardcheck', label: 'چک‌لیست', Icon: Clipboard },
  { id: 'file', label: 'فایل', Icon: FileText },
  { id: 'filecheck', label: 'فایل تأیید', Icon: FileCheck },
  { id: 'folder', label: 'پوشه', Icon: FolderOpen },
  { id: 'book', label: 'کتاب', Icon: BookOpen },
  { id: 'inbox', label: 'صندوق', Icon: Inbox },
  { id: 'layers', label: 'لایه‌ها', Icon: Layers },
  { id: 'tag', label: 'برچسب', Icon: Tag },
  { id: 'bookmark', label: 'نشانک', Icon: Bookmark },
  /* ── People ── */
  { id: 'users', label: 'کاربران', Icon: Users },
  { id: 'userplus', label: 'کاربر جدید', Icon: UserPlus },
  { id: 'usercheck', label: 'کاربر تأیید', Icon: UserCheck },
  { id: 'userx', label: 'کاربر حذف', Icon: UserX },
  { id: 'graduation', label: 'آموزش', Icon: GraduationCap },
  /* ── Industrial / Factory ── */
  { id: 'factory', label: 'کارخانه', Icon: Factory },
  { id: 'warehouse', label: 'انبار', Icon: Warehouse },
  { id: 'construction', label: 'ساختمان', Icon: Construction },
  { id: 'hardhat', label: 'HSE', Icon: HardHat },
  { id: 'hammer', label: 'چکش', Icon: Hammer },
  { id: 'wrench', label: 'تعمیرات', Icon: Wrench },
  { id: 'cog', label: 'چرخ‌دنده', Icon: Cog },
  { id: 'building', label: 'ساختمان', Icon: Building2 },
  { id: 'home', label: 'خانه', Icon: Home },
  { id: 'door', label: 'درب', Icon: DoorOpen },
  /* ── Energy / Environment ── */
  { id: 'flame', label: 'شعله', Icon: Flame },
  { id: 'thermometer', label: 'دما', Icon: Thermometer },
  { id: 'droplets', label: 'آب', Icon: Droplets },
  { id: 'zap', label: 'برق', Icon: Zap },
  { id: 'gauge', label: 'فشارسنج', Icon: Gauge },
  { id: 'plug', label: 'پریز', Icon: PlugZap },
  { id: 'battery', label: 'باتری', Icon: BatteryCharging },
  { id: 'sun', label: 'آفتاب', Icon: Sun },
  { id: 'moon', label: 'ماه', Icon: Moon },
  { id: 'cloud', label: 'ابر', Icon: Cloud },
  { id: 'cloudrain', label: 'باران', Icon: CloudRain },
  { id: 'wind', label: 'باد', Icon: Wind },
  { id: 'umbrella', label: 'چتر', Icon: Umbrella },
  { id: 'snowflake', label: 'برف', Icon: Snowflake },
  { id: 'tree', label: 'درخت', Icon: TreePine },
  { id: 'leaf', label: 'برگ', Icon: Leaf },
  { id: 'recycle', label: 'بازیافت', Icon: Recycle },
  /* ── Science / Lab ── */
  { id: 'flask', label: 'آزمایشگاه', Icon: FlaskConical },
  { id: 'pipette', label: 'قطره‌چکان', Icon: Pipette },
  { id: 'testtube', label: 'لوله آزمایش', Icon: TestTube2 },
  { id: 'microscope', label: 'میکروسکوپ', Icon: Microscope },
  /* ── Medical / Health ── */
  { id: 'stethoscope', label: 'بهداشت', Icon: Stethoscope },
  { id: 'heartpulse', label: 'ضربان قلب', Icon: HeartPulse },
  { id: 'activity', label: 'فعالیت', Icon: Activity },
  /* ── Data / IT ── */
  { id: 'database', label: 'پایگاه داده', Icon: Database },
  { id: 'monitor', label: 'مانیتور', Icon: Monitor },
  { id: 'cpu', label: 'پردازنده', Icon: Cpu },
  { id: 'wifi', label: 'وای‌فای', Icon: Wifi },
  { id: 'radio', label: 'رادیو', Icon: Radio },
  /* ── Transport ── */
  { id: 'truck', label: 'کامیون', Icon: Truck },
  { id: 'car', label: 'خودرو', Icon: Car },
  { id: 'bike', label: 'دوچرخه', Icon: Bike },
  { id: 'ship', label: 'کشتی', Icon: Ship },
  { id: 'plane', label: 'هواپیما', Icon: Plane },
  { id: 'rocket', label: 'موشک', Icon: Rocket },
  /* ── Finance ── */
  { id: 'dollar', label: 'دلار', Icon: CircleDollarSign },
  { id: 'banknote', label: 'اسکناس', Icon: Banknote },
  { id: 'creditcard', label: 'کارت بانکی', Icon: CreditCard },
  /* ── Charts / Status ── */
  { id: 'chart', label: 'نمودار', Icon: BarChart3 },
  { id: 'piechart', label: 'دایره‌ای', Icon: PieChart },
  { id: 'trending', label: 'روند صعودی', Icon: TrendingUp },
  { id: 'target', label: 'هدف', Icon: Target },
  /* ── Communication ── */
  { id: 'phone', label: 'تلفن', Icon: Phone },
  { id: 'mail', label: 'ایمیل', Icon: Mail },
  { id: 'send', label: 'ارسال', Icon: Send },
  { id: 'message', label: 'پیام', Icon: MessageSquare },
  { id: 'bell', label: 'اعلان', Icon: Bell },
  /* ── Security ── */
  { id: 'shield', label: 'سپر', Icon: ShieldCheck },
  { id: 'shieldalert', label: 'هشدار امنیتی', Icon: ShieldAlert },
  { id: 'lock', label: 'قفل', Icon: Lock },
  { id: 'unlock', label: 'باز', Icon: Unlock },
  { id: 'key', label: 'کلید', Icon: Key },
  { id: 'alert', label: 'هشدار', Icon: AlertTriangle },
  { id: 'siren', label: 'آژیر', Icon: Siren },
  /* ── Actions ── */
  { id: 'search', label: 'جستجو', Icon: Search },
  { id: 'filter', label: 'فیلتر', Icon: Filter },
  { id: 'refresh', label: 'بازنشانی', Icon: RefreshCw },
  { id: 'download', label: 'دانلود', Icon: Download },
  { id: 'upload', label: 'آپلود', Icon: Upload },
  { id: 'printer', label: 'پرینتر', Icon: Printer },
  { id: 'camera', label: 'دوربین', Icon: Camera },
  { id: 'image', label: 'تصویر', Icon: ImageIcon },
  /* ── Other / Rewards ── */
  { id: 'clock', label: 'ساعت', Icon: Clock3 },
  { id: 'settings', label: 'تنظیمات', Icon: Settings2 },
  { id: 'package', label: 'بسته', Icon: Package },
  { id: 'scale', label: 'ترازو', Icon: Scale },
  { id: 'mappin', label: 'مکان', Icon: MapPin },
  { id: 'globe', label: 'کره زمین', Icon: Globe },
  { id: 'star', label: 'ستاره', Icon: Star },
  { id: 'heart', label: 'قلب', Icon: Heart },
  { id: 'flag', label: 'پرچم', Icon: Flag },
  { id: 'award', label: 'مدال', Icon: Award },
  { id: 'trophy', label: 'جام', Icon: Trophy },
];

const FIELD_TYPE_OPTIONS: Array<{ id: ReportFieldSchema['type']; title: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'text', title: 'متن', Icon: FileText },
  { id: 'number', title: 'عدد', Icon: Hash },
  { id: 'date', title: 'تاریخ', Icon: Calendar },
  { id: 'time', title: 'زمان', Icon: Clock3 },
  { id: 'select', title: 'لیست انتخابی', Icon: ListChecks },
  { id: 'textarea', title: 'متن چندخطی', Icon: ClipboardList },
  { id: 'checkbox', title: 'چک‌باکس', Icon: CheckSquare },
  { id: 'repeatable_list', title: 'لیست تکرارشونده', Icon: Layers },
  { id: 'time_pair', title: 'جفت زمان', Icon: Timer },
  { id: 'matrix', title: 'ماتریس', Icon: Grid3X3 },
];

const HelpHint: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        ref={triggerRef}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 hover:text-primary hover:bg-primary/10 cursor-help"
        aria-label="راهنما"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </span>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            className="fixed z-[9999] w-72 max-w-[90vw] p-3 text-[11px] leading-5 rounded-lg border bg-white dark:bg-gray-800 shadow-xl text-gray-600 dark:text-gray-300"
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
};

const SectionHeader: React.FC<{ index: number; title: string; help?: string }> = ({ index, title, help }) => (
  <div className="flex items-center gap-2">
    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold inline-flex items-center justify-center">{index}</span>
    <h3 className="font-bold text-sm">{title}</h3>
    {help ? <HelpHint text={help} /> : null}
  </div>
);

interface ModuleOption {
  id: string;
  title: string;
  path: string;
}

interface ModuleCategoryOption {
  id: string;
  title: string;
  items: ModuleOption[];
}


interface ReportFormDesignProps {
  user?: User | null;
}

export const ReportFormDesign: React.FC<ReportFormDesignProps> = ({ user }) => {
  const [defs, setDefs] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('گزارشات');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [showTitleField, setShowTitleField] = useState(false);
  const [iconPickerTabId, setIconPickerTabId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<ReportTabSchema[]>([{ id: 'main', label: 'عمومی', color: '#800020', icon: 'clipboard' }]);
  const [groups, setGroups] = useState<ReportFormGroup[]>([]);
  const [themeColor, setThemeColor] = useState('#800020');
  const [fields, setFields] = useState<ReportFieldSchema[]>([blankField()]);
  const [activeDesignTabId, setActiveDesignTabId] = useState<string>('main');
  const [previewValue, setPreviewValue] = useState<Record<string, any>>({});
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [isSqlCopied, setIsSqlCopied] = useState(false);
  const [isSqlExpanded, setIsSqlExpanded] = useState(false);
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTabsOpen, setIsTabsOpen] = useState(false);
  const [isFieldsOpen, setIsFieldsOpen] = useState(false);

  type FormSnapshot = { fields: ReportFieldSchema[]; tabs: ReportTabSchema[]; groups: ReportFormGroup[] };
  const [historyPast, setHistoryPast] = useState<FormSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<FormSnapshot[]>([]);
  const skipHistoryRef = useRef(false);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (viewMode !== 'FORM') return;
    historyDebounceRef.current = setTimeout(() => {
      if (skipHistoryRef.current) {
        skipHistoryRef.current = false;
        return;
      }
      setHistoryPast(prev => [...prev.slice(-49), { fields: JSON.parse(JSON.stringify(fields)), tabs: JSON.parse(JSON.stringify(tabs)), groups: JSON.parse(JSON.stringify(groups)) }]);
      setHistoryFuture([]);
    }, 400);
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, [fields, tabs, groups, viewMode]);

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    skipHistoryRef.current = true;
    setHistoryPast(prev => prev.slice(0, -1));
    setHistoryFuture(prev => [{ fields: JSON.parse(JSON.stringify(fields)), tabs: JSON.parse(JSON.stringify(tabs)), groups: JSON.parse(JSON.stringify(groups)) }, ...prev].slice(0, 40));
    setFields(previous.fields);
    setTabs(previous.tabs);
    setGroups(previous.groups);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    skipHistoryRef.current = true;
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev.slice(-49), { fields: JSON.parse(JSON.stringify(fields)), tabs: JSON.parse(JSON.stringify(tabs)), groups: JSON.parse(JSON.stringify(groups)) }]);
    setFields(next.fields);
    setTabs(next.tabs);
    setGroups(next.groups);
  };

  const loadDefs = async () => {
    setLoading(true);
    const data = await getAllReportDefinitions();
    setDefs(data);
    setLoading(false);
    return data;
  };

  const handleRefresh = async () => {
    const data = await loadDefs();
    if (editingId) {
      const row = data.find((d: ReportDefinition) => d.id === editingId);
      if (row) handleEdit(row);
    }
  };

  useEffect(() => {
    loadDefs();
  }, []);

  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  handleUndoRef.current = handleUndo;
  handleRedoRef.current = handleRedo;
  useEffect(() => {
    if (viewMode !== 'FORM') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedoRef.current();
        else handleUndoRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedoRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'FORM') {
      fetchMasterData('personnel').then((data: any) => {
        const list = Array.isArray(data) ? data : [];
        setPersonnel(list.map((p: any) => ({ id: p.id, full_name: p.full_name ?? p.fullName ?? p.name ?? '' })));
      });
    }
  }, [viewMode]);

  const moduleCategories = useMemo<ModuleCategoryOption[]>(() => {
    const categories: ModuleCategoryOption[] = [];
    MENU_ITEMS.forEach((item: any) => {
      const sub = Array.isArray(item.submenu) ? item.submenu : [];
      if (sub.length) {
        const items = sub
          .filter((s: any) => typeof s.path === 'string' && s.path.startsWith('/') && s.path !== '/report-form-design')
          .map((s: any) => ({ id: String(s.id), title: String(s.title), path: String(s.path) }));
        if (items.length) categories.push({ id: String(item.id), title: String(item.title), items });
      }
    });
    return categories;
  }, []);

  const selectedCategory = useMemo(
    () => moduleCategories.find(c => c.id === selectedCategoryId) || null,
    [moduleCategories, selectedCategoryId]
  );

  const selectedModule = useMemo(
    () => selectedCategory?.items.find(i => i.id === selectedModuleId) || null,
    [selectedCategory, selectedModuleId]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setCategory('گزارشات');
    setSelectedCategoryId('');
    setSelectedModuleId('');
    setShowTitleField(false);
    setTabs([{ id: 'main', label: 'عمومی', color: '#800020', icon: 'clipboard' }]);
    setThemeColor('#800020');
    setFields([blankField()]);
    setActiveDesignTabId('main');
    setPreviewValue({});
    setIsSqlExpanded(false);
    setGroups([]);
    setHistoryPast([]);
    setHistoryFuture([]);
  };

  const columns = useMemo(
    () => [
      { header: 'عنوان', accessor: (i: ReportDefinition) => i.title, sortKey: 'title' },
      { header: 'slug', accessor: (i: ReportDefinition) => <span className="font-mono">{i.slug}</span>, sortKey: 'slug' },
      { header: 'دسته', accessor: (i: ReportDefinition) => i.category, sortKey: 'category' },
      { header: 'نسخه', accessor: (i: ReportDefinition) => i.version, sortKey: 'version' },
      { header: 'نسخه منتشرشده', accessor: (i: ReportDefinition) => i.published_version || 0, sortKey: 'published_version' },
      {
        header: 'وضعیت',
        accessor: (i: ReportDefinition) =>
          i.is_active ? <span className="text-green-700 bg-green-50 px-2 py-1 rounded">فعال</span> : <span className="text-gray-500">غیرفعال</span>,
        sortKey: 'is_active',
      },
    ],
    []
  );

  const saveDraft = async () => {
    if ((!selectedCategoryId || !selectedModuleId) && !editingId) {
      alert('ابتدا دسته و آیتم ماژول را انتخاب کنید.');
      return;
    }
    if (!showTitleField && !editingId) {
      alert('برای ایجاد فرم جدید، از لیست آیتم یک آیتم را انتخاب کن و عنوان/slug فرم را پر کن.');
      return;
    }
    if (!title.trim() || !slug.trim()) {
      alert('عنوان و slug الزامی است.');
      return;
    }
    // فیلدهای کاملاً خالی (بدون key و label) را قبل از ذخیره حذف می‌کنیم
    const effectiveFields = fields.filter(f => f.key.trim() || f.label.trim());
    if (!effectiveFields.length) {
      alert('حداقل یک فیلد برای فرم لازم است.');
      return;
    }
    if (effectiveFields.some(f => !f.key.trim() || !f.label.trim())) {
      alert('کلید و برچسب همه فیلدها باید کامل باشد.');
      return;
    }
    const keys = effectiveFields.map(f => f.key.trim());
    const dupKey = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dupKey) {
      alert(`کلید تکراری در فرم وجود دارد: ${dupKey}`);
      return;
    }
    for (const f of effectiveFields) {
      if (f.type === 'select' && (!f.options || !f.options.length)) {
        alert(`فیلد انتخابی «${f.label}» باید حداقل یک گزینه داشته باشد.`);
        return;
      }
      if (f.type === 'matrix' && (!f.matrixConfig?.rows?.length || !f.matrixConfig?.columns?.length)) {
        alert(`برای فیلد ماتریسی «${f.label}»، ردیف و ستون الزامی است.`);
        return;
      }
    }
    const listColumns = effectiveFields.map(f => ({ key: f.key, label: f.label, visible: true }));
    await upsertReportDefinitionDraft({
      id: editingId || undefined,
      title: title.trim(),
      slug: slug.trim(),
      category: (selectedCategory?.title || category || 'گزارشات').trim(),
      form_schema: {
        tabs,
        fields: effectiveFields,
        groups,
        sections: Array.from(new Set(effectiveFields.map(f => f.sectionId).filter(Boolean))).map((s, i) => ({
          id: `s-${i + 1}`,
          title: s as string,
          fieldKeys: effectiveFields.filter(f => f.sectionId === s).map(f => f.key),
        })),
      },
      list_schema: { columns: listColumns },
      template_schema: {
        moduleId: selectedModuleId === '__new__' ? slug.replace(/-/g, '') : (selectedModuleId || slug.trim()),
        modulePath: selectedModuleId === '__new__' ? ('/' + slug) : (selectedModule?.path || ''),
      },
    } as any);
    // اگر فیلدهای خالی حذف شده باشند، state را به نسخه تمیز به‌روز می‌کنیم
    setFields(effectiveFields);
    alert('پیش‌نویس فرم ذخیره شد.');
    await loadDefs();
    setViewMode('LIST');
    resetForm();
  };

  const publishSelected = async () => {
    if (selectedIds.length !== 1) {
      alert('برای انتشار، یک فرم را انتخاب کنید.');
      return;
    }
    const selected = defs.find(d => d.id === selectedIds[0]);
    if (!selected) return;
    await publishReportDefinition(selected.slug);
    alert('فرم منتشر شد و برای Runtime آماده است.');
    await loadDefs();
  };

  const toggleActiveSelected = async () => {
    if (selectedIds.length !== 1) {
      alert('یک فرم را انتخاب کنید.');
      return;
    }
    const selected = defs.find(d => d.id === selectedIds[0]);
    if (!selected) return;
    await setDefinitionActiveState(selected.id, !selected.is_active);
    await loadDefs();
  };

  const handleEdit = (row: ReportDefinition) => {
    setEditingId(row.id);
    setTitle(row.title);
    setSlug(row.slug);
    setCategory(row.category);
    setShowTitleField(true);
    const moduleId = String((row as any)?.template_schema?.moduleId || '');
    const matchedCategory = moduleCategories.find(c => c.title === row.category || c.items.some(i => i.id === moduleId));
    const matchedModule = matchedCategory?.items.find(i => i.id === moduleId) || null;
    setSelectedCategoryId(matchedCategory?.id || '');
    setSelectedModuleId(matchedModule?.id || '');
    const loadedTabs = row.form_schema?.tabs?.length
      ? row.form_schema.tabs
      : [{ id: 'main', label: 'عمومی', color: '#800020', icon: 'clipboard' }];
    setTabs(loadedTabs);
    const firstColor = String(loadedTabs[0]?.color || '#800020');
    setThemeColor(firstColor);
    setFields((row.form_schema?.fields || []).length ? row.form_schema.fields : [blankField()]);
    setGroups((row.form_schema as any)?.groups || []);
    setActiveDesignTabId(loadedTabs[0]?.id || 'main');
    setPreviewValue({});
    setHistoryPast([]);
    setHistoryFuture([]);
    setViewMode('FORM');
  };

  const addPreset = (preset: ReportFieldSchema[]) => {
    const normalized = preset.map(item => ({
      ...item,
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key: item.key,
      label: item.label,
    }));
    setTabs(SHIFT_TABS_PRESET);
    const firstPresetColor = SHIFT_TABS_PRESET[0]?.color || '#2563eb';
    setThemeColor(firstPresetColor);
    setFields(normalized);
    setActiveDesignTabId(SHIFT_TABS_PRESET[0]?.id || 'tab-1');
    const today = getShamsiDate();
    setPreviewValue({
      report_date: today,
      shift_duration: '12:00',
      weekday: getPersianDayName(today),
      supervisor_name: user?.fullName || '',
    });
  };

  const addShiftReadyField = (tool: 'tabs' | 'shift' | 'shiftType' | 'shiftDuration' | 'weekday' | 'date' | 'supervisor' | 'attendance') => {
    if (tool === 'tabs') {
      setTabs(prev => {
        const allExists = SHIFT_TABS_PRESET.every(t => prev.some(p => p.id === t.id));
        if (allExists) {
          // خاموش کردن: برگرداندن به یک تب ساده
          const single = [{ id: 'main', label: 'عمومی', color: themeColor, icon: 'clipboard' as ReportTabSchema['icon'] }];
          setFields(current => current.map(f => ({ ...f, tabId: single[0].id })));
          setActiveDesignTabId(single[0].id);
          return single;
        }
        setActiveDesignTabId(SHIFT_TABS_PRESET[0].id);
        setThemeColor(SHIFT_TABS_PRESET[0].color || themeColor);
        return SHIFT_TABS_PRESET;
      });
      return;
    }

    setFields(prev => {
      const hasKey = (key: string) => prev.some(f => f.key === key);
      const next = [...prev];
      const baseTabId = activeDesignTabId || tabs[0]?.id || 'main';

      const pushField = (field: ReportFieldSchema) => {
        if (hasKey(field.key)) return;
        next.push({
          ...field,
          id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tabId: baseTabId,
        });
      };

      if (tool === 'shift') {
        if (hasKey('shift_name')) {
          return next.filter(f => f.key !== 'shift_name');
        }
        pushField({
          id: 'tmp',
          key: 'shift_name',
          label: 'شیفت',
          type: 'select',
          required: true,
          sectionId: 'اطلاعات پایه',
          options: [
            { label: 'شیفت A', value: 'A' },
            { label: 'شیفت B', value: 'B' },
            { label: 'شیفت C', value: 'C' },
          ],
        });
      } else if (tool === 'shiftType') {
        if (hasKey('shift_type')) {
          return next.filter(f => f.key !== 'shift_type');
        }
        pushField({
          id: 'tmp',
          key: 'shift_type',
          label: 'نوبت کاری',
          type: 'select',
          required: true,
          sectionId: 'اطلاعات پایه',
          options: [
            { label: 'روزکار اول', value: 'Day1' },
            { label: 'روزکار دوم', value: 'Day2' },
            { label: 'شب‌کار اول', value: 'Night1' },
            { label: 'شب‌کار دوم', value: 'Night2' },
          ],
        });
      } else if (tool === 'shiftDuration') {
        if (hasKey('shift_duration')) {
          return next.filter(f => f.key !== 'shift_duration');
        }
        pushField({
          id: 'tmp',
          key: 'shift_duration',
          label: 'مدت شیفت',
          type: 'time',
          required: true,
          sectionId: 'اطلاعات پایه',
          defaultValue: '12:00',
        });
      } else if (tool === 'date') {
        if (hasKey('report_date')) {
          return next.filter(f => f.key !== 'report_date');
        }
        pushField({
          id: 'tmp',
          key: 'report_date',
          label: 'تاریخ',
          type: 'date',
          required: true,
          sectionId: 'اطلاعات پایه',
        });
      } else if (tool === 'weekday') {
        if (hasKey('weekday')) {
          return next.filter(f => f.key !== 'weekday');
        }
        pushField({
          id: 'tmp',
          key: 'weekday',
          label: 'روز هفته',
          type: 'text',
          required: true,
          sectionId: 'اطلاعات پایه',
          readOnly: true,
        } as any);
      } else if (tool === 'supervisor') {
        if (hasKey('supervisor_name')) {
          return next.filter(f => f.key !== 'supervisor_name');
        }
        pushField({
          id: 'tmp',
          key: 'supervisor_name',
          label: 'ثبت کننده گزارش',
          type: 'text',
          required: true,
          sectionId: 'اطلاعات پایه',
          readOnly: true,
        });
      } else if (tool === 'attendance') {
        const hasAny =
          hasKey('present_count') || hasKey('leave_count') || hasKey('absent_count') || hasKey('attendance_widget') || hasKey('personnel_attendance');
        if (hasAny) {
          return next.filter(
            f => !['present_count', 'leave_count', 'absent_count', 'attendance_widget', 'personnel_attendance'].includes(f.key)
          );
        }
        pushField({
          id: 'tmp',
          key: 'personnel_attendance',
          label: 'وضعیت حضور و غیاب پرسنل',
          type: 'attendance',
          required: true,
          sectionId: 'وضعیت حضور و غیاب پرسنل',
          width: 2,
        });
      }

      return next;
    });
  };

  const applyUnifiedColor = (hex: string) => {
    setThemeColor(hex);
    setTabs(prev => prev.map(tab => ({ ...tab, color: hex })));
  };

  const parseSelectOptions = (raw: string) => {
    return String(raw || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [label, value] = line.includes(':') ? line.split(':') : [line, line];
        return { label: label.trim(), value: (value || label).trim() };
      });
  };

  /* no separate trigger needed — handled inline in the dropdown onChange */

  const suggestedSql = useMemo(() => {
    const tableName = toSqlTableName(slug);
    const cols: string[] = [];
    const used = new Set<string>(['id', 'tracking_code', 'report_date', 'created_at', 'updated_at']);
    fields.forEach(f => {
      const col = toSqlColumnName(f.key);
      if (!col || used.has(col)) return;
      used.add(col);
      const notNull = f.required ? ' not null' : '';
      cols.push(`  ${col} ${mapFieldTypeToSql(f.type)}${notNull}`);
    });

    return `-- Suggested SQL for form: ${title || 'New Report Form'}
create extension if not exists pgcrypto;

create table if not exists public.${tableName} (
  id uuid primary key default gen_random_uuid(),
  definition_slug text not null default '${toSqlColumnName(slug) || 'new_form'}',
  tracking_code text,
  report_date text,
${cols.join(',\n')}${cols.length ? ',\n' : ''}  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_${tableName}_report_date on public.${tableName}(report_date);
create index if not exists ix_${tableName}_created_at on public.${tableName}(created_at desc);

alter table public.${tableName} enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='${tableName}' and policyname='${tableName}_select_open'
  ) then
    create policy ${tableName}_select_open on public.${tableName}
      for select to anon, authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='${tableName}' and policyname='${tableName}_insert_open'
  ) then
    create policy ${tableName}_insert_open on public.${tableName}
      for insert to anon, authenticated with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='${tableName}' and policyname='${tableName}_update_open'
  ) then
    create policy ${tableName}_update_open on public.${tableName}
      for update to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update on public.${tableName} to anon, authenticated;`;
  }, [slug, fields, title]);

  useEffect(() => {
    if (!tabs.some(t => t.id === activeDesignTabId)) {
      setActiveDesignTabId(tabs[0]?.id || 'main');
    }
  }, [tabs, activeDesignTabId]);

  const activeFieldEntries = useMemo(
    () =>
      fields
        .map((f, index) => ({ field: f, index }))
        .filter(x => (x.field.tabId || tabs[0]?.id || 'main') === activeDesignTabId),
    [fields, activeDesignTabId, tabs]
  );

  if (viewMode === 'FORM') {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <div className="flex-none bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold">طراحی فرم گزارش</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-gray-600 pr-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyPast.length === 0}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="بازگشت (Undo)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyFuture.length === 0}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="انجام مجدد (Redo)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
              title="بروزرسانی لیست و بارگذاری مجدد"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              title="ذخیره پیش‌نویس"
            >
              <Save className="w-4 h-4" /> ذخیره
            </button>
            <button
              onClick={() => { setViewMode('LIST'); resetForm(); }}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              بازگشت
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-[max(280px,32%)] max-w-[420px] flex-shrink-0 overflow-y-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader index={1} title="عنوان و مشخصات فرم" help="در این بخش اطلاعات اصلی فرم گزارش را وارد می‌کنی. دسته ماژول و آیتم داخل دسته مشخص می‌کنند فرم به کدام صفحه متصل است. نام فرم و slug (شناسه یکتا) برای نمایش در منو و ذخیره داده‌ها استفاده می‌شوند. فیلدهای ستاره‌دار را حتماً پر کن." />
            <button
              type="button"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"
              onClick={() => setIsMetaOpen(v => !v)}
              aria-label={isMetaOpen ? 'جمع کردن بخش عنوان' : 'نمایش بخش عنوان'}
            >
              {isMetaOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          {isMetaOpen && (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                دسته ماژول <span className="text-red-500">*</span>
                <HelpHint text="دسته ماژول، گروهی از صفحات مرتبط است (مثل گزارشات، تولید، HSE). با انتخاب دسته، لیست آیتم‌های داخل آن (مثل گزارش شیفت، چاپ قالب) در فیلد بعدی نمایش داده می‌شود. آیتمِ «+ جدید» برای ساخت فرمی که هنوز در منو نیست استفاده می‌شود." />
              </div>
              <select
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                value={selectedCategoryId}
                onChange={e => {
                  const nextId = e.target.value;
                  setSelectedCategoryId(nextId);
                  setSelectedModuleId('');
                  setShowTitleField(false);
                  const nextCategory = moduleCategories.find(c => c.id === nextId);
                  setCategory(nextCategory?.title || '');
                }}
              >
                <option value="">انتخاب دسته...</option>
                {moduleCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                آیتم داخل دسته <span className="text-red-500">*</span>
                <HelpHint text="صفحه یا ماژولی که می‌خواهی برای آن فرم بسازی. هر آیتم به یک مسیر (Route) در برنامه وصل است. گزینه «+ جدید» برای ساخت فرمی که هنوز در منو وجود ندارد؛ با انتخاب آن، نام فرم و slug از روی دسته ساخته می‌شود و می‌توانی آن‌ها را ویرایش کنی." />
              </div>
              <select
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                value={selectedModuleId}
                onChange={e => {
                  const val = e.target.value;
                  // اگر «+ جدید» انتخاب شود، فقط مقدار قبلی را حفظ می‌کنیم و عنوان/slug را از دسته می‌سازیم
                  if (val === '__new__') {
                    setSelectedModuleId('');
                    setShowTitleField(true);
                    const catTitle = selectedCategory?.title || '';
                    setTitle(catTitle ? catTitle + ' - فرم جدید' : '');
                    setSlug(catTitle ? toSqlColumnName(catTitle).replace(/_/g, '-') + '-new' : '');
                    return;
                  }
                  // در حالت عادی، انتخاب هر آیتم کافی است و کاربر مجبور نیست «جدید» را بزند
                  setSelectedModuleId(val);
                  setShowTitleField(true);
                  const mod = (selectedCategory?.items || []).find(m => m.id === val);
                  if (mod) {
                    setTitle(mod.title + ' - فرم گزارش');
                    setSlug(buildSlugFromModule(mod.id, mod.path));
                  }
                }}
                disabled={!selectedCategoryId}
              >
                <option value="">{selectedCategoryId ? 'انتخاب آیتم...' : 'ابتدا دسته را انتخاب کنید'}</option>
                {(selectedCategory?.items || []).map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
                <option value="__new__">+ جدید</option>
              </select>
            </div>
          </div>
          {showTitleField && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                  نام فرم <span className="text-red-500">*</span>
                  <HelpHint text="نام نمایشی فرم که در منوی گزارش‌ها و عنوان بالای صفحه ثبت دیده می‌شود. مثال: «فرم گزارش شیفت کوره ۱». این نام برای کاربران است و باید قابل فهم باشد." />
                </div>
                <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="مثال: فرم گزارش شیفت کوره ۱" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                  ID فرم (slug) <span className="text-red-500">*</span>
                  <HelpHint text="شناسه انگلیسی و یکتا برای فرم. برای مسیر صفحه (مثلاً /shift-report)، نام جدول ذخیره داده‌ها، و اتصال به قالب چاپ استفاده می‌شود. فقط حروف انگلیسی، اعداد و خط تیره استفاده کن. مثال: shift-furnace-1-report" />
                </div>
                <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 font-mono" placeholder="مثال: shift-furnace-1-report" value={slug} onChange={e => setSlug(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-500 flex items-center gap-1">کلید ماژول <HelpHint text="کلید داخلی ماژول در سیستم. از روی slug به‌صورت خودکار ساخته می‌شود (بدون خط تیره). اگر «+ جدید» انتخاب کرده‌ای، slug را وارد کن تا این فیلد هم پر شود." /></div>
                <input
                  className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900/40 font-mono"
                  value={selectedModuleId === '__new__' ? slug.replace(/-/g, '') : (selectedModuleId || '')}
                  placeholder="خودکار از slug ساخته می‌شود"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-500 flex items-center gap-1">مسیر ماژول <HelpHint text="مسیر صفحه ماژول در برنامه (Route). مثلاً /shift-report. اگر آیتم موجود انتخاب شده باشد، خودکار پر می‌شود. برای «+ جدید» با اضافه کردن اسلش قبل از slug ساخته می‌شود." /></div>
                <input
                  className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900/40 font-mono"
                  value={selectedModuleId === '__new__' ? ('/' + slug) : (selectedModule?.path || '')}
                  placeholder="خودکار از slug ساخته می‌شود"
                  readOnly
                />
              </div>
            </div>
          )}
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <SectionHeader index={2} title="SQL پیشنهادی ساخت جدول" help="خروجی SQL از روی فیلدهای فرم به‌صورت خودکار ساخته می‌شود. این کوئری را در Supabase SQL Editor اجرا کن تا جدول اختصاصی برای ذخیره اطلاعات فرم ساخته شود. پس از نهایی‌کردن فیلدها، دکمه کپی را بزن و در Supabase اجرا کن." />
            <button
              type="button"
              onClick={() => setIsSqlExpanded(v => !v)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"
              aria-label={isSqlExpanded ? 'جمع کردن SQL' : 'نمایش SQL'}
            >
              {isSqlExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          {isSqlExpanded && (
            <>
              <p className="text-[11px] text-gray-500">بعد از نهایی‌کردن فرم، این SQL را در Supabase اجرا کن تا جدول اختصاصی ساخته شود.</p>
              <div className="relative">
                <textarea
                  value={suggestedSql}
                  readOnly
                  className="w-full min-h-[220px] p-2 pr-12 text-xs font-mono border rounded bg-gray-50 dark:bg-gray-900/40"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(suggestedSql);
                      setIsSqlCopied(true);
                      setTimeout(() => setIsSqlCopied(false), 2000);
                    } catch {
                      alert('کپی SQL ناموفق بود. دستی کپی کنید.');
                    }
                  }}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-primary transition"
                  title={isSqlCopied ? 'کپی شد' : 'کپی SQL'}
                >
                  {isSqlCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader index={3} title="ویرایشگر فرم" help="قالب‌های آماده (فرم شبیه گزارش شیفت، توقفات A/B/C) و ابزارهای افزودن فیلد خالی یا فیلدهای آماده فرم شیفت (شیفت، نوبت کاری، تاریخ، حضور و غیاب و...) را اینجا می‌بینی. باکس با سه زیرباکس رنگی برای ساخت بخش حضور و غیاب با باکس‌های سبز، نارنجی و قرمز استفاده می‌شود." />
            <button
              type="button"
              onClick={() => setIsEditorOpen(v => !v)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"
              aria-label={isEditorOpen ? 'جمع کردن ویرایشگر فرم' : 'نمایش ویرایشگر فرم'}
            >
              {isEditorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isEditorOpen && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide sm:col-span-3">قالب سریع</span>
              <button
                onClick={() => addPreset(SHIFT_LIKE_PRESET)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all"
              >
                <Wand2 className="w-4 h-4" /> فرم اولیه پیشنهادی
              </button>
              <button
                onClick={() => {
                  const normalized = DOWNTIME_ABC_PRESET.map(item => ({
                    ...item,
                    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  }));
                  setTabs(prev => {
                    if (prev.some(t => t.id === 'downtime')) return prev;
                    return [...prev, { id: 'downtime', label: 'توقفات', color: themeColor, icon: 'clock' }];
                  });
                  setFields(prev => {
                    const existingKeys = new Set(prev.map(f => f.key));
                    return [...prev, ...normalized.filter(x => !existingKeys.has(x.key))];
                  });
                  setActiveDesignTabId('downtime');
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow transition-all"
              >
                <Wand2 className="w-4 h-4" /> تب توقفات
              </button>
              <button
                onClick={() =>
                  setFields(prev => [
                    ...prev,
                    { ...blankField(), tabId: activeDesignTabId, sectionId: prev.find(f => (f.tabId || tabs[0]?.id || 'main') === activeDesignTabId)?.sectionId || '' },
                  ])
                }
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all"
              >
                <Plus className="w-4 h-4" /> افزودن فیلد خالی
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-2">ابزار آماده</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => addShiftReadyField('tabs')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-all"
                >
                  <LayoutTemplate className="w-4 h-4" /> باکس تب‌ها
                </button>
                <button
                  type="button"
                  onClick={() => addShiftReadyField('shift')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
                >
                  <Clock3 className="w-4 h-4" /> شیفت
                </button>
                <button
                  type="button"
                  onClick={() => addShiftReadyField('shiftType')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4" /> نوبت کاری
                </button>
                <button
                  type="button"
                  onClick={() => addShiftReadyField('shiftDuration')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm transition-all"
                >
                  <Timer className="w-4 h-4" /> مدت شیفت
                </button>
                <button
                  type="button"
                  onClick={() => addShiftReadyField('date')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <Calendar className="w-4 h-4" /> تاریخ
                </button>
                <button
                  type="button"
                  onClick={() => addShiftReadyField('weekday')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all"
                >
                  <CalendarDays className="w-4 h-4" /> روز هفته
                </button>
                <button
                  type="button"
                  onClick={() => addShiftReadyField('supervisor')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all"
                >
                  <Users className="w-4 h-4" /> ثبت کننده گزارش
                </button>
                <button
                  type="button"
                  onClick={() => addShiftReadyField('attendance')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all"
                >
                  <CheckSquare className="w-4 h-4" /> حضور و غیاب پرسنل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tabId = activeDesignTabId || tabs[0]?.id || 'main';
                    const boxNum = fields.filter(f => (f.tabId || tabs[0]?.id) === tabId && f.sectionId?.startsWith('باکس جدید')).length + 1;
                    const sectionId = `باکس جدید ${boxNum}`;
                    const key = `box_${Date.now()}`;
                    setFields(prev => [...prev, {
                      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      key,
                      label: 'باکس جدید',
                      type: 'textarea',
                      sectionId,
                      tabId,
                      width: 2,
                      placeholder: 'محتوای باکس را اینجا وارد کنید...',
                    }]);
                    setIsFieldsOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all"
                >
                  <Layers className="w-4 h-4" /> افزودن باکس
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader index={4} title="تب‌ها و استایل صفحه" help="ساختار کلی فرم را با تب‌ها مشخص کن. هر تب یک بخش جدا در فرم است (مثل اطلاعات شیفت، تولید، توقفات). شناسه تب، عنوان فارسی، رنگ و آیکون هر تب را تنظیم کن. ابزار رنگ یکپارچه رنگ همه تب‌ها را یکسان می‌کند. گروه‌های باکس رنگی برای زیرباکس‌های رنگی داخل هر بخش استفاده می‌شوند." />
            <button
              type="button"
              onClick={() => setIsTabsOpen(v => !v)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"
              aria-label={isTabsOpen ? 'جمع کردن تب‌ها' : 'نمایش تب‌ها'}
            >
              {isTabsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isTabsOpen && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-end">
              <button onClick={() => setTabs(prev => [...prev, blankTab()])} className="px-2 py-1 text-xs rounded bg-gray-800 text-white">
                + تب جدید
              </button>
            </div>
            <div className="space-y-3">
              {tabs.map((tab, idx) => (
                <div key={tab.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/40">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">شناسه تب</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="شناسه تب (انگلیسی)" value={tab.id} onChange={e => setTabs(prev => prev.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">عنوان تب</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="عنوان تب (فارسی)" value={tab.label} onChange={e => setTabs(prev => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">رنگ</div>
                      <div className="flex items-center gap-2 p-1 border rounded bg-white dark:bg-gray-700">
                        <input
                          type="color"
                          className="w-9 h-8 p-0 border-0 bg-transparent cursor-pointer"
                          value={tab.color || '#800020'}
                          onChange={e => setTabs(prev => prev.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))}
                        />
                        <input
                          className="flex-1 min-w-0 p-1 text-xs border rounded bg-white dark:bg-gray-700"
                          value={tab.color || '#800020'}
                          onChange={e => setTabs(prev => prev.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">آیکون</div>
                      <div className="p-2 border rounded bg-white dark:bg-gray-700">
                    {(() => {
                      const current = TAB_ICON_OPTIONS.find(opt => opt.id === (tab.icon || 'clipboard')) || TAB_ICON_OPTIONS[0];
                      const CurrentIcon = current.Icon;
                      return (
                        <button
                          type="button"
                          onClick={() => setIconPickerTabId(tab.id)}
                          className="w-full px-2 py-1.5 text-xs rounded border flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded border bg-gray-50 dark:bg-gray-900/40">
                            <CurrentIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-medium">انتخاب آیکون</span>
                          <span className="mr-auto text-[10px] text-gray-400 truncate max-w-[120px]">{current.label}</span>
                        </button>
                      );
                    })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded border"
                      onClick={() =>
                      setTabs(prev => {
                        if (prev.length <= 1) return prev;
                        const target = prev[idx];
                        const next = prev.filter((_, i) => i !== idx);
                        setFields(old => old.map(f => (f.tabId === target.id ? { ...f, tabId: next[0].id } : f)));
                        if (activeDesignTabId === target.id) {
                          setActiveDesignTabId(next[0].id);
                        }
                        return next;
                      })
                    }
                    >
                      <Trash2 className="w-4 h-4" /> حذف تب
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-2">
              <h4 className="text-xs font-bold text-gray-500 mb-2">ابزار رنگ یکپارچه</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 p-2 border rounded bg-white dark:bg-gray-700">
                  <input
                    type="color"
                    className="w-10 h-8 p-0 border-0 bg-transparent cursor-pointer"
                    value={themeColor}
                    onChange={e => applyUnifiedColor(e.target.value)}
                  />
                  <input
                    className="w-28 p-1 text-xs border rounded bg-white dark:bg-gray-700 font-mono"
                    value={themeColor}
                    onChange={e => {
                      const val = e.target.value;
                      setThemeColor(val);
                      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) {
                        applyUnifiedColor(val);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map(color => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => applyUnifiedColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${themeColor.toLowerCase() === color.toLowerCase() ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">با تغییر رنگ، رنگ همه تب‌ها یکپارچه اعمال می‌شود.</p>
            </div>
            {groups.length > 0 && (
              <div className="border-t pt-3 mt-2">
                <h4 className="text-xs font-bold text-gray-500 mb-2">گروه‌های باکس رنگی</h4>
                <p className="text-[11px] text-gray-500 mb-2">هر گروه یک باکس رنگی جدا در بخش است. فیلدها را با انتخاب گروه در ویرایشگر فیلد به باکس مورد نظر متصل کن. عرض باکس را هم می‌توانی تنظیم کنی.</p>
                <div className="space-y-2">
                  {groups.map((g, gi) => (
                    <div key={g.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border bg-white dark:bg-gray-800">
                      <input type="color" className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer" value={g.color} onChange={e => setGroups(prev => prev.map((x, i) => (i === gi ? { ...x, color: e.target.value } : x)))} />
                      <input className="flex-1 min-w-[80px] p-2 text-xs border rounded bg-white dark:bg-gray-700" placeholder="عنوان گروه" value={g.title} onChange={e => setGroups(prev => prev.map((x, i) => (i === gi ? { ...x, title: e.target.value } : x)))} />
                      <select className="p-2 text-xs border rounded bg-white dark:bg-gray-700" value={g.width ?? 1} onChange={e => setGroups(prev => prev.map((x, i) => (i === gi ? { ...x, width: Number(e.target.value) as 1 | 2 | 3 } : x)))}>
                        <option value={1}>یک‌سوم</option>
                        <option value={2}>دو‌سوم</option>
                        <option value={3}>کامل</option>
                      </select>
                      <span className="text-[10px] font-mono text-gray-400">{g.id}</span>
                      <button type="button" className="p-2 text-red-600 hover:bg-red-50 rounded" onClick={() => { setGroups(prev => prev.filter((_, i) => i !== gi)); setFields(prev => prev.map(f => f.groupId === g.id ? { ...f, groupId: undefined } : f)); }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionHeader index={5} title="فیلدها" help="فیلدهای فرم را اینجا تعریف می‌کنی. با دکمه «افزودن فیلد خالی» می‌توانی فیلدهای زیادی اضافه کنی. فیلدهایی که بخش یکسان دارند در یک باکس قرار می‌گیرند. هر فیلد می‌تواند عنوان نمایشی (نام روی فیلد)، نوع، بخش، گروه رنگی، عرض و قوانین داشته باشد." />
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"
                  onClick={() => setIsFieldsOpen(v => !v)}
                  aria-label={isFieldsOpen ? 'جمع کردن فیلدها' : 'نمایش فیلدها'}
                >
                  {isFieldsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {isFieldsOpen && (
                <>
                  <div className="rounded-xl border p-3 bg-gray-50 dark:bg-gray-900/40 space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-500">تب فعال برای طراحی فیلدها:</span>
                      <HelpHint text="هر فیلدی که با دکمه‌های ابزار آماده یا اضافه کردن فیلد خالی اضافه می‌کنی، به تب فعال (که اینجا انتخاب کرده‌ای) متصل می‌شود. برای اضافه کردن فیلد به تب دیگر، ابتدا آن تب را انتخاب کن." />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tabs.map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDesignTabId(tab.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${activeDesignTabId === tab.id ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">تعداد فیلدهای این تب: {activeFieldEntries.length}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFields(prev => [
                            ...prev,
                            { ...blankField(), tabId: activeDesignTabId, sectionId: prev.find(f => (f.tabId || tabs[0]?.id || 'main') === activeDesignTabId)?.sectionId || '' },
                          ])
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> افزودن فیلد خالی
                      </button>
                    </div>
                  </div>

                  {activeFieldEntries.length === 0 && (
                    <div className="text-center py-8 rounded-xl border border-dashed text-gray-500 text-sm">
                      <p>در این تب هنوز فیلدی ثبت نشده است. از دکمه «افزودن فیلد خالی» بالا استفاده کنید.</p>
                    </div>
                  )}

                  {activeFieldEntries.map(({ field: f, index: idx }) => (
                <div key={f.id} className="space-y-4 border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-bold">تنظیمات فیلد</span>
                    <span className="font-mono">{f.key || `field_${idx + 1}`}</span>
                    <HelpHint text="کلید فنی (key) فیلد باید یکتا باشد و در SQL و ذخیره داده‌ها استفاده می‌شود. نوع فیلد (متن، عدد، تاریخ، لیست، ماتریس و...)، تب مربوطه، بخش (نام هدر باکس)، گروه رنگی (برای زیرباکس‌های رنگی)، و قوانین اعتبارسنجی (حداقل، حداکثر، وابستگی) در همین بخش تنظیم می‌شوند." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">کلید فنی (key) <span className="text-red-500">*</span></div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700 font-mono" placeholder="مثال: shift_name" value={f.key} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">عنوان نمایشی (نام روی فیلد) <span className="text-red-500">*</span> <HelpHint text="این نام روی هر فیلد در فرم نمایش داده می‌شود؛ مثل «نام شیفت»، «تاریخ»، «تعداد تولید»." /></div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="مثال: نام شیفت" value={f.label} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">تب مربوطه</div>
                      <select className="w-full p-2 border rounded bg-white dark:bg-gray-700" value={f.tabId || tabs[0]?.id || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, tabId: e.target.value } : x)))}>
                        {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">بخش (هدر باکس) <HelpHint text="فیلدهایی که بخش یکسان دارند در یک باکس با هدر مشترک قرار می‌گیرند. برای قرار دادن چند فیلد در یک باکس، همان نام بخش را برای همه آن‌ها بگذار. برای باکس جدید، نام جدید وارد کن یا از لیست انتخاب کن." /></div>
                      <input
                        list={`section-list-${activeDesignTabId}`}
                        className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                        placeholder="مثال: اطلاعات پایه (خالی = عمومی)"
                        value={f.sectionId || ''}
                        onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, sectionId: e.target.value } : x)))}
                      />
                      <datalist id={`section-list-${activeDesignTabId}`}>
                        {Array.from(new Set(fields.filter(x => (x.tabId || tabs[0]?.id || 'main') === activeDesignTabId).map(x => x.sectionId).filter(Boolean))).map(sid => (
                          <option key={sid} value={sid} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">گروه</div>
                      <select className="w-full p-2 border rounded bg-white dark:bg-gray-700" value={f.groupId || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, groupId: e.target.value || undefined } : x)))}>
                        <option value="">بدون گروه</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.title} ({g.color})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">عرض</div>
                      <select className="w-full p-2 border rounded bg-white dark:bg-gray-700" value={f.width || 1} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, width: Number(e.target.value) as 1 | 2 } : x)))}>
                        <option value={1}>نیم</option>
                        <option value={2}>کامل</option>
                      </select>
                    </div>
                    <label className="text-xs flex items-center gap-1 p-2 border rounded bg-white dark:bg-gray-700">
                      <input type="checkbox" checked={!!f.required} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, required: e.target.checked } : x)))} /> اجباری
                    </label>
                    <button type="button" className="text-red-600 hover:bg-red-50 p-2 rounded border col-span-2" onClick={() => setFields(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}><Trash2 className="w-4 h-4 inline mr-1" />حذف فیلد</button>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">نوع فیلد</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FIELD_TYPE_OPTIONS.map(option => {
                        const Icon = option.Icon;
                        const active = f.type === option.id;
                        return (
                          <button
                            key={`${f.id}-${option.id}`}
                            type="button"
                            onClick={() => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, type: option.id } : x)))}
                            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition ${active ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {option.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">متن راهنما داخل فیلد</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="placeholder" value={f.placeholder || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, placeholder: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">توضیح فیلد</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="مثال: این فیلد برای..." value={f.helpText || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, helpText: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">حداقل عدد</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="min" value={f.validation?.min ?? ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), min: e.target.value === '' ? undefined : Number(e.target.value) } } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">حداکثر عدد</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="max" value={f.validation?.max ?? ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), max: e.target.value === '' ? undefined : Number(e.target.value) } } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">الگوی regex</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="regex" value={f.validation?.regex || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), regex: e.target.value || undefined } } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">باید کوچک‌تر یا مساوی این فیلد باشد</div>
                      <input
                        className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                        placeholder="مثال: total_count"
                        value={f.validation?.mustBeLessOrEqualField || ''}
                        onChange={e =>
                          setFields(prev =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, validation: { ...(x.validation || {}), mustBeLessOrEqualField: e.target.value || undefined } }
                                : x
                            )
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">نمایش شرطی - نام فیلد مرجع</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="مثال: shift_type" value={f.validation?.dependsOn?.field || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), dependsOn: e.target.value ? { field: e.target.value, equals: x.validation?.dependsOn?.equals ?? '' } : undefined } } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">نمایش شرطی - مقدار مورد انتظار</div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="مثال: Day1" value={f.validation?.dependsOn?.equals ?? ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), dependsOn: x.validation?.dependsOn?.field ? { field: x.validation.dependsOn.field, equals: e.target.value } : undefined } } : x)))} />
                    </div>
                    {f.type === 'select' && (
                      <div className="col-span-2 space-y-1">
                        <div className="text-[11px] text-gray-500">گزینه‌های لیست (هر خط: label:value)</div>
                      <textarea
                        className="w-full p-2 border rounded bg-white dark:bg-gray-700 min-h-[60px]"
                        placeholder={'گزینه‌ها (هر خط: label:value)\nمثال:\nشیفت A:A\nشیفت B:B'}
                        value={(f.options || []).map(o => `${o.label}:${o.value}`).join('\n')}
                        onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, options: parseSelectOptions(e.target.value) } : x)))}
                      />
                      </div>
                    )}
                    {(f.type === 'time_pair' || f.type === 'matrix') && (
                      <>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">فیلد هدف برای برابری مجموع</div>
                          <input
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                            placeholder="مثال: shift_duration"
                            value={f.validation?.totalMustEqualField || ''}
                            onChange={e =>
                              setFields(prev =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, validation: { ...(x.validation || {}), totalMustEqualField: e.target.value || undefined } } : x
                                )
                              )
                            }
                          />
                        </div>
                        {f.type === 'time_pair' && (
                          <>
                            <label className="text-xs flex items-center gap-1 p-2 border rounded bg-white dark:bg-gray-700 col-span-2">
                              <input
                                type="checkbox"
                                checked={!!f.timePairConfig?.requireReasonWhenStop}
                                onChange={e =>
                                  setFields(prev =>
                                    prev.map((x, i) =>
                                      i === idx
                                        ? {
                                            ...x,
                                            timePairConfig: { ...(x.timePairConfig || {}), requireReasonWhenStop: e.target.checked },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                              الزام علت توقف
                            </label>
                            <input
                              className="col-span-2 p-2 border rounded bg-white dark:bg-gray-700"
                              placeholder="برچسب علت توقف"
                              value={f.timePairConfig?.reasonLabel || ''}
                              onChange={e =>
                                setFields(prev =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, timePairConfig: { ...(x.timePairConfig || {}), reasonLabel: e.target.value } } : x
                                  )
                                )
                              }
                            />
                          </>
                        )}
                      </>
                    )}
                    {f.type === 'repeatable_list' && (
                      <>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">placeholder آیتم‌ها</div>
                        <input
                          className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                          placeholder="placeholder آیتم‌ها"
                          value={f.repeatableListConfig?.placeholder || ''}
                          onChange={e =>
                            setFields(prev =>
                              prev.map((x, i) =>
                                i === idx
                                  ? { ...x, repeatableListConfig: { ...(x.repeatableListConfig || {}), placeholder: e.target.value } }
                                  : x
                              )
                            )
                          }
                        />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">minItems</div>
                        <input
                          type="number"
                          className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                          placeholder="minItems"
                          value={f.repeatableListConfig?.minItems ?? ''}
                          onChange={e =>
                            setFields(prev =>
                              prev.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      repeatableListConfig: {
                                        ...(x.repeatableListConfig || {}),
                                        minItems: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    }
                                  : x
                              )
                            )
                          }
                        />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">maxItems</div>
                        <input
                          type="number"
                          className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                          placeholder="maxItems"
                          value={f.repeatableListConfig?.maxItems ?? ''}
                          onChange={e =>
                            setFields(prev =>
                              prev.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      repeatableListConfig: {
                                        ...(x.repeatableListConfig || {}),
                                        maxItems: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    }
                                  : x
                              )
                              )
                            }
                          />
                        </div>
                        </>
                      )}
                    {f.type === 'matrix' && (
                      <div className="col-span-2 space-y-2">
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">ردیف‌های ماتریس (هر خط یک ردیف)</div>
                          <textarea
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 min-h-[70px]"
                            placeholder={'rows (هر خط یک ردیف)\nخط A\nخط B'}
                            value={(f.matrixConfig?.rows || []).join('\n')}
                            onChange={e =>
                              setFields(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        matrixConfig: {
                                          ...(x.matrixConfig || { rows: [], columns: [] }),
                                          rows: e.target.value.split('\n').map(v => v.trim()).filter(Boolean),
                                        },
                                      }
                                    : x
                                )
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">ستون‌های ماتریس (هر خط یک ستون)</div>
                          <textarea
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 min-h-[70px]"
                            placeholder={'مکانیکی\nبرقی'}
                            value={(f.matrixConfig?.columns || []).join('\n')}
                            onChange={e =>
                              setFields(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        matrixConfig: {
                                          ...(x.matrixConfig || { rows: [], columns: [] }),
                                          columns: e.target.value.split('\n').map(v => v.trim()).filter(Boolean),
                                        },
                                      }
                                    : x
                                )
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">مقدار پیش‌فرض</div>
                          <input
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                            placeholder="defaultValue"
                            value={f.matrixConfig?.defaultValue || ''}
                            onChange={e =>
                              setFields(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        matrixConfig: {
                                          ...(x.matrixConfig || { rows: [], columns: [] }),
                                          defaultValue: e.target.value,
                                        },
                                      }
                                    : x
                                )
                              )
                            }
                          />
                        </div>
                        <label className="block text-xs flex items-center gap-1 p-2 border rounded bg-white dark:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={!!f.matrixConfig?.enforceNumeric}
                            onChange={e =>
                              setFields(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        matrixConfig: {
                                          ...(x.matrixConfig || { rows: [], columns: [] }),
                                          enforceNumeric: e.target.checked,
                                        },
                                      }
                                    : x
                                )
                              )
                            }
                          />
                          مقادیر ماتریس عددی باشند + جمع‌ها نمایش داده شود
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
              )}
            </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={saveDraft} className="px-4 py-2 rounded-lg bg-primary text-white flex items-center gap-2">
            <Save className="w-4 h-4" /> ذخیره پیش‌نویس
          </button>
          <button
            onClick={async () => {
              await saveDraft();
              const targetSlug = slug.trim();
              if (targetSlug) {
                await publishReportDefinition(targetSlug);
                alert('نسخه منتشر شد.');
                await loadDefs();
              }
            }}
            className="px-4 py-2 rounded-lg bg-green-600 text-white flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" /> ذخیره و انتشار
          </button>
        </div>
          </div>

          <div className="flex-1 min-w-[min(480px,45%)] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2 z-10">
              <Eye className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">پیش‌نمایش</span>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3">تغییرات را به‌صورت زنده در اینجا می‌بینی.</p>
              {tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' ? (
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                  <ShiftReportFormContent
                    embed
                    readOnly={false}
                    personnel={personnel}
                    showNavButtons={true}
                    showSubmitButton={false}
                    initialValue={{ shiftInfo: { supervisorName: user?.fullName ?? '' } }}
                  />
                </div>
              ) : (
                <DynamicFormRenderer fields={fields} tabs={tabs} groups={groups} value={previewValue} onChange={setPreviewValue} activeTabId={activeDesignTabId} personnel={personnel} />
              )}
            </div>
          </div>
        </div>

        {iconPickerTabId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setIconPickerTabId(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <h3 className="font-bold">انتخاب آیکون تب</h3>
                <button
                  type="button"
                  onClick={() => setIconPickerTabId(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                >
                  ×
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {TAB_ICON_OPTIONS.map(opt => {
                    const Icon = opt.Icon;
                    const tabIdx = tabs.findIndex(t => t.id === iconPickerTabId);
                    const isSelected = tabIdx >= 0 && (tabs[tabIdx]?.icon || 'clipboard') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        onClick={() => {
                          if (iconPickerTabId) {
                            setTabs(prev =>
                              prev.map(t => (t.id === iconPickerTabId ? { ...t, icon: opt.id } : t))
                            );
                            setIconPickerTabId(null);
                          }
                        }}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] truncate w-full text-center">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <DataPage
      title="طراحی فرم گزارش"
      icon={LayoutTemplate}
      data={defs}
      columns={columns}
      isLoading={loading}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      onAdd={() => {
        resetForm();
        setViewMode('FORM');
      }}
      onReload={loadDefs}
      onEdit={handleEdit}
      onViewDetails={handleEdit}
      exportName="ReportFormDefinitions"
    />
  );
};

export default ReportFormDesign;
