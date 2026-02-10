export type ElementType =
  | 'HEADER'
  | 'TEXT'
  | 'TABLE'
  | 'CHART_BAR'
  | 'CHART_PIE'
  | 'CHART_LINE'
  | 'CHART_AREA'
  | 'CHART_RADAR'
  | 'STAT_CARD'
  | 'IMAGE';

export type BandType =
  | 'reportHeader'
  | 'pageHeader'
  | 'groupHeader'
  | 'detail'
  | 'groupFooter'
  | 'reportFooter'
  | 'pageFooter';

export type ParameterType = 'text' | 'number' | 'date' | 'boolean' | 'select';
export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT';

export interface ReportTemplateParameter {
  id: string;
  key: string;
  label: string;
  type: ParameterType;
  required?: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
}

export interface ReportTemplateFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: any;
  source?: 'record' | 'parameter' | 'literal';
}

export interface ReportTemplateSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportTemplateGroup {
  field: string;
  label?: string;
}

export interface ReportTemplateAggregate {
  field: string;
  fn: AggregationType;
  as: string;
}

export interface ReportTemplateCalculatedField {
  key: string;
  expression: string;
}

export interface ReportTemplateDataset {
  id: string;
  source: string;
  alias?: string;
  joins?: { source: string; localField: string; foreignField: string; alias?: string }[];
  filters?: ReportTemplateFilter[];
  sort?: ReportTemplateSort[];
  groupBy?: ReportTemplateGroup[];
  aggregates?: ReportTemplateAggregate[];
  calculatedFields?: ReportTemplateCalculatedField[];
  masterDatasetId?: string;
  relationField?: string;
}

export interface ReportPageSettings {
  size: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  keepTogether?: boolean;
}

export interface GovernanceRules {
  requiredRoles?: string[];
  requiresApproval?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface ReportElement {
  id: string;
  type: ElementType;
  layout: { x: number; y: number; width: number; height: number };
  band?: BandType;
  props: Record<string, any>;
}

export interface ReportTemplate {
  id: string;
  title: string;
  targetModule: string;
  elements: ReportElement[];
  version: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  datasets?: ReportTemplateDataset[];
  parameters?: ReportTemplateParameter[];
  pageSettings?: ReportPageSettings;
  governance?: GovernanceRules;
}

const STORAGE_KEY = 'report_templates_v1';
const AUDIT_KEY = 'report_templates_audit_v1';
const RUNTIME_CACHE_KEY = 'report_runtime_cache_v1';

const defaultPageSettings: ReportPageSettings = {
  size: 'A4',
  orientation: 'portrait',
  marginTop: 12,
  marginRight: 12,
  marginBottom: 12,
  marginLeft: 12,
  keepTogether: true,
};

const normalizeModuleId = (raw: string) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\/#]/g, '')
    .replace(/[-_\s]/g, '');

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getValue = (row: any, path: string): any =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc: any, key: string) => (acc === null || acc === undefined ? undefined : acc[key]), row);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNumeric = (value: unknown) => Number.isFinite(Number(String(value ?? '').replace(/,/g, '').trim()));

const ensureTemplateShape = (raw: ReportTemplate): ReportTemplate => ({
  ...raw,
  datasets: raw.datasets || [],
  parameters: raw.parameters || [],
  pageSettings: { ...defaultPageSettings, ...(raw.pageSettings || {}) },
  governance: {
    requiredRoles: raw.governance?.requiredRoles || [],
    requiresApproval: !!raw.governance?.requiresApproval,
    approvedBy: raw.governance?.approvedBy || null,
    approvedAt: raw.governance?.approvedAt || null,
  },
  elements: (raw.elements || []).map(el => ({ ...el, band: el.band || 'detail' })),
});

const appendAuditLog = (event: string, template: Partial<ReportTemplate>) => {
  if (typeof window === 'undefined') return;
  const logs = safeParse<any[]>(localStorage.getItem(AUDIT_KEY), []);
  logs.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event,
    templateId: template.id,
    moduleId: template.targetModule,
    version: template.version,
    at: new Date().toISOString(),
  });
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(-500)));
};

