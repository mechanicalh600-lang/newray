import { supabase } from '../supabaseClient';
import { upsertReportDefinitionDraft, getReportDefinitionBySlug, ReportFormSchema } from './reportDefinitions';
import { BUILTIN_REPORT_MODULES } from '../config/builtinReportModules';

export interface ReportModule {
  id: string;
  slug: string;
  title: string;
  icon: string;
  path: string;
  description: string;
  sort_order: number;
  is_builtin: boolean;
  is_active: boolean;
  definition_slug?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ReportModuleInput = Pick<
  ReportModule,
  'slug' | 'title' | 'icon' | 'description' | 'sort_order' | 'is_active'
>;

const FALLBACK_KEY = 'report_modules_fallback_v2';
const CACHE_MS = 60_000;

let modulesCache: { data: ReportModule[]; at: number } | null = null;
let builtinSeedPromise: Promise<void> | null = null;

/** یک‌بار در هر session — ۹ گزارش پیش‌فرض را در DB ثبت می‌کند (بدون بازنویسی تغییرات کاربر) */
export const ensureBuiltinReportModules = async (): Promise<void> => {
  if (!builtinSeedPromise) {
    builtinSeedPromise = seedBuiltinReportModulesInternal();
  }
  return builtinSeedPromise;
};

const seedBuiltinReportModulesInternal = async (): Promise<void> => {
  for (const seed of BUILTIN_REPORT_MODULES) {
    const existing = await getReportModuleBySlugUncached(seed.slug);
    if (existing) continue;

    const payload = {
      slug: seed.slug,
      title: seed.title,
      icon: seed.icon,
      path: seed.path,
      description: '',
      sort_order: seed.sort_order,
      is_builtin: true,
      is_active: true,
      definition_slug: seed.slug,
    };

    try {
      const { error } = await supabase.from('report_modules').insert([payload]);
      if (error && !String(error.message).includes('duplicate')) {
        console.warn('seed report_modules:', seed.slug, error.message);
      }
    } catch {
      // fallback local — فقط اگر در DB نبود
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

export const invalidateReportModulesCache = () => {
  invalidateCache();
  builtinSeedPromise = null;
};

/** بدون cache — فقط برای seed */
const getReportModuleBySlugUncached = async (slug: string): Promise<ReportModule | null> => {
  const clean = slugifyReportModule(slug);
  try {
    const { data, error } = await supabase.from('report_modules').select('*').eq('slug', clean).maybeSingle();
    if (error) throw error;
    if (data) return data as ReportModule;
  } catch {
    // ignore
  }
  return getFallback().find(m => m.slug === clean) || null;
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getFallback = (): ReportModule[] => safeParse(localStorage.getItem(FALLBACK_KEY), []);
const setFallback = (rows: ReportModule[]) => localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows));

const normalizeReportModule = (row: ReportModule): ReportModule => ({
  ...row,
  sort_order: Number(row.sort_order) || 0,
});

/** ردیف‌های fallback که slug آن‌ها در DB هست حذف می‌شوند — DB منبع اصلی است */
const pruneFallbackOverlappingDb = (dbRows: ReportModule[]) => {
  try {
    localStorage.removeItem('report_modules_fallback_v1');
  } catch {
    // ignore
  }
  const dbSlugs = new Set(dbRows.map(r => r.slug));
  const fallback = getFallback();
  const pruned = fallback.filter(fb => !dbSlugs.has(fb.slug));
  if (pruned.length !== fallback.length) {
    setFallback(pruned);
  }
};

const mergeReportModules = (dbRows: ReportModule[], fallbackRows: ReportModule[]): ReportModule[] => {
  const bySlug = new Map<string, ReportModule>();
  for (const row of dbRows.map(normalizeReportModule)) {
    bySlug.set(row.slug, row);
  }
  for (const fb of fallbackRows.map(normalizeReportModule)) {
    if (!bySlug.has(fb.slug)) {
      bySlug.set(fb.slug, fb);
    }
  }
  return Array.from(bySlug.values()).sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'fa')
  );
};

export const slugifyReportModule = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const normalizeReportModulePath = (slug: string) => {
  const clean = slugifyReportModule(slug);
  return clean ? `/${clean}` : '';
};

const invalidateCache = () => {
  modulesCache = null;
};

export const emitReportModulesChanged = () => {
  invalidateCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('report-modules-changed'));
  }
};

