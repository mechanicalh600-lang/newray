import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FormInput,
  Plus,
  Save,
  Eye,
  Upload,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { User } from '../../types';
import { DataPage } from '../../components/DataPage';
import DynamicFormRenderer from '../../components/DynamicFormRenderer';
import {
  ProcessFormDefinition,
  blankProcessField,
  blankProcessTab,
  getAllProcessFormDefinitions,
  getProcessFormBySlug,
  importProcessFormPreset,
  publishProcessForm,
  saveProcessFormDraft,
  setProcessFormDynamicEnabled,
} from '../../services/processFormDefinitions';
import { ReportFieldSchema, ReportTabSchema } from '../../services/reportDefinitions';
import { FIELD_WIDTH_OPTIONS } from '../../utils/formFieldWidth';
import { PROCESS_FORM_DESIGN_GUIDE } from '../../config/entityFormPresets';
import { fetchMasterData } from '../../workflowStore';

const FIELD_TYPES: { id: ReportFieldSchema['type']; label: string }[] = [
  { id: 'text', label: 'متن' },
  { id: 'number', label: 'عدد' },
  { id: 'date', label: 'تاریخ' },
  { id: 'time', label: 'ساعت' },
  { id: 'textarea', label: 'متن چندخطی' },
  { id: 'select', label: 'انتخابی' },
  { id: 'checkbox', label: 'چک‌باکس' },
  { id: 'repeatable_list', label: 'لیست تکرارشونده' },
  { id: 'matrix', label: 'ماتریس' },
];

interface Props {
  user?: User | null;
}