const evaluateFilter = (left: any, operator: ReportTemplateFilter['operator'], right: any) => {
  if (operator === 'eq') return String(left ?? '') === String(right ?? '');
  if (operator === 'neq') return String(left ?? '') !== String(right ?? '');
  if (operator === 'gt') return toNumber(left) > toNumber(right);
  if (operator === 'gte') return toNumber(left) >= toNumber(right);
  if (operator === 'lt') return toNumber(left) < toNumber(right);
  if (operator === 'lte') return toNumber(left) <= toNumber(right);
  if (operator === 'contains') return String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase());
  return true;
};

const aggregateRows = (rows: any[], aggregates: ReportTemplateAggregate[] = []) => {
  const out: Record<string, any> = {};
  for (const agg of aggregates) {
    const nums = rows.map(r => toNumber(getValue(r, agg.field)));
    if (agg.fn === 'COUNT') out[agg.as] = rows.length;
    if (agg.fn === 'SUM') out[agg.as] = nums.reduce((a, b) => a + b, 0);
    if (agg.fn === 'AVG') out[agg.as] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    if (agg.fn === 'MIN') out[agg.as] = nums.length ? Math.min(...nums) : 0;
    if (agg.fn === 'MAX') out[agg.as] = nums.length ? Math.max(...nums) : 0;
  }
  return out;
};

const resolveFunction = (name: string, args: any[]) => {
  const upper = name.toUpperCase();
  if (upper === 'IF') return args[0] ? args[1] : args[2];
  if (upper === 'SUM') return args.reduce((acc, v) => acc + toNumber(v), 0);
  if (upper === 'AVG') return args.length ? args.reduce((acc, v) => acc + toNumber(v), 0) / args.length : 0;
  if (upper === 'MIN') return args.length ? Math.min(...args.map(toNumber)) : 0;
  if (upper === 'MAX') return args.length ? Math.max(...args.map(toNumber)) : 0;
  if (upper === 'ROUND') return Math.round(toNumber(args[0]) * Math.pow(10, toNumber(args[1] ?? 0))) / Math.pow(10, toNumber(args[1] ?? 0));
  if (upper === 'CONCAT') return args.map(v => String(v ?? '')).join('');
  if (upper === 'DATE_DIFF') {
    const from = new Date(args[0]);
    const to = new Date(args[1]);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  }
  return null;
};

const splitFunctionArgs = (input: string): string[] => {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if ((ch === '"' || ch === "'") && input[i - 1] !== '\\') {
      if (!quote) {
        quote = ch as '"' | "'";
      } else if (quote === ch) {
        quote = null;
      }
      current += ch;
      continue;
    }
    if (!quote) {
      if (ch === '(') {
        depth += 1;
        current += ch;
        continue;
      }
      if (ch === ')') {
        depth = Math.max(0, depth - 1);
        current += ch;
        continue;
      }
      if (ch === ',' && depth === 0) {
        if (current.trim()) args.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
};

const parseExpressionToken = (token: string, context: Record<string, any>) => {
  const trimmed = String(token || '').trim();
  if (!trimmed) return null;
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;
  if (isNumeric(trimmed)) return Number(trimmed);
  const nestedFn = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
  if (nestedFn) return evaluateTemplateExpression(trimmed, context);
  return getValue(context, trimmed) ?? context[trimmed];
};

export const evaluateTemplateExpression = (expression: string, context: Record<string, any>) => {
  const expr = String(expression || '').trim();
  if (!expr) return null;
  const fnMatch = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const args = splitFunctionArgs(fnMatch[2]).map(token => parseExpressionToken(token, context));
    const result = resolveFunction(fnName, args);
    if (result !== null) return result;
  }
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `return (${expr});`);
    return fn(...values);
  } catch {
    return null;
  }
};