export const getAllReportModules = async (): Promise<ReportModule[]> => {
  await ensureBuiltinReportModules();

  if (modulesCache && Date.now() - modulesCache.at < CACHE_MS) {
    return modulesCache.data;
  }
  try {
    const { data, error } = await supabase
      .from('report_modules')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw error;
    const rows = (data || []) as ReportModule[];
    pruneFallbackOverlappingDb(rows);
    const fallback = getFallback();
    const merged = fallback.length ? mergeReportModules(rows, fallback) : rows.map(normalizeReportModule);
    modulesCache = { data: merged, at: Date.now() };
    return merged;
  } catch {
    const fallback = getFallback().map(normalizeReportModule);
    modulesCache = { data: fallback, at: Date.now() };
    return fallback;
  }
};

export const getActiveReportModulesForMenu = async (): Promise<ReportModule[]> => {
  const all = await getAllReportModules();
  return all.filter(m => m.is_active);
};

export const getActiveCustomReportModules = async (): Promise<ReportModule[]> => {
  const all = await getAllReportModules();
  return all.filter(m => m.is_active && !m.is_builtin);
};

export const getReportModuleByPath = async (path: string): Promise<ReportModule | null> => {
  const normalized = '/' + String(path || '').replace(/^\/+/, '').replace(/\/+$/, '');
  const all = await getAllReportModules();
  return all.find(m => m.path === normalized) || null;
};

export const getReportModuleBySlug = async (slug: string): Promise<ReportModule | null> => {
  const clean = slugifyReportModule(slug);
  const all = await getAllReportModules();
  return all.find(m => m.slug === clean) || null;
};

export const getNextReportModuleSortOrder = async (): Promise<number> => {
  const all = await getAllReportModules();
  if (!all.length) return 1;
  return Math.max(...all.map(m => Number(m.sort_order) || 0)) + 1;
};

export type ReportModuleSlugConflict = 'slug' | 'path';

/** بررسی یکتا بودن slug و path قبل از ایجاد/ویرایش */
export const findReportModuleSlugConflict = async (
  slug: string,
  excludeId?: string | null
): Promise<{ conflict: ReportModuleSlugConflict; existing: ReportModule } | null> => {
  const clean = slugifyReportModule(slug);
  if (!clean) return null;
  const path = normalizeReportModulePath(clean);
  const all = await getAllReportModules();
  const slugHit = all.find(m => m.slug === clean && m.id !== excludeId);
  if (slugHit) return { conflict: 'slug', existing: slugHit };
  const pathHit = all.find(m => m.path === path && m.id !== excludeId);
  if (pathHit) return { conflict: 'path', existing: pathHit };
  return null;
};

export const assertReportModuleSlugAvailable = async (slug: string, excludeId?: string | null) => {
  const hit = await findReportModuleSlugConflict(slug, excludeId);
  if (!hit) return;
  if (hit.conflict === 'slug') {
    throw new Error(`شناسه «${slugifyReportModule(slug)}» قبلاً برای گزارش «${hit.existing.title}» ثبت شده است.`);
  }
  throw new Error(`مسیر «${hit.existing.path}» قبلاً برای گزارش «${hit.existing.title}» استفاده شده است.`);
};

const isDuplicateDbError = (err: unknown) => {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505');
};

const defaultListSchema = () => ({
  columns: [
    { key: 'report_date', label: 'تاریخ', visible: true },
    { key: 'tracking_code', label: 'کد رهگیری', visible: true },
  ],
});

const defaultFormSchema = (): ReportFormSchema => ({
  renderer: 'dynamic',
  fields: [],
  tabs: [{ id: 'main', label: 'عمومی', color: '#800020', icon: 'clipboard' }],
  groups: [],
  sections: [],
});

const resolveModuleId = (mod: ReportModule) =>
  BUILTIN_REPORT_MODULES.find(b => b.slug === mod.slug)?.menuId ?? mod.slug.replace(/-/g, '');

const ensureLinkedDefinition = async (mod: ReportModule) => {
  const slug = mod.definition_slug || mod.slug;
  const existing = await getReportDefinitionBySlug(slug);
  const modulePath = mod.path;
  const moduleId = resolveModuleId(mod);
  if (existing) {
    const needsLink =
      (existing.template_schema as { modulePath?: string })?.modulePath !== modulePath ||
      (existing.template_schema as { moduleId?: string })?.moduleId !== moduleId;
    if (needsLink) {
      await upsertReportDefinitionDraft({
        ...existing,
        slug,
        title: mod.title,
        category: 'گزارشات',
        template_schema: { moduleId, modulePath },
      });
    }
    return slug;
  }

  const result = await upsertReportDefinitionDraft({
    slug,
    title: mod.title,
    category: 'گزارشات',
    is_active: false,
    form_schema: defaultFormSchema(),
    list_schema: defaultListSchema(),
    template_schema: {
      moduleId,
      modulePath: mod.path,
    },
  });
  return result.data.slug;
};

