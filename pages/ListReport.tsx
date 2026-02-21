import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileSpreadsheet, Plus, ArrowRight, Database, Save, List } from 'lucide-react';
import { SqlQueryBuilderModal } from '../components/SqlQueryBuilderModal';

const STORAGE_KEY = 'list_report_definitions_v1';

export interface ListReportDefinition {
  id: string;
  title: string;
  groupName: string;
  querySql: string;
  uniqueKeyName: string;
  parentFieldName: string;
  displayColumns: string;
  hiddenColumns: string;
  defaultGroupingFields: string;
  sortFields: string;
  options: {
    showColumnFilter: boolean;
    showTitleBar: boolean;
    showVerticalScroll: boolean;
    showHorizontalScroll: boolean;
    showGroupingPanel: boolean;
    allowReportFilter: boolean;
    showFilterMenu: boolean;
    showRecordCountSetting: boolean;
    showInReportTree: boolean;
    mergeSameValueColumns: boolean;
    rtl: boolean;
    shortenLongFields: boolean;
    openGroupsByDefault: boolean;
    treeList: boolean;
    active: boolean;
  };
  pageSize: number;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

const defaultOptions: ListReportDefinition['options'] = {
  showColumnFilter: true,
  showTitleBar: true,
  showVerticalScroll: true,
  showHorizontalScroll: true,
  showGroupingPanel: true,
  allowReportFilter: false,
  showFilterMenu: false,
  showRecordCountSetting: false,
  showInReportTree: true,
  mergeSameValueColumns: false,
  rtl: true,
  shortenLongFields: false,
  openGroupsByDefault: false,
  treeList: false,
  active: true,
};

function loadDefinitions(): ListReportDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDefinitions(defs: ListReportDefinition[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defs));
}

