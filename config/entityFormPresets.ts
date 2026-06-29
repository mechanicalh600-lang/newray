import type { ReportFieldSchema, ReportFormSchema, ReportTabSchema } from '../services/reportDefinitions';

const T = 'tab-main';
const T2 = 'tab-detail';

const f = (
  key: string,
  label: string,
  type: ReportFieldSchema['type'],
  extra: Partial<ReportFieldSchema> = {}
): ReportFieldSchema => ({
  id: `preset-${key}`,
  key,
  label,
  type,
  width: 2,
  required: false,
  tabId: T,
  ...extra,
});

const mainTab = (label = 'اطلاعات اصلی'): ReportTabSchema => ({
  id: T,
  label,
  color: '#2563eb',
  icon: 'clipboard',
});

const detailTab = (label: string): ReportTabSchema => ({
  id: T2,
  label,
  color: '#16a34a',
  icon: 'package',
});

/** قالب‌های آماده — کلید فیلد = نام ستون PostgreSQL */
export const ENTITY_FORM_PRESETS: Record<string, ReportFormSchema> = {
  'work-order': {
    tabs: [mainTab('درخواست'), detailTab('جزئیات فنی')],
    fields: [
      f('request_date', 'تاریخ درخواست', 'date', { required: true, sectionId: 'عمومی', defaultValue: '' }),
      f('request_time', 'ساعت درخواست', 'time', { sectionId: 'عمومی' }),
      f('shift', 'شیفت', 'text', { sectionId: 'عمومی' }),
      f('equipment_code', 'کد تجهیز', 'text', { required: true, sectionId: 'تجهیز' }),
      f('equipment_name', 'نام تجهیز', 'text', { required: true, sectionId: 'تجهیز' }),
      f('local_name', 'نام محلی', 'text', { sectionId: 'تجهیز' }),
      f('location_details', 'محل / جزئیات موقعیت', 'text', { sectionId: 'تجهیز', width: 4 }),
      f('production_line', 'خط تولید', 'text', { sectionId: 'تجهیز' }),
      f('work_category', 'رسته کاری', 'select', {
        sectionId: 'کار',
        options: [
          { label: 'مکانیک', value: 'MECHANICAL' },
          { label: 'برق', value: 'ELECTRICAL' },
          { label: 'ابزار دقیق', value: 'INSTRUMENT' },
        ],
      }),
      f('work_type', 'نوع کار', 'select', {
        sectionId: 'کار',
        options: [
          { label: 'تعمیر', value: 'REPAIR' },
          { label: 'سرویس', value: 'SERVICE' },
          { label: 'بازرسی', value: 'INSPECTION' },
        ],
      }),
      f('priority', 'اولویت', 'select', {
        sectionId: 'کار',
        options: [
          { label: 'عادی', value: 'NORMAL' },
          { label: 'فوری', value: 'URGENT' },
          { label: 'اضطراری', value: 'EMERGENCY' },
        ],
      }),
      f('failure_description', 'شرح خرابی / درخواست', 'textarea', {
        required: true,
        sectionId: 'شرح',
        width: 4,
      }),
      f('action_taken', 'اقدام انجام‌شده', 'textarea', { sectionId: 'شرح', tabId: T2, width: 4 }),
      f('downtime', 'زمان توقف (دقیقه)', 'number', { sectionId: 'زمان', tabId: T2, validation: { min: 0 } }),
      f('repair_time', 'زمان تعمیر (دقیقه)', 'number', { sectionId: 'زمان', tabId: T2, validation: { min: 0 } }),
      f('labor_details', 'نیروی کار (JSON)', 'repeatable_list', { sectionId: 'منابع', tabId: T2, width: 4 }),
      f('used_parts', 'قطعات مصرفی (JSON)', 'repeatable_list', { sectionId: 'منابع', tabId: T2, width: 4 }),
    ],
    groups: [],
  },
  'pm-plan': {
    tabs: [mainTab()],
    fields: [
      f('title', 'عنوان برنامه PM', 'text', { required: true }),
      f('frequency_type', 'نوع دوره', 'select', {
        required: true,
        options: [
          { label: 'هفتگی', value: 'WEEKLY' },
          { label: 'ماهانه', value: 'MONTHLY' },
          { label: 'ساعتی', value: 'HOURS' },
        ],
      }),
      f('frequency_value', 'مقدار دوره', 'number', { required: true, validation: { min: 1 } }),
      f('next_run_date', 'تاریخ اجرای بعدی', 'date', { required: true }),
      f('last_run_date', 'آخرین اجرا', 'date'),
      f('description', 'شرح فعالیت‌ها', 'textarea', { width: 4 }),
    ],
    groups: [],
  },
  'service-repair': {
    tabs: [mainTab()],
    fields: [
      f('request_date', 'تاریخ درخواست', 'date', { required: true }),
      f('equipment_code', 'کد تجهیز', 'text'),
      f('equipment_name', 'نام تجهیز', 'text', { required: true }),
      f('service_type', 'نوع خدمت', 'select', {
        required: true,
        options: [
          { label: 'تعمیرات', value: 'REPAIR' },
          { label: 'خدمات', value: 'SERVICE' },
          { label: 'بازرسی', value: 'INSPECTION' },
          { label: 'کالیبراسیون', value: 'CALIBRATION' },
        ],
      }),
      f('urgency', 'فوریت', 'select', {
        options: [
          { label: 'عادی', value: 'LOW' },
          { label: 'متوسط', value: 'NORMAL' },
          { label: 'فوری', value: 'HIGH' },
          { label: 'بحرانی', value: 'CRITICAL' },
        ],
      }),
      f('vendor_name', 'نام پیمانکار / فروشنده', 'text'),
      f('estimated_cost', 'هزینه برآوردی', 'number', { validation: { min: 0 } }),
      f('completion_date', 'تاریخ تکمیل', 'date'),
      f('description', 'شرح درخواست', 'textarea', { required: true, width: 4 }),
    ],
    groups: [],
  },
  permit: {
    tabs: [mainTab('مجوز'), detailTab('ایمنی')],
    fields: [
      f('permit_type', 'نوع مجوز (PTW)', 'text', { required: true }),
      f('start_time', 'زمان شروع', 'time', { required: true }),
      f('end_time', 'زمان پایان', 'time', { required: true }),
      f('hazards', 'خطرات شناسایی‌شده', 'repeatable_list', { tabId: T2, width: 4 }),
      f('precautions', 'اقدامات احتیاطی', 'repeatable_list', { tabId: T2, width: 4 }),
    ],
    groups: [],
  },
  project: {
    tabs: [mainTab(), detailTab('بودجه و پیشرفت')],
    fields: [
      f('title', 'عنوان پروژه', 'text', { required: true }),
      f('manager_name', 'مدیر پروژه', 'text'),
      f('start_date', 'تاریخ شروع', 'date'),
      f('end_date', 'تاریخ پایان', 'date'),
      f('description', 'شرح پروژه', 'textarea', { width: 4 }),
      f('budget', 'بودجه', 'number', { tabId: T2, validation: { min: 0 } }),
      f('progress', 'درصد پیشرفت', 'number', { tabId: T2, validation: { min: 0, max: 100 } }),
    ],
    groups: [],
  },
  'tech-doc': {
    tabs: [mainTab()],
    fields: [
      f('code', 'کد سند', 'text'),
      f('title', 'عنوان سند', 'text', { required: true }),
      f('type', 'نوع سند', 'select', {
        options: [
          { label: 'دیتاشیت', value: 'DATASHEET' },
          { label: 'نقشه', value: 'DRAWING' },
          { label: 'دستورالعمل', value: 'MANUAL' },
          { label: 'سایر', value: 'OTHER' },
        ],
      }),
      f('file_url', 'آدرس فایل', 'text', { width: 4, placeholder: 'URL یا مسیر فایل' }),
      f('description', 'توضیحات', 'textarea', { width: 4 }),
    ],
    groups: [],
  },
  suggestion: {
    tabs: [mainTab()],
    fields: [
      f('description', 'متن پیشنهاد فنی', 'textarea', {
        required: true,
        width: 4,
        placeholder: 'شرح کامل پیشنهاد، مزایا و محل اجرا...',
      }),
    ],
    groups: [],
  },
  meeting: {
    tabs: [mainTab(), detailTab('حضار')],
    fields: [
      f('subject', 'موضوع جلسه', 'text', { required: true }),
      f('location', 'محل برگزاری', 'text'),
      f('meeting_date', 'تاریخ جلسه', 'date', { required: true }),
      f('start_time', 'ساعت شروع', 'time', { required: true, defaultValue: '08:00' }),
      f('end_time', 'ساعت پایان', 'time', { required: true, defaultValue: '10:00' }),
      f('attendees', 'لیست حاضرین (JSON)', 'repeatable_list', {
        tabId: T2,
        width: 4,
        repeatableListConfig: { minItems: 1 },
      }),
    ],
    groups: [],
  },
  'part-request': {
    tabs: [mainTab()],
    fields: [
      f('request_date', 'تاریخ درخواست', 'date', { required: true }),
      f('work_order_code', 'کد دستور کار مرتبط', 'text'),
      f('description', 'شرح درخواست', 'textarea', { required: true, width: 4 }),
      f('items', 'اقلام درخواستی', 'repeatable_list', {
        width: 4,
        repeatableListConfig: { minItems: 1 },
      }),
    ],
    groups: [],
  },
  purchase: {
    tabs: [mainTab()],
    fields: [
      f('request_number', 'شماره درخواست', 'text', { required: true, placeholder: '03/1234' }),
      f('request_date', 'تاریخ درخواست', 'date', { required: true }),
      f('location', 'محل مصرف', 'select', {
        required: true,
        options: [
          { label: 'ستاد (دفتر مرکزی)', value: 'ستاد (دفتر مرکزی)' },
          { label: 'مجتمع (کارخانه)', value: 'مجتمع (کارخانه)' },
        ],
      }),
      f('priority', 'اولویت', 'select', {
        required: true,
        options: [
          { label: 'عادی', value: 'عادی' },
          { label: 'فوری', value: 'فوری' },
          { label: 'بحرانی (توقف تولید)', value: 'بحرانی (توقف تولید)' },
        ],
      }),
      f('description', 'شرح کالا / خدمات', 'textarea', { required: true, width: 4 }),
      f('qty', 'مقدار', 'number', { required: true, validation: { min: 0.001 } }),
      f('unit', 'واحد', 'text', { required: true, defaultValue: 'عدد' }),
    ],
    groups: [],
  },
  'factory-exit': {
    tabs: [mainTab('خروج'), detailTab('حمل')],
    fields: [
      f('exit_date', 'تاریخ خروج', 'date', { required: true }),
      f('exit_time', 'ساعت خروج', 'time', { defaultValue: '08:00' }),
      f('destination', 'مقصد', 'text', { required: true }),
      f('recipient_name', 'نام تحویل‌گیرنده', 'text', { required: true }),
      f('recipient_org', 'سازمان / شرکت', 'text'),
      f('description', 'شرح کلی', 'textarea', { width: 4 }),
      f('vehicle_plate', 'پلاک خودرو', 'text', { tabId: T2 }),
      f('driver_name', 'نام راننده', 'text', { tabId: T2 }),
      f('gate_pass_no', 'شماره مجوز گیت', 'text', { tabId: T2 }),
      f('line_items', 'اقلام خروجی', 'repeatable_list', {
        tabId: T2,
        width: 4,
        repeatableListConfig: { minItems: 1 },
      }),
    ],
    groups: [],
  },
  'training-course': {
    tabs: [mainTab('دوره آموزشی')],
    fields: [
      f('code', 'کد دوره', 'text'),
      f('title', 'عنوان دوره', 'text', { required: true }),
      f('duration_hours', 'مدت (ساعت)', 'number', { validation: { min: 0 } }),
      f('provider', 'ارائه‌دهنده / مدرس', 'text'),
    ],
    groups: [],
  },
  'personnel-skill': {
    tabs: [mainTab('مهارت')],
    fields: [
      f('skill_name', 'نام مهارت', 'text', { required: true }),
      f('level', 'سطح', 'select', {
        required: true,
        options: [
          { label: 'مقدماتی', value: 'Beginner' },
          { label: 'متوسط', value: 'Intermediate' },
          { label: 'پیشرفته / مدرس', value: 'Expert' },
        ],
      }),
      f('certificate_date', 'تاریخ صدور گواهی', 'date'),
      f('expiry_date', 'تاریخ انقضا', 'date'),
    ],
    groups: [],
  },
  performance: {
    tabs: [mainTab(), detailTab('امتیازات')],
    fields: [
      f('personnel_name', 'نام پرسنل', 'text', { required: true }),
      f('unit', 'واحد سازمانی', 'text'),
      f('period', 'دوره ارزیابی', 'text', { required: true }),
      f('total_score', 'امتیاز کل', 'number', { tabId: T2, validation: { min: 0 } }),
      f('max_possible_score', 'حداکثر امتیاز', 'number', { tabId: T2, validation: { min: 0 } }),
      f('criteria_scores', 'امتیاز شاخص‌ها (JSON)', 'matrix', {
        tabId: T2,
        width: 4,
        matrixConfig: {
          rows: ['شاخص ۱', 'شاخص ۲', 'شاخص ۳'],
          columns: ['امتیاز', 'حداکثر'],
          defaultValue: '',
          enforceNumeric: true,
        },
      }),
    ],
    groups: [],
  },
  mission: {
    tabs: [mainTab('مأموریت'), detailTab('تأیید')],
    fields: [
      f('personnel_name', 'نام پرسنل', 'text', { required: true }),
      f('personnel_code', 'کد پرسنلی', 'text'),
      f('unit', 'واحد', 'text'),
      f('mission_date', 'تاریخ مأموریت', 'date', { required: true }),
      f('start_date', 'تاریخ شروع', 'date', { required: true }),
      f('end_date', 'تاریخ پایان', 'date', { required: true }),
      f('destination', 'مقصد', 'text', { required: true }),
      f('purpose', 'هدف مأموریت', 'textarea', { width: 4 }),
      f('transport_type', 'نوع حمل‌ونقل', 'select', {
        options: [
          { label: 'شرکت', value: 'شرکت' },
          { label: 'شخصی', value: 'شخصی' },
          { label: 'وسیله عمومی', value: 'وسیله عمومی' },
          { label: 'سایر', value: 'سایر' },
        ],
      }),
      f('approver_name', 'تأییدکننده', 'text', { tabId: T2 }),
      f('description', 'توضیحات تکمیلی', 'textarea', { tabId: T2, width: 4 }),
    ],
    groups: [],
  },
};

