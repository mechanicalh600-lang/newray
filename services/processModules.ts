import { supabase } from '../supabaseClient';
import { ProcessModule } from '../types';
import { BUILTIN_PROCESS_MODULES } from '../config/builtinProcessModules';

export type ProcessModuleInput = Pick<
  ProcessModule,
  'slug' | 'module_key' | 'title' | 'icon' | 'entity_table' | 'entity_status_field' | 'form_route' | 'description' | 'sort_order' | 'is_active' | 'condition_fields'
>;

const FALLBACK_KEY = 'process_modules_fallback_v1';
const CACHE_MS = 60_000;

let modulesCache: { data: ProcessModule[]; at: number } | null = null;
let builtinSeedPromise: Promise<void> | null = null;

export const slugifyProcessModule = (raw: string) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const normalizeModuleKey = (raw: string) =>
  String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_');

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getFallback = (): ProcessModule[] => safeParse(localStorage.getItem(FALLBACK_KEY), []);
const setFallback = (rows: ProcessModule[]) => localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows));

const normalizeRow = (row: ProcessModule): ProcessModule => ({
  ...row,
  sort_order: Number(row.sort_order) || 0,
  condition_fields: Array.isArray(row.condition_fields) ? row.condition_fields : [],
});

const invalidateCache = () => {
  modulesCache = null;
};

export const invalidateProcessModulesCache = () => {
  invalidateCache();
  builtinSeedPromise = null;
};

const pruneFallbackOverlappingDb = (dbRows: ProcessModule[]) => {
  const dbSlugs = new Set(dbRows.map(r => r.slug));
  const pruned = getFallback().filter(r => !dbSlugs.has(r.slug));
  if (pruned.length !== getFallback().length) setFallback(pruned);
};

const getReportModuleBySlugUncached = async (slug: string): Promise<ProcessModule | null> => {
  const clean = slugifyProcessModule(slug);
  try {
    const { data, error } = await supabase.from('process_modules').select('*').eq('slug', clean).maybeSingle();
    if (error) throw error;
    if (data) return normalizeRow(data as ProcessModule);
  } catch {
    // ignore
  }
  return getFallback().find(m => m.slug === clean) || null;
};

const seedBuiltinProcessModulesInternal = async (): Promise<void> => {
  for (const seed of BUILTIN_PROCESS_MODULES) {
    const existing = await getReportModuleBySlugUncached(seed.slug);
    if (existing) continue;
    const payload = {
      slug: seed.slug,
      module_key: seed.module_key,
      title: seed.title,
      icon: seed.icon,
      entity_table: seed.entity_table,
      entity_status_field: seed.entity_status_field,
      form_route: seed.form_route,
      description: '',
      sort_order: seed.sort_order,
      is_builtin: true,
      is_active: true,
      condition_fields: seed.condition_fields || [],
    };
    try {
      const { error } = await supabase.from('process_modules').insert([payload]);
      if (error && !String(error.message).includes('duplicate')) {
        console.warn('seed process_modules:', seed.slug, error.message);
      }
    } catch {
      const fallback = getFallback();
      if (!fallback.some(m => m.slug === seed.slug)) {
        fallback.push({
          id: `builtin-${seed.slug}`,
          ...payload,
          created_at: new Date().toISOString(),
        });
        setFallback(fallback);
      }
    }
  }
  invalidateCache();
};

export const ensureBuiltinProcessModules = async (): Promise<void> => {
  if (!builtinSeedPromise) {
    builtinSeedPromise = seedBuiltinProcessModulesInternal();
  }
  return builtinSeedPromise;
};

export const getAllProcessModules = async (): Promise<ProcessModule[]> => {
  await ensureBuiltinProcessModules();
  if (modulesCache && Date.now() - modulesCache.at < CACHE_MS) {
    return modulesCache.data;
  }
  try {
    const { data, error } = await supabase
      .from('process_modules')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw error;
    const rows = (data || []).map(r => normalizeRow(r as ProcessModule));
    pruneFallbackOverlappingDb(rows);
    const fallbackOnly = getFallback().filter(f => !rows.some(r => r.slug === f.slug));
    let merged = [...rows, ...fallbackOnly].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'fa'));
    if (!merged.length) {
      merged = BUILTIN_PROCESS_MODULES.map(seed => ({
        id: `builtin-${seed.slug}`,
        slug: seed.slug,
        module_key: seed.module_key,
        title: seed.title,
        icon: seed.icon,
        entity_table: seed.entity_table,
        entity_status_field: seed.entity_status_field,
        form_route: seed.form_route,
        description: '',
        sort_order: seed.sort_order,
        is_builtin: true,
        is_active: true,
        condition_fields: seed.condition_fields || [],
        created_at: new Date().toISOString(),
      }));
    }
    modulesCache = { data: merged, at: Date.now() };
    return merged;
  } catch {
    const fallback = getFallback().sort((a, b) => a.sort_order - b.sort_order);
    if (fallback.length) {
      modulesCache = { data: fallback, at: Date.now() };
      return fallback;
    }
    const fromBuiltin = BUILTIN_PROCESS_MODULES.map(seed => ({
      id: `builtin-${seed.slug}`,
      slug: seed.slug,
      module_key: seed.module_key,
      title: seed.title,
      icon: seed.icon,
      entity_table: seed.entity_table,
      entity_status_field: seed.entity_status_field,
      form_route: seed.form_route,
      description: '',
      sort_order: seed.sort_order,
      is_builtin: true,
      is_active: true,
      condition_fields: seed.condition_fields || [],
      created_at: new Date().toISOString(),
    }));
    modulesCache = { data: fromBuiltin, at: Date.now() };
    return fromBuiltin;
  }
};

