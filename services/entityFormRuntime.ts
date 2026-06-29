import { supabase } from '../supabaseClient';
import { User } from '../types';
import { ReportFieldSchema } from './reportDefinitions';
import { ProcessFormDefinition } from './processFormDefinitions';
import { getEntityFormConfig } from '../config/entityFormModules';
import { fetchNextTrackingCode } from '../workflowStore';
import { startEntityWorkflow } from './entityWorkflow';
import { validateDynamicForm } from '../utils/validateDynamicForm';

const JSON_FIELD_TYPES = new Set(['matrix', 'repeatable_list', 'time_pair', 'attendance']);

export function fieldToColumn(field: ReportFieldSchema): string {
  return (field.key || '').trim();
}

export function formValuesToDbRow(
  formValue: Record<string, unknown>,
  fields: ReportFieldSchema[]
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of fields) {
    const col = fieldToColumn(field);
    if (!col) continue;
    let val = formValue[field.key];
    if (val === undefined) continue;
    if (field.type === 'number') {
      row[col] = val === '' || val == null ? null : Number(val);
      continue;
    }
    if (field.type === 'checkbox') {
      row[col] = !!val;
      continue;
    }
    if (JSON_FIELD_TYPES.has(field.type)) {
      row[col] = val ?? (field.type === 'repeatable_list' ? [] : {});
      continue;
    }
    row[col] = val;
  }
  return row;
}

export function dbRowToFormValues(
  row: Record<string, unknown>,
  fields: ReportFieldSchema[]
): Record<string, unknown> {
  const formValue: Record<string, unknown> = {};
  for (const field of fields) {
    const col = fieldToColumn(field);
    const raw = row[col];
    if (raw === undefined || raw === null) {
      if (field.defaultValue !== undefined) formValue[field.key] = field.defaultValue;
      else if (field.type === 'repeatable_list') formValue[field.key] = [];
      else if (JSON_FIELD_TYPES.has(field.type)) formValue[field.key] = field.type === 'matrix' ? {} : [];
      else formValue[field.key] = '';
    } else {
      formValue[field.key] = raw;
    }
  }
  return formValue;
}

export async function fetchEntityRecords(table: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function deleteEntityRecords(table: string, ids: string[]): Promise<void> {
  const { error } = await supabase.from(table).delete().in('id', ids);
  if (error) throw error;
}

export async function saveEntityFormRecord(
  def: ProcessFormDefinition,
  user: User,
  formValue: Record<string, unknown>,
  editingId?: string | null
): Promise<string> {
  const fields = def.form_schema?.fields || [];
  if (!validateDynamicForm(fields, formValue)) {
    throw new Error('validation_failed');
  }

  const config = getEntityFormConfig(def.slug);
  let row = formValuesToDbRow(formValue, fields);

  if (!editingId) {
    const extras = config?.onCreate?.(user) || {};
    row = { ...extras, ...row };
    if (config?.trackingPrefix && !row.tracking_code) {
      row.tracking_code = await fetchNextTrackingCode(config.trackingPrefix);
    }
  }

  if (editingId) {
    const { error } = await supabase.from(def.entity_table).update(row).eq('id', editingId);
    if (error) throw error;
    return editingId;
  }

  const { data, error } = await supabase.from(def.entity_table).insert(row).select('id').single();
  if (error) throw error;
  const id = data.id as string;

  if (config?.startWorkflow && config.moduleKey && row.tracking_code) {
    const titleField = config.titleField || 'title';
    const titleVal = String(row[titleField] || formValue[titleField] || def.title);
    await startEntityWorkflow(config.moduleKey, user, {
      entityId: id,
      trackingCode: String(row.tracking_code),
      title: `${def.title} — ${titleVal}`.slice(0, 120),
      data: { ...row, id },
    });
  }

  return id;
}

export function getListColumns(def: ProcessFormDefinition, fields: ReportFieldSchema[]) {
  const fromSchema = def.list_schema?.columns?.filter(c => c.visible !== false) || [];
  if (fromSchema.length) return fromSchema;
  return fields.slice(0, 6).map(f => ({ key: f.key, label: f.label, visible: true }));
}
