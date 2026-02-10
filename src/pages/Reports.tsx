
import React, { useState, useEffect } from 'react';
import { 
  PieChart, Settings, CheckSquare, Square, ChevronDown, ChevronUp, RefreshCcw, FileSpreadsheet
} from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
import { SmartTable } from '../components/SmartTable';
import * as XLSX from 'xlsx';

// Expanded Data Sources
type DataSource = 'LOGINS' | 'WORK_ORDERS' | 'PARTS' | 'SHIFT_REPORTS' | 'LAB_REPORTS' | 'WAREHOUSE';

interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
}

export const Reports: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<DataSource>('LOGINS');
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);

  // Definition of available columns per source
  const sourceDefinitions: Record<DataSource, ColumnDef[]> = {
    LOGINS: [
      { id: 'user_name', label: 'نام کاربر', visible: true },
      { id: 'personnel_code', label: 'کد پرسنلی', visible: true },
      { id: 'action', label: 'نوع عملیات', visible: true },
      { id: 'created_at', label: 'تاریخ و زمان', visible: true },
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
      { id: 'shift_date', label: 'تاریخ', visible: true },
      { id: 'shift_name', label: 'شیفت', visible: true },
      { id: 'supervisor_name', label: 'سرپرست', visible: true },
      { id: 'total_production_a', label: 'تولید خط A', visible: true },
      { id: 'total_production_b', label: 'تولید خط B', visible: true },
    ],
    LAB_REPORTS: [
      { id: 'tracking_code', label: 'کد گزارش', visible: true },
      { id: 'report_date', label: 'تاریخ', visible: true },
      { id: 'sample_code', label: 'کد نمونه', visible: true },
      { id: 'fe_percent', label: 'Fe %', visible: true },
      { id: 'feo_percent', label: 'FeO %', visible: true },
      { id: 's_percent', label: 'S %', visible: true },
    ],
    WAREHOUSE: [
      { id: 'tracking_code', label: 'کد رهگیری', visible: true },
      { id: 'report_date', label: 'تاریخ', visible: true },
      { id: 'type', label: 'نوع تراکنش', visible: true },
      { id: 'part_name', label: 'نام کالا', visible: true },
      { id: 'qty', label: 'تعداد', visible: true },
      { id: 'receiver_name', label: 'طرف حساب', visible: true },
    ]
  };

  useEffect(() => {
    loadData();
    setColumns(sourceDefinitions[selectedSource]);
  }, [selectedSource]);

  const loadData = async () => {
    setLoading(true);
    let rawData: any[] = [];
    
    try {
        switch (selectedSource) {
          case 'LOGINS':
            const { data: logs } = await supabase
                .from('system_logs')
                .select('id, user_name, personnel_code, action, created_at, ip_address, details')
                .order('created_at', { ascending: false });
            rawData = (logs || []).map(l => ({
                ...l,
                created_at: new Date(l.created_at).toLocaleString('fa-IR')
            }));
            break;

          case 'WORK_ORDERS':
            const { data: wos } = await supabase
                .from('cartable_items')
                .select('id, tracking_code, title, created_at, status, data')
                .eq('module', 'WORK_ORDER')
                .order('created_at', { ascending: false });
            rawData = (wos || []).map(wo => {
                const d = wo.data || {};
                return {
                    id: wo.id,
                    tracking_code: wo.tracking_code,
                    title: wo.title,
                    requester: d.requester || '-',
                    created_at: new Date(wo.created_at).toLocaleDateString('fa-IR'),
                    status: wo.status === 'DONE' ? 'تکمیل شده' : 'در حال انجام',
                    equip_name: d.equipName || d.equipLocalName || '-',
                    failure_desc: d.failureDesc || '-'
                };
            });
            break;

          case 'PARTS':
            const { data: parts } = await supabase
                .from('part_requests')
                .select('*')
                .order('created_at', { ascending: false });
            rawData = (parts || []).map(p => ({
                ...p,
                status: p.status === 'PENDING' ? 'در انتظار تایید' : 'تایید شده'
            }));
            break;

          case 'SHIFT_REPORTS':
            const { data: shifts } = await supabase
                .from('shift_reports')
                .select('*')
                .order('created_at', { ascending: false });
            rawData = shifts || [];
            break;

          case 'LAB_REPORTS':
            const { data: labs } = await supabase
                .from('lab_reports')
                .select('*')
                .order('created_at', { ascending: false });
            rawData = labs || [];
            break;

          case 'WAREHOUSE':
            const { data: warehouse } = await supabase
                .from('warehouse_reports')
                .select('id, tracking_code, report_date, type, qty, receiver_name, parts(name)')
                .order('created_at', { ascending: false });
            rawData = (warehouse || []).map((w: any) => ({
                id: w.id,
                tracking_code: w.tracking_code,
                report_date: w.report_date,
                type: w.type === 'ENTRY' ? 'ورود' : 'خروج',
                qty: w.qty,
                receiver_name: w.receiver_name,
                part_name: w.parts?.name || '---'
            }));
            break;
        }
    } catch (error) {
        console.error("Error fetching report data:", error);
    } finally {
        setLoading(false);
    }

    setData(rawData);
    setFilteredData(rawData);
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

  // Prepare Chart Data
  const getChartData = () => {
      if (filteredData.length === 0) return [];
      
      let key = '';
      if (selectedSource === 'LOGINS') key = 'created_at';
      else if (selectedSource === 'WORK_ORDERS' || selectedSource === 'PARTS') key = 'status';
      else if (selectedSource === 'SHIFT_REPORTS' || selectedSource === 'LAB_REPORTS' || selectedSource === 'WAREHOUSE') key = 'report_date';
      else key = 'created_at';
      
      // Fallback key check
      if (filteredData.length > 0 && !(key in filteredData[0]) && key === 'report_date') {
           if ('shift_date' in filteredData[0]) key = 'shift_date';
      }

      const counts: Record<string, number> = {};
      filteredData.forEach(item => {
          let val = item[key] || 'نامشخص';
          counts[val] = (counts[val] || 0) + 1;
      });
      
      return Object.keys(counts).map(k => ({ name: k, count: counts[k] })).slice(0, 10);
  };

  // Map dynamic columns to SmartTable format
  const smartTableColumns = columns.filter(c => c.visible).map(col => ({
      header: col.label,
      accessor: (item: any) => item[col.id],
      sortKey: col.id
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <Settings className="w-4 h-4"/> تنظیمات گزارش
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">منبع داده</label>
                          <select 
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value as DataSource)}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none text-sm"
                          >
                              <option value="LOGINS">لاگ‌های ورود و خروج</option>
                              <option value="WORK_ORDERS">دستور کارها</option>
                              <option value="PARTS">درخواست‌های قطعه</option>
                              <option value="SHIFT_REPORTS">گزارشات شیفت</option>
                              <option value="LAB_REPORTS">گزارشات آزمایشگاه</option>
                              <option value="WAREHOUSE">تراکنش‌های انبار</option>
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
                      
                      <div className="flex gap-2">
                          <button onClick={loadData} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition text-sm font-bold">
                              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
                          </button>
                          <button onClick={handleExport} className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg flex items-center justify-center gap-2 hover:bg-green-100 transition text-sm font-bold">
                              <FileSpreadsheet className="w-4 h-4" /> خروجی
                          </button>
                      </div>
                  </div>
              </div>

              {/* Mini Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 h-64">
                   <h4 className="text-xs font-bold text-gray-500 mb-2 text-center">نمودار توزیع فراوانی</h4>
                   <ResponsiveContainer width="100%" height="90%">
                      <ReBarChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={50} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#800020" radius={[4, 4, 0, 0]} />
                      </ReBarChart>
                   </ResponsiveContainer>
              </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3">
               <SmartTable 
                  title={`پیش‌نمایش داده‌ها (${filteredData.length} رکورد)`}
                  data={data}
                  columns={smartTableColumns}
                  isLoading={loading}
                  icon={PieChart}
               />
          </div>
      </div>
    </div>
  );
};

export default Reports;