export function getEntityFormPreset(slug: string): ReportFormSchema | null {
  return ENTITY_FORM_PRESETS[slug] || null;
}

export function buildListSchemaFromFields(fields: ReportFieldSchema[]) {
  const priorityKeys = ['tracking_code', 'request_number', 'title', 'subject', 'description', 'personnel_name', 'equipment_name', 'destination'];
  const sorted = [...fields].sort((a, b) => {
    const ia = priorityKeys.indexOf(a.key);
    const ib = priorityKeys.indexOf(b.key);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return 0;
  });
  return {
    columns: sorted.slice(0, 8).map(field => ({
      key: field.key,
      label: field.label,
      visible: true,
    })),
  };
}

/** راهنمای کوتاه طراحی — نمایش در UI */
export const PROCESS_FORM_DESIGN_GUIDE = [
  '۱. فرم را از لیست انتخاب کنید (مثلاً «درخواست خرید»).',
  '۲. «قالب آماده» را بزنید تا فیلدهای فعلی کارخانه بارگذاری شود.',
  '۳. فیلد اضافه/حذف کنید — کلید فیلد باید دقیقاً نام ستون DB باشد (مثل description، qty).',
  '۴. «ذخیره پیش‌نویس» سپس «انتشار» — از این لحظه صفحه عملیاتی فرم جدید را نشان می‌دهد.',
  '۵. برای بازگشت به فرم قدیمی، در لیست toggle «فعال» را خاموش کنید.',
];