export const getProcessModuleBySlug = async (slug: string): Promise<ProcessModule | null> => {
  const all = await getAllProcessModules();
  const clean = slugifyProcessModule(slug);
  return all.find(m => m.slug === clean) || null;
};

export const getProcessModuleByKey = async (moduleKey: string): Promise<ProcessModule | null> => {
  const all = await getAllProcessModules();
  const key = normalizeModuleKey(moduleKey);
  return all.find(m => m.module_key === key) || null;
};

export const findProcessModuleSlugConflict = async (slug: string, excludeId?: string): Promise<ProcessModule | null> => {
  const clean = slugifyProcessModule(slug);
  const all = await getAllProcessModules();
  return all.find(m => m.slug === clean && m.id !== excludeId) || null;
};

export const getNextProcessModuleSortOrder = async (): Promise<number> => {
  const all = await getAllProcessModules();
  const max = all.reduce((m, r) => Math.max(m, Number(r.sort_order) || 0), 0);
  return max + 1;
};

export const createProcessModule = async (input: ProcessModuleInput): Promise<ProcessModule> => {
  const slug = slugifyProcessModule(input.slug);
  const module_key = normalizeModuleKey(input.module_key || slug.replace(/-/g, '_').toUpperCase());
  const conflict = await findProcessModuleSlugConflict(slug);
  if (conflict) throw new Error(`slug تکراری: ${slug}`);

  const payload = {
    ...input,
    slug,
    module_key,
    is_builtin: false,
    condition_fields: input.condition_fields || [],
  };

  try {
    const { data, error } = await supabase.from('process_modules').insert([payload]).select('*').single();
    if (error) throw error;
    invalidateCache();
    window.dispatchEvent(new Event('process-modules-changed'));
    return normalizeRow(data as ProcessModule);
  } catch (err) {
    const row: ProcessModule = {
      id: `local-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    };
    const fallback = getFallback();
    fallback.push(row);
    setFallback(fallback);
    invalidateCache();
    window.dispatchEvent(new Event('process-modules-changed'));
    return row;
  }
};

export const updateProcessModule = async (id: string, input: Partial<ProcessModuleInput>): Promise<ProcessModule> => {
  const all = await getAllProcessModules();
  const current = all.find(m => m.id === id);
  if (!current) throw new Error('فرآیند یافت نشد');

  const nextSlug = input.slug ? slugifyProcessModule(input.slug) : current.slug;
  if (nextSlug !== current.slug && !current.is_builtin) {
    const conflict = await findProcessModuleSlugConflict(nextSlug, id);
    if (conflict) throw new Error(`slug تکراری: ${nextSlug}`);
  }

  const payload: Record<string, unknown> = {
    ...input,
    slug: current.is_builtin ? current.slug : nextSlug,
    module_key: current.is_builtin ? current.module_key : input.module_key ? normalizeModuleKey(input.module_key) : current.module_key,
  };

  try {
    const { data, error } = await supabase.from('process_modules').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    invalidateCache();
    window.dispatchEvent(new Event('process-modules-changed'));
    return normalizeRow(data as ProcessModule);
  } catch {
    const fallback = getFallback();
    const idx = fallback.findIndex(m => m.id === id);
    const updated = normalizeRow({ ...current, ...payload } as ProcessModule);
    if (idx >= 0) fallback[idx] = updated;
    else fallback.push(updated);
    setFallback(fallback);
    invalidateCache();
    window.dispatchEvent(new Event('process-modules-changed'));
    return updated;
  }
};

export const setProcessModuleActive = async (id: string, isActive: boolean): Promise<void> => {
  try {
    await supabase.from('process_modules').update({ is_active: isActive }).eq('id', id);
  } catch {
    const fallback = getFallback();
    const row = fallback.find(m => m.id === id);
    if (row) row.is_active = isActive;
    setFallback(fallback);
  }
  invalidateCache();
  window.dispatchEvent(new Event('process-modules-changed'));
};

export const deleteProcessModule = async (id: string): Promise<void> => {
  const all = await getAllProcessModules();
  const row = all.find(m => m.id === id);
  if (!row) return;
  if (row.is_builtin) throw new Error('فرآیند پیش‌فرض قابل حذف نیست');

  try {
    await supabase.from('process_modules').delete().eq('id', id);
  } catch {
    setFallback(getFallback().filter(m => m.id !== id));
  }
  invalidateCache();
  window.dispatchEvent(new Event('process-modules-changed'));
};

export const setActiveWorkflowForProcess = async (processModuleId: string, workflowId: string | null): Promise<void> => {
  try {
    await supabase.from('process_modules').update({ active_workflow_id: workflowId }).eq('id', processModuleId);
  } catch {
    const fallback = getFallback();
    const row = fallback.find(m => m.id === processModuleId);
    if (row) row.active_workflow_id = workflowId;
    setFallback(fallback);
  }
  invalidateCache();
  window.dispatchEvent(new Event('process-modules-changed'));
};
