import { supabase } from '../supabaseClient';
import { ProcessModule } from '../types';
import {
  ReportFieldSchema,
  ReportFormSchema,
  ReportTabSchema,
} from './reportDefinitions';
import { getEntityFormPreset, buildListSchemaFromFields } from '../config/entityFormPresets';
import { slugifyProcessModule, getAllProcessModules, invalidateProcessModulesCache } from './processModules';

export interface ProcessFormDefinition extends ProcessModule {
  form_schema: ReportFormSchema;
  list_schema: { columns: { key: string; label: string; visible?: boolean }[] };
}

const defaultFormSchema = (): ReportFormSchema => ({ tabs: [], fields: [], groups: [] });

export const normalizeProcessFormRow = (row: ProcessModule): ProcessFormDefinition => ({
  ...row,
  form_schema: (row.form_schema as ReportFormSchema) || defaultFormSchema(),
  list_schema: row.list_schema?.columns?.length
    ? { columns: row.list_schema.columns }
    : { columns: [] },
  use_dynamic_form: !!row.use_dynamic_form,
  form_version: Number(row.form_version) || 1,
  published_form_version: Number(row.published_form_version) || 0,
});

export async function getAllProcessFormDefinitions(): Promise<ProcessFormDefinition[]> {
  const modules = await getAllProcessModules();
  return modules.map(normalizeProcessFormRow);
}

export async function getProcessFormBySlug(slug: string): Promise<ProcessFormDefinition | null> {
  const clean = slugifyProcessModule(slug);
  try {
    const { data, error } = await supabase.from('process_modules').select('*').eq('slug', clean).maybeSingle();
    if (error) throw error;
    if (data) return normalizeProcessFormRow(data as ProcessModule);
  } catch (e) {
    console.warn('getProcessFormBySlug', e);
  }
  const modules = await getAllProcessModules();
  const found = modules.find(m => m.slug === clean);
  return found ? normalizeProcessFormRow(found) : null;
}

export async function getPublishedProcessFormBySlug(slug: string): Promise<ProcessFormDefinition | null> {
  const def = await getProcessFormBySlug(slug);
  if (!def?.use_dynamic_form) return null;
  if (!def.published_form_version || def.published_form_version <= 0) return null;
  if (!def.form_schema?.fields?.length) return null;
  return def;
}

export async function saveProcessFormDraft(input: {
  slug: string;
  form_schema: ReportFormSchema;
  list_schema?: { columns: { key: string; label: string; visible?: boolean }[] };
  use_dynamic_form?: boolean;
  updated_by?: string;
}): Promise<void> {
  const clean = slugifyProcessModule(input.slug);
  const list_schema = input.list_schema || buildListSchemaFromFields(input.form_schema.fields || []);
  const existing = await getProcessFormBySlug(clean);
  if (!existing) throw new Error('ماژول فرآیند یافت نشد.');

  const nextVersion = (existing.form_version || 1) + 1;
  const { error } = await supabase
    .from('process_modules')
    .update({
      form_schema: input.form_schema,
      list_schema,
      use_dynamic_form: input.use_dynamic_form ?? true,
      form_version: nextVersion,
      updated_at: new Date().toISOString(),
      updated_by: input.updated_by || null,
    })
    .eq('slug', clean);
  if (error) throw error;
  invalidateProcessModulesCache();
  window.dispatchEvent(new Event('process-modules-changed'));
}

export async function publishProcessForm(slug: string): Promise<void> {
  const def = await getProcessFormBySlug(slug);
  if (!def) throw new Error('ماژول یافت نشد.');
  if (!def.form_schema?.fields?.length) throw new Error('فرم خالی است.');
  const { error } = await supabase
    .from('process_modules')
    .update({
      published_form_version: def.form_version || 1,
      use_dynamic_form: true,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slugifyProcessModule(slug));
  if (error) throw error;
  invalidateProcessModulesCache();
  window.dispatchEvent(new Event('process-modules-changed'));
}

export async function setProcessFormDynamicEnabled(slug: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('process_modules')
    .update({ use_dynamic_form: enabled, updated_at: new Date().toISOString() })
    .eq('slug', slugifyProcessModule(slug));
  if (error) throw error;
  invalidateProcessModulesCache();
  window.dispatchEvent(new Event('process-modules-changed'));
}

export async function importProcessFormPreset(slug: string, updatedBy?: string): Promise<void> {
  const preset = getEntityFormPreset(slug);
  if (!preset) throw new Error('قالب آماده برای این ماژول وجود ندارد.');
  await saveProcessFormDraft({
    slug,
    form_schema: preset,
    list_schema: buildListSchemaFromFields(preset.fields || []),
    use_dynamic_form: false,
    updated_by: updatedBy,
  });
}

export function blankProcessField(): ReportFieldSchema {
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    key: '',
    label: '',
    type: 'text',
    width: 2,
    required: false,
    tabId: 'tab-main',
  };
}

export function blankProcessTab(): ReportTabSchema {
  return {
    id: `tab-${Date.now()}`,
    label: 'تب جدید',
    color: '#2563eb',
    icon: 'clipboard',
  };
}
