import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCcw, FileSpreadsheet, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

type ErrorRow = {
  id: string;
  created_at: string;
  user_name: string;
  action: string;
  details: string;
  ip_address: string;
};

const isErrorLike = (row: any) => {
  const text = `${row?.action || ''} ${row?.details || ''}`.toLowerCase();
  return (
    text.includes('error') ||
    text.includes('failed') ||
    text.includes('exception') ||
    text.includes('trace') ||
    text.includes('خطا') ||
    text.includes('ناموفق') ||
    text.includes('عدم موفقیت')
  );
};

export const SoftwareErrors: React.FC = () => {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('id, created_at, user_name, action, details, ip_address')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      const normalized = (data || [])
        .filter(isErrorLike)
        .map((r: any) => ({
          id: r.id,
          created_at: r.created_at ? new Date(r.created_at).toLocaleString('fa-IR') : '-',
          user_name: r.user_name || '-',
          action: r.action || '-',
          details: r.details || '-',
          ip_address: r.ip_address || '-',
        }));
      setRows(normalized);
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در دریافت لاگ خطاهای نرم‌افزار');
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
      `${r.created_at} ${r.user_name} ${r.action} ${r.details} ${r.ip_address}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        'زمان': r.created_at,
        'کاربر': r.user_name,
        'نوع خطا/رویداد': r.action,
        'جزئیات': r.details,
        'IP': r.ip_address,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'software_errors');
    XLSX.writeFile(wb, `software_errors_${Date.now()}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">خطاهای نرم‌افزار</h1>
            <p className="text-xs text-gray-500 mt-1">مشاهده و پایش خطاهای ثبت‌شده در لاگ سیستم</p>
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

      {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{errorMsg}</div>}

      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-gray-700 dark:text-gray-200">تعداد خطاها: {filtered.length}</div>
          <div className="relative w-72">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در خطاها..."
              className="w-full pr-9 pl-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 outline-none"
            />
          </div>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-sm text-right">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3">زمان</th>
                <th className="p-3">کاربر</th>
                <th className="p-3">نوع خطا/رویداد</th>
                <th className="p-3">جزئیات</th>
                <th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="p-3 whitespace-nowrap">{r.created_at}</td>
                    <td className="p-3 whitespace-nowrap">{r.user_name}</td>
                    <td className="p-3 whitespace-nowrap">{r.action}</td>
                    <td className="p-3 min-w-[360px]">{r.details}</td>
                    <td className="p-3 whitespace-nowrap ltr text-left">{r.ip_address}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-10 text-center text-gray-400" colSpan={5}>
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

export default SoftwareErrors;
