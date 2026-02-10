
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Scale } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';

interface Props {
  user: User;
}

export const ScaleReport: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterMaterial, setFilterMaterial] = useState('ALL');

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
    } catch (error) {
      console.error('Error fetching scale reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('scale_reports').delete().in('id', ids);
      if (error) throw error;
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error('Error deleting scale reports:', error);
      alert('خطا در حذف اطلاعات');
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ScaleReports");
    XLSX.writeFile(wb, `scale_reports_${Date.now()}.xlsx`);
  };

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

  if (view === 'NEW') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">ثبت توزین جدید</h2>
        <div className="text-center text-gray-500 py-10">فرم باسکول در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
    <DataPage
        title="گزارشات باسکول"
        icon={Scale}
        data={filteredItems}
        isLoading={loading}
        columns={[
          { header: 'کد رهگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'تاریخ', accessor: (i: any) => i.report_date, sortKey: 'report_date' },
          { header: 'محموله', accessor: (i: any) => i.material, sortKey: 'material' },
          { header: 'پلاک خودرو', accessor: (i: any) => i.truck_no, sortKey: 'truck_no' },
          { header: 'وزن خالص', accessor: (i: any) => i.net_weight, sortKey: 'net_weight' },
          { header: 'مبدا/مقصد', accessor: (i: any) => `${i.origin || '-'} / ${i.destination || '-'}`, sortKey: 'origin' },
        ]}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onAdd={() => setView('NEW')}
        onReload={fetchReports}
        onDelete={handleDelete}
        onPrint={(item) => openReportTemplatePreview(navigate, 'scale-report', item)}
        onExport={handleExport}
        exportName="ScaleReports"
      />
  );
};

export default ScaleReport;
