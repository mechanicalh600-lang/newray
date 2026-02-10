
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Warehouse } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { DataPage } from '../components/DataPage';

interface Props {
  user: User;
}

export const WarehouseReport: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let res = items;
    if (filterType !== 'ALL') res = res.filter(i => i.type === filterType);
    if (fromDate) res = res.filter(i => i.report_date >= fromDate);
    if (toDate) res = res.filter(i => i.report_date <= toDate);
    setFilteredItems(res);
  }, [items, filterType, fromDate, toDate]);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('warehouse_reports')
      .select('*, parts(name)')
      .order('created_at', { ascending: false });
    if (data) setItems(data.map((i:any) => ({...i, part_name: i.parts?.name || '-'})));
    setLoading(false);
  };

  const confirmDelete = async (ids: string[]) => {
    await supabase.from('warehouse_reports').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WarehouseReports");
    XLSX.writeFile(wb, `warehouse_reports_${Date.now()}.xlsx`);
  };

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">نوع تراکنش</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="ENTRY">ورود</option>
          <option value="EXIT">خروج</option>
        </select>
      </div>
      <div>
        <ShamsiDatePicker label="از تاریخ" value={fromDate} onChange={setFromDate} />
      </div>
      <div>
        <ShamsiDatePicker label="تا تاریخ" value={toDate} onChange={setToDate} />
      </div>
    </div>
  );

  if (view === 'NEW') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">ثبت سند انبار</h2>
        <div className="text-center text-gray-500 py-10">فرم انبار در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
    <DataPage
      title="گزارشات انبار"
      icon={Warehouse}
      data={filteredItems}
      isLoading={loading}
      columns={[
          { header: 'کد رهگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'تاریخ', accessor: (i: any) => i.report_date, sortKey: 'report_date' },
          { header: 'نوع', accessor: (i: any) => i.type === 'ENTRY' ? 'ورود' : 'خروج', sortKey: 'type' },
          { header: 'کالا', accessor: (i: any) => i.part_name, sortKey: 'part_name' },
          { header: 'تعداد', accessor: (i: any) => `${i.qty} ${i.unit || ''}`, sortKey: 'qty' },
          { header: 'طرف حساب', accessor: (i: any) => i.receiver_name, sortKey: 'receiver_name' },
      ]}
      onAdd={() => setView('NEW')}
      onReload={fetchReports}
      onDelete={confirmDelete}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      filterContent={filterContent}
      onEdit={() => setView('NEW')}
      onViewDetails={() => alert('مشاهده جزئیات')}
      onPrint={() => alert('چاپ سند')}
      onExport={handleExport}
      exportName="WarehouseReports"
    />
  );
};

export default WarehouseReport;