export const ProcessFormDesign: React.FC<Props> = ({ user }) => {
  const [defs, setDefs] = useState<ProcessFormDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'EDIT'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [fields, setFields] = useState<ReportFieldSchema[]>([]);
  const [tabs, setTabs] = useState<ReportTabSchema[]>([{ id: 'tab-main', label: 'اطلاعات اصلی', color: '#2563eb', icon: 'clipboard' }]);
  const [previewValue, setPreviewValue] = useState<Record<string, unknown>>({});
  const [personnel, setPersonnel] = useState<unknown[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [useDynamic, setUseDynamic] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDefs(await getAllProcessFormDefinitions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchMasterData('personnel').then(setPersonnel);
    const onChange = () => load();
    window.addEventListener('process-modules-changed', onChange);
    return () => window.removeEventListener('process-modules-changed', onChange);
  }, [load]);

  const selectedField = useMemo(
    () => fields.find(f => f.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  const openEditor = async (slug: string) => {
    const row = await getProcessFormBySlug(slug);
    if (!row) return;
    setActiveSlug(slug);
    const loadedTabs = row.form_schema?.tabs?.length
      ? row.form_schema.tabs
      : [{ id: 'tab-main', label: 'اطلاعات اصلی', color: '#2563eb', icon: 'clipboard' as const }];
    setTabs(loadedTabs as ReportTabSchema[]);
    setFields(
      row.form_schema?.fields?.length
        ? (row.form_schema.fields as ReportFieldSchema[])
        : [{ ...blankProcessField(), label: 'فیلد ۱', tabId: loadedTabs[0].id }]
    );
    setUseDynamic(!!row.use_dynamic_form);
    setSelectedFieldId(null);
    setPreviewValue({});
    setViewMode('EDIT');
  };

  const addField = () => {
    const tabId = tabs[0]?.id || 'tab-main';
    const nf = { ...blankProcessField(), label: `فیلد ${fields.length + 1}`, tabId };
    setFields(prev => [...prev, nf]);
    setSelectedFieldId(nf.id);
  };

  const addTab = () => {
    const nt = blankProcessTab();
    setTabs(prev => [...prev, nt]);
  };

  const updateField = (id: string, patch: Partial<ReportFieldSchema>) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const saveDraft = async () => {
    const effective = fields.filter(f => (f.key || '').trim() && (f.label || '').trim());
    if (!effective.length) {
      alert('حداقل یک فیلد با کلید و برچسب لازم است.');
      return;
    }
    const keys = effective.map(f => f.key.trim());
    if (new Set(keys).size !== keys.length) {
      alert('کلید فیلدها باید یکتا باشد.');
      return;
    }
    try {
      await saveProcessFormDraft({
        slug: activeSlug,
        form_schema: { tabs, fields: effective, groups: [] },
        use_dynamic_form: useDynamic,
        updated_by: user?.username,
      });
      alert('پیش‌نویس ذخیره شد.');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handlePublish = async () => {
    try {
      await saveDraft();
      await publishProcessForm(activeSlug);
      alert('فرم منتشر شد. از این پس در صفحه عملیاتی نمایش داده می‌شود.');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleImportPreset = async () => {
    try {
      await importProcessFormPreset(activeSlug, user?.username);
      await openEditor(activeSlug);
      alert('قالب آماده بارگذاری شد. می‌توانید ویرایش و منتشر کنید.');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleDynamic = async (row: ProcessFormDefinition) => {
    await setProcessFormDynamicEnabled(row.slug, !row.use_dynamic_form);
    await load();
  };

  const listColumns = [
    { header: 'فرم / فرآیند', sortKey: 'title', accessor: (row: ProcessFormDefinition) => row.title },
    { header: 'مسیر', sortKey: 'form_route', accessor: (row: ProcessFormDefinition) => row.form_route },
    { header: 'جدول', sortKey: 'entity_table', accessor: (row: ProcessFormDefinition) => row.entity_table },
    {
      header: 'وضعیت فرم',
      sortKey: 'published_form_version',
      accessor: (row: ProcessFormDefinition) => (
        <span className={`text-xs px-2 py-0.5 rounded ${row.use_dynamic_form && row.published_form_version ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {row.use_dynamic_form && row.published_form_version
            ? `داینامیک (v${row.published_form_version})`
            : row.form_schema?.fields?.length
              ? 'پیش‌نویس'
              : 'فرم ثابت'}
        </span>
      ),
    },
    {
      header: 'فعال',
      sortKey: 'use_dynamic_form',
      accessor: (row: ProcessFormDefinition) => (
        <button type="button" onClick={() => toggleDynamic(row)} className="text-primary">
          {row.use_dynamic_form ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
        </button>
      ),
    },
  ];

  if (viewMode === 'EDIT') {
    const activeModule = defs.find(d => d.slug === activeSlug);
    return (
      <div className="p-4 max-w-[1600px] mx-auto pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold">طراحی فرم: {activeModule?.title}</h1>
            <p className="text-sm text-gray-500">جدول: {activeModule?.entity_table} — کلید فیلد = نام ستون DB</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setViewMode('LIST')} className="px-3 py-2 border rounded-lg text-sm">بازگشت</button>
            <button type="button" onClick={handleImportPreset} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1">
              <Upload className="w-4 h-4" /> قالب آماده
            </button>
            <button type="button" onClick={saveDraft} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1">
              <Save className="w-4 h-4" /> ذخیره پیش‌نویس
            </button>
            <button type="button" onClick={handlePublish} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1">
              <Eye className="w-4 h-4" /> انتشار
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-3 bg-white dark:bg-gray-800 border rounded-xl p-3 space-y-2 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">فیلدها</span>
              <button type="button" onClick={addField} className="text-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> افزودن</button>
            </div>
            {fields.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFieldId(f.id)}
                className={`w-full text-right p-2 rounded-lg border text-sm ${selectedFieldId === f.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="font-medium">{f.label || '(بدون برچسب)'}</div>
                <div className="text-xs text-gray-500 font-mono">{f.key || '—'} · {f.type}</div>
              </button>
            ))}
          </div>

          <div className="xl:col-span-3 bg-white dark:bg-gray-800 border rounded-xl p-3 space-y-3">
            <span className="font-bold text-sm">ویژگی فیلد</span>
            {selectedField ? (
              <>
                <label className="block text-xs text-gray-500">برچسب</label>
                <input className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700" value={selectedField.label} onChange={e => updateField(selectedField.id, { label: e.target.value })} />
                <label className="block text-xs text-gray-500">کلید (ستون DB)</label>
                <input className="w-full p-2 border rounded-lg text-sm font-mono dark:bg-gray-700" value={selectedField.key} onChange={e => updateField(selectedField.id, { key: e.target.value.replace(/\s/g, '_') })} />
                <label className="block text-xs text-gray-500">نوع</label>
                <select className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700" value={selectedField.type} onChange={e => updateField(selectedField.id, { type: e.target.value as ReportFieldSchema['type'] })}>
                  {FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <label className="block text-xs text-gray-500">عرض</label>
                <select className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700" value={selectedField.width || 2} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) as ReportFieldSchema['width'] })}>
                  {FIELD_WIDTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <label className="block text-xs text-gray-500">تب</label>
                <select className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700" value={selectedField.tabId || tabs[0]?.id} onChange={e => updateField(selectedField.id, { tabId: e.target.value })}>
                  {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!selectedField.required} onChange={e => updateField(selectedField.id, { required: e.target.checked })} />
                  الزامی
                </label>
                {selectedField.type === 'select' && (
                  <>
                    <label className="block text-xs text-gray-500">گزینه‌ها (label:value هر خط)</label>
                    <textarea
                      className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700 h-24"
                      value={(selectedField.options || []).map(o => `${o.label}:${o.value}`).join('\n')}
                      onChange={e => {
                        const options = e.target.value.split('\n').map(line => {
                          const [label, ...rest] = line.split(':');
                          const value = rest.join(':') || label;
                          return { label: label?.trim() || '', value: value?.trim() || '' };
                        }).filter(o => o.label);
                        updateField(selectedField.id, { options });
                      }}
                    />
                  </>
                )}
                <button type="button" onClick={() => removeField(selectedField.id)} className="text-red-600 text-sm flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> حذف فیلد
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500">یک فیلد را انتخاب کنید.</p>
            )}
            <hr />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">تب‌ها</span>
              <button type="button" onClick={addTab} className="text-xs text-primary">+ تب</button>
            </div>
            {tabs.map(t => (
              <input key={t.id} className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700" value={t.label} onChange={e => setTabs(prev => prev.map(x => x.id === t.id ? { ...x, label: e.target.value } : x))} />
            ))}
          </div>

          <div className="xl:col-span-6 bg-white dark:bg-gray-800 border rounded-xl p-4 min-h-[400px]">
            <div className="text-sm font-bold mb-3 flex items-center gap-2"><ChevronDown className="w-4 h-4" /> پیش‌نمایش</div>
            <DynamicFormRenderer
              fields={fields}
              tabs={tabs}
              groups={[]}
              value={previewValue}
              onChange={setPreviewValue}
              personnel={personnel as never[]}
              onFieldClick={setSelectedFieldId}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataPage
      title="طراحی فرم‌های عملیاتی"
      icon={FormInput}
      data={defs}
      isLoading={loading}
      columns={listColumns}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      onEdit={(row) => void openEditor(row.slug)}
      onViewDetails={(row) => void openEditor(row.slug)}
      onReload={load}
      exportName="process-forms"
      filterContent={
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/20 p-4 text-sm leading-relaxed space-y-1">
          <p className="font-bold text-blue-800 dark:text-blue-300 mb-2">راهنمای طراحی فرم</p>
          {PROCESS_FORM_DESIGN_GUIDE.map(line => (
            <p key={line} className="text-gray-700 dark:text-gray-300">{line}</p>
          ))}
        </div>
      }
    />
  );
};

export default ProcessFormDesign;
