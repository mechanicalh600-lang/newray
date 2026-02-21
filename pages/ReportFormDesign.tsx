import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  GripVertical,
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
  Magnet,
  // ── تجهیزات صنعتی ──
  Fan,
  Drill,
  Fuel,
  Nut,
  Bolt,
  Cylinder,
  AirVent,
  RotateCw,
  Settings,
  Forklift,
  Cable,
  Boxes,
  Workflow,
  Radius,
  Pickaxe,
  Newspaper,
  Minimize,
  Mailbox,
  Layers2,
  GalleryVerticalEnd,
  AlignVerticalDistributeStart,
  // ── فلش، تیک، زنگ، مکعب ──
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  CheckCheck,
  BellDot,
  BellRing,
  Box,
} from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { ConfirmModal } from '../components/ConfirmModal';
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
  generateSqlForDefinition,
} from '../services/reportDefinitions';
import { fetchMasterData } from '../workflowStore';
import { getShamsiDate, getPersianDayName } from '../utils';
import { User } from '../types';

const blankField = (): ReportFieldSchema => ({
  id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  key: '',
  label: '',
  type: 'text',
  width: 2,
  required: false,
});

const getNextFieldLabel = (fields: ReportFieldSchema[]): string => {
  const nums = fields
    .map(f => (f.label || '').match(/^فیلد جدید\s*(\d+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => parseInt(m[1], 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return `فیلد جدید ${max + 1}`;
};

const blankTab = (): ReportTabSchema => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  label: 'تب جدید',
  color: '#800020',
  icon: 'clipboard',
});

/** ۹ تب گزارش شیفت (همان ساختار منوی گزارش شیفت) - برای استفاده در DynamicReportRuntime */
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

const OmegaIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 20h4.5a.5.5 0 0 0 .5-.5v-.282a.52.52 0 0 0-.247-.437 8 8 0 1 1 8.494-.001.52.52 0 0 0-.247.438v.282a.5.5 0 0 0 .5.5H21"/>
  </svg>
);

const TAB_ICON_OPTIONS: Array<{ id: ReportTabSchema['icon']; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  /* ── فلش ── */
  { id: 'arrowup', label: 'فلش بالا', Icon: ArrowUp },
  { id: 'arrowdown', label: 'فلش پایین', Icon: ArrowDown },
  { id: 'arrowleft', label: 'فلش چپ', Icon: ArrowLeft },
  { id: 'arrowright', label: 'فلش راست', Icon: ArrowRight },
  { id: 'arrowupright', label: 'فلش بالا راست', Icon: ArrowUpRight },
  { id: 'arrowdownleft', label: 'فلش پایین چپ', Icon: ArrowDownLeft },
  { id: 'chevronright', label: 'فلش کشیده راست', Icon: ChevronRight },
  { id: 'chevronleft', label: 'فلش کشیده چپ', Icon: ChevronLeft },
  /* ── تیک ── */
  { id: 'check', label: 'تیک', Icon: Check },
  { id: 'checkcircle', label: 'تیک دایره', Icon: CheckCircle },
  { id: 'checksquare', label: 'تیک مربع', Icon: CheckSquare },
  { id: 'checkcheck', label: 'دوتیک', Icon: CheckCheck },
  /* ── زنگ ── */
  { id: 'bell', label: 'زنگ', Icon: Bell },
  { id: 'belldot', label: 'زنگ با نقطه', Icon: BellDot },
  { id: 'bellring', label: 'زنگ در حال نواختن', Icon: BellRing },
  /* ── مکعب / جعبه ── */
  { id: 'box', label: 'مکعب / جعبه', Icon: Box },
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
  { id: 'magnet', label: 'مگنت', Icon: Magnet },
  { id: 'cog', label: 'چرخ‌دنده', Icon: Cog },
  { id: 'gears', label: 'گیربکس / چرخدنده‌ها', Icon: Settings },
  { id: 'fan', label: 'فن', Icon: Fan },
  { id: 'drill', label: 'دریل / پیچ‌گوشتی', Icon: Drill },
  { id: 'fuel', label: 'پمپ سوخت', Icon: Fuel },
  { id: 'nut', label: 'مهره', Icon: Nut },
  { id: 'bolt', label: 'پیچ', Icon: Bolt },
  { id: 'cylinder', label: 'سیلندر', Icon: Cylinder },
  { id: 'airvent', label: 'هواکش', Icon: AirVent },
  { id: 'rotatecw', label: 'موتور / الکتروموتور', Icon: RotateCw },
  { id: 'forklift', label: 'جرثقیل / لیفتراک', Icon: Forklift },
  { id: 'cable', label: 'کابل / سیم', Icon: Cable },
  { id: 'boxes', label: 'جعبه / انبار', Icon: Boxes },
  { id: 'workflow', label: 'گردش کار', Icon: Workflow },
  { id: 'radius', label: 'شعاع / دایره', Icon: Radius },
  { id: 'pickaxe', label: 'کلنگ', Icon: Pickaxe },
  { id: 'newspaper', label: 'روزنامه / خبر', Icon: Newspaper },
  { id: 'minimize', label: 'کوچک‌سازی', Icon: Minimize },
  { id: 'mailbox', label: 'صندوق پستی', Icon: Mailbox },
  { id: 'layers2', label: 'لایه‌های چندگانه', Icon: Layers2 },
  { id: 'galleryverticalend', label: 'گالری عمودی', Icon: GalleryVerticalEnd },
  { id: 'alignverticaldistributestart', label: 'تراز عمودی بالا', Icon: AlignVerticalDistributeStart },
  { id: 'omega', label: 'امگا', Icon: OmegaIcon },
  { id: 'building', label: 'ساختمان', Icon: Building2 },
  { id: 'home', label: 'خانه', Icon: Home },
  { id: 'door', label: 'درب', Icon: DoorOpen },
  /* ── Energy / Environment ── */
  { id: 'flame', label: 'شعله', Icon: Flame },
  { id: 'thermometer', label: 'دما', Icon: Thermometer },
  { id: 'droplets', label: 'آب / پمپ آب', Icon: Droplets },
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
  { id: 'letter', label: 'نامه', Icon: Mail },
  { id: 'send', label: 'ارسال', Icon: Send },
  { id: 'message', label: 'پیام', Icon: MessageSquare },
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

const MATRIX_QUERY_TABLES = [
  { id: 'work_orders', label: 'دستور کارها' },
  { id: 'shifts', label: 'شیفت' },
  { id: 'personnel', label: 'پرسنل' },
  { id: 'equipment', label: 'تجهیزات' },
  { id: 'parts', label: 'قطعات' },
  { id: 'shift_reports', label: 'گزارشات شیفت' },
  { id: 'shift_types', label: 'نوبت کاری' },
  { id: 'locations', label: 'محل استقرار' },
  { id: 'part_requests', label: 'درخواست قطعات' },
  { id: 'equipment_classes', label: 'کلاس تجهیزات' },
  { id: 'equipment_groups', label: 'گروه تجهیزات' },
];

const SELECT_OPTIONS_TABLES = [
  { id: 'shifts', label: 'شیفت' },
  { id: 'shift_types', label: 'نوبت کاری' },
  { id: 'personnel', label: 'پرسنل' },
  { id: 'user_groups', label: 'گروه‌های کاربری' },
  { id: 'locations', label: 'محل استقرار' },
  { id: 'measurement_units', label: 'واحدهای اندازه‌گیری' },
  { id: 'work_activity_types', label: 'نوع فعالیت' },
  { id: 'work_types', label: 'نوع کار' },
  { id: 'work_order_priorities', label: 'اولویت انجام' },
  { id: 'equipment_classes', label: 'کلاس تجهیزات' },
  { id: 'equipment_groups', label: 'گروه تجهیزات' },
  { id: 'equipment', label: 'تجهیزات' },
  { id: 'parts', label: 'قطعات' },
  { id: 'app_users', label: 'کاربران سیستم' },
  { id: 'org_chart', label: 'چارت سازمانی' },
];
const SELECT_OPTIONS_TABLE_CONFIG: Record<string, { labelCol: string; valueCol: string }> = {
  shifts: { labelCol: 'name', valueCol: 'code' },
  shift_types: { labelCol: 'title', valueCol: 'value' },
  personnel: { labelCol: 'full_name', valueCol: 'id' },
  user_groups: { labelCol: 'name', valueCol: 'code' },
  locations: { labelCol: 'name', valueCol: 'code' },
  measurement_units: { labelCol: 'title', valueCol: 'id' },
  work_activity_types: { labelCol: 'name', valueCol: 'code' },
  work_types: { labelCol: 'name', valueCol: 'code' },
  work_order_priorities: { labelCol: 'name', valueCol: 'code' },
  equipment_classes: { labelCol: 'name', valueCol: 'code' },
  equipment_groups: { labelCol: 'name', valueCol: 'code' },
  equipment: { labelCol: 'name', valueCol: 'code' },
  parts: { labelCol: 'name', valueCol: 'code' },
  app_users: { labelCol: 'full_name', valueCol: 'id' },
  org_chart: { labelCol: 'name', valueCol: 'code' },
};

const FIELD_TYPE_OPTIONS: Array<{ id: ReportFieldSchema['type']; title: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'text', title: 'متن', Icon: FileText },
  { id: 'number', title: 'عدد', Icon: Hash },
  { id: 'date', title: 'تاریخ', Icon: Calendar },
  { id: 'time', title: 'زمان', Icon: Clock3 },
  { id: 'select', title: 'لیست انتخابی', Icon: ListChecks },
  { id: 'textarea', title: 'متن چندخطی', Icon: ClipboardList },
  { id: 'checkbox', title: 'چک‌باکس', Icon: CheckSquare },
  { id: 'attendance', title: 'حضور و غیاب', Icon: Users },
  { id: 'repeatable_list', title: 'لیست تکرارشونده', Icon: Layers },
  { id: 'time_pair', title: 'جفت زمان', Icon: Timer },
  { id: 'matrix', title: 'ماتریس', Icon: Grid3X3 },
];

const FieldCategory: React.FC<{ title: string; color: string; help?: string; children: React.ReactNode }> = ({ title, color, help, children }) => (
  <div className="rounded-lg border-2 p-3 space-y-2" style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}>
    <h4 className="text-xs font-bold px-1 flex items-center gap-1" style={{ color }}>{title}{help ? <HelpHint text={help} /> : null}</h4>
    {children}
  </div>
);

