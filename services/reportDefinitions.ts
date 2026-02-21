import { supabase } from '../supabaseClient';

export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'time'
  | 'repeatable_list'
  | 'time_pair'
  | 'matrix'
  | 'attendance'
  | 'container';

export interface RepeatableListConfig {
  placeholder?: string;
  minItems?: number;
  maxItems?: number;
}

export interface TimePairConfig {
  workLabel?: string;
  stopLabel?: string;
  reasonLabel?: string;
  requireReasonWhenStop?: boolean;
}

export type MatrixNumericOp = 'sum' | 'avg' | 'min' | 'max' | 'diff';

/** پیکربندی منبع مقدار هر سلول ماتریس */
export interface MatrixCellSource {
  type: 'manual';
}

export interface MatrixCellQuerySource {
  type: 'query';
  table: string;
  op: 'count' | 'sum';
  column?: string; // برای sum: نام ستون عددی
}

export interface MatrixCellCustomSqlSource {
  type: 'custom_sql';
  sql: string; // کوئری SELECT که یک مقدار برمی‌گرداند
}

export type MatrixCellSourceConfig = MatrixCellSource | MatrixCellQuerySource | MatrixCellCustomSqlSource;

export interface MatrixConfig {
  rows: string[];
  columns: string[];
  defaultValue?: string;
  enforceNumeric?: boolean;
  /** عنوان محور ردیف (پیش‌فرض: ردیف) */
  rowAxisLabel?: string;
  /** عنوان محور ستون (پیش‌فرض: ستون) */
  columnAxisLabel?: string;
  /** عملگرهای عددی نمایش داده شده (پیش‌فرض: فقط جمع) */
  numericOps?: MatrixNumericOp[];
  /** منبع مقدار هر سلول: { [rowKey]: { [colKey]: MatrixCellSourceConfig } } - پیش‌فرض: manual */
  cellSources?: Record<string, Record<string, MatrixCellSourceConfig>>;
}

export interface ReportFormGroup {
  id: string;
  title: string;
  color: string;
  /** عرض باکس: 1=یک‌سوم، 2=دو‌سوم، 3=کامل */
  width?: 1 | 2 | 3;
}

export interface ReportFieldSchema {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  tabId?: string;
  sectionId?: string;
  groupId?: string;
  /** عرض: 1=۱/۴، 2=۱/۲، 3=۳/۴، 4=کامل */
  width?: 1 | 2 | 3 | 4;
  helpText?: string;
  /** رنگ باکس یا فیلد (hex) */
  color?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  repeatableListConfig?: RepeatableListConfig;
  timePairConfig?: TimePairConfig;
  matrixConfig?: MatrixConfig;
  validation?: {
    min?: number;
    max?: number;
    regex?: string;
    regexMessage?: string;
    dependsOn?: { field: string; equals: any };
    totalMustEqualField?: string;
    mustBeLessOrEqualField?: string;
  };
  // فقط برای نمایش؛ برای مثال فیلدی مثل «روز هفته» که از روی تاریخ پر می‌شود
  readOnly?: boolean;
}

