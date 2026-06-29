import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitMerge,
  Plus,
  Save,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  Workflow,
} from 'lucide-react';
import { DataPage } from '../../components/DataPage';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  createProcessModule,
  deleteProcessModule,
  findProcessModuleSlugConflict,
  getAllProcessModules,
  getNextProcessModuleSortOrder,
  invalidateProcessModulesCache,
  normalizeModuleKey,
  setProcessModuleActive,
  slugifyProcessModule,
  updateProcessModule,
} from '../../services/processModules';
import { loadAllProcessDesignLinkStatuses, ProcessDesignLinkStatus } from '../../services/processDesignRegistry';
import { ProcessModule, User } from '../../types';

interface Props {
  user?: User | null;
}

type ViewMode = 'LIST' | 'FORM';

const blankForm = () => ({
  title: '',
  slug: '',
  module_key: '',
  icon: 'workflow',
  entity_table: '',
  entity_status_field: 'status',
  form_route: '',
  description: '',
  sort_order: 1,
  is_active: true,
});

const workflowStatusBadge = (status: ProcessDesignLinkStatus | undefined) => {
  if (!status?.hasWorkflow) {
    return <span className="text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded">بدون گردش کار</span>;
  }
  if (status.activeWorkflow?.isActive) {
    return (
      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
        فعال ({status.stepCount} مرحله)
      </span>
    );
  }
  return <span className="text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">پیش‌نویس</span>;
};

