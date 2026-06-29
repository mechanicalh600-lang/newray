import { BUILTIN_REPORT_MODULES } from '../config/builtinReportModules';
import { getAllReportModules, ReportModule } from './reportModules';
import { getReportDefinitionBySlug, ReportDefinition } from './reportDefinitions';

/** گزینهٔ یکپارچه برای طراحی فرم و طراحی قالب — منبع: report_modules */
export interface ReportDesignOption {
  moduleId: string;
  slug: string;
  title: string;
  path: string;
  isBuiltin: boolean;
  sortOrder: number;
  definitionSlug: string;
}

export const resolveReportModuleId = (mod: Pick<ReportModule, 'slug' | 'is_builtin'>): string =>
  BUILTIN_REPORT_MODULES.find(b => b.slug === mod.slug)?.menuId ?? mod.slug.replace(/-/g, '');

export const normalizeModuleId = (raw: string) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[/#]/g, '')
    .replace(/[-_\s]/g, '');

export const reportModuleToDesignOption = (mod: ReportModule): ReportDesignOption => ({
  moduleId: resolveReportModuleId(mod),
  slug: mod.slug,
  title: mod.title,
  path: mod.path,
  isBuiltin: mod.is_builtin,
  sortOrder: Number(mod.sort_order) || 0,
  definitionSlug: mod.definition_slug || mod.slug,
});

export const loadReportDesignOptions = async (): Promise<ReportDesignOption[]> => {
  const modules = await getAllReportModules();
  return modules.map(reportModuleToDesignOption).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const findDesignOptionBySlug = (options: ReportDesignOption[], slug: string) => {
  const clean = String(slug || '').trim().toLowerCase();
  return (
    options.find(o => o.slug === clean || o.definitionSlug === clean) ||
    options.find(o => normalizeModuleId(o.moduleId) === normalizeModuleId(clean))
  );
};

export const findDesignOptionByModuleId = (options: ReportDesignOption[], moduleId: string) =>
  options.find(o => o.moduleId === moduleId) ||
  options.find(o => normalizeModuleId(o.moduleId) === normalizeModuleId(moduleId)) ||
  options.find(o => o.slug.replace(/-/g, '') === moduleId);

export const getDefinitionSlugForModuleId = (options: ReportDesignOption[], moduleId: string): string => {
  const opt = findDesignOptionByModuleId(options, moduleId);
  return opt?.definitionSlug || opt?.slug || moduleId;
};

export interface ReportDesignLinkStatus {
  option: ReportDesignOption;
  definition: ReportDefinition | null;
  hasForm: boolean;
  formPublished: boolean;
  fieldCount: number;
  hasTemplate: boolean;
  templateId?: string;
  templateVersion?: number;
}

export const loadReportDesignLinkStatus = async (option: ReportDesignOption): Promise<ReportDesignLinkStatus> => {
  const def = await getReportDefinitionBySlug(option.definitionSlug);
  const ts = (def?.template_schema || {}) as {
    linkedTemplateId?: string;
    linkedTemplateVersion?: number;
  };
  const fieldCount = def?.form_schema?.fields?.length || 0;
  return {
    option,
    definition: def,
    hasForm: fieldCount > 0,
    formPublished: !!(def?.is_active && (def?.published_version || 0) > 0),
    fieldCount,
    hasTemplate: !!ts.linkedTemplateId,
    templateId: ts.linkedTemplateId,
    templateVersion: ts.linkedTemplateVersion,
  };
};

export const loadAllReportDesignLinkStatuses = async (): Promise<ReportDesignLinkStatus[]> => {
  const options = await loadReportDesignOptions();
  return Promise.all(options.map(loadReportDesignLinkStatus));
};