export const ListReport: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isNew = params.id === 'new' || !params.id;
  const editId = params.id && params.id !== 'new' ? params.id : null;

  const [definitions, setDefinitions] = useState<ListReportDefinition[]>([]);
  const [view, setView] = useState<'LIST' | 'EDIT'>(() => (params.id === 'new' || (params.id && params.id !== 'new')) ? 'EDIT' : 'LIST');
  const [form, setForm] = useState<ListReportDefinition>({
    id: '',
    title: '',
    groupName: 'دستور کار',
    querySql: '',
    uniqueKeyName: 'id',
    parentFieldName: '',
    displayColumns: '',
    hiddenColumns: '',
    defaultGroupingFields: '',
    sortFields: '',
    options: { ...defaultOptions },
    pageSize: 100,
    rowCount: 100,
    createdAt: '',
    updatedAt: '',
  });
  const [sqlModalOpen, setSqlModalOpen] = useState(false);

  useEffect(() => {
    setDefinitions(loadDefinitions());
  }, []);

  useEffect(() => {
    if (params.id === 'new' || (params.id && params.id !== 'new')) setView('EDIT');
  }, [params.id]);

  useEffect(() => {
    if (editId) {
      const found = definitions.find(d => d.id === editId);
      if (found) setForm(found);
    } else if (isNew && view === 'EDIT') {
      setForm({
        id: `lr-${Date.now()}`,
        title: '',
        groupName: 'گزارش لیستی',
        querySql: '',
        uniqueKeyName: 'id',
        parentFieldName: '',
        displayColumns: '',
        hiddenColumns: '',
        defaultGroupingFields: '',
        sortFields: '',
        options: { ...defaultOptions },
        pageSize: 100,
        rowCount: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [editId, isNew, definitions, view]);

  const handleNew = () => {
    setView('EDIT');
    navigate('/list-report/new');
    setForm({
      id: `lr-${Date.now()}`,
      title: '',
      groupName: 'گزارش لیستی',
      querySql: '',
      uniqueKeyName: 'id',
      parentFieldName: '',
      displayColumns: '',
      hiddenColumns: '',
      defaultGroupingFields: '',
      sortFields: '',
      options: { ...defaultOptions },
      pageSize: 100,
      rowCount: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    const updated = { ...form, updatedAt: new Date().toISOString() };
    const exists = definitions.some(d => d.id === form.id);
    const next = exists ? definitions.map(d => d.id === form.id ? updated : d) : [...definitions, updated];
    setDefinitions(next);
    saveDefinitions(next);
    setView('LIST');
    navigate('/list-report');
    alert('ذخیره شد.');
  };

  const handleEdit = (item: ListReportDefinition) => {
    setForm(item);
    setView('EDIT');
    navigate(`/list-report/edit/${item.id}`);
  };

  const handleApplySql = (sql: string) => {
    setForm(prev => ({ ...prev, querySql: sql }));
    setSqlModalOpen(false);
  };

  const toggleOption = (key: keyof ListReportDefinition['options'], value?: boolean) => {
    setForm(prev => ({
      ...prev,
      options: { ...prev.options, [key]: value ?? !prev.options[key] },
    }));
  };

  if (view === 'EDIT') {
    return (
      <div className="p-4 max-w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">گزارش لیستی — تنظیمات</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setView('LIST'); navigate('/list-report'); }} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" /> بازگشت به لیست
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-white font-bold flex items-center gap-2">
                <Save className="w-4 h-4" /> ذخیره
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <h2 className="font-bold mb-2">گروه و عنوان</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">گروه</label>
                    <input type="text" value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="مثال: دستور کار" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">عنوان گزارش</label>
                    <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="عنوان" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold">متن پرس‌وجو (SQL)</h2>
                  <button type="button" onClick={() => setSqlModalOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-bold">
                    <Database className="w-4 h-4" /> ابزار SQL
                  </button>
                </div>
                <textarea value={form.querySql} onChange={e => setForm(f => ({ ...f, querySql: e.target.value }))} rows={8} className="w-full p-3 font-mono text-sm border rounded-lg bg-gray-50 dark:bg-gray-900" placeholder="SELECT ... FROM public.table_name ..." dir="ltr" />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">نام کلید یکتای گزارش</label>
                  <input type="text" value={form.uniqueKeyName} onChange={e => setForm(f => ({ ...f, uniqueKeyName: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="id" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">نام فیلد والد (درخت)</label>
                  <input type="text" value={form.parentFieldName} onChange={e => setForm(f => ({ ...f, parentFieldName: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="خالی" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">ستون‌های قابل نمایش (با کاما)</label>
                  <input type="text" value={form.displayColumns} onChange={e => setForm(f => ({ ...f, displayColumns: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="col1,col2,col3" dir="ltr" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">ستون‌های مخفی</label>
                  <input type="text" value={form.hiddenColumns} onChange={e => setForm(f => ({ ...f, hiddenColumns: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="خالی" dir="ltr" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">فیلدهای گروه‌بندی پیش‌فرض</label>
                  <input type="text" value={form.defaultGroupingFields} onChange={e => setForm(f => ({ ...f, defaultGroupingFields: e.target.value }))} className="w-full p-2 border rounded-lg" dir="ltr" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">سورت فیلدها (ORDER BY)</label>
                  <input type="text" value={form.sortFields} onChange={e => setForm(f => ({ ...f, sortFields: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="created_at DESC" dir="ltr" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <h2 className="font-bold mb-3">نمایش و رفتار</h2>
                <div className="space-y-2 text-sm">
                  {[
                    { key: 'showColumnFilter', label: 'نمایش دکمه فیلتر هر ستون' },
                    { key: 'showTitleBar', label: 'نمایش نوار عنوان گزارش' },
                    { key: 'showVerticalScroll', label: 'نمایش نوار پیمایش عمودی' },
                    { key: 'showHorizontalScroll', label: 'نمایش نوار پیمایش افقی' },
                    { key: 'showGroupingPanel', label: 'نمایش پنل گروه‌بندی' },
                    { key: 'allowReportFilter', label: 'امکان فیلتر گزارش' },
                    { key: 'showFilterMenu', label: 'نمایش منوی فیلتر' },
                    { key: 'showRecordCountSetting', label: 'نمایش تنظیم تعداد رکوردها' },
                    { key: 'showInReportTree', label: 'نمایش در درخت گزارشات' },
                    { key: 'mergeSameValueColumns', label: 'ادغام ستون‌های هم‌مقدار' },
                    { key: 'rtl', label: 'راست به چپ' },
                    { key: 'shortenLongFields', label: 'کوتاه‌سازی فیلدهای طولانی' },
                    { key: 'openGroupsByDefault', label: 'باز کردن گروه‌بندی‌ها به‌صورت پیش‌فرض' },
                    { key: 'treeList', label: 'لیست درختی' },
                    { key: 'active', label: 'فعال' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!form.options[key as keyof ListReportDefinition['options']]} onChange={() => toggleOption(key as keyof ListReportDefinition['options'])} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <label className="block text-xs text-gray-500 mb-1">تعداد ردیف‌ها / سایز صفحه</label>
                <input type="number" min={1} max={1000} value={form.pageSize} onChange={e => setForm(f => ({ ...f, pageSize: Number(e.target.value) || 100 }))} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </div>
        <SqlQueryBuilderModal open={sqlModalOpen} onClose={() => setSqlModalOpen(false)} initialSql={form.querySql} onApplySql={handleApplySql} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">گزارشات لیستی</h1>
          </div>
          <button onClick={handleNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold">
            <Plus className="w-5 h-5" /> رکورد جدید
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          {definitions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>هنوز گزارشی تعریف نشده است.</p>
              <button onClick={handleNew} className="mt-4 px-4 py-2 rounded-lg bg-primary text-white">
                ایجاد اولین گزارش لیستی
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {definitions.map(item => (
                <li key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div>
                    <p className="font-medium">{item.title || '(بدون عنوان)'}</p>
                    <p className="text-xs text-gray-500">گروه: {item.groupName} — کلید: {item.uniqueKeyName}</p>
                  </div>
                  <button onClick={() => handleEdit(item)} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 flex items-center gap-2">
                    ویرایش
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
  );
};

export default ListReport;
