import { supabase } from '../supabaseClient';
import { WorkflowDefinition, WorkflowStep } from '../types';
import { generateId } from '../utils';
import { BUILTIN_PROCESS_MODULES } from '../config/builtinProcessModules';
import { UserRole } from '../types';

export interface WorkflowDefinitionRow {
  id: string;
  process_module_slug: string;
  title: string;
  version: number;
  definition_json: {
    steps: WorkflowStep[];
    moduleKey: string;
  };
  is_active: boolean;
  is_published: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

const FALLBACK_KEY = 'workflow_definitions_fallback_v1';

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getFallback = (): WorkflowDefinitionRow[] => safeParse(localStorage.getItem(FALLBACK_KEY), []);
const setFallback = (rows: WorkflowDefinitionRow[]) => localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows));

const dispatchChanged = () => window.dispatchEvent(new Event('workflow-definitions-changed'));

export const rowToWorkflowDefinition = (row: WorkflowDefinitionRow): WorkflowDefinition => ({
  id: row.id,
  module: row.definition_json?.moduleKey || '',
  processModuleSlug: row.process_module_slug,
  title: row.title,
  steps: row.definition_json?.steps || [],
  isActive: row.is_active,
  version: row.version,
  isPublished: row.is_published,
});

const ensureStepDefaults = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.map((s, i) => ({
    ...s,
    statusCode: s.statusCode || `STEP_${i + 1}`,
    layout: s.layout ?? { x: 100 + (i % 4) * 280, y: 100 + Math.floor(i / 4) * 220 },
    isStart: s.isStart ?? i === 0,
    isFinish: s.isFinish ?? false,
    recipientUserIds: s.recipientUserIds ?? [],
    ccUserIds: s.ccUserIds ?? [],
    actions: (s.actions || []).map(a => ({
      ...a,
      lineColor: a.lineColor || '#6366f1',
      conditions: (a.conditions || []).map(c => ({
        ...c,
        lineColor: c.lineColor || '#a855f7',
      })),
    })),
  }));

export const getAllWorkflowDefinitions = async (): Promise<WorkflowDefinition[]> => {
  try {
    const { data, error } = await supabase
      .from('workflow_definitions')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => rowToWorkflowDefinition(r as WorkflowDefinitionRow));
  } catch {
    return getFallback().map(rowToWorkflowDefinition);
  }
};

