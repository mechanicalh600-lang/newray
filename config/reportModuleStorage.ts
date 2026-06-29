/** محل ذخیره داده هر گزارش — برای نمایش در طراحی گزارش */

export type ReportStorageKind = 'legacy_table' | 'report_records' | 'tool_page';

export interface ReportStorageInfo {
  kind: ReportStorageKind;
  /** نام جدول PostgreSQL */
  table?: string;
  /** توضیح فارسی کوتاه */
  label: string;
  detail?: string;
}

/** گزارش‌های پیش‌فرض با جدول اختصاصی legacy */
const LEGACY_TABLE_BY_SLUG: Record<string, { table: string; detail?: string }> = {
  'control-room': { table: 'control_room_reports', detail: 'همچنین فرم JSON در report_records در صورت انتشار فرم داینامیک' },
  'shift-report': { table: 'shift_reports' },
  'lab-report': { table: 'lab_reports' },
  'scale-report': { table: 'scale_reports' },
  'production-report': { table: 'production_reports' },
  'warehouse-report': { table: 'warehouse_reports' },
  'hse-report': { table: 'hse_reports' },
};

const TOOL_PAGES: Record<string, string> = {
  reports: 'صفحه ابزار — گزارش‌های ساخته‌شده در report_definitions / report_records',
  'list-report': 'گزارش لیستی — تعاریف در localStorage / لیست SQL',
};

export function getReportStorageInfo(slug: string, isBuiltin: boolean): ReportStorageInfo {
  const legacy = LEGACY_TABLE_BY_SLUG[slug];
  if (legacy) {
    return {
      kind: 'legacy_table',
      table: legacy.table,
      label: legacy.table,
      detail: legacy.detail,
    };
  }
  const toolDetail = TOOL_PAGES[slug];
  if (toolDetail) {
    return {
      kind: 'tool_page',
      label: slug === 'list-report' ? 'گزارش لیستی' : 'گزارش‌ساز پویا',
      detail: toolDetail,
    };
  }
  if (isBuiltin) {
    return {
      kind: 'report_records',
      table: 'report_records',
      label: 'report_records',
      detail: 'داده در payload (JSON) با definition_id',
    };
  }
  return {
    kind: 'report_records',
    table: 'report_records',
    label: 'report_records',
    detail: 'جدول مشترک — هر رکورد با definition_id و payload (JSON)',
  };
}
