import { supabase } from '../supabaseClient';

export interface DynamicReportRecord {
  id: string;
  definition_id: string;
  tracking_code?: string | null;
  report_date?: string | null;
  payload: Record<string, any>;
  payload_version?: number;
  created_at?: string;
  updated_at?: string;
}

const localKey = (definitionId: string) => `report_records_fallback_${definitionId}`;

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const fetchDynamicReportRecords = async (definitionId: string): Promise<DynamicReportRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('report_records')
      .select('*')
      .eq('definition_id', definitionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as DynamicReportRecord[];
  } catch {
    return safeParse<DynamicReportRecord[]>(localStorage.getItem(localKey(definitionId)), []);
  }
};

export const saveDynamicReportRecord = async (
  record: Partial<DynamicReportRecord> & Pick<DynamicReportRecord, 'definition_id' | 'payload'>
) => {
  try {
    const { data, error } = await supabase
      .from('report_records')
      .upsert([record])
      .select('*')
      .single();
    if (error) throw error;
    return data as DynamicReportRecord;
  } catch {
    const key = localKey(record.definition_id);
    const current = safeParse<DynamicReportRecord[]>(localStorage.getItem(key), []);
    const now = new Date().toISOString();
    const fallback: DynamicReportRecord = {
      id: record.id || `local-${Date.now()}`,
      definition_id: record.definition_id,
      tracking_code: record.tracking_code || null,
      report_date: record.report_date || null,
      payload: record.payload,
      payload_version: record.payload_version || 1,
      created_at: record.id ? undefined : now,
      updated_at: now,
    };
    const idx = current.findIndex(r => r.id === fallback.id);
    if (idx >= 0) current[idx] = { ...current[idx], ...fallback };
    else current.unshift(fallback);
    localStorage.setItem(key, JSON.stringify(current));
    return fallback;
  }
};

export const deleteDynamicReportRecords = async (definitionId: string, ids: string[]) => {
  try {
    const { error } = await supabase.from('report_records').delete().eq('definition_id', definitionId).in('id', ids);
    if (error) throw error;
  } catch {
    const key = localKey(definitionId);
    const current = safeParse<DynamicReportRecord[]>(localStorage.getItem(key), []);
    localStorage.setItem(key, JSON.stringify(current.filter(r => !ids.includes(r.id))));
  }
};
