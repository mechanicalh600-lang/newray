import React, { useEffect, useMemo, useState } from 'react';
import { Save, Plus, Trash2, RefreshCw, FileSpreadsheet, AlertTriangle } from 'lucide-react';

import { supabase } from '../supabaseClient';
import { ORDERED_TABS, TABLE_LABELS, EntityType } from './admin/adminConfig';

type ImportProfile = {
  id?: string;
  title: string;
  module_key: string;
  target_table: string;
  config_json: any;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

const LOCAL_FALLBACK_KEY = 'import_tool_profiles_v1';

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const defaultConfig = (moduleKey: string) => ({
  referenceQueries: [],
  mappings: [],
  dependencyRules: [],
  batchSize: 200,
  moduleKey,
});

const normalizeRecord = (raw: any): ImportProfile => ({
  id: raw.id,
  title: raw.title || '',
  module_key: raw.module_key || '',
  target_table: raw.target_table || raw.module_key || '',
  config_json: raw.config_json || defaultConfig(raw.module_key || ''),
  is_active: raw.is_active !== false,
  notes: raw.notes || '',
  created_at: raw.created_at,
  updated_at: raw.updated_at,
});

const getProfileScopeLabel = (moduleKey: string, targetTable: string) => {
  const moduleValue = (moduleKey || '').trim();
  const tableValue = (targetTable || '').trim();
  if (!moduleValue && !tableValue) return '-';
  if (!tableValue || moduleValue === tableValue) return moduleValue || tableValue;
  if (!moduleValue) return tableValue;
  return `${moduleValue} / ${tableValue}`;
};

export const DataEntryToolSettings: React.FC = () => {
  const [profiles, setProfiles] = useState<ImportProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ImportProfile>({
    title: 'پروفایل تجهیزات',
    module_key: 'equipment',
    target_table: 'equipment',
    config_json: defaultConfig('equipment'),
    is_active: true,
    notes: '',
  });
  const [configText, setConfigText] = useState<string>(JSON.stringify(defaultConfig('equipment'), null, 2));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [usingFallback, setUsingFallback] = useState(false);

  const moduleOptions = useMemo(
    () =>
      ORDERED_TABS.map((id: EntityType) => ({
        value: id,
        label: TABLE_LABELS[id],
      })),
    []
  );

  const loadProfiles = async () => {
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const { data, error } = await supabase
        .from('import_tool_profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(normalizeRecord);
      setProfiles(list);
      setUsingFallback(false);
      if (list.length > 0) {
        const first = list[0];
        setSelectedId(first.id || null);
        setForm(first);
        setConfigText(JSON.stringify(first.config_json || {}, null, 2));
      }
    } catch (err: any) {
      const local = safeParse<ImportProfile[]>(localStorage.getItem(LOCAL_FALLBACK_KEY), []);
      setProfiles(local);
      setUsingFallback(true);
      setErrorMsg(
        `جدول import_tool_profiles در دسترس نیست. برای ادامه موقت از LocalStorage استفاده می‌شود. جزئیات: ${err?.message || 'unknown'}`
      );
      if (local.length > 0) {
        const first = normalizeRecord(local[0]);
        setSelectedId(first.id || null);
        setForm(first);
        setConfigText(JSON.stringify(first.config_json || {}, null, 2));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleNew = () => {
    const next: ImportProfile = {
      title: 'پروفایل جدید',
      module_key: 'equipment',
      target_table: 'equipment',
      config_json: defaultConfig('equipment'),
      is_active: true,
      notes: '',
    };
    setSelectedId(null);
    setForm(next);
    setConfigText(JSON.stringify(next.config_json, null, 2));
  };

  const handlePick = (item: ImportProfile) => {
    setSelectedId(item.id || null);
    setForm(item);
    setConfigText(JSON.stringify(item.config_json || {}, null, 2));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const parsed = JSON.parse(configText || '{}');
      const payload: ImportProfile = {
        ...form,
        config_json: parsed,
      };

      if (usingFallback) {
        const current = safeParse<ImportProfile[]>(localStorage.getItem(LOCAL_FALLBACK_KEY), []);
        const upsertId = payload.id || `local-${Date.now()}`;
        const next = [
          ...current.filter((p) => p.id !== upsertId),
          { ...payload, id: upsertId, updated_at: new Date().toISOString() },
        ];
        localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(next));
        setStatusMsg('پروفایل در LocalStorage ذخیره شد.');
        await loadProfiles();
        return;
      }

      if (payload.is_active) {
        await supabase.from('import_tool_profiles').update({ is_active: false }).eq('module_key', payload.module_key);
      }

      if (payload.id) {
        const { error } = await supabase
          .from('import_tool_profiles')
          .update({
            title: payload.title,
            module_key: payload.module_key,
            target_table: payload.target_table,
            config_json: payload.config_json,
            notes: payload.notes || null,
            is_active: payload.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('import_tool_profiles').insert([
          {
            title: payload.title,
            module_key: payload.module_key,
            target_table: payload.target_table,
            config_json: payload.config_json,
            notes: payload.notes || null,
            is_active: payload.is_active,
          },
        ]);
        if (error) throw error;
      }

      setStatusMsg('پروفایل با موفقیت ذخیره شد.');
      await loadProfiles();
    } catch (err: any) {
      setErrorMsg(`خطا در ذخیره پروفایل: ${err?.message || 'invalid config json'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!window.confirm('این پروفایل حذف شود؟')) return;
    setSaving(true);
    setErrorMsg('');
    try {
      if (usingFallback) {
        const current = safeParse<ImportProfile[]>(localStorage.getItem(LOCAL_FALLBACK_KEY), []);
        const next = current.filter((p) => p.id !== form.id);
        localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(next));
      } else {
        const { error } = await supabase.from('import_tool_profiles').delete().eq('id', form.id);
        if (error) throw error;
      }
      setStatusMsg('پروفایل حذف شد.');
      handleNew();
      await loadProfiles();
    } catch (err: any) {
      setErrorMsg(`خطا در حذف: ${err?.message || 'unknown'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 pb-20">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">تنظیمات ابزار ورود اطلاعات</h1>
            <p className="text-xs text-gray-500 mt-1">
              تعریف پروفایل import برای دانلود نمونه اکسل وابستگی‌دار و نگاشت هوشمند ستون‌ها
            </p>
          </div>
        </div>
      </div>

      {usingFallback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          جدول Supabase برای پروفایل‌ها هنوز آماده نیست. ذخیره‌ها فعلا لوکال هستند.
        </div>
      )}

      {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{errorMsg}</div>}
      {statusMsg && <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 p-3 text-sm">{statusMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">پروفایل‌ها</h2>
            <button onClick={loadProfiles} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="بازخوانی">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <button onClick={handleNew} className="w-full mb-3 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-sm font-bold hover:bg-cyan-100">
            <span className="inline-flex items-center gap-1">
              <Plus className="w-4 h-4" />
              پروفایل جدید
            </span>
          </button>
          <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
            {profiles.map((item) => (
              <button
                key={item.id || `${item.module_key}-${item.title}`}
                onClick={() => handlePick(item)}
                className={`w-full text-right p-3 rounded-xl border text-sm ${
                  selectedId === item.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-bold">{item.title || 'بدون عنوان'}</div>
                <div className="text-xs text-gray-500 mt-1">{getProfileScopeLabel(item.module_key, item.target_table)}</div>
                {item.is_active && <div className="mt-1 text-[10px] text-green-700 bg-green-100 inline-block px-2 py-0.5 rounded">فعال</div>}
              </button>
            ))}
            {!profiles.length && <div className="text-xs text-gray-400 text-center py-6">پروفایلی ثبت نشده است.</div>}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">عنوان پروفایل</label>
              <input
                className="w-full p-2 border rounded-xl text-sm"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">ماژول هدف</label>
              <select
                className="w-full p-2 border rounded-xl text-sm"
                value={form.module_key}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    module_key: e.target.value,
                    target_table: prev.target_table || e.target.value,
                  }))
                }
              >
                {moduleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">جدول هدف (DB)</label>
              <input
                className="w-full p-2 border rounded-xl text-sm ltr text-left"
                value={form.target_table}
                onChange={(e) => setForm((prev) => ({ ...prev, target_table: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                فعال برای این ماژول
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">توضیحات</label>
            <textarea
              className="w-full p-2 border rounded-xl text-sm min-h-20"
              value={form.notes || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              تنظیمات JSON (Queryها، Mappingها و Ruleها)
            </label>
            <textarea
              className="w-full p-3 border rounded-xl text-xs ltr text-left font-mono min-h-[320px]"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <button
              onClick={handleDelete}
              disabled={!form.id || saving}
              className="px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 text-sm font-bold inline-flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              حذف پروفایل
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-red-900 disabled:opacity-50 text-sm font-bold inline-flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              ذخیره پروفایل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataEntryToolSettings;
