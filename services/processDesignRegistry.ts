import { ProcessModule } from '../types';
import { BUILTIN_PROCESS_MODULES } from '../config/builtinProcessModules';
import { isWorkflowInboxModule } from '../config/workflowInboxModules';
import { getAllProcessModules, getProcessModuleByKey, getProcessModuleBySlug } from './processModules';
import { getWorkflowsForProcessSlug, WorkflowDefinitionRow, rowToWorkflowDefinition } from './workflowDefinitions';
import { WorkflowDefinition } from '../types';

export interface ProcessDesignOption {
  slug: string;
  moduleKey: string;
  title: string;
  icon: string;
  entityTable: string;
  formRoute: string;
  sortOrder: number;
  isBuiltin: boolean;
  conditionFields: { key: string; label: string }[];
}

export interface ProcessDesignLinkStatus {
  option: ProcessDesignOption;
  processModule: ProcessModule;
  workflows: WorkflowDefinition[];
  activeWorkflow: WorkflowDefinition | null;
  hasWorkflow: boolean;
  isPublished: boolean;
  stepCount: number;
}

export const processModuleToDesignOption = (mod: ProcessModule): ProcessDesignOption => ({
  slug: mod.slug,
  moduleKey: mod.module_key,
  title: mod.title,
  icon: mod.icon,
  entityTable: mod.entity_table,
  formRoute: mod.form_route,
  sortOrder: Number(mod.sort_order) || 0,
  isBuiltin: mod.is_builtin,
  conditionFields: mod.condition_fields || [],
});

export const builtinSeedToDesignOption = (seed: (typeof BUILTIN_PROCESS_MODULES)[number]): ProcessDesignOption => ({
  slug: seed.slug,
  moduleKey: seed.module_key,
  title: seed.title,
  icon: seed.icon,
  entityTable: seed.entity_table,
  formRoute: seed.form_route,
  sortOrder: seed.sort_order,
  isBuiltin: true,
  conditionFields: seed.condition_fields || [],
});

export const getBuiltinProcessDesignOptions = (): ProcessDesignOption[] =>
  BUILTIN_PROCESS_MODULES.map(builtinSeedToDesignOption).sort((a, b) => a.sortOrder - b.sortOrder);

export const loadProcessDesignOptions = async (): Promise<ProcessDesignOption[]> => {
  const modules = await getAllProcessModules();
  const fromDb = modules.filter(m => m.is_active).map(processModuleToDesignOption);
  if (fromDb.length) {
    return fromDb.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return getBuiltinProcessDesignOptions();
};

/** گزینه‌های تب کارتابل — همیشه حداقل از seed پیش‌فرض */
export const loadInboxProcessOptions = async (): Promise<ProcessDesignOption[]> => {
  const all = await loadProcessDesignOptions();
  const filtered = all.filter(o => isWorkflowInboxModule(o.moduleKey));
  if (filtered.length) return filtered;
  return getBuiltinProcessDesignOptions().filter(o => isWorkflowInboxModule(o.moduleKey));
};

export const findProcessOptionBySlug = (options: ProcessDesignOption[], slug: string) => {
  const clean = String(slug || '').trim().toLowerCase();
  return options.find(o => o.slug === clean);
};

export const findProcessOptionByModuleKey = (options: ProcessDesignOption[], moduleKey: string) => {
  const key = String(moduleKey || '').trim().toUpperCase();
  return options.find(o => o.moduleKey === key);
};

export const loadProcessDesignLinkStatus = async (mod: ProcessModule): Promise<ProcessDesignLinkStatus> => {
  const option = processModuleToDesignOption(mod);
  const workflows = await getWorkflowsForProcessSlug(mod.slug);
  const activeWorkflow = workflows.find(w => w.isActive) || null;
  return {
    option,
    processModule: mod,
    workflows,
    activeWorkflow,
    hasWorkflow: workflows.length > 0,
    isPublished: !!activeWorkflow?.isPublished,
    stepCount: activeWorkflow?.steps.length || 0,
  };
};

export const loadAllProcessDesignLinkStatuses = async (): Promise<ProcessDesignLinkStatus[]> => {
  const modules = await getAllProcessModules();
  return Promise.all(modules.map(loadProcessDesignLinkStatus));
};

export const resolveProcessModule = async (slugOrKey: string): Promise<ProcessModule | null> => {
  const bySlug = await getProcessModuleBySlug(slugOrKey);
  if (bySlug) return bySlug;
  return getProcessModuleByKey(slugOrKey);
};

export type { WorkflowDefinitionRow };
