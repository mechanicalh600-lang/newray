
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Scale, X, Save, Loader2 } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
}

export const ScaleReport: React.FC<Props> = ({ user }) => {
  // --- State Management ---
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [filterMaterial, setFilterMaterial] = useState('ALL');

  // --- Data Fetching ---
  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let res = items;
    if (filterMaterial !== 'ALL') {
      res = res.filter(i => i.material === filterMaterial);
    }
    setFilteredItems(res);
  }, [items, filterMaterial]);

  const fetchReports = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
        .from('scale_reports')
        .select('*')
        .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setItems(data);
    } catch (e) {
        console.error('Error fetching scale reports:', e);
    } finally {
        setLoading(false);
    }
  };

  // --- Handlers ---
  const handleDelete = async (ids: string[]) => {
    try {
        const { error } = await supabase.from('scale_reports').delete().in('id', ids);
        if (error) throw error;
        setItems(prev => prev.filter(i => !ids.includes(i.id)));
        setSelectedIds([]);
    } catch (e) {
        alert('خطا در حذف اطلاعات');
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;
      
    if (dataToExport.length === 0) return alert('داده‌ای برای خروجی وجود ندارد');

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ScaleReports");
    XLSX.writeFile(wb, `scale_reports_${Date.now()}.xlsx`);
  };

  // --- Column Definition ---
  const columns = [
      { header: 'کد رهگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
      { header: 'تاریخ', accessor: (i: any) => i.report_date, sortKey: 'report_date' },
      { header: 'محموله', accessor: (i: any) => i.material, sortKey: 'material' },
      { header: 'پلاک خودرو', accessor: (i: any) => <span className="dir-ltr">{i.truck_no}</span>, sortKey: 'truck_no' },
      { header: 'وزن خالص (Kg)', accessor: (i: any) => Number(i.net_weight).toLocaleString(), sortKey: 'net_weight' },
      { header: 'مبدا / مقصد', accessor: (i: any) => <div className="text-xs">{i.origin} <span className="text-gray-400 mx-1">←</span> {i.destination}</div>, sortKey: 'origin' },
  ];

  // --- Filter UI ---
  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">نوع محموله</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}>
          <option value="ALL">همه</option>
          <option>کنسانتره سنگ آهن</option>
          <option>سنگ آهن دانه بندی</option>
          <option>گندله</option>
        </select>
      </div>
    </div>
  );

  // --- RENDER: Form View ---
  if (viewMode === 'FORM') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Scale className="w-8 h-8 text-primary"/> ثبت توزین جدید
            </h1>
            <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                <X className="w-6 h-6"/>
            </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <div className="py-10 text-gray-400 flex flex-col items-center">
                <Loader2 className="w-10 h-10 mb-4 animate-spin opacity-50" />
                <p>فرم اتصال به باسکول در حال توسعه است...</p>
            </div>
            <button onClick={() => setViewMode('LIST')} className="mt-4 px-6 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold">
                بازگشت به لیست
            </button>
        </div>
      </div>
    );
  }

  // --- RENDER: List View (Standard DataPage) ---
  return (
    <DataPage
        title="گزارشات باسکول"
        icon={Scale}
        data={filteredItems}
        isLoading={loading}
        columns={columns}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        onAdd={() => setViewMode('FORM')}
        onReload={fetchReports}
        onDelete={handleDelete}
        onExport={handleExport}
        exportName="ScaleReports"
        filterContent={filterContent}
        onEdit={() => setViewMode('FORM')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        onPrint={() => alert('چاپ قبض')}
    />
  );
};

export default ScaleReport;