const HelpHint: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  useEffect(() => () => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }, []);

  const scheduleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  };
  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
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
            className="fixed z-[9999] w-72 max-w-[90vw] p-3 text-[11px] leading-5 rounded-lg border bg-white dark:bg-gray-800 shadow-xl text-gray-600 dark:text-gray-300 select-text cursor-text"
            style={{ top: pos.top, left: pos.left, whiteSpace: 'pre-line' }}
            onMouseEnter={cancelClose}
            onMouseLeave={() => {
              cancelClose();
              setOpen(false);
            }}
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
  const [viewOnlyDef, setViewOnlyDef] = useState<ReportDefinition | null>(null);
  const [viewOnlyValue, setViewOnlyValue] = useState<Record<string, any>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('گزارشات');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [showTitleField, setShowTitleField] = useState(false);
  const [iconPickerTabId, setIconPickerTabId] = useState<string | null>(null);
  const iconPickerTargetRef = useRef<{ tabId: string; tabIndex: number } | null>(null);
  const [tabs, setTabs] = useState<ReportTabSchema[]>([{ id: 'main', label: 'عمومی', color: '#800020', icon: 'clipboard' }]);
  const [draggedTabIdx, setDraggedTabIdx] = useState<number | null>(null);
  const [groups, setGroups] = useState<ReportFormGroup[]>([]);
  const [themeColor, setThemeColor] = useState('#800020');
  const [fields, setFields] = useState<ReportFieldSchema[]>([{ ...blankField(), label: 'فیلد جدید 1' }]);
  const [activeDesignTabId, setActiveDesignTabId] = useState<string>('main');
  const [activeDesignBoxSectionId, setActiveDesignBoxSectionId] = useState<string | null>(null);
  const [selectedDesignFieldId, setSelectedDesignFieldId] = useState<string | null>(null);
  const [lastCreatedBoxSectionId, setLastCreatedBoxSectionId] = useState<string | null>(null);
  const [previewActiveTab, setPreviewActiveTab] = useState<number>(1);
  const [visibleTools, setVisibleTools] = useState<Record<string, boolean>>({
    shift: true, shiftType: true, shiftDuration: true, date: true, weekday: true, supervisor: true, attendance: true,
  });
  const [previewValue, setPreviewValue] = useState<Record<string, any>>({});
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [isSqlCopied, setIsSqlCopied] = useState(false);
  const [isRequiredSqlCopied, setIsRequiredSqlCopied] = useState(false);
  const [isSqlExpanded, setIsSqlExpanded] = useState(false);
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [selectOptionsDraft, setSelectOptionsDraft] = useState<Record<string, string>>({});
  const [matrixRowsDraft, setMatrixRowsDraft] = useState<Record<string, string>>({});
  const [matrixColumnsDraft, setMatrixColumnsDraft] = useState<Record<string, string>>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTabsOpen, setIsTabsOpen] = useState(false);
  const [isBoxesOpen, setIsBoxesOpen] = useState(false);
  const [isFieldsOpen, setIsFieldsOpen] = useState(false);
  const [publishConfirmTarget, setPublishConfirmTarget] = useState<ReportDefinition | null>(null);
  const [publishResult, setPublishResult] = useState<{ success: boolean; sql?: string; error?: string; def?: ReportDefinition } | null>(null);
  const [publishSqlCopied, setPublishSqlCopied] = useState(false);

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

  // با زدن فلش بازگشت در هدر Layout به لیست رکوردها برگرد
  useEffect(() => {
    const handler = () => {
      setViewMode('LIST');
      resetForm();
    };
    window.addEventListener('report-form-design-back-to-list', handler);
    return () => window.removeEventListener('report-form-design-back-to-list', handler);
  }, []);

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
    setFields([{ ...blankField(), label: 'فیلد جدید 1' }]);
    setActiveDesignTabId('main');
    setVisibleTools({ shift: true, shiftType: true, shiftDuration: true, date: true, weekday: true, supervisor: true, attendance: true });
    setPreviewValue({});
    setIsSqlExpanded(false);
    setGroups([]);
    setHistoryPast([]);
    setHistoryFuture([]);
  };

  const columns = useMemo(
    () => [
      { header: 'عنوان', accessor: (i: ReportDefinition) => i.title, sortKey: 'title' },
      { header: 'شناسه فرم', accessor: (i: ReportDefinition) => <span className="font-mono">{i.slug}</span>, sortKey: 'slug' },
      { header: 'دسته', accessor: (i: ReportDefinition) => i.category, sortKey: 'category' },
      { header: 'نسخه', accessor: (i: ReportDefinition) => i.version, sortKey: 'version' },
      { header: 'نسخه منتشرشده', accessor: (i: ReportDefinition) => i.published_version || 0, sortKey: 'published_version' },
      {
        header: 'وضعیت',
        accessor: (i: ReportDefinition) => {
          const isDraft = (i.version || 0) > (i.published_version || 0);
          if (isDraft) return <span className="text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded text-xs font-medium">پیش‌نویس</span>;
          if (i.is_active) return <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded text-xs font-medium">فعال</span>;
          return <span className="text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded text-xs font-medium">غیرفعال</span>;
        },
        sortKey: 'is_active',
      },
    ],
    []
  );

  const saveDraft = async () => {
    try {
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
      const effectiveFields = fields.filter(f => (f.key || '').trim() || (f.label || '').trim());
      if (!effectiveFields.length) {
        alert('حداقل یک فیلد برای فرم لازم است.');
        return;
      }
      if (effectiveFields.some(f => !(f.key || '').trim())) {
        alert('کلید فنی همه فیلدها باید کامل باشد.');
        return;
      }
      const keys = effectiveFields.map(f => (f.key || '').trim());
      const dupKey = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dupKey) {
        alert(`کلید تکراری در فرم وجود دارد: ${dupKey}`);
        return;
      }
      for (const f of effectiveFields) {
        if (f.type === 'select' && (!f.options || !f.options.length)) {
          alert(`فیلد انتخابی «${f.label || f.key}» باید حداقل یک گزینه داشته باشد.`);
          return;
        }
        if (f.type === 'matrix' && (!f.matrixConfig?.rows?.length || !f.matrixConfig?.columns?.length)) {
          alert(`برای فیلد ماتریسی «${f.label || f.key}»، ردیف و ستون الزامی است.`);
          return;
        }
      }
      const listColumns = effectiveFields.map(f => ({ key: (f.key || '').trim(), label: f.label || '', visible: true }));
      const result = await upsertReportDefinitionDraft({
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
            fieldKeys: effectiveFields.filter(f => f.sectionId === s).map(f => (f.key || '').trim()),
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
      alert(result.usedFallback
        ? `پیش‌نویس در مرورگر ذخیره شد. خطای سرور: ${(result as { error?: string }).error || 'نامشخص'}. جدول report_definitions و RLS در Supabase را بررسی کنید.`
        : 'پیش‌نویس فرم ذخیره شد.');
      await loadDefs();
      setViewMode('LIST');
      resetForm();
    } catch (err) {
      console.error('خطا در ذخیره فرم:', err);
      alert(`خطا در ذخیره: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handlePublishConfirm = async () => {
    if (!publishConfirmTarget) return;
    const target = publishConfirmTarget;
    setPublishConfirmTarget(null);
    try {
      await publishReportDefinition(target.slug);
      const sql = generateSqlForDefinition({ ...target, published_version: target.version });
      setPublishResult({ success: true, sql, def: target });
      await loadDefs();
    } catch (err) {
      setPublishResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
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

  const handleView = (row: ReportDefinition) => {
    setViewOnlyDef(row);
    setViewOnlyValue({
      report_date: getShamsiDate(),
      supervisor_name: user?.fullName ?? '',
    });
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
    setFields((row.form_schema?.fields || []).length ? row.form_schema.fields : [{ ...blankField(), label: 'فیلد جدید 1' }]);
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
    if (preset[0]?.key === 'shift_name') {
      setVisibleTools({ shift: true, shiftType: true, shiftDuration: true, date: true, weekday: true, supervisor: true, attendance: true });
    }
    const today = getShamsiDate();
    setPreviewValue({
      report_date: today,
      shift_duration: '12:00',
      weekday: getPersianDayName(today),
      supervisor_name: user?.fullName || '',
    });
  };

  const addShiftReadyField = useCallback((tool: 'tabs' | 'shift' | 'shiftType' | 'shiftDuration' | 'weekday' | 'date' | 'supervisor' | 'attendance') => {
    if (tool === 'tabs') {
      setTabs(prev => {
        const allExists = SHIFT_TABS_PRESET.every(t => prev.some(p => p.id === t.id));
        if (allExists) {
          const single = [{ id: 'main', label: 'عمومی', color: themeColor, icon: 'clipboard' as ReportTabSchema['icon'] }];
          queueMicrotask(() => {
            setFields(current => current.map(f => ({ ...f, tabId: single[0].id })));
            setActiveDesignTabId(single[0].id);
          });
          return single;
        }
        setActiveDesignTabId(SHIFT_TABS_PRESET[0].id);
        setThemeColor(SHIFT_TABS_PRESET[0].color || themeColor);
        return SHIFT_TABS_PRESET;
      });
      return;
    }

    const baseTabId = activeDesignTabId || tabs[0]?.id || 'main';

    setFields(prev => {
      const hasKey = (k: string) => prev.some(f => f.key === k);
      const add = (field: Omit<ReportFieldSchema, 'id' | 'tabId'>) => ({
        ...field,
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tabId: baseTabId,
      });

      if (tool === 'shift') {
        if (hasKey('shift_name')) return prev.filter(f => f.key !== 'shift_name');
        return [...prev, add({ key: 'shift_name', label: 'شیفت', type: 'select', required: true, sectionId: 'اطلاعات پایه', options: [{ label: 'شیفت A', value: 'A' }, { label: 'شیفت B', value: 'B' }, { label: 'شیفت C', value: 'C' }] })];
      }
      if (tool === 'shiftType') {
        if (hasKey('shift_type')) return prev.filter(f => f.key !== 'shift_type');
        return [...prev, add({ key: 'shift_type', label: 'نوبت کاری', type: 'select', required: true, sectionId: 'اطلاعات پایه', options: [{ label: 'روزکار اول', value: 'Day1' }, { label: 'روزکار دوم', value: 'Day2' }, { label: 'شب‌کار اول', value: 'Night1' }, { label: 'شب‌کار دوم', value: 'Night2' }] })];
      }
      if (tool === 'shiftDuration') {
        if (hasKey('shift_duration')) return prev.filter(f => f.key !== 'shift_duration');
        return [...prev, add({ key: 'shift_duration', label: 'مدت شیفت', type: 'time', required: true, sectionId: 'اطلاعات پایه', defaultValue: '12:00' })];
      }
      if (tool === 'date') {
        if (hasKey('report_date')) return prev.filter(f => f.key !== 'report_date');
        return [...prev, add({ key: 'report_date', label: 'تاریخ', type: 'date', required: true, sectionId: 'اطلاعات پایه' })];
      }
      if (tool === 'weekday') {
        if (hasKey('weekday')) return prev.filter(f => f.key !== 'weekday');
        return [...prev, add({ key: 'weekday', label: 'روز هفته', type: 'text', required: true, sectionId: 'اطلاعات پایه', readOnly: true } as any)];
      }
      if (tool === 'supervisor') {
        if (hasKey('supervisor_name')) return prev.filter(f => f.key !== 'supervisor_name');
        return [...prev, add({ key: 'supervisor_name', label: 'ثبت کننده گزارش', type: 'text', required: true, sectionId: 'اطلاعات پایه', readOnly: true })];
      }
      if (tool === 'attendance') {
        const hasAny = hasKey('present_count') || hasKey('leave_count') || hasKey('absent_count') || hasKey('attendance_widget') || hasKey('personnel_attendance');
        if (hasAny) {
          return prev.filter(f => !['present_count', 'leave_count', 'absent_count', 'attendance_widget', 'personnel_attendance'].includes(f.key))
            .filter(f => !(f.type === 'container' && f.sectionId === 'وضعیت حضور و غیاب پرسنل'));
        }
        const sectionId = 'وضعیت حضور و غیاب پرسنل';
        const hasContainer = prev.some(f => f.type === 'container' && f.sectionId === sectionId);
        const containerIfNeeded = hasContainer ? [] : [add({ key: 'attendance_section', label: 'باکس جدید', type: 'container', sectionId, width: 4, color: '#22c55e' })];
        return [...prev, ...containerIfNeeded, add({ key: 'personnel_attendance', label: 'وضعیت حضور و غیاب پرسنل', type: 'attendance', required: true, sectionId, width: 2 })];
      }
      return prev;
    });
    setIsFieldsOpen(true);
  }, [activeDesignTabId, tabs, themeColor]);

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
        const colonIdx = line.indexOf(':');
        const [label, value] = colonIdx >= 0
          ? [line.slice(0, colonIdx), line.slice(colonIdx + 1)]
          : [line, line];
        return { label: label.trim(), value: (value || label).trim() };
      });
  };

  /* no separate trigger needed — handled inline in the dropdown onChange */

  /** کوئری اجباری: برای کار کردن دکمه ذخیره در همه فرم‌های داینامیک (یک بار در Supabase اجرا شود) */
  const requiredSaveSql = `-- SQL مورد نیاز برای ذخیره فرم (اجباری) — یک بار در Supabase اجرا کنید
create extension if not exists pgcrypto;

create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'گزارشات',
  is_active boolean not null default true,
  form_schema jsonb not null default '{"fields":[]}'::jsonb,
  list_schema jsonb not null default '{"columns":[]}'::jsonb,
  template_schema jsonb not null default '{}'::jsonb,
  data_source jsonb not null default '{"mode":"generic","table":"report_records"}'::jsonb,
  version int not null default 1,
  published_version int not null default 0,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_records (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.report_definitions(id) on delete cascade,
  tracking_code text,
  report_date text,
  payload jsonb not null default '{}'::jsonb,
  payload_version int not null default 1,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_report_definitions_slug on public.report_definitions(slug);
create index if not exists ix_report_definitions_active on public.report_definitions(is_active);
create index if not exists ix_report_definitions_updated_at on public.report_definitions(updated_at desc);
create index if not exists ix_report_records_definition_id on public.report_records(definition_id);
create index if not exists ix_report_records_report_date on public.report_records(report_date);
create index if not exists ix_report_records_created_at on public.report_records(created_at desc);

create or replace function public.set_report_builder_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_report_definitions_updated_at on public.report_definitions;
create trigger trg_report_definitions_updated_at before update on public.report_definitions for each row execute function public.set_report_builder_updated_at();
drop trigger if exists trg_report_records_updated_at on public.report_records;
create trigger trg_report_records_updated_at before update on public.report_records for each row execute function public.set_report_builder_updated_at();

alter table public.report_definitions enable row level security;
alter table public.report_records enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_definitions' and policyname='report_definitions_select_open') then
    create policy report_definitions_select_open on public.report_definitions for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_definitions' and policyname='report_definitions_insert_open') then
    create policy report_definitions_insert_open on public.report_definitions for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_definitions' and policyname='report_definitions_update_open') then
    create policy report_definitions_update_open on public.report_definitions for update to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_select_open') then
    create policy report_records_select_open on public.report_records for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_insert_open') then
    create policy report_records_insert_open on public.report_records for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_update_open') then
    create policy report_records_update_open on public.report_records for update to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='report_records' and policyname='report_records_delete_open') then
    create policy report_records_delete_open on public.report_records for delete to anon, authenticated using (true);
  end if;
end $$;

grant select, insert, update on public.report_definitions to anon, authenticated;
grant select, insert, update, delete on public.report_records to anon, authenticated;
`;

  const suggestedSql = useMemo(() => {
    const tableName = toSqlTableName(slug);
    const cols: string[] = [];
    const used = new Set<string>(['id', 'tracking_code', 'report_date', 'created_at', 'updated_at']);
    fields.forEach(f => {
      if (f.type === 'container') return;
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

  const activeBoxEntries = useMemo(
    () =>
      fields
        .map((f, index) => ({ field: f, index }))
        .filter(x => x.field.type === 'container' && (x.field.tabId || tabs[0]?.id || 'main') === activeDesignTabId),
    [fields, activeDesignTabId, tabs]
  );

  useEffect(() => {
    const boxSectionIds = new Set(activeBoxEntries.map(({ field }) => field.sectionId ?? ''));
    if (activeDesignBoxSectionId && !boxSectionIds.has(activeDesignBoxSectionId)) {
      setActiveDesignBoxSectionId(activeBoxEntries[0]?.field?.sectionId ?? null);
    }
  }, [activeDesignTabId, activeBoxEntries, activeDesignBoxSectionId]);

  const activeFieldEntries = useMemo(
    () =>
      fields
        .map((f, index) => ({ field: f, index }))
        .filter(x => x.field.type !== 'container' && (x.field.tabId || tabs[0]?.id || 'main') === activeDesignTabId),
    [fields, activeDesignTabId, tabs]
  );

  const selectableFieldEntries = useMemo(
    () =>
      activeDesignBoxSectionId
        ? activeFieldEntries.filter(({ field }) => field.sectionId === activeDesignBoxSectionId)
        : activeFieldEntries,
    [activeFieldEntries, activeDesignBoxSectionId]
  );

  useEffect(() => {
    const inSelectable = selectableFieldEntries.some(({ field }) => field.id === selectedDesignFieldId);
    if (selectedDesignFieldId && !inSelectable) {
      setSelectedDesignFieldId(selectableFieldEntries[0]?.field?.id ?? null);
    }
  }, [selectableFieldEntries, selectedDesignFieldId]);

  if (viewOnlyDef) {
    const schema = viewOnlyDef.form_schema!;
    const vTabs = schema?.tabs || [];
    const vFields = schema?.fields || [];
    const vGroups = schema?.groups || [];
    const useShift = SHIFT_TABS_PRESET.length > 0 && vTabs.length >= 9 && SHIFT_TABS_PRESET.every(pt => vTabs.some(t => t.id === pt.id));
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <div className="flex-none bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center gap-2">
          <Eye className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">{viewOnlyDef.title}</h1>
          <button
            type="button"
            onClick={() => setViewOnlyDef(null)}
            className="mr-auto px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            بازگشت
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {schema && (useShift ? (() => {
            const allDesignTabs = vTabs.map(t => ({ id: t.id, label: t.label, icon: t.icon, color: t.color }));
            const containerSectionIds = new Set(vFields.filter((f: any) => f.type === 'container').map((f: any) => f.sectionId).filter(Boolean));
            const customBoxes = vFields.filter((f: any) => f.type === 'container' || (f.sectionId && containerSectionIds.has(f.sectionId))).map((f: any) => ({ id: f.id, key: f.key, label: f.label, type: f.type, tabId: f.tabId, sectionId: f.sectionId ?? '', placeholder: f.placeholder, options: f.options, defaultValue: f.defaultValue, readOnly: f.readOnly, required: f.required, width: f.width, color: f.color, helpText: f.helpText, validation: f.validation, repeatableListConfig: f.repeatableListConfig, timePairConfig: f.timePairConfig, matrixConfig: f.matrixConfig }));
            return (
              <div className="w-full max-w-full border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                <ShiftReportFormContent
                  embed
                  readOnly
                  personnel={personnel}
                  showNavButtons={true}
                  showSubmitButton={false}
                  initialValue={{ shiftInfo: { supervisorName: user?.fullName ?? '' }, feedLinesActive: { lineA: false, lineB: false } }}
                  dynamicFeedColumns={false}
                  customBoxes={customBoxes}
                  customBoxValue={viewOnlyValue}
                  designTabs={allDesignTabs}
                />
              </div>
            );
          })() : (
            <div className="w-full max-w-full border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-800 p-4">
              <DynamicFormRenderer
                fields={vFields}
                tabs={vTabs}
                groups={vGroups}
                value={viewOnlyValue}
                onChange={() => {}}
                readOnly
                personnel={personnel}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'FORM') {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <div className="flex-none bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setViewMode('LIST'); resetForm(); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="بازگشت به لیست رکوردها"
            >
              <LayoutTemplate className="w-7 h-7 text-primary" />
            </button>
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
            <SectionHeader index={2} title="SQL ساخت جدول" help="برای کار کردن دکمه «ذخیره» در فرم گزارش، ابتدا کوئری «اجباری» را یک بار در Supabase اجرا کنید. کوئری «جدول اختصاصی» اختیاری است و در نسخه فعلی برای ذخیره استفاده نمی‌شود." />
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
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">۱. SQL مورد نیاز برای ذخیره (اجباری)</p>
              <p className="text-[11px] text-gray-500">اگر جداول report_definitions و report_records را در Supabase نساخته‌اید، این کوئری را یک بار در Supabase SQL Editor اجرا کنید تا دکمه ذخیره کار کند.</p>
              <div className="relative">
                <textarea
                  value={requiredSaveSql}
                  readOnly
                  className="w-full min-h-[200px] p-2 pr-12 text-xs font-mono border rounded bg-gray-50 dark:bg-gray-900/40"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(requiredSaveSql);
                      setIsRequiredSqlCopied(true);
                      setTimeout(() => setIsRequiredSqlCopied(false), 2000);
                    } catch {
                      alert('کپی SQL ناموفق بود. دستی کپی کنید.');
                    }
                  }}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-primary transition"
                  title={isRequiredSqlCopied ? 'کپی شد' : 'کپی SQL اجباری'}
                >
                  {isRequiredSqlCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-4">۲. SQL جدول اختصاصی این فرم (اختیاری)</p>
              <p className="text-[11px] text-gray-500">برای ذخیره در جدول جداگانه با ستون‌های مشخص؛ در نسخه فعلی اپ از report_records استفاده می‌شود.</p>
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
                  title={isSqlCopied ? 'کپی شد' : 'کپی SQL جدول اختصاصی'}
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
                فرم اولیه پیشنهادی
              </button>
              <button
                onClick={() => setTabs(prev => [...prev, blankTab()])}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-gray-700 hover:bg-gray-800 text-white shadow-sm transition-all"
              >
                تب جدید
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
                تب توقفات
              </button>
              <button
                onClick={() => {
                  const isDefaultForm = tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9';
                  const tabId = isDefaultForm ? `tab-${previewActiveTab}` : (activeDesignTabId || tabs[0]?.id || 'main');
                  const existingBoxSections = new Set(fields.filter(f => (f.tabId || tabs[0]?.id) === tabId).map(f => f.sectionId).filter(Boolean));
                  let boxNum = 1;
                  while (existingBoxSections.has(`باکس جدید ${boxNum}`)) boxNum++;
                  const sectionId = `باکس جدید ${boxNum}`;
                  const key = `box_${Date.now()}`;
                  setFields(prev => [...prev, {
                    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    key,
                    label: 'باکس جدید',
                    type: 'container',
                    sectionId,
                    tabId,
                    width: 4,
                    color: '#6b7280',
                  }]);
                  setLastCreatedBoxSectionId(sectionId);
                  setActiveDesignBoxSectionId(sectionId);
                  setIsFieldsOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow transition-all"
              >
                افزودن باکس
              </button>
              {(() => {
                const isDefaultForm = tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9';
                const tabId = isDefaultForm ? `tab-${previewActiveTab}` : (activeDesignTabId || tabs[0]?.id || 'main');
                const boxesInTab = fields.filter(f => f.type === 'container' && (f.tabId || tabs[0]?.id) === tabId);
                const hasBoxes = boxesInTab.length > 0;
                const boxSectionIds = new Set(boxesInTab.map(b => b.sectionId ?? '').filter(Boolean));
                const targetSectionId = hasBoxes
                  ? ((boxSectionIds.has(activeDesignBoxSectionId ?? '') ? activeDesignBoxSectionId : null)
                    || (boxSectionIds.has(lastCreatedBoxSectionId ?? '') ? lastCreatedBoxSectionId : null)
                    || boxesInTab[0]?.sectionId
                    || '')
                  : '';
                return (
                  <>
                    <button
                      onClick={() => {
                        if (!hasBoxes) return;
                        const newField = { ...blankField(), label: getNextFieldLabel(fields), tabId, sectionId: targetSectionId };
                        setFields(prev => [...prev, newField]);
                        setLastCreatedBoxSectionId(targetSectionId || lastCreatedBoxSectionId || undefined);
                        setSelectedDesignFieldId(newField.id);
                        setIsFieldsOpen(true);
                      }}
                      disabled={!hasBoxes}
                      title={!hasBoxes ? 'ابتدا با «افزودن باکس» باکسی ایجاد کنید' : undefined}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl shadow-sm transition-all ${hasBoxes ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      افزودن فیلد داخل باکس
                    </button>
                    <button
                      onClick={() => {
                        const newField = { ...blankField(), label: getNextFieldLabel(fields), tabId };
                        setFields(prev => [...prev, newField]);
                        setSelectedDesignFieldId(newField.id);
                        setIsFieldsOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-900 shadow-sm hover:shadow transition-all"
                    >
                      افزودن فیلد
                    </button>
                  </>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-2">ابزار آماده</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => addShiftReadyField('tabs')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-all"
                >
                  باکس تب‌ها
                </button>
                <button
                  type="button"
                  onClick={() => (tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9')
                    ? setVisibleTools(p => ({ ...p, shift: !p.shift }))
                    : addShiftReadyField('shift')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 shadow-sm transition-all ${tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' && !visibleTools.shift ? 'bg-gray-400 text-gray-200' : 'text-white bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  شیفت
                </button>
                <button
                  type="button"
                  onClick={() => (tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9')
                    ? setVisibleTools(p => ({ ...p, shiftType: !p.shiftType }))
                    : addShiftReadyField('shiftType')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 shadow-sm transition-all ${tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' && !visibleTools.shiftType ? 'bg-gray-400 text-gray-200' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
                >
                  نوبت کاری
                </button>
                <button
                  type="button"
                  onClick={() => (tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9')
                    ? setVisibleTools(p => ({ ...p, shiftDuration: !p.shiftDuration }))
                    : addShiftReadyField('shiftDuration')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 shadow-sm transition-all ${tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' && !visibleTools.shiftDuration ? 'bg-gray-400 text-gray-200' : 'text-white bg-cyan-600 hover:bg-cyan-700'}`}
                >
                  مدت شیفت
                </button>
                <button
                  type="button"
                  onClick={() => (tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9')
                    ? setVisibleTools(p => ({ ...p, date: !p.date }))
                    : addShiftReadyField('date')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 shadow-sm transition-all ${tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' && !visibleTools.date ? 'bg-gray-400 text-gray-200' : 'text-white bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  تاریخ
                </button>
                <button
                  type="button"
                  onClick={() => (tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9')
                    ? setVisibleTools(p => ({ ...p, weekday: !p.weekday }))
                    : addShiftReadyField('weekday')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 shadow-sm transition-all ${tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' && !visibleTools.weekday ? 'bg-gray-400 text-gray-200' : 'text-white bg-teal-600 hover:bg-teal-700'}`}
                >
                  روز هفته
                </button>
                <button
                  type="button"
                  onClick={() => (tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9')
                    ? setVisibleTools(p => ({ ...p, supervisor: !p.supervisor }))
                    : addShiftReadyField('supervisor')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 shadow-sm transition-all ${tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' && !visibleTools.supervisor ? 'bg-gray-400 text-gray-200' : 'text-white bg-amber-600 hover:bg-amber-700'}`}
                >
                  ثبت کننده گزارش
                </button>
                <button
                  type="button"
                  onClick={() => (tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9')
                    ? setVisibleTools(p => ({ ...p, attendance: !p.attendance }))
                    : addShiftReadyField('attendance')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border-0 shadow-sm transition-all ${tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9' && !visibleTools.attendance ? 'bg-gray-400 text-gray-200' : 'text-white bg-green-600 hover:bg-green-700'}`}
                >
                  حضور و غیاب پرسنل
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader index={4} title="ویرایشگر تب‌ها" help="ساختار کلی فرم را با تب‌ها مشخص کن. هر تب یک بخش جدا در فرم است (مثل اطلاعات شیفت، تولید، توقفات). شناسه تب، عنوان فارسی، رنگ و آیکون هر تب را تنظیم کن. ابزار رنگ یکپارچه رنگ همه تب‌ها را یکسان می‌کند. گروه‌های باکس رنگی برای زیرباکس‌های رنگی داخل هر بخش استفاده می‌شوند." />
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
            <div className="space-y-3">
              {tabs.map((tab, idx) => (
                <div
                  key={tab.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = draggedTabIdx;
                    const toIdx = idx;
                    if (fromIdx == null || fromIdx === toIdx) {
                      setDraggedTabIdx(null);
                      return;
                    }
                    setTabs(prev => {
                      const next = [...prev];
                      const [removed] = next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, removed);
                      return next;
                    });
                    setDraggedTabIdx(null);
                  }}
                  className={`flex flex-col gap-2 p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/40 transition-opacity ${draggedTabIdx === idx ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      draggable
                      onDragStart={(e) => {
                        setDraggedTabIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragEnd={() => setDraggedTabIdx(null)}
                      className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="برای جابجایی با موس بکشید"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0" />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-gray-400">رتبه:</span>
                      <input
                        type="number"
                        min={1}
                        max={tabs.length}
                        className="w-12 p-1 text-xs border rounded bg-white dark:bg-gray-700 text-center"
                        value={idx + 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!Number.isNaN(val) && val >= 1 && val <= tabs.length) {
                            const toIdx = val - 1;
                            if (toIdx !== idx) {
                              setTabs(prev => {
                                const next = [...prev];
                                const [removed] = next.splice(idx, 1);
                                next.splice(toIdx, 0, removed);
                                return next;
                              });
                            }
                          }
                        }}
                        title="شماره رتبه برای مرتب‌سازی"
                      />
                    </div>
                  </div>
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
                          onClick={() => { setIconPickerTabId(tab.id); iconPickerTargetRef.current = { tabId: tab.id, tabIndex: idx }; }}
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
                <SectionHeader index={5} title="فیلدها" help="فیلدهای فرم را اینجا تعریف می‌کنی. با دکمه «افزودن فیلد» یا «افزودن فیلد خالی» می‌توانی فیلدهای زیادی اضافه کنی. با انتخاب باکس مربوطه، فیلد داخل آن باکس قرار می‌گیرد. هر فیلد می‌تواند عنوان نمایشی، نوع، باکس مربوطه، گروه رنگی، عرض و قوانین داشته باشد." />
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
                  </div>

                  <div className="rounded-xl border p-3 bg-teal-50 dark:bg-teal-900/20 space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">باکس فعال برای طراحی فیلدها:</span>
                      <HelpHint text="با انتخاب یک باکس از کشو، فیلدهای جدید با دکمه «افزودن فیلد» داخل همان باکس اضافه می‌شوند." />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">باکس انتخاب‌شده برای افزودن فیلد</div>
                      <select
                        className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm"
                        value={activeDesignBoxSectionId || ''}
                        onChange={e => setActiveDesignBoxSectionId(e.target.value || null)}
                      >
                        <option value="">— انتخاب باکس —</option>
                        {activeBoxEntries.map(({ field: b }) => (
                          <option key={b.id} value={b.sectionId ?? ''}>{b.sectionId || b.key || 'باکس بدون عنوان'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{activeBoxEntries.length} باکس در این تب</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setIsBoxesOpen(v => !v)}
                      >
                        {isBoxesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isBoxesOpen ? 'مخفی کردن تنظیمات' : 'نمایش تنظیمات باکس‌ها'}
                      </button>
                    </div>
                    {isBoxesOpen && (
                      <div className="space-y-2 pt-2">
                        {activeBoxEntries.length === 0 ? (
                          <p className="text-xs text-gray-500 py-2">در این تب هنوز باکسی نیست. از دکمه «افزودن باکس» در قالب سریع استفاده کنید.</p>
                        ) : (
                          activeBoxEntries.map(({ field: b, index: bidx }) => (
                            <div key={b.id} className="rounded-lg border border-teal-200 dark:border-teal-800 p-3 bg-white dark:bg-gray-800 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-300 font-bold">
                                <Layers className="w-4 h-4" />
                                تنظیمات باکس
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2 space-y-1">
                                  <div className="text-[11px] text-gray-500">عنوان باکس (بخش)</div>
                                  <input
                                    type="text"
                                    autoComplete="off"
                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                                    placeholder="مثال: باکس جدید ۱"
                                    value={b.sectionId ?? ''}
                                    onChange={e => {
                                      const newSectionId = e.target.value;
                                      const oldSectionId = b.sectionId ?? '';
                                      setFields(prev => prev.map((x, i) => {
                                        if (i === bidx) return { ...x, sectionId: newSectionId };
                                        if (x.sectionId === oldSectionId) return { ...x, sectionId: newSectionId };
                                        return x;
                                      }));
                                      if (activeDesignBoxSectionId === oldSectionId) setActiveDesignBoxSectionId(newSectionId);
                                      if (lastCreatedBoxSectionId === oldSectionId) setLastCreatedBoxSectionId(newSectionId);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[11px] text-gray-500">تب مربوطه</div>
                                  <select className="w-full p-2 border rounded bg-white dark:bg-gray-700" value={b.tabId || tabs[0]?.id || ''} onChange={e => {
                                    const newTabId = e.target.value;
                                    const oldSectionId = b.sectionId ?? '';
                                    setFields(prev => prev.map((x, i) => {
                                      if (i === bidx) return { ...x, tabId: newTabId };
                                      if (x.sectionId === oldSectionId) return { ...x, tabId: newTabId };
                                      return x;
                                    }));
                                  }}>
                                    {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[11px] text-gray-500">رنگ باکس</div>
                                  <div className="flex items-center gap-2">
                                    <input type="color" className="w-9 h-8 p-0 border rounded bg-white dark:bg-gray-700 cursor-pointer" value={b.color || '#6b7280'} onChange={e => setFields(prev => prev.map((x, i) => (i === bidx ? { ...x, color: e.target.value } : x)))} />
                                    <input className="flex-1 min-w-0 p-1.5 text-xs border rounded bg-white dark:bg-gray-700 font-mono" value={b.color || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === bidx ? { ...x, color: e.target.value } : x)))} placeholder="#6b7280" />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[11px] text-gray-500">کلید فنی (key)</div>
                                  <input className="w-full p-2 border rounded bg-white dark:bg-gray-700 font-mono text-xs" placeholder="box_xxx" value={b.key || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === bidx ? { ...x, key: e.target.value } : x)))} readOnly />
                                </div>
                                <div className="col-span-2">
                                  <button type="button" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded border text-xs" onClick={() => setFields(prev => prev.filter((_, i) => i !== bidx))}>
                                    <Trash2 className="w-3.5 h-3.5 inline mr-1" />حذف باکس
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">تعداد فیلدهای این باکس: {activeDesignBoxSectionId ? activeFieldEntries.filter(({ field }) => field.sectionId === activeDesignBoxSectionId).length : (activeBoxEntries.length > 0 ? '— (باکس انتخاب کنید)' : 0)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const isDefaultForm = tabs.length === 9 && tabs[0]?.id === 'tab-1' && tabs[8]?.id === 'tab-9';
                        const tabId = isDefaultForm ? `tab-${previewActiveTab}` : (activeDesignTabId || tabs[0]?.id || 'main');
                        const boxSectionIds = new Set(activeBoxEntries.map(({ field }) => field.sectionId ?? '').filter(Boolean));
                        const targetSectionId = activeBoxEntries.length > 0
                          ? ((boxSectionIds.has(activeDesignBoxSectionId ?? '') ? activeDesignBoxSectionId : null)
                            || (boxSectionIds.has(lastCreatedBoxSectionId ?? '') ? lastCreatedBoxSectionId : null)
                            || activeBoxEntries[0]?.field?.sectionId
                            || '')
                          : (fields.filter(f => (f.tabId || tabs[0]?.id) === tabId).reverse().find(f => f.sectionId)?.sectionId ?? '');
                        const newField = { ...blankField(), label: getNextFieldLabel(fields), tabId, sectionId: targetSectionId };
                        setFields(prev => [...prev, newField]);
                        setSelectedDesignFieldId(newField.id);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> افزودن فیلد
                    </button>
                  </div>

                  {activeFieldEntries.length === 0 && (
                    <div className="text-center py-8 rounded-xl border border-dashed text-gray-500 text-sm">
                      <p>در این تب هنوز فیلدی ثبت نشده است. از دکمه «افزودن فیلد» بالا یا «افزودن باکس» در قالب سریع استفاده کنید.</p>
                    </div>
                  )}

                  {activeFieldEntries.length > 0 && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">انتخاب فیلد برای ویرایش</div>
                        <select
                          className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 font-medium"
                          value={selectedDesignFieldId ?? ''}
                          onChange={e => setSelectedDesignFieldId(e.target.value || null)}
                        >
                          <option value="">— فیلد را انتخاب کنید —</option>
                          {selectableFieldEntries.map(({ field: f, index: idx }) => (
                            <option key={f.id} value={f.id}>
                              {f.label || f.key || `فیلد ${idx + 1}`} ({f.key || `field_${idx + 1}`})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedDesignFieldId && (() => {
                        const entry = activeFieldEntries.find(({ field }) => field.id === selectedDesignFieldId);
                        if (!entry) return null;
                        const { field: f, index: idx } = entry;
                        return (
                <div key={f.id} className="space-y-4 border rounded-lg p-3 bg-white/50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-bold">تنظیمات فیلد</span>
                    <span className="font-mono">{f.key || `field_${idx + 1}`}</span>
                    <HelpHint text="کلید فنی (key) فیلد باید یکتا باشد و در SQL و ذخیره داده‌ها استفاده می‌شود. نوع فیلد، باکس مربوطه، عرض، رنگ و قوانین اعتبارسنجی در همین بخش تنظیم می‌شوند." />
                  </div>

                  <FieldCategory title="اطلاعات اصلی" color="#2563eb">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">کلید فنی (key) <span className="text-red-500">*</span></div>
                        <input className="w-full p-2 border rounded bg-white dark:bg-gray-700 font-mono" placeholder="مثال: shift_name" value={f.key} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x)))} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500 flex items-center gap-1">عنوان نمایشی (نام روی فیلد) <HelpHint text="این نام روی هر فیلد در فرم نمایش داده می‌شود؛ مثل «نام شیفت»، «تاریخ»، «تعداد تولید». می‌تواند خالی باشد." /></div>
                        <input
                          type="text"
                          autoComplete="off"
                          className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                          placeholder="مثال: نام شیفت (خالی = بدون عنوان)"
                          value={f.label ?? ''}
                          onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <div className="text-[11px] text-gray-500 flex items-center gap-1">باکس مربوطه <HelpHint text="فیلد داخل کدام باکس قرار بگیرد. با انتخاب باکس، تب و بخش فیلد به‌طور خودکار تنظیم می‌شود." /></div>
                        <select
                          className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                          value={(() => {
                            const allBoxes = fields.filter(x => x.type === 'container');
                            const match = allBoxes.find(b => (b.tabId || tabs[0]?.id) === (f.tabId || tabs[0]?.id) && (b.sectionId ?? '') === (f.sectionId ?? ''));
                            return match ? `${match.tabId || tabs[0]?.id}::${match.sectionId ?? ''}` : '';
                          })()}
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) {
                              setFields(prev => prev.map((x, i) => (i === idx ? { ...x, tabId: activeDesignTabId || tabs[0]?.id, sectionId: '__default__' } : x)));
                              return;
                            }
                            const [tabId, sectionId] = val.split('::');
                            setFields(prev => prev.map((x, i) => (i === idx ? { ...x, tabId: tabId || tabs[0]?.id, sectionId: sectionId || '__default__' } : x)));
                          }}
                        >
                          <option value="">— بدون باکس —</option>
                          {fields.filter(x => x.type === 'container').map(b => {
                            const t = tabs.find(t => t.id === (b.tabId || tabs[0]?.id));
                            return (
                              <option key={`${b.tabId}::${b.sectionId}`} value={`${b.tabId || tabs[0]?.id}::${b.sectionId ?? ''}`}>
                                {t?.label || b.tabId} — {b.sectionId || 'باکس بدون عنوان'}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">عرض</div>
                        <select className="w-full p-2 border rounded bg-white dark:bg-gray-700" value={f.width || 2} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, width: Number(e.target.value) as 1 | 2 | 3 | 4 } : x)))}>
                          <option value={1}>۱/۴</option>
                          <option value={2}>۱/۲</option>
                          <option value={3}>۳/۴</option>
                          <option value={4}>۱ (کامل)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">رنگ فیلد</div>
                        <div className="flex items-center gap-2">
                          <input type="color" className="w-9 h-8 p-0 border rounded bg-white dark:bg-gray-700 cursor-pointer" value={f.color || '#6b7280'} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))} />
                          <input className="flex-1 min-w-0 p-1.5 text-xs border rounded bg-white dark:bg-gray-700 font-mono" value={f.color || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))} placeholder="#6b7280" />
                        </div>
                      </div>
                    </div>
                  </FieldCategory>

                  <FieldCategory title="نوع فیلد" color="#16a34a" help="نوع داده‌ای که فیلد دریافت می‌کند:\nمتن، عدد، تاریخ، زمان، لیست انتخابی، متن چندخطی، چک‌باکس، حضور و غیاب، لیست تکرارشونده، جفت زمان (شروع‌پایان)، ماتریس. هر نوع تنظیمات و فیلدهای مرتبط خود را دارد.">
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
                  </FieldCategory>

                  <FieldCategory title="ظاهر و قوانین" color="#9333ea" help="اجباری: پر کردن فیلد اجباری است و فرم بدون آن ثبت نمی‌شود.\nفقط خواندنی: کاربر نمی‌تواند مقدار را ویرایش کند.\nمتن راهنما: متنی که داخل فیلد خالی نمایش داده می‌شود (placeholder).\nتوضیح فیلد: متن کمکی زیر فیلد برای راهنمایی کاربر.">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs flex items-center gap-1 p-2 border rounded bg-white dark:bg-gray-700">
                        <input type="checkbox" checked={!!f.required} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, required: e.target.checked } : x)))} /> اجباری
                      </label>
                      <label className="text-xs flex items-center gap-1 p-2 border rounded bg-white dark:bg-gray-700">
                        <input type="checkbox" checked={!!f.readOnly} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, readOnly: e.target.checked } : x)))} /> فقط خواندنی
                      </label>
                      <div className="space-y-1 col-span-2">
                        <div className="text-[11px] text-gray-500">متن راهنما داخل فیلد</div>
                        <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="placeholder" value={f.placeholder || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, placeholder: e.target.value } : x)))} />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <div className="text-[11px] text-gray-500">توضیح فیلد</div>
                        <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="مثال: این فیلد برای..." value={f.helpText || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, helpText: e.target.value } : x)))} />
                      </div>
                    </div>
                  </FieldCategory>

                  <FieldCategory title="اعتبارسنجی" color="#d97706">
                    <div className="grid grid-cols-2 gap-2">
                    {f.type === 'number' && (
                      <>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">حداقل عدد</div>
                          <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="min" value={f.validation?.min ?? ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), min: e.target.value === '' ? undefined : Number(e.target.value) } } : x)))} />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">حداکثر عدد</div>
                          <input className="w-full p-2 border rounded bg-white dark:bg-gray-700" placeholder="max" value={f.validation?.max ?? ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), max: e.target.value === '' ? undefined : Number(e.target.value) } } : x)))} />
                        </div>
                      </>
                    )}
                    <div className="space-y-1 col-span-2">
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">الگوی عبارت منظم <HelpHint text={'عبارت منظم JavaScript برای اعتبارسنجی فرمت:\n\nNumbers only: ^[0-9]+$\nیک یا چند رقم 0–9\n\nIran mobile: ^09[0-9]{9}$\nشروع با 09 و 9 رقم بعدی\n\nPersian digits: ^[\u06F0-\u06F9]+$\nفقط اعداد فارسی (0-9)\n\nMin 3 chars: ^.{3,}$\nحداقل 3 کاراکتر\n\n5-digit code: ^[0-9]{5}$\nدقیقاً 5 رقم'} /></div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700 font-mono text-xs" placeholder="مثال: ^[0-9]+$ یا ^09[0-9]{9}$" value={f.validation?.regex || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), regex: e.target.value || undefined } } : x)))} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">پیام خطا هنگام عدم تطابق <HelpHint text="متن دلخواهی که هنگام عدم مطابقت مقدار با الگوی عبارت منظم نمایش داده می‌شود. اختیاری." /></div>
                      <input className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-xs" placeholder="اختیاری - مثلاً: فقط رقم مجاز است" value={f.validation?.regexMessage || ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, validation: { ...(x.validation || {}), regexMessage: e.target.value || undefined } } : x)))} />
                    </div>
                    {(f.type === 'date' || f.type === 'time') && (
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">باید کوچک‌تر یا مساوی این فیلد باشد</div>
                        <input
                          className="w-full p-2 border rounded bg-white dark:bg-gray-700 font-mono text-xs"
                          placeholder={f.type === 'date' ? 'مثال: report_date' : 'مثال: end_time'}
                          value={f.validation?.mustBeLessOrEqualField || ''}
                          onChange={e =>
                            setFields(prev =>
                              prev.map((x, i) =>
                                i === idx
                                  ? { ...x, validation: { ...(x.validation || {}), mustBeLessOrEqualField: e.target.value?.trim() || undefined } }
                                  : x
                              )
                            )
                          }
                        />
                      </div>
                    )}
                    </div>
                  </FieldCategory>

                  <FieldCategory title="شرطی و پیشرفته" color="#64748b" help="نمایش شرطی: فیلد فقط وقتی دیده می‌شود که فیلد مرجع (مثلاً shift_type) دقیقاً مقدار مورد انتظار (مثلاً Day1) را داشته باشد. هر دو فیلد را پر کن.\n\nلیست انتخابی: گزینه‌ها را با فرمت label:value هر خط وارد کن یا از «بارگذاری از جدول» استفاده کن.\n\nجفت زمان/ماتریس: فیلد هدف برای برابری مجموع، کلید فیلدی است که جمع مقادیر باید با آن برابر باشد. برچسب‌های مدت کارکرد و توقف برای جفت زمان قابل تنظیم است.">
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
                      <div className="col-span-2 space-y-2">
                        <div className="text-[11px] text-gray-500">گزینه‌های لیست (هر خط: label:value)</div>
                        <div className="flex gap-2 items-center">
                          <select
                            className="p-2 text-xs border rounded bg-white dark:bg-gray-700"
                            value=""
                            onChange={async e => {
                              const table = e.target.value;
                              e.target.value = '';
                              if (!table) return;
                              try {
                                const rows: any[] = await fetchMasterData(table);
                                const cfg = SELECT_OPTIONS_TABLE_CONFIG[table as keyof typeof SELECT_OPTIONS_TABLE_CONFIG];
                                const labelCol = cfg?.labelCol ?? 'name';
                                const valueCol = cfg?.valueCol ?? 'code';
                                const opts = rows
                                  .filter(r => r[labelCol] != null)
                                  .map(r => ({ label: String(r[labelCol] ?? ''), value: String(r[valueCol] ?? r[labelCol] ?? '') }));
                                setFields(prev => prev.map((x, i) => (i === idx ? { ...x, options: opts } : x)));
                                setSelectOptionsDraft(prev => { const next = { ...prev }; delete next[f.id]; return next; });
                              } catch {
                                alert('خطا در بارگذاری داده از جدول');
                              }
                            }}
                          >
                            <option value="">— بارگذاری از جدول —</option>
                            {SELECT_OPTIONS_TABLES.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          className="w-full p-2 border rounded bg-white dark:bg-gray-700 min-h-[80px] font-mono text-sm"
                          placeholder={'گزینه‌ها (هر خط: label:value)\nمثال:\nشیفت A:A\nشیفت B:B'}
                          value={selectOptionsDraft[f.id] ?? (f.options || []).map(o => `${o.label}:${o.value}`).join('\n')}
                          onChange={e => setSelectOptionsDraft(prev => ({ ...prev, [f.id]: e.target.value }))}
                          onBlur={e => {
                            const raw = e.currentTarget.value;
                            setFields(prev => prev.map((x, i) => (i === idx ? { ...x, options: parseSelectOptions(raw) } : x)));
                            setSelectOptionsDraft(prev => { const next = { ...prev }; delete next[f.id]; return next; });
                          }}
                          rows={5}
                        />
                      </div>
                    )}
                    {(f.type === 'time_pair' || f.type === 'matrix') && (
                      <>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500 flex items-center gap-1">فیلد هدف برای برابری مجموع <HelpHint text="کلید فیلدی که جمع تمام سلول‌های ماتریس باید با مقدار آن برابر باشد. برای فیلد زمان (مثلاً shift_duration با مقدار 12:00) به دقیقه تبدیل می‌شود. برای فیلد عددی مستقیم مقایسه می‌شود. در زمان ذخیره بررسی می‌شود و در فرم بازخورد سبز/قرمز نمایش داده می‌شود." /></div>
                          <input
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                            placeholder="مثال: shift_duration یا کلید فیلد عددی"
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
                            <div className="space-y-1 col-span-2">
                              <div className="text-[11px] text-gray-500">برچسب مدت کارکرد</div>
                              <input
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                                placeholder="مدت کارکرد"
                                value={f.timePairConfig?.workLabel || ''}
                                onChange={e =>
                                  setFields(prev =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, timePairConfig: { ...(x.timePairConfig || {}), workLabel: e.target.value } } : x
                                    )
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <div className="text-[11px] text-gray-500">برچسب مدت توقف</div>
                              <input
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                                placeholder="مدت توقف"
                                value={f.timePairConfig?.stopLabel || ''}
                                onChange={e =>
                                  setFields(prev =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, timePairConfig: { ...(x.timePairConfig || {}), stopLabel: e.target.value } } : x
                                    )
                                  )
                                }
                              />
                            </div>
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
                            value={matrixRowsDraft[f.id] ?? (f.matrixConfig?.rows || []).join('\n')}
                            onChange={e => setMatrixRowsDraft(prev => ({ ...prev, [f.id]: e.target.value }))}
                            onBlur={e => {
                              const raw = e.currentTarget.value;
                              const rows = raw.split('\n').map(v => v.trim()).filter(Boolean);
                              setFields(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        matrixConfig: {
                                          ...(x.matrixConfig || { rows: [], columns: [] }),
                                          rows,
                                        },
                                      }
                                    : x
                                )
                              );
                              setMatrixRowsDraft(prev => {
                                const next = { ...prev };
                                delete next[f.id];
                                return next;
                              });
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-[11px] text-gray-500">عنوان محور ردیف</div>
                            <input className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm" placeholder="ردیف" value={f.matrixConfig?.rowAxisLabel ?? ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, matrixConfig: { ...(x.matrixConfig || { rows: [], columns: [] }), rowAxisLabel: e.target.value || undefined } } : x)))} />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-gray-500">عنوان محور ستون</div>
                            <input className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm" placeholder="ستون" value={f.matrixConfig?.columnAxisLabel ?? ''} onChange={e => setFields(prev => prev.map((x, i) => (i === idx ? { ...x, matrixConfig: { ...(x.matrixConfig || { rows: [], columns: [] }), columnAxisLabel: e.target.value || undefined } } : x)))} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">ستون‌های ماتریس (هر خط یک ستون)</div>
                          <textarea
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 min-h-[70px]"
                            placeholder={'مکانیکی\nبرقی'}
                            value={matrixColumnsDraft[f.id] ?? (f.matrixConfig?.columns || []).join('\n')}
                            onChange={e => setMatrixColumnsDraft(prev => ({ ...prev, [f.id]: e.target.value }))}
                            onBlur={e => {
                              const raw = e.currentTarget.value;
                              const columns = raw.split('\n').map(v => v.trim()).filter(Boolean);
                              setFields(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        matrixConfig: {
                                          ...(x.matrixConfig || { rows: [], columns: [] }),
                                          columns,
                                        },
                                      }
                                    : x
                                )
                              );
                              setMatrixColumnsDraft(prev => {
                                const next = { ...prev };
                                delete next[f.id];
                                return next;
                              });
                            }}
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
                                          numericOps: e.target.checked && (!x.matrixConfig?.numericOps?.length) ? ['sum'] : x.matrixConfig?.numericOps,
                                        },
                                      }
                                    : x
                                )
                              )
                            }
                          />
                          مقادیر ماتریس عددی باشند + عملگرها نمایش داده شود
                        </label>
                        {f.matrixConfig?.enforceNumeric && (
                          <div className="flex flex-wrap gap-2 p-2 border rounded bg-white dark:bg-gray-700">
                            <span className="text-[11px] text-gray-500 w-full">عملگرهای نمایشی:</span>
                            {(['sum', 'avg', 'min', 'max', 'diff'] as const).map(op => {
                              const labels: Record<string, string> = { sum: 'جمع', avg: 'میانگین', min: 'حداقل', max: 'حداکثر', diff: 'تفاضل (حداکثر − حداقل)' };
                              const ops = f.matrixConfig?.numericOps || ['sum'];
                              const checked = ops.includes(op);
                              return (
                                <label key={op} className="inline-flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={e => {
                                      const next = e.target.checked ? [...ops, op] : ops.filter(x => x !== op);
                                      setFields(prev => prev.map((x, i) => (i === idx ? { ...x, matrixConfig: { ...(x.matrixConfig || { rows: [], columns: [] }), numericOps: next.length ? next : ['sum'] } } : x)));
                                    }}
                                  />
                                  {labels[op]}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <div className="space-y-2 p-2 border rounded bg-amber-50/50 dark:bg-amber-900/10">
                          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                            نمایش از دیتابیس در سلول‌ها <HelpHint text="می‌توانی برای هر سلول تعیین کنی که به‌جای ورود دستی، مقدار از دیتابیس گرفته شود (مثلاً تعداد رکوردهای جدول دستور کارها). سلول‌های کوئری فقط‌خواندنی هستند و هنگام بارگذاری فرم مقدار به‌روز از دیتابیس نمایش داده می‌شود." />
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[10px] border-collapse">
                              <thead>
                                <tr>
                                  <th className="p-1 border bg-white dark:bg-gray-700">ردیف \ ستون</th>
                                  {(f.matrixConfig?.columns || []).map(col => (
                                    <th key={col} className="p-1 border bg-white dark:bg-gray-700 font-normal">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(f.matrixConfig?.rows || []).map(row => (
                                  <tr key={row}>
                                    <td className="p-1 border bg-gray-50 dark:bg-gray-800 font-medium">{row}</td>
                                    {(f.matrixConfig?.columns || []).map(col => {
                                      const src = f.matrixConfig?.cellSources?.[row]?.[col] ?? { type: 'manual' };
                                      const val = src.type === 'query' ? `count:${src.table}` : src.type === 'custom_sql' ? 'custom_sql' : 'manual';
                                      return (
                                        <td key={col} className="p-0.5 border">
                                          <select
                                            className="w-full text-[10px] p-1 border-0 bg-white dark:bg-gray-700 rounded"
                                            value={val}
                                            onChange={e => {
                                              const v = e.target.value;
                                              const next: Record<string, Record<string, any>> = {};
                                              for (const r of f.matrixConfig?.rows || []) {
                                                next[r] = { ...(f.matrixConfig?.cellSources?.[r] || {}) };
                                              }
                                              if (!next[row]) next[row] = {};
                                              if (v === 'manual') {
                                                next[row][col] = { type: 'manual' };
                                              } else if (v === 'custom_sql') {
                                                next[row][col] = { type: 'custom_sql', sql: (src.type === 'custom_sql' ? src.sql : '') || '' };
                                              } else {
                                                const [, table] = v.split(':');
                                                next[row][col] = { type: 'query', table: table || 'work_orders', op: 'count' };
                                              }
                                              setFields(prev => prev.map((x, i) => (i === idx ? { ...x, matrixConfig: { ...(x.matrixConfig || { rows: [], columns: [] }), cellSources: next } } : x)));
                                            }}
                                          >
                                            <option value="manual">ورود دستی</option>
                                            <option value="custom_sql">کوئری سفارشی</option>
                                            {MATRIX_QUERY_TABLES.map(t => (
                                              <option key={t.id} value={`count:${t.id}`}>تعداد از {t.label}</option>
                                            ))}
                                          </select>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {(() => {
                            const customCells: { row: string; col: string }[] = [];
                            for (const r of f.matrixConfig?.rows || []) {
                              for (const c of f.matrixConfig?.columns || []) {
                                const s = f.matrixConfig?.cellSources?.[r]?.[c];
                                if (s?.type === 'custom_sql') customCells.push({ row: r, col: c });
                              }
                            }
                            if (customCells.length === 0) return null;
                            return (
                              <div className="mt-2 space-y-2 p-2 border rounded bg-violet-50/50 dark:bg-violet-900/10">
                                <div className="text-[11px] font-bold text-violet-800 dark:text-violet-200 flex items-center gap-1">
                                  کوئری سفارشی سلول‌ها <HelpHint text="کوئری SELECT بنویس که یک مقدار برمی‌گرداند. مثال: SELECT COUNT(*) FROM work_orders WHERE status != 'FINISHED'. فقط SELECT مجاز است. قبل از استفاده، تابع get_report_matrix_cell_value را در Supabase اجرا کن (فایل migration)." />
                                </div>
                                {customCells.map(({ row, col }) => {
                                  const src = f.matrixConfig?.cellSources?.[row]?.[col];
                                  const sql = src?.type === 'custom_sql' ? (src.sql || '') : '';
                                  return (
                                    <div key={`${row}-${col}`} className="space-y-1">
                                      <div className="text-[10px] text-violet-700 dark:text-violet-300 font-medium">{row} / {col}</div>
                                      <textarea
                                        className="w-full p-2 text-[11px] font-mono border rounded bg-white dark:bg-gray-700 min-h-[60px]"
                                        placeholder="SELECT COUNT(*) FROM work_orders"
                                        value={sql}
                                        onChange={e => {
                                          const next: Record<string, Record<string, any>> = {};
                                          for (const r of f.matrixConfig?.rows || []) {
                                            next[r] = { ...(f.matrixConfig?.cellSources?.[r] || {}) };
                                          }
                                          if (!next[row]) next[row] = {};
                                          next[row][col] = { type: 'custom_sql', sql: e.target.value };
                                          setFields(prev => prev.map((x, i) => (i === idx ? { ...x, matrixConfig: { ...(x.matrixConfig || { rows: [], columns: [] }), cellSources: next } } : x)));
                                        }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    </div>
                  </FieldCategory>

                  <button type="button" className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded border col-span-2" onClick={() => setFields(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}><Trash2 className="w-4 h-4 inline mr-1" />حذف فیلد</button>
                </div>
                        );
                      })()}
                    </div>
                  )}
            </>
              )}
            </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={saveDraft} className="px-4 py-2 rounded-lg bg-primary text-white flex items-center gap-2">
            <Save className="w-4 h-4" /> ذخیره پیش‌نویس
          </button>
        </div>
          </div>

          <div className="flex-1 min-w-[min(480px,45%)] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2 z-10">
              <Eye className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">پیش‌نمایش</span>
            </div>
            <div className="p-4">
              {SHIFT_TABS_PRESET.every(pt => tabs.some(t => t.id === pt.id)) ? (
                (() => {
                  const allDesignTabs = tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon, color: t.color }));
                  const activeIdx = allDesignTabs.findIndex(t => t.id === activeDesignTabId);
                  const controlledTab = activeIdx >= 0 ? activeIdx + 1 : 1;
                  return (
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                  <ShiftReportFormContent
                    embed
                    readOnly={false}
                    personnel={personnel}
                    showNavButtons={true}
                    showSubmitButton={false}
                    initialValue={{ shiftInfo: { supervisorName: user?.fullName ?? '' }, feedLinesActive: { lineA: false, lineB: false } }}
                    dynamicFeedColumns={true}
                    customBoxes={(() => {
                      const containerSectionIds = new Set(fields.filter(f => f.type === 'container').map(f => f.sectionId).filter(Boolean));
                      return fields.filter(f =>
                        f.type === 'container' ||
                        (f.sectionId && containerSectionIds.has(f.sectionId)) ||
                        (!f.sectionId && f.tabId)
                      ).map(f => ({ id: f.id, key: f.key, label: f.label, type: f.type, tabId: f.tabId, sectionId: f.sectionId ?? '', placeholder: f.placeholder, options: f.options, defaultValue: f.defaultValue, readOnly: f.readOnly, required: f.required, width: f.width, color: f.color, helpText: f.helpText, validation: f.validation, repeatableListConfig: f.repeatableListConfig, timePairConfig: f.timePairConfig, matrixConfig: f.matrixConfig }));
                    })()}
                    customBoxValue={previewValue}
                    onCustomBoxChange={(key, val) => setPreviewValue(prev => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }))}
                    onPreviewTabChange={(idx) => { setPreviewActiveTab(idx); setActiveDesignTabId(allDesignTabs[idx - 1]?.id ?? `tab-${idx}`); }}
                    controlledActiveTab={controlledTab}
                    visibleTools={visibleTools}
                    designTabs={allDesignTabs}
                    onFieldClick={(id) => {
                      const f = fields.find(x => x.id === id || x.key === id);
                      if (f?.sectionId) setActiveDesignBoxSectionId(f.sectionId);
                      else if (f) setActiveDesignBoxSectionId(null);
                      setSelectedDesignFieldId(id);
                      setIsFieldsOpen(true);
                    }}
                  />
                </div>
                  );
                })()
              ) : (
                <DynamicFormRenderer fields={fields} tabs={tabs} groups={groups} value={previewValue} onChange={setPreviewValue} activeTabId={activeDesignTabId} onTabChange={setActiveDesignTabId} personnel={personnel} onFieldClick={(id) => {
                    const f = fields.find(x => x.id === id || x.key === id);
                    if (f?.sectionId) setActiveDesignBoxSectionId(f.sectionId);
                    else if (f) setActiveDesignBoxSectionId(null);
                    setSelectedDesignFieldId(id);
                    setIsFieldsOpen(true);
                  }} />
              )}
            </div>
          </div>
        </div>

        {iconPickerTabId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => { setIconPickerTabId(null); iconPickerTargetRef.current = null; }}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <h3 className="font-bold">انتخاب آیکون تب <span className="text-gray-500 font-normal text-sm">({TAB_ICON_OPTIONS.length} آیکون)</span></h3>
                <button
                  type="button"
                  onClick={() => { setIconPickerTabId(null); iconPickerTargetRef.current = null; }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                >
                  ×
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {TAB_ICON_OPTIONS.map(opt => {
                    const Icon = opt.Icon;
                    const target = iconPickerTargetRef.current;
                    const tabIdx = target ? target.tabIndex : tabs.findIndex(t => t.id === iconPickerTabId);
                    const isSelected = tabIdx >= 0 && (tabs[tabIdx]?.icon || 'clipboard') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const tgt = iconPickerTargetRef.current;
                          const iconId = opt.id;
                          if (tgt) {
                            setTabs(prev =>
                              prev.map(t => (t.id === tgt.tabId ? { ...t, icon: iconId } : t))
                            );
                            setIconPickerTabId(null);
                            iconPickerTargetRef.current = null;
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
    <>
      <ConfirmModal
        isOpen={!!publishConfirmTarget}
        onClose={() => setPublishConfirmTarget(null)}
        onConfirm={handlePublishConfirm}
        title="انتشار فرم گزارش"
        message={publishConfirmTarget ? `آیا از انتشار فرم «${publishConfirmTarget.title}» اطمینان دارید؟ پس از انتشار، این فرم در صفحه گزارش مربوطه فعال می‌شود و فرم قبلی (در صورت وجود) غیرفعال خواهد شد. برای ذخیره داده‌های گزارش، ممکن است نیاز به اجرای کوئری SQL مربوطه در دیتابیس باشید.` : ''}
        confirmText="بله، انتشار دهم"
        cancelText="انصراف"
        variant="warning"
      />
      {publishResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className={`p-6 ${publishResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${publishResult.success ? 'bg-green-200 dark:bg-green-800' : 'bg-red-200 dark:bg-red-800'}`}>
                  {publishResult.success ? <CheckCircle className="w-8 h-8 text-green-700 dark:text-green-300" /> : <AlertTriangle className="w-8 h-8 text-red-700 dark:text-red-300" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">{publishResult.success ? 'فرم با موفقیت منتشر شد' : 'خطا در انتشار'}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {publishResult.success ? 'فرم اکنون در صفحه گزارش مربوطه فعال است.' : publishResult.error}
                  </p>
                </div>
              </div>
            </div>
            {publishResult.success && publishResult.sql && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1 overflow-auto">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">کوئری پیشنهادی برای ساخت جدول در دیتابیس:</p>
                <div className="relative">
                  <textarea readOnly value={publishResult.sql} className="w-full min-h-[200px] p-3 text-xs font-mono bg-gray-50 dark:bg-gray-900 border rounded-lg resize-none" />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(publishResult!.sql!);
                        setPublishSqlCopied(true);
                        setTimeout(() => setPublishSqlCopied(false), 2000);
                      } catch { alert('کپی ناموفق'); }
                    }}
                    className="absolute top-2 left-2 p-2 rounded-lg bg-white dark:bg-gray-700 border hover:bg-gray-50 dark:hover:bg-gray-600"
                    title="کپی"
                  >
                    {publishSqlCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setPublishResult(null)}
                className="px-6 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 font-medium"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
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
        onViewDetails={handleView}
        exportName="ReportFormDefinitions"
        publishAction={{ onClick: (row) => setPublishConfirmTarget(row), title: 'انتشار' }}
      />
    </>
  );
};

export default ReportFormDesign;
