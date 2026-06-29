/** برچسب فارسی فیلدها و تم بصری هر ماژول کارتابل */

export interface CartableModuleTheme {
  gradient: string;
  accent: string;
  accentBg: string;
  iconBg: string;
}

export const CARTABLE_MODULE_THEMES: Record<string, CartableModuleTheme> = {
  WORK_ORDER: { gradient: 'from-orange-500 to-amber-600', accent: 'text-orange-600', accentBg: 'bg-orange-50 dark:bg-orange-900/30', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
  PART_REQUEST: { gradient: 'from-violet-500 to-purple-600', accent: 'text-violet-600', accentBg: 'bg-violet-50 dark:bg-violet-900/30', iconBg: 'bg-violet-100 dark:bg-violet-900/40' },
  PURCHASE: { gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600', accentBg: 'bg-emerald-50 dark:bg-emerald-900/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  PROJECT: { gradient: 'from-blue-500 to-indigo-600', accent: 'text-blue-600', accentBg: 'bg-blue-50 dark:bg-blue-900/30', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
  SUGGESTION: { gradient: 'from-yellow-500 to-amber-500', accent: 'text-amber-600', accentBg: 'bg-amber-50 dark:bg-amber-900/30', iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
  MEETING: { gradient: 'from-cyan-500 to-sky-600', accent: 'text-cyan-600', accentBg: 'bg-cyan-50 dark:bg-cyan-900/30', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  TECH_DOC: { gradient: 'from-slate-500 to-gray-600', accent: 'text-slate-600', accentBg: 'bg-slate-50 dark:bg-slate-900/30', iconBg: 'bg-slate-100 dark:bg-slate-800/40' },
  PERFORMANCE: { gradient: 'from-pink-500 to-rose-600', accent: 'text-pink-600', accentBg: 'bg-pink-50 dark:bg-pink-900/30', iconBg: 'bg-pink-100 dark:bg-pink-900/40' },
  MISSION: { gradient: 'from-lime-500 to-green-600', accent: 'text-lime-700', accentBg: 'bg-lime-50 dark:bg-lime-900/30', iconBg: 'bg-lime-100 dark:bg-lime-900/40' },
  FACTORY_EXIT: { gradient: 'from-red-500 to-rose-600', accent: 'text-red-600', accentBg: 'bg-red-50 dark:bg-red-900/30', iconBg: 'bg-red-100 dark:bg-red-900/40' },
};

export const DEFAULT_CARTABLE_THEME: CartableModuleTheme = {
  gradient: 'from-primary to-red-800',
  accent: 'text-primary',
  accentBg: 'bg-primary/5',
  iconBg: 'bg-primary/10',
};

export const getCartableTheme = (moduleKey: string) =>
  CARTABLE_MODULE_THEMES[moduleKey] || DEFAULT_CARTABLE_THEME;

const COMMON_LABELS: Record<string, string> = {
  tracking_code: 'کد پیگیری',
  status: 'وضعیت',
  description: 'توضیحات',
  requester_name: 'درخواست‌کننده',
  requester_id: 'شناسه درخواست‌کننده',
  request_date: 'تاریخ درخواست',
  request_time: 'ساعت',
  created_at: 'تاریخ ثبت',
  personnel_name: 'پرسنل',
  unit: 'واحد',
  period: 'دوره',
  total_score: 'امتیاز کل',
  max_possible_score: 'حداکثر امتیاز',
  subject: 'موضوع',
  location: 'محل',
  meeting_date: 'تاریخ جلسه',
  start_time: 'ساعت شروع',
  end_time: 'ساعت پایان',
  code: 'کد',
  title: 'عنوان',
  type: 'نوع',
  destination: 'مقصد',
  exit_date: 'تاریخ خروج',
  exit_time: 'ساعت خروج',
  recipient_name: 'تحویل‌گیرنده',
  equipment_name: 'نام تجهیز',
  equipment_code: 'کد تجهیز',
  work_type: 'نوع کار',
  priority: 'اولویت',
  failure_description: 'شرح خرابی',
  action_taken: 'اقدام انجام‌شده',
  user_name: 'ثبت‌کننده',
  request_number: 'شماره درخواست',
  qty: 'تعداد',
  unit_name: 'واحد',
  purpose: 'هدف',
  transport_type: 'نوع حمل',
  approver_name: 'تاییدکننده',
};

const MODULE_LABELS: Record<string, Record<string, string>> = {
  PART_REQUEST: { work_order_code: 'کد دستور کار', urgency: 'فوریت' },
  PURCHASE: { location: 'محل خرید', priority: 'اولویت' },
  PROJECT: { manager_name: 'مدیر پروژه', progress: 'پیشرفت', budget: 'بودجه' },
  MEETING: { attendees: 'حاضرین' },
  FACTORY_EXIT: { vehicle_plate: 'پلاک', driver_name: 'راننده', gate_pass_no: 'مجوز گیت' },
};

export const getFieldLabel = (moduleKey: string, key: string): string =>
  MODULE_LABELS[moduleKey]?.[key] || COMMON_LABELS[key] || key.replace(/_/g, ' ');

const HIDDEN_KEYS = new Set([
  'id', 'seen_by', 'entity_id', 'workflow_id', 'initiator_id', 'assignee_id',
  'labor', 'labor_details', 'parts', 'used_parts', 'docs', 'attachments',
  'items', 'line_items', 'criteria_scores', 'objectives', 'wbs', 'full_data',
]);

export const isHiddenCartableField = (key: string) => HIDDEN_KEYS.has(key);

const STATUS_FA: Record<string, string> = {
  PENDING: 'در انتظار',
  REQUEST: 'درخواست',
  IN_PROGRESS: 'در حال انجام',
  FINISHED: 'پایان‌یافته',
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال‌شده',
  APPROVED: 'تایید شده',
  REJECTED: 'رد شده',
  REGISTERED: 'ثبت شده',
  PLANNED: 'برنامه‌ریزی',
};

export const formatCartableValue = (key: string, val: unknown): string => {
  if (val == null || val === '') return '—';
  if (key === 'status' && typeof val === 'string') return STATUS_FA[val] || val;
  if (typeof val === 'boolean') return val ? 'بله' : 'خیر';
  if (typeof val === 'number') return val.toLocaleString('fa-IR');
  return String(val);
};

export interface CartableFieldRow {
  key: string;
  label: string;
  value: string;
  raw: unknown;
  isComplex: boolean;
}

export const extractCartableFields = (
  moduleKey: string,
  data: Record<string, unknown>
): CartableFieldRow[] => {
  const rows: CartableFieldRow[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (isHiddenCartableField(key)) continue;
    if (Array.isArray(val)) {
      rows.push({
        key,
        label: getFieldLabel(moduleKey, key),
        value: `${val.length} مورد`,
        raw: val,
        isComplex: true,
      });
      continue;
    }
    if (typeof val === 'object' && val !== null) continue;
    rows.push({
      key,
      label: getFieldLabel(moduleKey, key),
      value: formatCartableValue(key, val),
      raw: val,
      isComplex: false,
    });
  }
  return rows;
};

export const extractCartableCollections = (
  data: Record<string, unknown>
): { key: string; label: string; items: unknown[] }[] => {
  const out: { key: string; label: string; items: unknown[] }[] = [];
  for (const key of ['items', 'line_items', 'attendees', 'criteria_scores']) {
    const val = data[key];
    if (Array.isArray(val) && val.length > 0) {
      out.push({ key, label: getFieldLabel('', key), items: val });
    }
  }
  return out;
};
