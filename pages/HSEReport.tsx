
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';

export const HSEReport: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    // Simulated initial data or fetch
    setItems([
        { id: '1', tracking_code: 'HSE-001', type: 'INCIDENT', date: '1403/10/01', description: 'سقوط ابزار از ارتفاع' },
        { id: '2', tracking_code: 'HSE-002', type: 'NEAR_MISS', date: '1403/10/05', description: 'لیز خوردن روی روغن' }
    ]);
  }, []);

  useEffect(() => {
    let res = items;
    if (filterType !== 'ALL') res = res.filter(i => i.type === filterType);
    if (fromDate) res = res.filter(i => i.date >= fromDate);
    if (toDate) res = res.filter(i => i.date <= toDate);
    setFilteredItems(res);
  }, [items, filterType, fromDate, toDate]);

  const handleDelete = async (ids: string[]) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">نوع رویداد</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="INCIDENT">حادثه</option>
          <option value="NEAR_MISS">شبه حادثه</option>
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
        <h2 className="text-xl font-bold mb-4">ثبت گزارش ایمنی و بهداشت</h2>
        <div className="text-center text-gray-500 py-10">فرم HSE در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
      <DataPage
        title="گزارشات ایمنی و بهداشت (HSE)"
        icon={HardHat}
        data={filteredItems}
        isLoading={loading}
        onAdd={() => setView('NEW')}
        onReload={() => alert('بروزرسانی (شبیه‌سازی)')}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => setView('NEW')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        onPrint={(item) => openReportTemplatePreview(navigate, 'hse-report', item)}
        exportName="HSEReports"
        columns={[
          { header: 'کد گزارش', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'تاریخ', accessor: (i: any) => i.date, sortKey: 'date' },
          { header: 'نوع', accessor: (i: any) => i.type, sortKey: 'type' },
          { header: 'شرح', accessor: (i: any) => i.description, sortKey: 'description' },
        ]}
      />
  );
};

export default HSEReport;