export const getWorkflowDefinitionById = async (id: string): Promise<WorkflowDefinition | null> => {
  try {
    const { data, error } = await supabase.from('workflow_definitions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToWorkflowDefinition(data as WorkflowDefinitionRow) : null;
  } catch {
    return getFallback().find(r => r.id === id) ? rowToWorkflowDefinition(getFallback().find(r => r.id === id)!) : null;
  }
};

export const getActiveWorkflowForModuleKey = async (moduleKey: string): Promise<WorkflowDefinition | null> => {
  const all = await getAllWorkflowDefinitions();
  const active = all.find(w => w.module === moduleKey && w.isActive);
  if (active) return active;

  // fallback: seed default WO workflow in memory if nothing in DB
  if (moduleKey === 'WORK_ORDER') {
    return buildDefaultWorkOrderWorkflow();
  }
  return null;
};

export const getWorkflowsForProcessSlug = async (processSlug: string): Promise<WorkflowDefinition[]> => {
  try {
    const { data, error } = await supabase
      .from('workflow_definitions')
      .select('*')
      .eq('process_module_slug', processSlug)
      .order('version', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => rowToWorkflowDefinition(r as WorkflowDefinitionRow));
  } catch {
    return getFallback()
      .filter(r => r.process_module_slug === processSlug)
      .map(rowToWorkflowDefinition);
  }
};

export const saveWorkflowDefinition = async (def: WorkflowDefinition, processModuleSlug: string): Promise<WorkflowDefinition> => {
  const steps = ensureStepDefaults(def.steps);
  const moduleKey = def.module;
  const isNew = !def.id || def.id.startsWith('new-') || def.id.length < 10;

  const payload = {
    process_module_slug: processModuleSlug,
    title: def.title,
    definition_json: { steps, moduleKey },
    is_active: def.isActive,
    is_published: def.isPublished ?? def.isActive,
  };

  try {
    if (isNew) {
      const { data: latest } = await supabase
        .from('workflow_definitions')
        .select('version')
        .eq('process_module_slug', processModuleSlug)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = (latest?.version || 0) + 1;
      const { data, error } = await supabase
        .from('workflow_definitions')
        .insert([{ ...payload, version: nextVersion }])
        .select('*')
        .single();
      if (error) throw error;
      dispatchChanged();
      return rowToWorkflowDefinition(data as WorkflowDefinitionRow);
    }

    const { data, error } = await supabase
      .from('workflow_definitions')
      .update(payload)
      .eq('id', def.id)
      .select('*')
      .single();
    if (error) throw error;
    dispatchChanged();
    return rowToWorkflowDefinition(data as WorkflowDefinitionRow);
  } catch {
    const fallback = getFallback();
    const row: WorkflowDefinitionRow = {
      id: isNew ? generateId() : def.id,
      process_module_slug: processModuleSlug,
      title: def.title,
      version: def.version || 1,
      definition_json: { steps, moduleKey },
      is_active: def.isActive,
      is_published: def.isPublished ?? def.isActive,
      updated_at: new Date().toISOString(),
    };
    const idx = fallback.findIndex(r => r.id === row.id);
    if (idx >= 0) fallback[idx] = row;
    else fallback.push(row);
    setFallback(fallback);
    dispatchChanged();
    return rowToWorkflowDefinition(row);
  }
};

/** فقط یک گردش کار فعال برای هر فرآیند */
export const activateWorkflowDefinition = async (workflowId: string, processModuleSlug: string): Promise<void> => {
  try {
    await supabase
      .from('workflow_definitions')
      .update({ is_active: false })
      .eq('process_module_slug', processModuleSlug);
    await supabase
      .from('workflow_definitions')
      .update({ is_active: true, is_published: true })
      .eq('id', workflowId);
  } catch {
    const fallback = getFallback();
    fallback.forEach(r => {
      if (r.process_module_slug === processModuleSlug) r.is_active = r.id === workflowId;
    });
    setFallback(fallback);
  }
  dispatchChanged();
};

export const deleteWorkflowDefinition = async (id: string): Promise<void> => {
  try {
    await supabase.from('workflow_definitions').delete().eq('id', id);
  } catch {
    setFallback(getFallback().filter(r => r.id !== id));
  }
  dispatchChanged();
};

export const buildDefaultWorkOrderWorkflow = (): WorkflowDefinition => ({
  id: 'default-wo-flow',
  module: 'WORK_ORDER',
  processModuleSlug: 'work-order',
  title: 'فرآیند استاندارد تعمیرات',
  isActive: true,
  isPublished: true,
  version: 1,
  steps: [
    {
      id: 'step-request',
      title: 'درخواست',
      statusCode: 'REQUEST',
      assigneeRole: 'INITIATOR',
      description: 'ثبت درخواست توسط متقاضی',
      actions: [{ id: 'act-submit', label: 'ارسال جهت انجام', nextStepId: 'step-inprogress', style: 'primary' }],
    },
    {
      id: 'step-inprogress',
      title: 'در حال انجام',
      statusCode: 'IN_PROGRESS',
      assigneeRole: UserRole.USER,
      description: 'دستور کار در کارتابل مجری',
      actions: [
        {
          id: 'act-finish',
          label: 'اتمام کار و ارسال به تایید',
          nextStepId: 'step-verify',
          style: 'success',
          conditions: [
            {
              id: 'cond-electrical',
              field: 'work_type',
              operator: 'eq',
              value: 'ELECTRICAL',
              nextStepId: 'step-electrical',
              assigneeRole: UserRole.EXPERT,
            },
            {
              id: 'cond-mechanical',
              field: 'work_type',
              operator: 'eq',
              value: 'MECHANICAL',
              nextStepId: 'step-mechanical',
              assigneeRole: UserRole.USER,
            },
          ],
        },
      ],
    },
    {
      id: 'step-electrical',
      title: 'بررسی برق',
      statusCode: 'ELECTRICAL_REVIEW',
      assigneeRole: UserRole.EXPERT,
      actions: [{ id: 'act-electrical-done', label: 'تایید برق و ارسال به تایید نهایی', nextStepId: 'step-verify', style: 'success' }],
    },
    {
      id: 'step-mechanical',
      title: 'بررسی مکانیک',
      statusCode: 'MECHANICAL_REVIEW',
      assigneeRole: UserRole.USER,
      actions: [{ id: 'act-mech-done', label: 'تایید مکانیک و ارسال به تایید نهایی', nextStepId: 'step-verify', style: 'success' }],
    },
    {
      id: 'step-verify',
      title: 'تایید',
      statusCode: 'VERIFICATION',
      assigneeRole: UserRole.MANAGER,
      actions: [
        { id: 'act-approve', label: 'تایید نهایی', nextStepId: 'step-finish', style: 'success' },
        { id: 'act-reject', label: 'عدم تایید (بازگشت)', nextStepId: 'step-inprogress', style: 'danger' },
      ],
    },
    {
      id: 'step-finish',
      title: 'اتمام',
      statusCode: 'FINISHED',
      assigneeRole: UserRole.ADMIN,
      actions: [{ id: 'act-close', label: 'بستن پرونده', nextStepId: 'FINISH', style: 'neutral' }],
    },
  ],
});

export const seedDefaultWorkflowsIfEmpty = async (): Promise<void> => {
  const all = await getAllWorkflowDefinitions();
  if (all.some(w => w.module === 'WORK_ORDER')) return;

  const seed = buildDefaultWorkOrderWorkflow();
  const saved = await saveWorkflowDefinition(seed, 'work-order');
  if (saved.id) {
    try {
      const { data: pm } = await supabase.from('process_modules').select('id').eq('slug', 'work-order').maybeSingle();
      if (pm?.id) {
        await supabase.from('process_modules').update({ active_workflow_id: saved.id }).eq('id', pm.id);
      }
    } catch {
      // ignore
    }
    if (saved.isActive) await activateWorkflowDefinition(saved.id, 'work-order');
  }
};

// ensure builtin process exists reference
void BUILTIN_PROCESS_MODULES;
