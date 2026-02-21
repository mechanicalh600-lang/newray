import React, { useEffect, useMemo, useState } from 'react';
import { History, RefreshCcw, FileSpreadsheet, Search, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

type AuditRow = {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string;
  changed_at: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
};

type ChangeItem = {
  id: string;
  table: string;
  record_id: string;
  operation: string;
  changed_by: string;
  changed_at: string;
  changed_fields: string[];
  summary: string;
};

const tableLabel = (name: string) => {
  const labels: Record<string, string> = {
    user_groups: 'گروه‌های کاربری',
    personnel: 'پرسنل',
    org_chart: 'چارت سازمانی',
    equipment_classes: 'کلاس تجهیزات',
    equipment_groups: 'گروه تجهیزات',
    equipment: 'تجهیزات',
    parts: 'قطعات',
    activity_cards: 'کارت فعالیت‌ها',
    work_orders: 'دستورکارها',
    shift_reports: 'گزارشات شیفت',
    lab_reports: 'گزارشات آزمایشگاه',
    warehouse_reports: 'گزارشات انبار',
  };
  return labels[name] || name;
};

export const DataChangeTracking: React.FC = () => {
  const [rows, setRows] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [auditEnabled, setAuditEnabled] = useState(true);

  const summarizeChanges = (oldData: Record<string, any> | null, newData: Record<string, any> | null, operation: string) => {
    if (operation === 'INSERT') {
      const fields = Object.keys(newData || {});
      return {
        changedFields: fields,
        summary: fields.length ? `ایجاد رکورد با ${fields.length} فیلد` : 'ایجاد رکورد',
      };
    }
    if (operation === 'DELETE') {
      const fields = Object.keys(oldData || {});
      return {
        changedFields: fields,
        summary: 'حذف رکورد',
      };
    }

    const oldObj = oldData || {};
    const newObj = newData || {};
    const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    const changed = keys.filter((k) => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]));
    return {
      changedFields: changed,
      summary: changed.length ? `ویرایش ${changed.length} فیلد` : 'ویرایش بدون تغییر محسوس',
    };
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('data_change_audit')
        .select('id, table_name, record_id, operation, changed_by, changed_at, old_data, new_data')
        .order('changed_at', { ascending: false })
        .limit(2000);
      if (error) throw error;

      const mapped = ((data || []) as AuditRow[]).map((r) => {
        const details = summarizeChanges(r.old_data, r.new_data, r.operation);
        return {
          id: r.id,
          table: r.table_name,
          record_id: r.record_id || '-',
          operation: r.operation,
          changed_by: r.changed_by || '-',
          changed_at: r.changed_at ? new Date(r.changed_at).toLocaleString('fa-IR') : '-',
          changed_fields: details.changedFields,
          summary: details.summary,
        } as ChangeItem;
      });
      setAuditEnabled(true);
      setRows(mapped);
    } catch (err: any) {
      setAuditEnabled(false);
      setErrorMsg('جدول audit هنوز فعال نیست یا دسترسی ندارد. اسکریپت SQL ردیابی تغییرات را اجرا کنید.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      `${r.table} ${r.record_id} ${r.operation} ${r.changed_by} ${r.changed_at} ${r.summary} ${r.changed_fields.join(' ')}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        'جدول': tableLabel(r.table),
        'عملیات': r.operation,
        'شناسه رکورد': r.record_id,
        'تغییردهنده': r.changed_by,
        'زمان تغییر': r.changed_at,
        'خلاصه': r.summary,
        'فیلدهای تغییر یافته': r.changed_fields.join(', '),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'data_changes');
    XLSX.writeFile(wb, `data_changes_${Date.now()}.xlsx`);
  };

  return (
    <div className="w-full max-w-full space-y-6 pb-20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
            <History className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ردیابی تغییرات اطلاعات</h1>
            <p className="text-xs text-gray-500 mt-1">نمایش کامل تغییرات با Audit واقعی (Insert/Update/Delete)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-bold inline-flex items-center gap-1"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            بروزرسانی
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-sm font-bold inline-flex items-center gap-1"
          >
            <FileSpreadsheet className="w-4 h-4" />
            خروجی اکسل
          </button>
        </div>
      </div>

      {!auditEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm inline-flex items-center gap-2">
          <Info className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-gray-700 dark:text-gray-200">تعداد رویدادها: {filtered.length}</div>
          <div className="relative w-72">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در تغییرات..."
              className="w-full pr-9 pl-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 outline-none"
            />
          </div>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-sm text-right">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3">جدول</th>
                <th className="p-3">عملیات</th>
                <th className="p-3">شناسه رکورد</th>
                <th className="p-3">تغییردهنده</th>
                <th className="p-3">زمان تغییر</th>
                <th className="p-3">خلاصه</th>
                <th className="p-3">فیلدهای تغییر یافته</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length > 0 ? (
                filtered.map((r, idx) => (
                  <tr key={`${r.table}-${r.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="p-3 whitespace-nowrap">{tableLabel(r.table)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        r.operation === 'UPDATE'
                          ? 'bg-amber-100 text-amber-700'
                          : r.operation === 'DELETE'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {r.operation}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap ltr text-left">{r.record_id}</td>
                    <td className="p-3 whitespace-nowrap">{r.changed_by}</td>
                    <td className="p-3 whitespace-nowrap">{r.changed_at}</td>
                    <td className="p-3 min-w-[220px]">{r.summary}</td>
                    <td className="p-3 min-w-[260px] text-xs">{r.changed_fields.join(', ') || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-10 text-center text-gray-400" colSpan={7}>
                    {loading ? 'در حال دریافت...' : 'موردی یافت نشد'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataChangeTracking;
