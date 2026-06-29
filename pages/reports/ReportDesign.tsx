import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Save,
  ExternalLink,
  Settings2,
  LayoutTemplate,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  Info,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  FileStack,
} from 'lucide-react';
import { DataPage } from '../../components/DataPage';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  ReportModule,
  assertReportModuleSlugAvailable,
  createReportModule,
  deleteReportModule,
  findReportModuleSlugConflict,
  getAllReportModules,
  getNextReportModuleSortOrder,
  invalidateReportModulesCache,
  normalizeReportModulePath,
  setReportModuleActive,
  slugifyReportModule,
  updateReportModule,
} from '../../services/reportModules';
import { getReportDefinitionBySlug } from '../../services/reportDefinitions';
import { countReportRecordsByDefinitionId } from '../../services/dynamicReports';
import { getReportStorageInfo, ReportStorageInfo } from '../../config/reportModuleStorage';
import {
  REPORT_MODULE_ICON_OPTIONS,
  getReportModuleIconLabel,
  resolveReportModuleIcon,
} from '../../config/reportModuleIcons';
import { User } from '../../types';

interface Props {
  user?: User | null;
}

type ViewMode = 'LIST' | 'FORM';

interface ReportModuleMeta {
  definitionId?: string;
  formSlug: string;
  published: boolean;
  hasFields: boolean;
  fieldCount: number;
  recordCount: number | null;
  storage: ReportStorageInfo;
}

const blankForm = () => ({
  title: '',
  slug: '',
  icon: 'filetext',
  description: '',
  sort_order: 1,
  is_active: true,
});

const formStatusBadge = (meta: ReportModuleMeta | undefined) => {
  if (!meta?.hasFields) {
    return (
      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">بدون فرم</span>
    );
  }
  if (meta.published) {
    return (
      <span className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">
        منتشر شده
      </span>
    );
  }
  return (
    <span className="text-xs text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 rounded">
      پیش‌نویس
    </span>
  );
};

