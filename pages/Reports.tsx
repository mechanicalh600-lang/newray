
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, BarChart, FileSpreadsheet, Filter, RefreshCcw, 
  CheckSquare, Square, ChevronDown, ChevronUp, 
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { parseShamsiDate, getShamsiDate } from '../utils';

// Expanded Data Sources
type DataSource = 'LOGINS' | 'WORK_ORDERS' | 'PARTS' | 'SHIFT_REPORTS' | 'LAB_REPORTS' | 'WAREHOUSE';

interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
}

type SourceHealth = {
  status: 'checking' | 'ok' | 'error';
  message?: string;
};

export const Reports: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<DataSource>('SHIFT_REPORTS');
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const today = getShamsiDate();
  const parts = today.split('/');
  const firstOfMonth = `${parts[0]}/${parts[1]}/01`;
  const [filterDateFrom, setFilterDateFrom] = useState(firstOfMonth);
  const [filterDateTo, setFilterDateTo] = useState(today);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [chartAxisX, setChartAxisX] = useState('');
  const [chartAxisY, setChartAxisY] = useState('count');
  const [sourceHealth, setSourceHealth] = useState<Record<DataSource, SourceHealth>>({
    LOGINS: { status: 'checking' },
    WORK_ORDERS: { status: 'checking' },
    PARTS: { status: 'checking' },
    SHIFT_REPORTS: { status: 'checking' },
    LAB_REPORTS: { status: 'checking' },
    WAREHOUSE: { status: 'checking' },
  });
  // Definition of available columns per source
  const sourceDefinitions: Record<DataSource, ColumnDef[]> = {
    LOGINS: [
      { id: 'user_name', label: 'نام کاربر', visible: true },
      { id: 'personnel_code', label: 'کد پرسنلی', visible: true },
      { id: 'action', label: 'نوع عملیات', visible: true },
      { id: 'created_at', label: 'زمان', visible: true },
      { id: 'ip_address', label: 'آدرس IP', visible: true },
      { id: 'details', label: 'جزئیات', visible: false },
    ],
    WORK_ORDERS: [
      { id: 'tracking_code', label: 'کد پیگیری', visible: true },
      { id: 'title', label: 'عنوان', visible: true },
      { id: 'requester', label: 'درخواست کننده', visible: true },
      { id: 'created_at', label: 'تاریخ ثبت', visible: true },
      { id: 'status', label: 'وضعیت', visible: true },
      { id: 'equip_name', label: 'تجهیز', visible: true },
      { id: 'failure_desc', label: 'شرح خرابی', visible: false },
    ],
    PARTS: [
      { id: 'tracking_code', label: 'کد درخواست', visible: true },
      { id: 'requester_name', label: 'درخواست کننده', visible: true },
      { id: 'request_date', label: 'تاریخ درخواست', visible: true },
      { id: 'description', label: 'توضیحات/علت', visible: true },
      { id: 'work_order_code', label: 'دستور کار', visible: true },
      { id: 'status', label: 'وضعیت', visible: true },
    ],
    SHIFT_REPORTS: [
      { id: 'tracking_code', label: 'کد گزارش', visible: true },
      { id: 'shift_date', label: 'تاریخ شیفت', visible: true },
      { id: 'created_at', label: 'تاریخ ثبت', visible: true },
      { id: 'shift_name', label: 'شیفت', visible: true },
      { id: 'supervisor_name', label: 'سرپرست شیفت', visible: true },
      { id: 'total_production_a', label: 'خوراک خط A', visible: true },
      { id: 'total_production_b', label: 'خوراک خط B', visible: true },
    ],
    LAB_REPORTS: [
      { id: 'tracking_code', label: 'کد گزارش', visible: true },
      { id: 'report_date', label: 'تاریخ گزارش', visible: true },
      { id: 'created_at', label: 'تاریخ ثبت', visible: true },
      { id: 'sample_code', label: 'کد نمونه', visible: true },
      { id: 'fe_percent', label: 'Fe %', visible: true },
      { id: 'feo_percent', label: 'FeO %', visible: true },
      { id: 's_percent', label: 'S %', visible: true },
    ],
    WAREHOUSE: [
      { id: 'tracking_code', label: 'کد رهگیری', visible: true },
      { id: 'report_date', label: 'تاریخ سند', visible: true },
      { id: 'created_at', label: 'تاریخ ثبت', visible: true },
      { id: 'type', label: 'نوع تراکنش', visible: true },
      { id: 'part_name', label: 'نام کالا', visible: true },
      { id: 'qty', label: 'تعداد', visible: true },
      { id: 'receiver_name', label: 'تحویل گیرنده', visible: true },
    ]
  };

  const numericColumns: Record<DataSource, string[]> = {
    LOGINS: [],
    WORK_ORDERS: [],
    PARTS: [],
    SHIFT_REPORTS: ['total_production_a', 'total_production_b'],
    LAB_REPORTS: ['fe_percent', 'feo_percent', 's_percent'],
    WAREHOUSE: ['qty'],
  };

  const getSourceLabel = (src: DataSource) => {
    if (src === 'LOGINS') return 'لاگ‌های ورود و خروج';
    if (src === 'WORK_ORDERS') return 'دستور کارها';
    if (src === 'PARTS') return 'درخواست‌های قطعه';
    if (src === 'SHIFT_REPORTS') return 'گزارشات شیفت';
    if (src === 'LAB_REPORTS') return 'گزارشات آزمایشگاه';
    return 'تراکنش‌های انبار';
  };

  const getStatusLamp = (src: DataSource) => {
    const status = sourceHealth[src]?.status;
    if (status === 'ok') return '🟢';
    if (status === 'error') return '🔴';
    return '🟡';
  };

  useEffect(() => {
    const now = getShamsiDate();
    const p = now.split('/');
    setFilterDateFrom(`${p[0]}/${p[1]}/01`);
    setFilterDateTo(now);
    setSortConfig(null);
    const cols = sourceDefinitions[selectedSource];
    setColumns(cols);
    const defX = selectedSource === 'LOGINS' || selectedSource === 'WORK_ORDERS' ? 'created_at'
      : selectedSource === 'PARTS' ? 'request_date'
      : selectedSource === 'SHIFT_REPORTS' ? 'shift_date'
      : 'report_date';
    setChartAxisX(defX);
    const numCols = numericColumns[selectedSource];
    setChartAxisY(prev => (prev === 'count' || numCols.includes(prev)) ? prev : 'count');
    loadData();
  }, [selectedSource]);

  useEffect(() => {
    checkSourcesHealth();
  }, []);

  const normalizeDateTime = (item: any, timeFirst = false) => {
    const raw =
      item?.created_at ||
      item?.createdAt ||
      item?.timestamp ||
      item?.at ||
      (item?.date && item?.time ? `${item.date} ${item.time}` : item?.date || '');
    if (!raw) return '';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return String(raw);
    if (timeFirst) {
      const timePart = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const datePart = dt.toLocaleDateString('fa-IR');
      return `${timePart}｜${datePart}`;
    }
    return dt.toLocaleString('fa-IR');
  };

  const getDeepValues = (obj: any): string => {
      if (obj === null || obj === undefined) return '';
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
      if (Array.isArray(obj)) return obj.map(getDeepValues).join(' ');
      if (typeof obj === 'object') return Object.values(obj).map(getDeepValues).join(' ');
      return '';
  };

  useEffect(() => {
    let result = data;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => {
        const allValues = getDeepValues(item).toLowerCase();
        return allValues.includes(lower);
      });
    }
    if (filterDateFrom || filterDateTo) {
      const fromTs = filterDateFrom ? (parseShamsiDate(filterDateFrom)?.getTime() ?? 0) : 0;
      const toTs = filterDateTo ? (parseShamsiDate(filterDateTo)?.getTime() ?? Infinity) : Infinity;
      const toEndOfDay = (ts: number) => ts + 24 * 60 * 60 * 1000 - 1;
      result = result.filter(item => {
        const itemTs = item._dateForFilter;
        if (isNaN(itemTs)) return false;
        if (fromTs && itemTs < fromTs) return false;
        if (filterDateTo && itemTs > toEndOfDay(toTs)) return false;
        return true;
      });
    }
    setFilteredData(result);
    setCurrentPage(1);
  }, [searchTerm, filterDateFrom, filterDateTo, data]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    let rawData: any[] = [];
    
    try {
        switch (selectedSource) {
          case 'LOGINS':
            // Fetch all columns for compatibility with old/new schema variants.
            const { data: logs, error: logsError } = await supabase
                .from('system_logs')
                .select('*');
            if (logsError) {
              if (String(logsError.message || '').includes('relation') || logsError.code === '42P01') {
                throw new Error('جدول system_logs در دیتابیس وجود ندارد. لطفا اسکریپت ساخت/مهاجرت لاگ‌ها را اجرا کنید.');
              }
              throw logsError;
            }
            rawData = (logs || []).map(l => ({
              user_name: l.user_name || l.userName || l.username || '-',
              personnel_code: l.personnel_code || l.personnelCode || '-',
              action: l.action || l.event || '-',
              created_at: normalizeDateTime(l, true),
              ip_address: l.ip_address || l.ip || '-',
              details: l.details || l.description || '',
            }))
            .sort((a, b) => {
              const ad = new Date(a.created_at).getTime();
              const bd = new Date(b.created_at).getTime();
              if (Number.isNaN(ad) && Number.isNaN(bd)) return 0;
              if (Number.isNaN(ad)) return 1;
              if (Number.isNaN(bd)) return -1;
              return bd - ad;
            });
            break;

          case 'WORK_ORDERS':
            {
              const { data: wos, error: woError } = await supabase
                  .from('work_orders')
                  .select('tracking_code, request_date, requester_name, status, equipment_name, failure_description, created_at')
                  .order('created_at', { ascending: false });

              if (!woError) {
                rawData = (wos || []).map((wo: any) => ({
                  tracking_code: wo.tracking_code || '-',
                  title: wo.equipment_name || '-',
                  requester: wo.requester_name || '-',
                  created_at: normalizeDateTime(wo) || wo.request_date || '-',
                  status:
                    wo.status === 'DONE' || wo.status === 'FINISHED'
                      ? 'تکمیل شده'
                      : wo.status === 'REQUEST'
                      ? 'درخواست'
                      : 'در حال انجام',
                  equip_name: wo.equipment_name || '-',
                  failure_desc: wo.failure_description || '-',
                }));
                break;
              }

              // Fallback for older deployments that stored work orders in cartable_items.
              const { data: legacyWos, error: legacyWoError } = await supabase
                .from('cartable_items')
                .select('tracking_code, title, created_at, status, data')
                .eq('module', 'WORK_ORDER')
                .order('created_at', { ascending: false });
              if (legacyWoError) throw legacyWoError;
              rawData = (legacyWos || []).map((wo: any) => {
                const d = wo.data || {};
                return {
                  tracking_code: wo.tracking_code,
                  title: wo.title,
                  requester: d.requester || '-',
                  created_at: normalizeDateTime(wo),
                  status: wo.status === 'DONE' ? 'تکمیل شده' : 'در حال انجام',
                  equip_name: d.equipName || d.equipLocalName || '-',
                  failure_desc: d.failureDesc || '-'
                };
              });
            }
            break;

          case 'PARTS':
            const { data: parts, error: partsError } = await supabase
                .from('part_requests')
                .select('tracking_code, requester_name, request_date, description, work_order_code, status')
                .order('created_at', { ascending: false });
            if (partsError) throw partsError;
            rawData = (parts || []).map(p => ({
                ...p,
                status:
                  p.status === 'PENDING'
                    ? 'در انتظار تایید'
                    : p.status === 'REJECTED'
                    ? 'رد شده'
                    : 'تایید شده'
            }));
            break;

          case 'SHIFT_REPORTS':
            const { data: shifts, error: shiftError } = await supabase
                .from('shift_reports')
                .select('tracking_code, shift_date, shift_name, supervisor_name, total_production_a, total_production_b, created_at')
                .order('created_at', { ascending: false });
            if (shiftError) throw shiftError;
            rawData = (shifts || []).map((s: any) => ({
              ...s,
              created_at: s.created_at ? (() => {
                const dt = new Date(s.created_at);
                if (Number.isNaN(dt.getTime())) return '-';
                const time = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const date = dt.toLocaleDateString('fa-IR');
                return `${time} | ${date}`;
              })() : '-',
            }));
            break;

          case 'LAB_REPORTS':
            const { data: labs, error: labsError } = await supabase
                .from('lab_reports')
                .select('tracking_code, report_date, sample_code, fe_percent, feo_percent, s_percent, created_at')
                .order('created_at', { ascending: false });
            if (labsError) throw labsError;
            rawData = (labs || []).map((l: any) => ({
              ...l,
              created_at: l.created_at ? (() => {
                const dt = new Date(l.created_at);
                if (Number.isNaN(dt.getTime())) return '-';
                const time = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const date = dt.toLocaleDateString('fa-IR');
                return `${time} | ${date}`;
              })() : '-',
            }));
            break;

          case 'WAREHOUSE':
            const { data: warehouse, error: warehouseError } = await supabase
                .from('warehouse_reports')
                .select('tracking_code, report_date, type, qty, receiver_name, created_at, parts(name)')
                .order('created_at', { ascending: false });
            const fmtCreatedAt = (raw: string) => {
              if (!raw) return '-';
              const dt = new Date(raw);
              if (Number.isNaN(dt.getTime())) return '-';
              const time = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const date = dt.toLocaleDateString('fa-IR');
              return `${time} | ${date}`;
            };
            if (warehouseError) {
              const { data: simpleWarehouse, error: simpleWarehouseError } = await supabase
                .from('warehouse_reports')
                .select('tracking_code, report_date, type, qty, receiver_name, created_at')
                .order('created_at', { ascending: false });
              if (simpleWarehouseError) throw simpleWarehouseError;
              rawData = (simpleWarehouse || []).map((w: any) => ({
                tracking_code: w.tracking_code,
                report_date: w.report_date,
                type: w.type === 'ENTRY' ? 'ورود' : w.type === 'EXIT' ? 'خروج' : w.type || '-',
                qty: w.qty,
                receiver_name: w.receiver_name,
                part_name: '---',
                created_at: fmtCreatedAt(w.created_at),
              }));
              break;
            }
            rawData = (warehouse || []).map((w: any) => ({
                tracking_code: w.tracking_code,
                report_date: w.report_date,
                type: w.type === 'ENTRY' ? 'ورود' : w.type === 'EXIT' ? 'خروج' : w.type || '-',
                qty: w.qty,
                receiver_name: w.receiver_name,
                part_name: w.parts?.name || '---',
                created_at: fmtCreatedAt(w.created_at),
            }));
            break;
        }
    } catch (error: any) {
        console.error("Error fetching report data:", error);
        setErrorMsg(error?.message || 'خطا در دریافت اطلاعات گزارش');
        rawData = [];
    } finally {
        setLoading(false);
    }

    const dateKey = selectedSource === 'LOGINS' || selectedSource === 'WORK_ORDERS' ? 'created_at' 
      : selectedSource === 'PARTS' ? 'request_date' 
      : selectedSource === 'SHIFT_REPORTS' ? 'shift_date' 
      : 'report_date';
    const persianToAscii = (s: string) => s.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
    const withDateFilter = rawData.map((item: any) => {
      const raw = item[dateKey];
      let ts = NaN;
      if (raw) {
        let toParse = typeof raw === 'string' ? raw : String(raw);
        if (toParse.includes('｜')) toParse = toParse.split('｜')[1]?.trim() || toParse;
        toParse = persianToAscii(toParse);
        const d = /^\d{4}\/\d{1,2}\/\d{1,2}/.test(toParse) ? parseShamsiDate(toParse) : new Date(raw);
        ts = d && !isNaN((d as Date).getTime()) ? (d as Date).getTime() : NaN;
      }
      return { ...item, _dateForFilter: ts };
    });
    setData(withDateFilter);
    setFilteredData(withDateFilter);
  };

  const probeSourceHealth = async (source: DataSource): Promise<SourceHealth> => {
    try {
      switch (source) {
        case 'LOGINS': {
          const { error } = await supabase.from('system_logs').select('*').limit(1);
          if (error) throw error;
          return { status: 'ok' };
        }
        case 'WORK_ORDERS': {
          const { error } = await supabase.from('work_orders').select('id').limit(1);
          if (error) {
            const { error: legacyError } = await supabase.from('cartable_items').select('id').eq('module', 'WORK_ORDER').limit(1);
            if (legacyError) throw legacyError;
          }
          return { status: 'ok' };
        }
        case 'PARTS': {
          const { error } = await supabase.from('part_requests').select('id').limit(1);
          if (error) throw error;
          return { status: 'ok' };
        }
        case 'SHIFT_REPORTS': {
          const { error } = await supabase.from('shift_reports').select('id').limit(1);
          if (error) throw error;
          return { status: 'ok' };
        }
        case 'LAB_REPORTS': {
          const { error } = await supabase.from('lab_reports').select('id').limit(1);
          if (error) throw error;
          return { status: 'ok' };
        }
        case 'WAREHOUSE': {
          const { error } = await supabase.from('warehouse_reports').select('id').limit(1);
          if (error) throw error;
          return { status: 'ok' };
        }
        default:
          return { status: 'error', message: 'Unknown source' };
      }
    } catch (err: any) {
      return { status: 'error', message: err?.message || 'خطای اتصال' };
    }
  };

  const checkSourcesHealth = async () => {
    setSourceHealth({
      LOGINS: { status: 'checking' },
      WORK_ORDERS: { status: 'checking' },
      PARTS: { status: 'checking' },
      SHIFT_REPORTS: { status: 'checking' },
      LAB_REPORTS: { status: 'checking' },
      WAREHOUSE: { status: 'checking' },
    });
    const sources: DataSource[] = ['LOGINS', 'WORK_ORDERS', 'PARTS', 'SHIFT_REPORTS', 'LAB_REPORTS', 'WAREHOUSE'];
    const results = await Promise.all(sources.map(async (s) => ({ source: s, health: await probeSourceHealth(s) })));
    setSourceHealth((prev) => {
      const next = { ...prev };
      results.forEach(({ source, health }) => {
        next[source] = health;
      });
      return next;
    });
  };

  const toggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c));
  };

  const handleExport = () => {
    if (filteredData.length === 0) return alert('داده‌ای برای خروجی وجود ندارد');
    
    const visibleCols = columns.filter(c => c.visible);
    
    const rows = filteredData.map(item => {
        const row: any = {};
        visibleCols.forEach(col => {
            row[col.label] = item[col.id] || '-';
        });
        return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report_${selectedSource}_${Date.now()}.xlsx`);
  };

  // Prepare Chart Data based on selected axes
  const getChartData = () => {
      if (filteredData.length === 0) return [];
      const xKey = chartAxisX || columns[0]?.id || 'report_date';
      const yKey = chartAxisY;

      const agg: Record<string, number> = {};
      filteredData.forEach(item => {
          const val = String(item[xKey] ?? 'نامشخص');
          if (yKey === 'count') {
            agg[val] = (agg[val] || 0) + 1;
          } else {
            const num = Number(item[yKey]);
            agg[val] = (agg[val] || 0) + (isNaN(num) ? 0 : num);
          }
      });

      return Object.keys(agg).map(k => ({ name: k, count: agg[k] })).slice(0, 15);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' as const : 'asc' as const };
      return { key, direction: 'asc' as const };
    });
    setCurrentPage(1);
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    let cmp = 0;
    if (!isNaN(aNum) && !isNaN(bNum)) {
      cmp = aNum - bNum;
    } else {
      cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'fa');
    }
    return sortConfig.direction === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

  // دایره‌های ریز نامنظم برای تزئین بک‌گراند
  const decorativeCircles = useMemo(() => {
    const circles: { left: string; top: string; size: number; opacity: number }[] = [];
    const rnd = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < 55; i++) {
      circles.push({
        left: `${(rnd(i * 7) * 96 + 2)}%`,
        top: `${(rnd(i * 11 + 1) * 93 + 2)}%`,
        size: 2 + Math.floor(rnd(i * 19 + 2) * 5),
        opacity: 0.12 + rnd(i * 31) * 0.4,
      });
    }
    return circles;
  }, []);
  const start = (currentPage - 1) * rowsPerPage;
  const paginatedData = sortedData.slice(start, start + rowsPerPage);

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let page = parseInt(e.target.value);
    if (isNaN(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  return (
    <div className="relative min-h-[calc(100vh-6rem)]">
      {/* بک‌گراند کهکشان */}
      <div
        className="absolute inset-0 -z-[1] bg-cover bg-center bg-no-repeat rounded-2xl"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920)' }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-[1] bg-white/88 dark:bg-gray-900/92 rounded-2xl" aria-hidden />
      {/* دایره‌های ریز نامنظم */}
      <div className="absolute inset-0 -z-[1] overflow-hidden rounded-2xl pointer-events-none" aria-hidden>
        {decorativeCircles.map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-orange-400/60 dark:bg-amber-500/40"
            style={{
              left: c.left,
              top: c.top,
              width: c.size,
              height: c.size,
              opacity: c.opacity,
            }}
          />
        ))}
      </div>
      
      <div className="w-full max-w-full space-y-6 pb-20">
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
           <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
             <PieChart className="w-6 h-6 text-primary" />
           </div>
           <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">گزارش‌ساز پویا</h1>
              <p className="text-xs text-gray-500 mt-1">ساخت، مشاهده و خروجی گرفتن از داده‌های سیستم</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          {/* Controls Panel */}
          <div className="lg:col-span-1 flex flex-col">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">منبع داده</label>
                          <select 
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value as DataSource)}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none text-sm"
                          >
                              {(Object.keys(sourceDefinitions) as DataSource[]).map((src) => (
                                <option key={src} value={src}>
                                  {`${getStatusLamp(src)} ${getSourceLabel(src)}`}
                                </option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <button 
                            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                            className="flex items-center justify-between w-full text-xs font-bold text-gray-500 mb-2 hover:text-primary transition"
                          >
                             انتخاب ستون‌ها
                             {isOptionsOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                          </button>
                          
                          {isOptionsOpen && (
                              <div className="space-y-1 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg max-h-60 overflow-y-auto">
                                  {columns.map(col => (
                                      <div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded">
                                          {col.visible ? 
                                            <CheckSquare className="w-4 h-4 text-primary" /> : 
                                            <Square className="w-4 h-4 text-gray-400" />
                                          }
                                          <span className="text-sm">{col.label}</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-4">
                      <button
                        onClick={async () => { await checkSourcesHealth(); await loadData(); }}
                        className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition text-sm font-bold"
                      >
                          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
                      </button>
                      <button onClick={handleExport} className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg flex items-center justify-center gap-2 hover:bg-green-100 transition text-sm font-bold">
                          <FileSpreadsheet className="w-4 h-4" /> اکسل
                      </button>
                  </div>
              </div>

          </div>

          {/* Chart - هم‌ارتفاع با تنظیمات گزارش */}
          <div className="lg:col-span-3 flex flex-col">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm pl-2 pr-3 py-4 border border-gray-100 dark:border-gray-700 flex-1 flex flex-col min-h-0">
                   <h4 className="text-xs font-bold text-gray-500 mb-3 text-center shrink-0">نمودار توزیع فراوانی</h4>
                   <div className="flex-1 min-h-0 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={getChartData()} margin={{ top: 10, right: 8, bottom: 50, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={10} angle={-35} tickMargin={8} interval={0} tick={({ x, y, payload }) => (
                            <g transform={`translate(${Math.max(0, x - 30)}, ${y + 40})`}>
                              <text textAnchor="middle" fontSize={10} transform="rotate(-35 0 0)">{payload.value}</text>
                            </g>
                          )} />
                          <YAxis fontSize={10} tickMargin={6} tick={({ x, y, payload }) => (
                            <g transform={`translate(${x - 20}, ${y + 3})`}>
                              <text textAnchor="end" fontSize={10} x={0} y={0}>{payload?.value ?? payload}</text>
                            </g>
                          )} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#800020" radius={[4, 4, 0, 0]} />
                      </ReBarChart>
                   </ResponsiveContainer>
                   </div>
              </div>
          </div>

          {/* Results Panel - تمام عرض */}
          <div className="lg:col-span-4">
               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col min-h-[820px] max-h-[calc(100vh-8rem)]">
                   <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-l from-amber-50/80 via-gray-50 to-gray-50 dark:from-orange-950/30 dark:via-gray-900 dark:to-gray-900">
                       <h2 className="font-bold text-gray-700 dark:text-gray-200">پیش‌نمایش داده‌ها</h2>
                       <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-500">محور افقی</span>
                             <select
                               value={chartAxisX}
                               onChange={(e) => setChartAxisX(e.target.value)}
                               className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none min-w-[120px]"
                             >
                               {columns.map(col => (
                                 <option key={col.id} value={col.id}>{col.label}</option>
                               ))}
                             </select>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-500">محور عمودی</span>
                             <select
                               value={chartAxisY}
                               onChange={(e) => setChartAxisY(e.target.value)}
                               className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none min-w-[120px]"
                             >
                               <option value="count">تعداد</option>
                               {numericColumns[selectedSource].map(colId => {
                                 const col = columns.find(c => c.id === colId);
                                 return col ? <option key={colId} value={colId}>مجموع {col.label}</option> : null;
                               })}
                             </select>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-500">از تاریخ</span>
                             <ShamsiDatePicker value={filterDateFrom} onChange={setFilterDateFrom} disableFuture={true} />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-500">تا تاریخ</span>
                             <ShamsiDatePicker value={filterDateTo} onChange={setFilterDateTo} disableFuture={true} />
                          </div>
                          <div className="relative w-56">
                             <Filter className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                             <input 
                               type="text" 
                               placeholder="جستجو در نتایج..." 
                               value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}
                               className="w-full pr-9 pl-4 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-1 focus:ring-primary"
                             />
                          </div>
                       </div>
                   </div>
                   
                   <div className="flex-1 min-h-0 overflow-auto">
                       <table className="w-full text-right text-sm border-collapse">
                           <thead className="reports-table-header sticky top-0 z-10 shadow-md text-gray-800 dark:text-gray-200 border-b-2 border-orange-300/60 dark:border-orange-600/50">
                               <tr>
                                   {columns.filter(c => c.visible).map(col => (
                                       <th 
                                         key={col.id} 
                                         className="p-4 pl-10 pr-3 whitespace-nowrap cursor-pointer hover:text-primary select-none text-right align-middle min-w-[120px] border-l border-gray-200 dark:border-gray-600 last:border-l-0"
                                         onClick={() => handleSort(col.id)}
                                       >
                                         <div className="flex items-center justify-start gap-1 w-full" style={{ direction: 'rtl' }}>
                                           {col.label}
                                           <span className="text-gray-400 flex-shrink-0">
                                             {sortConfig?.key === col.id ? (
                                               sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                             ) : (
                                               <ArrowUpDown className="w-3 h-3 opacity-30" />
                                             )}
                                           </span>
                                         </div>
                                       </th>
                                   ))}
                               </tr>
                           </thead>
                           <tbody className="divide-y dark:divide-gray-600">
                               {paginatedData.length > 0 ? (
                                   paginatedData.map((item, idx) => (
                                       <tr key={start + idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${(start + idx) % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/70'}`}>
                                           {columns.filter(c => c.visible).map(col => (
                                               <td key={col.id} className="p-4 whitespace-nowrap text-gray-700 dark:text-gray-200 border-l border-gray-200 dark:border-gray-600 last:border-l-0">
                                                   {item[col.id] || '-'}
                                               </td>
                                           ))}
                                       </tr>
                                   ))
                               ) : (
                                   <tr>
                                       <td colSpan={columns.filter(c => c.visible).length} className="p-10 text-center text-gray-400">
                                           {loading ? 'در حال دریافت اطلاعات...' : 'داده‌ای یافت نشد'}
                                       </td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>

                   {/* فوتر مشابه SmartTable */}
                   <div className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
                       <div className="flex items-center gap-2 text-sm text-gray-500">
                           <span>نمایش</span>
                           <select 
                             value={rowsPerPage}
                             onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                             className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1 outline-none"
                           >
                               <option value={10}>10</option>
                               <option value={50}>50</option>
                               <option value={100}>100</option>
                               <option value={200}>200</option>
                           </select>
                           <span>ردیف در هر صفحه</span>
                           <span className="mr-2 px-2 border-r border-gray-300 dark:border-gray-600 font-bold">
                               مجموع: {filteredData.length} رکورد
                           </span>
                       </div>
                       <div className="flex items-center gap-1">
                           <button 
                             disabled={currentPage === 1} 
                             onClick={() => setCurrentPage(1)} 
                             className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                             title="اولین صفحه"
                           >
                               <ChevronsRight className="w-4 h-4 rtl:rotate-180"/>
                           </button>
                           <button 
                             disabled={currentPage === 1} 
                             onClick={() => setCurrentPage(p => p - 1)} 
                             className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                             title="صفحه قبل"
                           >
                               <ChevronRight className="w-4 h-4 rtl:rotate-180"/>
                           </button>
                           <div className="flex items-center gap-2 px-2">
                               <span className="text-sm font-medium">صفحه</span>
                               <input 
                                 type="number" 
                                 min={1} 
                                 max={totalPages} 
                                 value={currentPage} 
                                 onChange={handlePageInput}
                                 className="w-12 text-center p-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                               />
                               <span className="text-sm font-medium text-gray-500">از {totalPages}</span>
                           </div>
                           <button 
                             disabled={currentPage >= totalPages} 
                             onClick={() => setCurrentPage(p => p + 1)} 
                             className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                             title="صفحه بعد"
                           >
                               <ChevronLeft className="w-4 h-4 rtl:rotate-180"/>
                           </button>
                           <button 
                             disabled={currentPage >= totalPages} 
                             onClick={() => setCurrentPage(totalPages)} 
                             className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                             title="آخرین صفحه"
                           >
                               <ChevronsLeft className="w-4 h-4 rtl:rotate-180"/>
                           </button>
                       </div>
                   </div>
               </div>
          </div>
      </div>
    </div>
    </div>
  );
};

export default Reports;
