
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Award, Plus, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import { fetchMasterData } from '../workflowStore';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
}

export const Performance: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('ALL');
  const [periods, setPeriods] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchMasterData('evaluation_periods').then(setPeriods);
  }, []);

  useEffect(() => {
    let res = items;
    if (filterPeriod !== 'ALL') {
      res = res.filter(i => i.period === filterPeriod);
    }
    setFilteredItems(res);
  }, [items, filterPeriod]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('performance_evaluations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setIsLoading(false);
  };

  const confirmDelete = async () => {
    await supabase.from('performance_evaluations').delete().in('id', selectedIds);
    setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance");
    XLSX.writeFile(wb, `performance_${Date.now()}.xlsx`);
  };

  const extraActions = (
    <>
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => setView('NEW')} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="ارزیابی جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchData} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">دوره ارزیابی</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
          <option value="ALL">همه</option>
          {periods.map((p: any) => <option key={p.id} value={p.title}>{p.title}</option>)}
        </select>
      </div>
    </div>
  );

  if (view === 'NEW') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">ثبت ارزیابی عملکرد</h2>
        <div className="text-center text-gray-500 py-10">فرم ارزیابی در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف ارزیابی"
        message={`آیا از حذف ${selectedIds.length} مورد انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="ارزیابی عملکرد پرسنل"
        icon={Award}
        data={filteredItems}
        isLoading={isLoading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'نام پرسنل', accessor: (i: any) => i.personnel_name, sortKey: 'personnel_name' },
          { header: 'واحد', accessor: (i: any) => i.unit, sortKey: 'unit' },
          { header: 'دوره', accessor: (i: any) => i.period, sortKey: 'period' },
          { header: 'امتیاز کل', accessor: (i: any) => <span className="font-bold text-blue-600">{i.total_score}</span>, sortKey: 'total_score' },
          { header: 'وضعیت', accessor: (i: any) => i.status, sortKey: 'status' },
        ]}
      />
    </div>
  );
};

export default Performance;