export const ProcessDesign: React.FC<Props> = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<ProcessModule[]>([]);
  const [linkStatuses, setLinkStatuses] = useState<ProcessDesignLinkStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBuiltin, setEditingBuiltin] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProcessModule | null>(null);

  const statusBySlug = useMemo(() => {
    const map: Record<string, ProcessDesignLinkStatus> = {};
    linkStatuses.forEach(s => {
      map[s.option.slug] = s;
    });
    return map;
  }, [linkStatuses]);

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      invalidateProcessModulesCache();
      const [rows, statuses] = await Promise.all([
        getAllProcessModules(),
        loadAllProcessDesignLinkStatuses(),
      ]);
      setModules(rows);
      setLinkStatuses(statuses);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
    const onChanged = () => loadModules();
    window.addEventListener('process-modules-changed', onChanged);
    window.addEventListener('workflow-definitions-changed', onChanged);
    return () => {
      window.removeEventListener('process-modules-changed', onChanged);
      window.removeEventListener('workflow-definitions-changed', onChanged);
    };
  }, [loadModules]);

  const resetForm = () => {
    setEditingId(null);
    setEditingBuiltin(false);
    setForm(blankForm());
    setSlugTouched(false);
  };

  const handleEdit = async (row: ProcessModule) => {
    setEditingId(row.id);
    setEditingBuiltin(row.is_builtin);
    setForm({
      title: row.title,
      slug: row.slug,
      module_key: row.module_key,
      icon: row.icon,
      entity_table: row.entity_table,
      entity_status_field: row.entity_status_field,
      form_route: row.form_route,
      description: row.description,
      sort_order: row.sort_order,
      is_active: row.is_active,
    });
    setViewMode('FORM');
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('عنوان فرآیند را وارد کنید.');
      return;
    }
    setSaving(true);
    try {
      const slug = slugifyProcessModule(form.slug || form.title);
      const conflict = await findProcessModuleSlugConflict(slug, editingId || undefined);
      if (conflict) {
        alert(`شناسه «${slug}» تکراری است.`);
        return;
      }

      if (editingId) {
        await updateProcessModule(editingId, {
          ...form,
          slug: editingBuiltin ? undefined : slug,
          module_key: editingBuiltin ? undefined : normalizeModuleKey(form.module_key || slug),
        } as any);
      } else {
        await createProcessModule({
          ...form,
          slug,
          module_key: normalizeModuleKey(form.module_key || slug.replace(/-/g, '_')),
        });
      }
      await loadModules();
      setViewMode('LIST');
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { header: 'عنوان', accessor: (m: ProcessModule) => m.title, sortKey: 'title' },
      { header: 'شناسه', accessor: (m: ProcessModule) => <span className="font-mono text-xs">{m.slug}</span>, sortKey: 'slug' },
      { header: 'کلید ماژول', accessor: (m: ProcessModule) => <span className="font-mono text-xs">{m.module_key}</span>, sortKey: 'module_key' },
      { header: 'جدول', accessor: (m: ProcessModule) => m.entity_table || '—' },
      {
        header: 'گردش کار',
        accessor: (m: ProcessModule) => workflowStatusBadge(statusBySlug[m.slug]),
      },
      {
        header: 'وضعیت',
        accessor: (m: ProcessModule) =>
          m.is_active ? (
            <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs">فعال</span>
          ) : (
            <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-xs">غیرفعال</span>
          ),
        sortKey: 'is_active',
      },
      { header: 'ترتیب', accessor: (m: ProcessModule) => m.sort_order, sortKey: 'sort_order' },
    ],
    [statusBySlug]
  );

  if (viewMode === 'FORM') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="text-primary" />
            {editingId ? 'ویرایش فرآیند' : 'فرآیند جدید'}
          </h1>
          <button type="button" onClick={() => { resetForm(); setViewMode('LIST'); }} className="text-gray-500 hover:text-gray-800">
            بازگشت به لیست
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
          <p className="text-sm text-gray-500">
            فرآیند، نوع درخواستی است که گردش کار برای آن طراحی می‌شود (مثل دستور کار، درخواست قطعه). پس از ذخیره، از «طراحی گردش کار» برای آن گردش کار بنویسید.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500">عنوان فرآیند *</label>
              <input
                className="w-full p-2 border rounded-lg"
                value={form.title}
                placeholder="مثال: درخواست قطعه"
                onChange={e => {
                  const title = e.target.value;
                  setForm(f => ({
                    ...f,
                    title,
                    slug: !slugTouched && !editingId ? slugifyProcessModule(title) : f.slug,
                    module_key: !slugTouched && !editingId ? normalizeModuleKey(title.replace(/\s+/g, '_')) : f.module_key,
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">شناسه (slug)</label>
              <input
                className="w-full p-2 border rounded-lg font-mono"
                value={form.slug}
                readOnly={editingBuiltin}
                placeholder="مثال: part-request"
                onChange={e => {
                  setSlugTouched(true);
                  setForm(f => ({ ...f, slug: slugifyProcessModule(e.target.value) }));
                }}
              />
              <p className="text-[10px] text-gray-400">شناسه انگلیسی یکتا — از روی عنوان خودکار ساخته می‌شود</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">کلید ماژول (کارتابل)</label>
              <input
                className="w-full p-2 border rounded-lg font-mono"
                value={form.module_key}
                readOnly={editingBuiltin}
                placeholder="مثال: PART_REQUEST"
                onChange={e => setForm(f => ({ ...f, module_key: normalizeModuleKey(e.target.value) }))}
              />
              <p className="text-[10px] text-gray-400">کلید یکتا در کارتابل — فقط حروف انگلیسی و _</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">جدول موجودیت</label>
              <input
                className="w-full p-2 border rounded-lg font-mono"
                value={form.entity_table}
                onChange={e => setForm(f => ({ ...f, entity_table: e.target.value }))}
                placeholder="مثال: part_requests"
              />
              <p className="text-[10px] text-gray-400">نام جدول Supabase که رکوردها در آن ذخیره می‌شوند</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">فیلد وضعیت</label>
              <input
                className="w-full p-2 border rounded-lg font-mono"
                value={form.entity_status_field}
                onChange={e => setForm(f => ({ ...f, entity_status_field: e.target.value }))}
                placeholder="مثال: status"
              />
              <p className="text-[10px] text-gray-400">ستونی که وضعیت رکورد در آن نگه‌داری می‌شود</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500">مسیر فرم</label>
              <input
                className="w-full p-2 border rounded-lg font-mono"
                value={form.form_route}
                onChange={e => setForm(f => ({ ...f, form_route: e.target.value }))}
                placeholder="مثال: /part-requests"
              />
              <p className="text-[10px] text-gray-400">مسیر صفحه ثبت در برنامه</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500">توضیحات</label>
              <textarea
                className="w-full p-2 border rounded-lg min-h-[80px]"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="مثال: فرآیند درخواست و تایید قطعه از انبار — شامل ثبت، بررسی انباردار و تحویل"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            {editingId && statusBySlug[form.slug]?.hasWorkflow ? (
              <button
                type="button"
                onClick={() => navigate(`/workflow-designer?slug=${encodeURIComponent(form.slug)}`)}
                className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
              >
                طراحی گردش کار <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-xs text-gray-400">پس از ذخیره، گردش کار را طراحی کنید</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="حذف فرآیند"
        message={`فرآیند «${deleteTarget?.title}» حذف شود؟`}
        onConfirm={async () => {
          if (deleteTarget) {
            try {
              await deleteProcessModule(deleteTarget.id);
              await loadModules();
            } catch (err) {
              alert(err instanceof Error ? err.message : 'خطا در حذف');
            }
          }
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      <DataPage
        title="طراحی فرآیند"
        icon={GitMerge}
        data={modules}
        columns={columns}
        isLoading={loading}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        onAdd={async () => {
          resetForm();
          const nextOrder = await getNextProcessModuleSortOrder();
          setForm({ ...blankForm(), sort_order: nextOrder });
          setViewMode('FORM');
        }}
        onReload={loadModules}
        onEdit={handleEdit}
        onDelete={async (ids) => {
          const row = modules.find(m => m.id === ids[0]);
          if (row) setDeleteTarget(row);
        }}
        exportName="ProcessModules"
        extraActionsBeforeDivider={
          selectedIds.length === 1 ? (() => {
            const row = modules.find(m => m.id === selectedIds[0]);
            if (!row) return null;
            return (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/workflow-designer?slug=${encodeURIComponent(row.slug)}`)}
                  className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition"
                  title="طراحی گردش کار"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await setProcessModuleActive(row.id, !row.is_active);
                    await loadModules();
                  }}
                  className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition"
                  title={row.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                >
                  {row.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </>
            );
          })() : null
        }
      />
    </>
  );
};

export default ProcessDesign;
