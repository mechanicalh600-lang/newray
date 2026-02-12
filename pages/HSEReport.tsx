
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { ensureDefaultReportTemplate } from '../services/reportTemplates';
import { supabase } from '../supabaseClient';
import { fetchNextTrackingCode } from '../workflowStore';

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
  const [formData, setFormData] = useState({
    type: 'INCIDENT',
    date: '',
    time: '',
    location: '',
    description: '',
    involved_persons: '',
    corrective_action: '',
    status: 'OPEN',
  });

  useEffect(() => {
    ensureDefaultReportTemplate('hse-report', 'قالب پیش فرض گزارش HSE');
    supabase
      .from('hse_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hse_reports')
      .select('*')
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

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
    const submitForm = async () => {
      if (!formData.date || !formData.description.trim()) {
        alert('تاریخ و شرح رویداد الزامی است.');
        return;
      }
      const tracking_code = await fetchNextTrackingCode('HSE-');
      const payload = {
        tracking_code,
        ...formData,
      };
      const { error } = await supabase.from('hse_reports').insert([payload]);
      if (error) {
        alert(`خطا در ثبت: ${error.message}`);
        return;
      }
      alert('گزارش HSE ثبت شد.');
      setItems(prev => [{ ...payload, id: `${Date.now()}` }, ...prev]);
      setView('LIST');
    };

    return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-bold mb-4">ثبت گزارش ایمنی و بهداشت</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">نوع رویداد</label>
            <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}>
              <option value="INCIDENT">حادثه</option>
              <option value="NEAR_MISS">شبه حادثه</option>
            </select>
          </div>
          <ShamsiDatePicker label="تاریخ رویداد" value={formData.date} onChange={v => setFormData(prev => ({ ...prev, date: v }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="ساعت (مثال 08:30)" value={formData.time} onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="محل رخداد" value={formData.location} onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))} />
          <textarea className="md:col-span-2 w-full p-2 border rounded-lg bg-white dark:bg-gray-700 min-h-[90px]" placeholder="شرح رویداد *" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <input className="md:col-span-2 w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="افراد درگیر" value={formData.involved_persons} onChange={e => setFormData(prev => ({ ...prev, involved_persons: e.target.value }))} />
          <textarea className="md:col-span-2 w-full p-2 border rounded-lg bg-white dark:bg-gray-700 min-h-[90px]" placeholder="اقدام اصلاحی" value={formData.corrective_action} onChange={e => setFormData(prev => ({ ...prev, corrective_action: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={submitForm} className="bg-primary text-white px-4 py-2 rounded-lg">ثبت نهایی</button>
          <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded-lg">بازگشت</button>
        </div>
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
        onReload={fetchReports}
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