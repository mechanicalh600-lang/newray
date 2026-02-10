
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { FlaskConical } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { DataPage } from '../components/DataPage';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
}

export const LabReport: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterCode, setFilterCode] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let res = items;
    if (filterDate) res = res.filter(i => i.report_date === filterDate);
    if (filterCode) res = res.filter(i => i.sample_code.includes(filterCode));
    setFilteredItems(res);
  }, [items, filterDate, filterCode]);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lab_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('lab_reports').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LabReports");
    XLSX.writeFile(wb, `lab_reports_${Date.now()}.xlsx`);
  };

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <ShamsiDatePicker label="تاریخ" value={filterDate} onChange={setFilterDate} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">کد نمونه</label>
        <input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterCode} onChange={e => setFilterCode(e.target.value)} />
      </div>
    </div>
  );

  if (view === 'NEW') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">ثبت گزارش آزمایشگاه</h2>
        <div className="text-center text-gray-500 py-10">فرم آزمایشگاه در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
      <DataPage
        title="گزارشات آزمایشگاه"
        icon={FlaskConical}
        data={filteredItems}
        isLoading={loading}
        onAdd={() => setView('NEW')}
        onReload={fetchReports}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => setView('NEW')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        onPrint={() => alert('چاپ گزارش')}
        onExport={handleExport}
        exportName="LabReports"
        columns={[
          { header: 'کد گزارش', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'تاریخ', accessor: (i: any) => i.report_date, sortKey: 'report_date' },
          { header: 'کد نمونه', accessor: (i: any) => i.sample_code, sortKey: 'sample_code' },
          { header: 'Fe %', accessor: (i: any) => i.fe_percent, sortKey: 'fe_percent' },
          { header: 'FeO %', accessor: (i: any) => i.feo_percent, sortKey: 'feo_percent' },
          { header: 'S %', accessor: (i: any) => i.s_percent, sortKey: 's_percent' },
        ]}
      />
  );
};

export default LabReport;