export interface ReportTabSchema {
  id: string;
  label: string;
  color?: string;
  icon?:
    | 'clipboard'
    | 'factory'
    | 'settings'
    | 'clock'
    | 'users'
    | 'activity'
    | 'package'
    | 'database'
    | 'monitor'
    | 'flask'
    | 'warehouse'
    | 'scale'
    | 'shield'
    | 'hardhat'
    | 'wrench'
    | 'magnet'
    | 'alert'
    | 'layers'
    | 'chart'
    | 'file'
    /* ── extended icon set ── */
    | 'truck'
    | 'flame'
    | 'thermometer'
    | 'droplets'
    | 'zap'
    | 'gauge'
    | 'mappin'
    | 'globe'
    | 'phone'
    | 'bell'
    | 'bookmark'
    | 'star'
    | 'heart'
    | 'flag'
    | 'tag'
    | 'key'
    | 'lock'
    | 'unlock'
    | 'search'
    | 'filter'
    | 'refresh'
    | 'download'
    | 'upload'
    | 'printer'
    | 'camera'
    | 'image'
    | 'sun'
    | 'moon'
    | 'cloud'
    | 'cloudrain'
    | 'wind'
    | 'umbrella'
    | 'building'
    | 'home'
    | 'door'
    | 'dollar'
    | 'banknote'
    | 'creditcard'
    | 'piechart'
    | 'trending'
    | 'target'
    | 'award'
    | 'trophy'
    | 'graduation'
    | 'book'
    | 'clipboardcheck'
    | 'filecheck'
    | 'folder'
    | 'inbox'
    | 'send'
    | 'message'
    | 'userplus'
    | 'usercheck'
    | 'userx'
    | 'shieldalert'
    | 'siren'
    | 'construction'
    | 'hammer'
    | 'cog'
    | 'cpu'
    | 'wifi'
    | 'radio'
    | 'battery'
    | 'plug'
    | 'pipette'
    | 'testtube'
    | 'microscope'
    | 'stethoscope'
    | 'heartpulse'
    | 'bike'
    | 'car'
    | 'ship'
    | 'plane'
    | 'rocket'
    | 'tree'
    | 'leaf'
    | 'recycle'
    | 'snowflake'
    /* ── تجهیزات صنعتی ── */
    | 'fan'
    | 'drill'
    | 'fuel'
    | 'nut'
    | 'bolt'
    | 'cylinder'
    | 'airvent'
    | 'rotatecw'
    | 'gears'
    | 'forklift'
    | 'cable'
    | 'boxes'
    | 'workflow'
    | 'radius'
    | 'pickaxe'
    | 'newspaper'
    | 'minimize'
    | 'mailbox'
    | 'layers2'
    | 'galleryverticalend'
    | 'alignverticaldistributestart'
    | 'omega'
    | 'letter'
    /* ── فلش، تیک، زنگ، مکعب ── */
    | 'arrowup'
    | 'arrowdown'
    | 'arrowleft'
    | 'arrowright'
    | 'arrowupright'
    | 'arrowdownleft'
    | 'chevronright'
    | 'chevronleft'
    | 'check'
    | 'checkcircle'
    | 'checksquare'
    | 'checkcheck'
    | 'belldot'
    | 'bellring'
    | 'box';
}

export interface ReportFormSchema {
  fields: ReportFieldSchema[];
  sections?: { id: string; title: string; fieldKeys: string[]; columns?: number }[];
  groups?: ReportFormGroup[];
  tabs?: ReportTabSchema[];
}

export interface ReportListSchema {
  columns: { key: string; label: string; visible?: boolean }[];
  sort?: { key: string; direction: 'asc' | 'desc' };
  filters?: { key: string; type: 'text' | 'date' | 'select'; options?: string[] }[];
}

export interface ReportTemplateSchema {
  moduleId: string;
  modulePath?: string;
}

export interface ReportDefinition {
  id: string;
  slug: string;
  title: string;
  category: string;
  is_active: boolean;
  form_schema: ReportFormSchema;
  list_schema: ReportListSchema;
  template_schema: ReportTemplateSchema;
  data_source: { mode: 'generic'; table: 'report_records' };
  version: number;
  published_version: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

const FALLBACK_KEY = 'report_definitions_fallback_v1';

const safeLocalParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getFallbackDefs = (): ReportDefinition[] => safeLocalParse<ReportDefinition[]>(localStorage.getItem(FALLBACK_KEY), []);
const setFallbackDefs = (defs: ReportDefinition[]) => localStorage.setItem(FALLBACK_KEY, JSON.stringify(defs));

const slugify = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const insertSystemLog = async (action: string, details: string) => {
  try {
    await supabase.from('system_logs').insert([{ action, details }]);
  } catch {
    // best effort
  }
};

const insertAudit = async (operation: 'INSERT' | 'UPDATE', recordId: string, oldData: any, newData: any) => {
  try {
    await supabase.from('data_change_audit').insert([
      {
        table_name: 'report_definitions',
        record_id: recordId,
        operation,
        changed_by: 'app-local-user',
        old_data: oldData,
        new_data: newData,
      },
    ]);
  } catch {
    // best effort
  }
};

const emitReportDefinitionsChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('report-definitions-changed'));
};

export const getAllReportDefinitions = async (): Promise<ReportDefinition[]> => {
  try {
    const { data, error } = await supabase
      .from('report_definitions')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const fromDb = (data || []) as ReportDefinition[];
    const fallback = getFallbackDefs();
    if (!fallback.length) return fromDb;
    // ادغام fallback با داده‌های Supabase: وقتی ذخیره در Supabase خطا داد ولی در localStorage ذخیره شد، نمایش داده شود
    const bySlug = new Map(fromDb.map(d => [d.slug, d]));
    for (const fb of fallback) {
      const existing = bySlug.get(fb.slug);
      const fbUpdated = fb.updated_at || '';
      const existingUpdated = existing?.updated_at || '';
      if (!existing || fbUpdated > existingUpdated) {
        bySlug.set(fb.slug, fb);
      }
    }
    return Array.from(bySlug.values()).sort((a, b) =>
      (b.updated_at || '').localeCompare(a.updated_at || '')
    );
  } catch {
    return getFallbackDefs();
  }
};