export const getAllReportTemplates = (): ReportTemplate[] => {
  if (typeof window === 'undefined') return [];
  const templates = safeParse<ReportTemplate[]>(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(templates) ? templates.map(ensureTemplateShape) : [];
};

export const getTemplatesByModule = (moduleId: string): ReportTemplate[] => {
  const normalized = normalizeModuleId(moduleId);
  const templates = getAllReportTemplates().filter(
    t => t.targetModule === moduleId || normalizeModuleId(t.targetModule) === normalized
  );
  return templates.sort((a, b) => (b.version || 0) - (a.version || 0));
};

export const getReportTemplateByModule = (moduleId: string): ReportTemplate | null => getTemplatesByModule(moduleId)[0] || null;
export const getActiveReportTemplateByModule = (moduleId: string): ReportTemplate | null => getTemplatesByModule(moduleId).find(t => t.isActive) || getTemplatesByModule(moduleId)[0] || null;
export const getLatestReportTemplateByModule = (moduleId: string): ReportTemplate | null => getTemplatesByModule(moduleId)[0] || null;

export const saveReportTemplate = (
  template: Omit<ReportTemplate, 'version' | 'isActive' | 'createdAt' | 'updatedAt'>,
  options?: { activate?: boolean }
) => {
  const targetModule = template.targetModule;
  const templates = getAllReportTemplates();
  const moduleTemplates = getTemplatesByModule(targetModule);
  const maxVersion = moduleTemplates.reduce((max, t) => Math.max(max, t.version || 0), 0);
  const activate = options?.activate ?? true;
  const now = new Date().toISOString();
  const next: ReportTemplate = ensureTemplateShape({
    ...template,
    id: template.id || `${targetModule}-${Date.now()}`,
    version: maxVersion + 1,
    isActive: activate,
    createdAt: now,
    updatedAt: now,
  } as ReportTemplate);
  let all = [...templates, next];
  if (activate) {
    all = all.map(t =>
      normalizeModuleId(t.targetModule) === normalizeModuleId(targetModule) ? { ...t, isActive: t.id === next.id } : t
    );
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  appendAuditLog('save', next);
  return next;
};

export const setActiveTemplate = (templateId: string) => {
  const templates = getAllReportTemplates();
  const target = templates.find(t => t.id === templateId);
  if (!target) return;
  const next = templates.map(t => {
    if (normalizeModuleId(t.targetModule) !== normalizeModuleId(target.targetModule)) return t;
    return { ...t, isActive: t.id === templateId, updatedAt: new Date().toISOString() };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  appendAuditLog('set_active', target);
};

export const deleteTemplateVersion = (templateId: string) => {
  const templates = getAllReportTemplates();
  const target = templates.find(t => t.id === templateId);
  if (!target) return;
  let filtered = templates.filter(t => t.id !== templateId);
  const moduleTemplates = filtered.filter(t => normalizeModuleId(t.targetModule) === normalizeModuleId(target.targetModule));
  if (!moduleTemplates.some(t => t.isActive) && moduleTemplates.length > 0) {
    const latest = moduleTemplates.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
    filtered = filtered.map(t => (t.id === latest.id ? { ...t, isActive: true } : t));
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  appendAuditLog('delete', target);
};

export const getTemplateAuditLog = () => (typeof window === 'undefined' ? [] : safeParse<any[]>(localStorage.getItem(AUDIT_KEY), []));
export const getTemplateById = (templateId: string) => getAllReportTemplates().find(t => t.id === templateId) || null;

export const approveTemplate = (templateId: string, approvedBy: string) => {
  const templates = getAllReportTemplates();
  const next = templates.map(t =>
    t.id === templateId ? { ...t, governance: { ...(t.governance || {}), approvedBy, approvedAt: new Date().toISOString() } } : t
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  appendAuditLog('approve', { id: templateId });
};

export const userCanAccessTemplate = (template: ReportTemplate | null, userRoles: string[] = []) => {
  if (!template) return false;
  const required = template.governance?.requiredRoles || [];
  if (!required.length) return true;
  return required.some(r => userRoles.includes(r));
};

export interface ExecuteDatasetOptions {
  runtimeParameters?: Record<string, any>;
  record?: any;
  sourceData?: Record<string, any[]>;
}

export interface ExecutedDatasets {
  [datasetId: string]: any[];
}

const resolveFilterValue = (filter: ReportTemplateFilter, runtimeParameters: Record<string, any>, record: any) => {
  if (filter.source === 'parameter') return runtimeParameters?.[String(filter.value)];
  if (filter.source === 'record') return getValue(record, String(filter.value));
  return filter.value;
};

export const executeTemplateDatasets = (template: ReportTemplate, options: ExecuteDatasetOptions = {}): ExecutedDatasets => {
  const runtimeParameters = options.runtimeParameters || {};
  const record = options.record || {};
  const sourceData = options.sourceData || {};
  const executed: ExecutedDatasets = {};
  for (const ds of template.datasets || []) {
    let rows = [...(sourceData[ds.source] || [])].map(r => ({ ...r }));
    for (const join of ds.joins || []) {
      const foreign = sourceData[join.source] || [];
      rows = rows.map(row => {
        const local = getValue(row, join.localField);
        const match = foreign.find(f => String(getValue(f, join.foreignField) ?? '') === String(local ?? ''));
        return { ...row, [join.alias || join.source]: match || null };
      });
    }
    if (ds.filters?.length) {
      rows = rows.filter(row => ds.filters!.every(filter => evaluateFilter(getValue(row, filter.field), filter.operator, resolveFilterValue(filter, runtimeParameters, record))));
    }
    if (ds.masterDatasetId && ds.relationField) {
      const masterRows = executed[ds.masterDatasetId] || [];
      const allowed = new Set(masterRows.map(r => String(getValue(r, ds.relationField!) ?? '')));
      rows = rows.filter(r => allowed.has(String(getValue(r, ds.relationField) ?? '')));
    }
    if (ds.calculatedFields?.length) {
      rows = rows.map(row => {
        const out = { ...row };
        ds.calculatedFields!.forEach(calc => {
          out[calc.key] = evaluateTemplateExpression(calc.expression, { ...row, params: runtimeParameters, record });
        });
        return out;
      });
    }
    if (ds.sort?.length) {
      rows.sort((a, b) => {
        for (const s of ds.sort || []) {
          const av = getValue(a, s.field);
          const bv = getValue(b, s.field);
          const compare = isNumeric(av) || isNumeric(bv) ? toNumber(av) - toNumber(bv) : String(av ?? '').localeCompare(String(bv ?? ''), 'fa');
          if (compare !== 0) return s.direction === 'asc' ? compare : -compare;
        }
        return 0;
      });
    }
    if (ds.groupBy?.length && ds.aggregates?.length) {
      const grouped: Record<string, any[]> = {};
      rows.forEach(row => {
        const key = ds.groupBy!.map(g => String(getValue(row, g.field) ?? '')).join('|');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      });
      rows = Object.keys(grouped).map(key => {
        const items = grouped[key];
        const first = items[0] || {};
        const groupedFields: Record<string, any> = {};
        ds.groupBy!.forEach(g => {
          groupedFields[g.field] = getValue(first, g.field);
        });
        return { ...groupedFields, ...aggregateRows(items, ds.aggregates), __groupCount: items.length };
      });
    }
    executed[ds.id] = rows;
  }
  return executed;
};

export const compareTemplateVersions = (moduleId: string, leftVersion: number, rightVersion: number) => {
  const templates = getTemplatesByModule(moduleId);
  const left = templates.find(t => t.version === leftVersion) || null;
  const right = templates.find(t => t.version === rightVersion) || null;
  if (!left || !right) return null;
  return {
    left,
    right,
    diff: {
      titleChanged: left.title !== right.title,
      elementCountDelta: (right.elements?.length || 0) - (left.elements?.length || 0),
      datasetCountDelta: (right.datasets?.length || 0) - (left.datasets?.length || 0),
      parameterCountDelta: (right.parameters?.length || 0) - (left.parameters?.length || 0),
      pageSettingsChanged: JSON.stringify(left.pageSettings || {}) !== JSON.stringify(right.pageSettings || {}),
      governanceChanged: JSON.stringify(left.governance || {}) !== JSON.stringify(right.governance || {}),
    },
  };
};

interface RuntimeCacheValue {
  key: string;
  expiresAt: number;
  data: any;
}

export const getRuntimeCache = (key: string) => {
  if (typeof window === 'undefined') return null;
  const entries = safeParse<RuntimeCacheValue[]>(localStorage.getItem(RUNTIME_CACHE_KEY), []);
  const now = Date.now();
  const valid = entries.filter(e => e.expiresAt > now);
  if (valid.length !== entries.length) localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(valid));
  return valid.find(e => e.key === key)?.data ?? null;
};

export const setRuntimeCache = (key: string, data: any, ttlSeconds = 120) => {
  if (typeof window === 'undefined') return;
  const entries = safeParse<RuntimeCacheValue[]>(localStorage.getItem(RUNTIME_CACHE_KEY), []);
  const next: RuntimeCacheValue[] = [
    ...entries.filter(e => e.key !== key),
    { key, data, expiresAt: Date.now() + Math.max(5, ttlSeconds) * 1000 },
  ].slice(-100);
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(next));
};

export const clearRuntimeCache = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RUNTIME_CACHE_KEY);
};
