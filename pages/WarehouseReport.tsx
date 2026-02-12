
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Warehouse } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { DataPage } from '../components/DataPage';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { ensureDefaultReportTemplate } from '../services/reportTemplates';
import { fetchNextTrackingCode } from '../workflowStore';

interface Props {
  user: User;
}

export const WarehouseReport: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  
  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [formData, setFormData] = useState({
    report_date: '',
    type: 'ENTRY',
    part_id: '',
    qty: '',
    unit: '',
    receiver_name: '',
    doc_ref: '',
  });

  useEffect(() => {
    ensureDefaultReportTemplate('warehouse-report', 'قالب پیش فرض گزارش انبار');
    fetchReports();
    supabase.from('parts').select('id,name').order('name', { ascending: true }).then(({ data }) => setParts(data || []));
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

  const handleDelete = async (ids: string[]) => {
    await supabase.from('warehouse_reports').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
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
    const submitForm = async () => {
      if (!formData.report_date || !formData.part_id || !formData.qty) {
        alert('تاریخ، کالا و تعداد الزامی است.');
        return;
      }
      const tracking_code = await fetchNextTrackingCode('WH-');
      const payload = {
        tracking_code,
        report_date: formData.report_date,
        type: formData.type,
        part_id: formData.part_id,
        qty: Number(formData.qty),
        unit: formData.unit || null,
        receiver_name: formData.receiver_name || null,
        doc_ref: formData.doc_ref || null,
        operator_id: user.id || null,
      };
      const { error } = await supabase.from('warehouse_reports').insert([payload]);
      if (error) {
        alert(`خطا در ثبت: ${error.message}`);
        return;
      }
      alert('سند انبار ثبت شد.');
      setFormData({ report_date: '', type: 'ENTRY', part_id: '', qty: '', unit: '', receiver_name: '', doc_ref: '' });
      await fetchReports();
      setView('LIST');
    };

    return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-bold mb-4">ثبت سند انبار</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ShamsiDatePicker label="تاریخ" value={formData.report_date} onChange={v => setFormData(prev => ({ ...prev, report_date: v }))} />
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">نوع سند</label>
            <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}>
              <option value="ENTRY">ورود</option>
              <option value="EXIT">خروج</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">کالا *</label>
            <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.part_id} onChange={e => setFormData(prev => ({ ...prev, part_id: e.target.value }))}>
              <option value="">انتخاب کالا...</option>
              {parts.map((part: any) => <option key={part.id} value={part.id}>{part.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">تعداد *</label>
            <input type="number" min="0" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.qty} onChange={e => setFormData(prev => ({ ...prev, qty: e.target.value }))} />
          </div>
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="واحد" value={formData.unit} onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="گیرنده/تحویل‌گیرنده" value={formData.receiver_name} onChange={e => setFormData(prev => ({ ...prev, receiver_name: e.target.value }))} />
          <input className="md:col-span-2 w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="شماره سند/حواله" value={formData.doc_ref} onChange={e => setFormData(prev => ({ ...prev, doc_ref: e.target.value }))} />
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
        title="گزارشات انبار"
        icon={Warehouse}
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
        onPrint={(item) => openReportTemplatePreview(navigate, 'warehouse-report', item)}
        exportName="WarehouseReports"
        columns={[
          { header: 'کد رهگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'تاریخ', accessor: (i: any) => i.report_date, sortKey: 'report_date' },
          { header: 'نوع', accessor: (i: any) => i.type === 'ENTRY' ? 'ورود' : 'خروج', sortKey: 'type' },
          { header: 'کالا', accessor: (i: any) => i.part_name, sortKey: 'part_name' },
          { header: 'تعداد', accessor: (i: any) => `${i.qty} ${i.unit || ''}`, sortKey: 'qty' },
          { header: 'طرف حساب', accessor: (i: any) => i.receiver_name, sortKey: 'receiver_name' },
        ]}
      />
  );
};

export default WarehouseReport;