export const getActiveReportDefinitions = async (): Promise<ReportDefinition[]> => {
  const defs = await getAllReportDefinitions();
  return defs.filter(d => d.is_active);
};

/** فرم فعالی که به مسیر هدف (مثلاً /shift-report) متصل شده است */
export const getReportDefinitionByModulePath = async (modulePath: string): Promise<ReportDefinition | null> => {
  const defs = await getActiveReportDefinitions();
  const normalized = '/' + String(modulePath || '').replace(/^\/+/, '');
  return defs.find(d => {
    const p = (d.template_schema as any)?.modulePath;
    return p && ('/' + String(p).replace(/^\/+/, '')) === normalized;
  }) || null;
};

export const getReportDefinitionBySlug = async (slug: string): Promise<ReportDefinition | null> => {
  const cleaned = slugify(slug);
  try {
    const { data, error } = await supabase
      .from('report_definitions')
      .select('*')
      .eq('slug', cleaned)
      .maybeSingle();
    if (error) throw error;
    return (data as ReportDefinition) || null;
  } catch {
    return getFallbackDefs().find(d => d.slug === cleaned) || null;
  }
};

const isValidUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const upsertReportDefinitionDraft = async (
  input: Partial<ReportDefinition> & Pick<ReportDefinition, 'title' | 'slug' | 'category' | 'form_schema' | 'list_schema'>
) => {
  const normalizedSlug = slugify(input.slug);
  const now = new Date().toISOString();
  const current = await getReportDefinitionBySlug(normalizedSlug);

  const payload: Record<string, unknown> = {
    slug: normalizedSlug,
    title: input.title,
    category: input.category || 'گزارشات',
    is_active: input.is_active ?? false,
    form_schema: input.form_schema ?? { tabs: [], fields: [], groups: [], sections: [] },
    list_schema: input.list_schema ?? { columns: [] },
    template_schema: input.template_schema || { moduleId: normalizedSlug },
    data_source: { mode: 'generic', table: 'report_records' },
    version: Math.max(1, (current?.version || 0) + 1),
    published_version: current?.published_version || 0,
    updated_at: now,
  };
  // فقط برای به‌روزرسانی؛ id معتبر (UUID) ارسال می‌شود و upsert با slug انجام می‌شود
  if (input.id && isValidUuid(input.id)) {
    payload.id = input.id;
  }

  try {
    const { data, error } = await supabase
      .from('report_definitions')
      .upsert([payload], { onConflict: 'slug' })
      .select('*')
      .single();
    if (error) throw error;
    const saved = data as ReportDefinition;
    const modulePath = (input.template_schema as any)?.modulePath;
    if (modulePath) {
      const { data: others } = await supabase.from('report_definitions').select('id, is_active, template_schema').neq('id', saved.id);
      const samePathIds = (others || []).filter((d: any) => (d.template_schema?.modulePath || '') === modulePath && d.is_active).map((d: any) => d.id);
      for (const id of samePathIds) {
        await supabase.from('report_definitions').update({ is_active: false }).eq('id', id);
      }
    }
    await insertSystemLog('ذخیره پیش نویس فرم گزارش', `slug=${normalizedSlug}`);
    await insertAudit(current ? 'UPDATE' : 'INSERT', saved.id, current || null, data);
    emitReportDefinitionsChanged();
    return { data: saved, usedFallback: false };
  } catch (err) {
    console.error('خطا در ذخیره گزارش در Supabase:', err);
    const fallback = getFallbackDefs();
    const idx = fallback.findIndex(d => d.slug === normalizedSlug);
    const next: ReportDefinition = {
      id: input.id || `local-${Date.now()}`,
      slug: normalizedSlug,
      title: input.title,
      category: input.category || 'گزارشات',
      is_active: input.is_active ?? true,
      form_schema: input.form_schema,
      list_schema: input.list_schema,
      template_schema: input.template_schema || { moduleId: normalizedSlug },
      data_source: { mode: 'generic', table: 'report_records' },
      version: Math.max(1, (idx >= 0 ? fallback[idx].version : 0) + 1),
      published_version: idx >= 0 ? fallback[idx].published_version : 0,
      created_at: idx >= 0 ? fallback[idx].created_at : now,
      updated_at: now,
    };
    if (idx >= 0) fallback[idx] = next;
    else fallback.unshift(next);
    setFallbackDefs(fallback);
    emitReportDefinitionsChanged();
    const errMsg = err instanceof Error ? err.message : String(err);
    return { data: next, usedFallback: true, error: errMsg };
  }
};

