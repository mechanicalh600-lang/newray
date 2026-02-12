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
  | 'attendance';

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

export interface MatrixConfig {
  rows: string[];
  columns: string[];
  defaultValue?: string;
  enforceNumeric?: boolean;
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
  width?: 1 | 2;
  helpText?: string;
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
    | 'mail'
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
    | 'snowflake';
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
    return (data || []) as ReportDefinition[];
  } catch {
    return getFallbackDefs();
  }
};

export const getActiveReportDefinitions = async (): Promise<ReportDefinition[]> => {
  const defs = await getAllReportDefinitions();
  return defs.filter(d => d.is_active);
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

export const upsertReportDefinitionDraft = async (
  input: Partial<ReportDefinition> & Pick<ReportDefinition, 'title' | 'slug' | 'category' | 'form_schema' | 'list_schema'>
) => {
  const normalizedSlug = slugify(input.slug);
  const now = new Date().toISOString();
  const current = input.id ? await getReportDefinitionBySlug(normalizedSlug) : null;

  const payload: Partial<ReportDefinition> = {
    id: input.id,
    slug: normalizedSlug,
    title: input.title,
    category: input.category,
    is_active: input.is_active ?? true,
    form_schema: input.form_schema,
    list_schema: input.list_schema,
    template_schema: input.template_schema || { moduleId: normalizedSlug },
    data_source: { mode: 'generic', table: 'report_records' },
    version: Math.max(1, (current?.version || 0) + 1),
    published_version: current?.published_version || 0,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase.from('report_definitions').upsert([payload]).select('*').single();
    if (error) throw error;
    await insertSystemLog('ذخیره پیش نویس فرم گزارش', `slug=${normalizedSlug}`);
    await insertAudit(current ? 'UPDATE' : 'INSERT', data.id, current || null, data);
    emitReportDefinitionsChanged();
    return data as ReportDefinition;
  } catch {
    const fallback = getFallbackDefs();
    const idx = fallback.findIndex(d => d.slug === normalizedSlug);
    const next: ReportDefinition = {
      id: input.id || `local-${Date.now()}`,
      slug: normalizedSlug,
      title: input.title,
      category: input.category,
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
    return next;
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
  try {
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