export const ReportDesign: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<ReportModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBuiltin, setEditingBuiltin] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportModule | null>(null);
  const [moduleMeta, setModuleMeta] = useState<Record<string, ReportModuleMeta>>({});
  const [slugCheckState, setSlugCheckState] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [slugCheckMessage, setSlugCheckMessage] = useState('');

  const loadModuleMeta = async (mod: ReportModule): Promise<ReportModuleMeta> => {
    const formSlug = mod.definition_slug || mod.slug;
    const storage = getReportStorageInfo(mod.slug, mod.is_builtin);
    const def = await getReportDefinitionBySlug(formSlug);
    const fieldCount = def?.form_schema?.fields?.length || 0;
    let recordCount: number | null = null;
    if (def?.id && storage.kind === 'report_records') {
      recordCount = await countReportRecordsByDefinitionId(def.id);
    } else if (def?.id && storage.kind === 'legacy_table') {
      recordCount = await countReportRecordsByDefinitionId(def.id);
    } else if (storage.kind === 'tool_page') {
      recordCount = null;
    }
    return {
      definitionId: def?.id,
      formSlug,
      published: !!(def?.is_active && (def?.published_version || 0) > 0),
      hasFields: fieldCount > 0,
      fieldCount,
      recordCount,
      storage,
    };
  };

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      invalidateReportModulesCache();
      const rows = await getAllReportModules();
      setModules(rows);
      const metaEntries = await Promise.all(rows.map(async mod => [mod.id, await loadModuleMeta(mod)] as const));
      setModuleMeta(Object.fromEntries(metaEntries));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  useEffect(() => {
    const handler = () => {
      setViewMode('LIST');
      resetForm();
    };
    window.addEventListener('report-design-back-to-list', handler);
    return () => window.removeEventListener('report-design-back-to-list', handler);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setEditingBuiltin(false);
    setForm(blankForm());
    setSlugTouched(false);
    setSlugCheckState('idle');
    setSlugCheckMessage('');
  };

  const handleAdd = async () => {
    resetForm();
    const nextOrder = await getNextReportModuleSortOrder();
    setForm({ ...blankForm(), sort_order: nextOrder });
    setViewMode('FORM');
  };

  const handleEdit = (row: ReportModule) => {
    setEditingId(row.id);
    setEditingBuiltin(row.is_builtin);
    setForm({
      title: row.title,
      slug: row.slug,
      icon: row.icon || 'filetext',
      description: row.description || '',
      sort_order: Number(row.sort_order) || 1,
      is_active: row.is_active,
    });
    setSlugTouched(true);
    setSlugCheckState('ok');
    setSlugCheckMessage('');
    setViewMode('FORM');
  };

  const effectiveSlug = useMemo(() => {
    if (editingBuiltin) return form.slug;
    return slugifyReportModule(slugTouched ? form.slug : form.slug || form.title);
  }, [editingBuiltin, form.slug, form.title, slugTouched]);

  useEffect(() => {
    if (viewMode !== 'FORM' || editingBuiltin || !effectiveSlug) {
      setSlugCheckState('idle');
      setSlugCheckMessage('');
      return;
    }
    let cancelled = false;
    setSlugCheckState('checking');
    const timer = setTimeout(async () => {
      try {
        const hit = await findReportModuleSlugConflict(effectiveSlug, editingId);
        if (cancelled) return;
        if (hit) {
          setSlugCheckState('error');
          setSlugCheckMessage(
            hit.conflict === 'slug'
              ? `این شناسه برای «${hit.existing.title}» ثبت شده است.`
              : `این مسیر برای «${hit.existing.title}» استفاده شده است.`
          );
        } else {
          setSlugCheckState('ok');
          setSlugCheckMessage('شناسه قابل استفاده است.');
        }
      } catch {
        if (!cancelled) {
          setSlugCheckState('idle');
          setSlugCheckMessage('');
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveSlug, editingBuiltin, editingId, viewMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('عنوان گزارش الزامی است.');
    const slug = effectiveSlug;
    if (!slug && !editingBuiltin) return alert('شناسه انگلیسی (slug) الزامی است — مثال: training-report');

    if (!editingBuiltin && slugCheckState === 'error') {
      return alert(slugCheckMessage || 'شناسه یا مسیر تکراری است.');
    }

    setSaving(true);
    try {
      if (!editingId) {
        await assertReportModuleSlugAvailable(slug);
      } else if (!editingBuiltin) {
        await assertReportModuleSlugAvailable(slug, editingId);
      }

      if (editingId) {
        const payload = editingBuiltin ? { ...form, slug: undefined } : { ...form, slug };
        await updateReportModule(editingId, payload as typeof form, user?.fullName);
      } else {
        await createReportModule({ ...form, slug }, user?.fullName);
      }
      await loadModules();
      setViewMode('LIST');
      resetForm();
    } catch (err: any) {
      alert(err?.message || 'خطا در ذخیره گزارش');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_builtin) {
      alert('گزارش‌های پیش‌فرض سیستم قابل حذف نیستند.');
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteReportModule(deleteTarget.id);
      setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
      setDeleteTarget(null);
      await loadModules();
    } catch (err: any) {
      alert(err?.message || 'حذف ناموفق بود');
    }
  };

  const handleToggleActive = async (row: ReportModule) => {
    await setReportModuleActive(row.id, !row.is_active);
    await loadModules();
  };

  const openFormDesign = (row: ReportModule) => {
    const slug = row.definition_slug || row.slug;
    navigate(`/report-form-design?slug=${encodeURIComponent(slug)}`);
  };

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)),
    [modules]
  );

  const editingMeta = editingId ? moduleMeta[editingId] : undefined;

  const columns = useMemo(
    () => [
      {
        header: 'ترتیب',
        accessor: (row: ReportModule) => (
          <span className="font-mono text-sm tabular-nums">{Number(row.sort_order) || '—'}</span>
        ),
        sortKey: 'sort_order',
      },
      {
        header: 'عنوان',
        accessor: (row: ReportModule) => {
          const Icon = resolveReportModuleIcon(row.icon);
          return (
            <span className="inline-flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              {row.title}
            </span>
          );
        },
        sortKey: 'title',
      },
      {
        header: 'شناسه',
        accessor: (row: ReportModule) => <span className="font-mono text-xs">{row.slug}</span>,
        sortKey: 'slug',
      },
      {
        header: 'ذخیره‌سازی',
        accessor: (row: ReportModule) => {
          const st = moduleMeta[row.id]?.storage;
          if (!st) return '—';
          const color =
            st.kind === 'legacy_table'
              ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : st.kind === 'tool_page'
                ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
          return (
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${color}`} title={st.detail}>
              {st.table || st.label}
            </span>
          );
        },
      },
      {
        header: 'فرم',
        accessor: (row: ReportModule) => {
          const meta = moduleMeta[row.id];
          return (
            <button
              type="button"
              onClick={() => openFormDesign(row)}
              className="inline-flex items-center gap-1 hover:opacity-80"
              title="رفتن به طراحی فرم"
            >
              {formStatusBadge(meta)}
            </button>
          );
        },
      },
      {
        header: 'رکورد',
        accessor: (row: ReportModule) => {
          const meta = moduleMeta[row.id];
          if (meta?.storage.kind === 'tool_page') {
            return <span className="text-xs text-gray-400">—</span>;
          }
          const count = meta?.recordCount ?? 0;
          return (
            <button
              type="button"
              onClick={() => navigate(row.path)}
              className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
              title="مشاهده رکوردهای گزارش"
            >
              <FileStack className="w-3.5 h-3.5" />
              {count}
            </button>
          );
        },
      },
      {
        header: 'منو',
        accessor: (row: ReportModule) =>
          row.is_active ? (
            <span className="text-xs text-green-700 dark:text-green-400">فعال</span>
          ) : (
            <span className="text-xs text-gray-500">غیرفعال</span>
          ),
        sortKey: 'is_active',
      },
    ],
    [moduleMeta, navigate]
  );

  const customRowActions = (row: ReportModule) => (
    <div className="flex items-center gap-1">
      <button type="button" title="باز کردن گزارش" onClick={() => navigate(row.path)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600">
        <ExternalLink className="w-4 h-4" />
      </button>
      <button type="button" title="طراحی فرم" onClick={() => openFormDesign(row)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600">
        <Settings2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="طراحی قالب"
        onClick={() => navigate(`/report-template-design?slug=${encodeURIComponent(row.definition_slug || row.slug)}`)}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600"
      >
        <LayoutTemplate className="w-4 h-4" />
      </button>
      <button type="button" title={row.is_active ? 'غیرفعال در منو' : 'فعال در منو'} onClick={() => handleToggleActive(row)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600">
        {row.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  if (viewMode === 'FORM') {
    const PreviewIcon = resolveReportModuleIcon(form.icon);
    const previewPath = editingBuiltin
      ? modules.find(m => m.id === editingId)?.path || ''
      : normalizeReportModulePath(effectiveSlug);

    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setViewMode('LIST'); resetForm(); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{editingId ? 'ویرایش گزارش' : 'گزارش جدید'}</h1>
        </div>

        {editingMeta ? (
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100">
              <Database className="w-4 h-4 text-primary" />
              وضعیت داده و فرم
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-gray-500 block text-xs mb-0.5">جدول / محل ذخیره</span>
                <span className="font-mono text-xs">{editingMeta.storage.table || editingMeta.storage.label}</span>
                {editingMeta.storage.detail ? (
                  <p className="text-xs text-gray-500 mt-1">{editingMeta.storage.detail}</p>
                ) : null}
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-0.5">وضعیت فرم</span>
                {formStatusBadge(editingMeta)}
                <span className="text-xs text-gray-500 mr-2">({editingMeta.fieldCount} فیلد)</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-0.5">رکورد در report_records</span>
                <span className="font-mono">{editingMeta.recordCount ?? '—'}</span>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <button type="button" onClick={() => openFormDesign(modules.find(m => m.id === editingId)!)} className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20">
                  طراحی فرم
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/report-template-design?slug=${encodeURIComponent(editingMeta.formSlug)}`)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  طراحی قالب
                </button>
                {editingId && (
                  <button type="button" onClick={() => navigate(modules.find(m => m.id === editingId)!.path)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                    باز کردن گزارش
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : !editingId ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3 text-sm">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-blue-900 dark:text-blue-100 space-y-1">
              <p>دادهٔ گزارش‌های جدید در جدول <span className="font-mono">report_records</span> (JSON) ذخیره می‌شود.</p>
              <p className="text-xs opacity-80">ترتیب منو: {form.sort_order} — مراحل بعد: طراحی فرم → انتشار → (اختیاری) قالب چاپ</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">عنوان گزارش *</label>
            <input className="w-full p-2.5 border rounded-lg dark:bg-gray-700" placeholder="مثال: گزارش آموزش" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">شناسه انگلیسی (slug) *</label>
            <div className="relative">
              <input
                className={`w-full p-2.5 border rounded-lg dark:bg-gray-700 font-mono text-sm disabled:opacity-60 pr-10 ${
                  slugCheckState === 'error' ? 'border-red-400' : slugCheckState === 'ok' ? 'border-green-400' : ''
                }`}
                placeholder="training-report"
                value={editingBuiltin ? form.slug : slugTouched ? form.slug : effectiveSlug}
                onChange={e => {
                  setSlugTouched(true);
                  setForm(f => ({ ...f, slug: e.target.value }));
                }}
                dir="ltr"
                required
                disabled={editingBuiltin}
              />
              {!editingBuiltin && effectiveSlug ? (
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  {slugCheckState === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {slugCheckState === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {slugCheckState === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                </span>
              ) : null}
            </div>
            <p className={`text-xs mt-1 ${slugCheckState === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
              {editingBuiltin
                ? 'شناسه گزارش‌های پیش‌فرض ثابت است.'
                : slugCheckMessage || `مسیر: ${previewPath || '—'}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">آیکون منو</label>
            <div className="flex flex-wrap gap-2">
              {REPORT_MODULE_ICON_OPTIONS.map(opt => {
                const Icon = opt.Icon;
                const selected = form.icon === opt.id;
                return (
                  <button key={opt.id} type="button" title={opt.label} onClick={() => setForm(f => ({ ...f, icon: opt.id }))} className={`w-10 h-10 rounded-lg border flex items-center justify-center transition ${selected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">توضیح (اختیاری)</label>
            <textarea className="w-full p-2.5 border rounded-lg dark:bg-gray-700 min-h-[80px]" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ترتیب در منو</label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 font-mono"
                value={String(form.sort_order ?? '')}
                onChange={e => {
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  setForm(f => ({ ...f, sort_order: raw === '' ? 0 : parseInt(raw, 10) }));
                }}
                dir="ltr"
              />
              {!editingId ? (
                <p className="text-xs text-gray-500 mt-1">به‌صورت خودکار آخرین ترتیب + ۱ پیشنهاد شده است.</p>
              ) : null}
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 cursor-pointer pb-2.5">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <span className="text-sm">نمایش در منوی گزارشات</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <PreviewIcon className="w-8 h-8 text-primary" />
            <div>
              <p className="font-bold">{form.title || 'عنوان گزارش'}</p>
              <p className="text-xs text-gray-500">{previewPath || '/...'} · {getReportModuleIconLabel(form.icon)} · ترتیب {form.sort_order}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || slugCheckState === 'error'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover-primary-dark disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ایجاد گزارش'}
            </button>
            <button type="button" onClick={() => { setViewMode('LIST'); resetForm(); }} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-medium">
              انصراف
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <DataPage
        title="طراحی گزارش"
        icon={FileText}
        data={sortedModules}
        columns={columns}
        isLoading={loading}
        onAdd={() => void handleAdd()}
        onReload={loadModules}
        onEdit={handleEdit}
        initialSort={{ key: 'sort_order', direction: 'asc' }}
        onDelete={async ids => {
          const row = modules.find(m => m.id === ids[0]);
          if (row?.is_builtin) {
            alert('گزارش‌های پیش‌فرض سیستم قابل حذف نیستند.');
            return;
          }
          if (row) setDeleteTarget(row);
        }}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        exportName="report-modules"
        customRowActions={customRowActions}
        columnVisibilityKey="report_design_modules"
        userId={user?.id}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="حذف گزارش"
        message={deleteTarget ? `آیا از حذف «${deleteTarget.title}» اطمینان دارید؟ تعریف فرم در report_definitions باقی می‌ماند؛ فقط ثبت منو حذف می‌شود.` : ''}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        confirmText="حذف"
        variant="danger"
      />
    </>
  );
};

export default ReportDesign;