export const createReportModule = async (
  input: ReportModuleInput,
  createdBy?: string
): Promise<{ module: ReportModule; usedFallback: boolean }> => {
  const slug = slugifyReportModule(input.slug || input.title);
  if (!slug) throw new Error('شناسه انگلیسی گزارش الزامی است (مثال: training-report)');

  const path = normalizeReportModulePath(slug);
  if (!path) throw new Error('مسیر گزارش نامعتبر است.');

  await assertReportModuleSlugAvailable(slug);

  const sortOrder =
    input.sort_order != null && Number(input.sort_order) > 0
      ? Number(input.sort_order)
      : await getNextReportModuleSortOrder();

  const now = new Date().toISOString();
  const payload = {
    slug,
    title: input.title.trim(),
    icon: input.icon || 'filetext',
    path,
    description: (input.description || '').trim(),
    sort_order: sortOrder,
    is_builtin: false,
    is_active: input.is_active ?? true,
    definition_slug: slug,
    created_by: createdBy || null,
    updated_by: createdBy || null,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase.from('report_modules').insert([payload]).select('*').single();
    if (error) throw error;
    const mod = data as ReportModule;
    await ensureLinkedDefinition(mod);
    emitReportModulesChanged();
    return { module: mod, usedFallback: false };
  } catch (err) {
    if (isDuplicateDbError(err)) {
      throw new Error('شناسه یا مسیر این گزارش قبلاً ثبت شده است. شناسه دیگری انتخاب کنید.');
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const updateReportModule = async (
  id: string,
  input: Partial<ReportModuleInput> & { title?: string },
  updatedBy?: string
): Promise<ReportModule> => {
  const all = await getAllReportModules();
  const current = all.find(m => m.id === id);
  if (!current) throw new Error('ماژول گزارش یافت نشد.');

  const nextSlug = input.slug ? slugifyReportModule(input.slug) : current.slug;
  if (current.is_builtin && input.slug !== undefined && nextSlug !== current.slug) {
    throw new Error('شناسه و مسیر گزارش‌های پیش‌فرض قابل تغییر نیست.');
  }
  const nextPath = input.slug && !current.is_builtin ? normalizeReportModulePath(nextSlug) : current.path;

  if (!current.is_builtin && input.slug !== undefined) {
    await assertReportModuleSlugAvailable(nextSlug, id);
  }

  const payload: Record<string, unknown> = {
    updated_by: updatedBy || null,
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.slug !== undefined && !current.is_builtin) {
    payload.slug = nextSlug;
    payload.path = nextPath;
    payload.definition_slug = nextSlug;
  }
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.sort_order !== undefined) payload.sort_order = Number(input.sort_order) || 0;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  try {
    const { data, error } = await supabase.from('report_modules').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    const mod = data as ReportModule;
    await ensureLinkedDefinition(mod);
    emitReportModulesChanged();
    return mod;
  } catch (err) {
    if (isDuplicateDbError(err)) {
      throw new Error('شناسه یا مسیر این گزارش قبلاً ثبت شده است.');
    }
    const fallback = getFallback();
    const idx = fallback.findIndex(m => m.id === id);
    if (idx < 0) throw err;
    fallback[idx] = { ...fallback[idx], ...payload } as ReportModule;
    setFallback(fallback);
    await ensureLinkedDefinition(fallback[idx]);
    emitReportModulesChanged();
    return fallback[idx];
  }
};

export const deleteReportModule = async (id: string): Promise<void> => {
  const all = await getAllReportModules();
  const current = all.find(m => m.id === id);
  if (!current) return;
  if (current.is_builtin) throw new Error('گزارش‌های پیش‌فرض سیستم قابل حذف نیستند.');

  try {
    const { error } = await supabase.from('report_modules').delete().eq('id', id);
    if (error) throw error;
    emitReportModulesChanged();
  } catch {
    const fallback = getFallback().filter(m => m.id !== id);
    setFallback(fallback);
    emitReportModulesChanged();
  }
};

export const setReportModuleActive = async (id: string, isActive: boolean): Promise<void> => {
  try {
    const { error } = await supabase.from('report_modules').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
    emitReportModulesChanged();
  } catch {
    const fallback = getFallback();
    const idx = fallback.findIndex(m => m.id === id);
    if (idx >= 0) {
      fallback[idx] = { ...fallback[idx], is_active: isActive };
      setFallback(fallback);
      emitReportModulesChanged();
    }
  }
};