export const publishReportDefinition = async (slug: string) => {
  const def = await getReportDefinitionBySlug(slug);
  if (!def) throw new Error('تعریف فرم گزارش پیدا نشد.');
  const nextPublished = Math.max(def.version, (def.published_version || 0) + 1);
  const publishedSnapshot = {
    ...def,
    published_version: nextPublished,
    template_schema: {
      ...(def.template_schema || { moduleId: def.slug }),
      moduleId: def.slug,
    },
  };
  const modulePath = (def.template_schema as any)?.modulePath;
  try {
    if (modulePath) {
      const { data: others } = await supabase.from('report_definitions').select('id, is_active, template_schema').neq('id', def.id);
      const samePathIds = (others || []).filter((d: any) => (d.template_schema?.modulePath || '') === modulePath && d.is_active).map((d: any) => d.id);
      for (const id of samePathIds) {
        await supabase.from('report_definitions').update({ is_active: false }).eq('id', id);
      }
    }
    const { data, error } = await supabase
      .from('report_definitions')
      .update({
        published_version: nextPublished,
        template_schema: publishedSnapshot.template_schema,
        is_active: true,
      })
      .eq('id', def.id)
      .select('*')
      .single();
    if (error) throw error;
    await insertSystemLog('انتشار فرم گزارش', `slug=${slug}, version=${nextPublished}`);
    await insertAudit('UPDATE', def.id, def, data);
    emitReportDefinitionsChanged();
    return data as ReportDefinition;
  } catch {
    const fallback = getFallbackDefs();
    const idx = fallback.findIndex(d => d.slug === def.slug);
    if (idx >= 0) {
      fallback[idx] = { ...fallback[idx], published_version: nextPublished, is_active: true };
      setFallbackDefs(fallback);
      emitReportDefinitionsChanged();
      return fallback[idx];
    }
    throw new Error('انتشار فرم در حالت fallback ناموفق بود.');
  }
};

const toSqlCol = (s: string) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
const toSqlTbl = (slug: string) => `report_${toSqlCol(slug.replace(/-/g, '_')) || 'new_form'}`;
const mapFieldTypeToSql = (type: FieldType) => {
  if (type === 'number') return 'numeric';
  if (type === 'checkbox') return 'boolean default false';
  if (type === 'matrix' || type === 'repeatable_list' || type === 'time_pair' || type === 'attendance') return "jsonb not null default '{}'::jsonb";
  return 'text';
};

export const generateSqlForDefinition = (def: ReportDefinition): string => {
  const slug = def.slug || '';
  const tableName = toSqlTbl(slug);
  const cols: string[] = [];
  const used = new Set<string>(['id', 'tracking_code', 'report_date', 'created_at', 'updated_at']);
  const fields = def.form_schema?.fields || [];
  for (const f of fields) {
    if (f.type === 'container') continue;
    const col = toSqlCol(f.key);
    if (!col || used.has(col)) continue;
    used.add(col);
    const notNull = f.required ? ' not null' : '';
    cols.push(`  ${col} ${mapFieldTypeToSql(f.type)}${notNull}`);
  }
  const slugCol = toSqlCol(slug) || 'new_form';
  return `-- SQL for: ${def.title || 'Report Form'}
create extension if not exists pgcrypto;

create table if not exists public.${tableName} (
  id uuid primary key default gen_random_uuid(),
  definition_slug text not null default '${slugCol}',
  tracking_code text,
  report_date text,
${cols.join(',\n')}${cols.length ? ',\n' : ''}  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_${tableName}_report_date on public.${tableName}(report_date);
create index if not exists ix_${tableName}_created_at on public.${tableName}(created_at desc);

alter table public.${tableName} enable row level security;`;
};

export const setDefinitionActiveState = async (id: string, isActive: boolean) => {
  try {
    const { error } = await supabase.from('report_definitions').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
    emitReportDefinitionsChanged();
  } catch {
    const fallback = getFallbackDefs();
    const idx = fallback.findIndex(d => d.id === id);
    if (idx >= 0) {
      fallback[idx] = { ...fallback[idx], is_active: isActive };
      setFallbackDefs(fallback);
      emitReportDefinitionsChanged();
    }
  }
};
