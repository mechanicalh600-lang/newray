
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { FlaskConical } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { DataPage } from '../components/DataPage';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { ensureDefaultReportTemplate } from '../services/reportTemplates';
import { fetchNextTrackingCode } from '../workflowStore';

interface Props {
  user: User;
}

export const LabReport: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [formData, setFormData] = useState({
    report_date: '',
    shift: 'A',
    sample_code: '',
    sample_location: '',
    fe_percent: '',
    feo_percent: '',
    s_percent: '',
    moisture_percent: '',
    blaine: '',
    mesh_size: '',
  });

  useEffect(() => {
    ensureDefaultReportTemplate('lab-report', 'قالب پیش فرض گزارش آزمایشگاه');
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
    const submitForm = async () => {
      if (!formData.report_date || !formData.sample_code.trim()) {
        alert('تاریخ و کد نمونه الزامی است.');
        return;
      }
      const tracking_code = await fetchNextTrackingCode('LAB-');
      const payload = {
        tracking_code,
        ...formData,
        operator_id: user.id || null,
        fe_percent: formData.fe_percent ? Number(formData.fe_percent) : null,
        feo_percent: formData.feo_percent ? Number(formData.feo_percent) : null,
        s_percent: formData.s_percent ? Number(formData.s_percent) : null,
        moisture_percent: formData.moisture_percent ? Number(formData.moisture_percent) : null,
        blaine: formData.blaine ? Number(formData.blaine) : null,
        mesh_size: formData.mesh_size ? Number(formData.mesh_size) : null,
      };
      const { error } = await supabase.from('lab_reports').insert([payload]);
      if (error) {
        alert(`خطا در ثبت: ${error.message}`);
        return;
      }
      alert('گزارش آزمایشگاه ثبت شد.');
      setFormData({
        report_date: '',
        shift: 'A',
        sample_code: '',
        sample_location: '',
        fe_percent: '',
        feo_percent: '',
        s_percent: '',
        moisture_percent: '',
        blaine: '',
        mesh_size: '',
      });
      await fetchReports();
      setView('LIST');
    };

    return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-bold mb-4">ثبت گزارش آزمایشگاه</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ShamsiDatePicker label="تاریخ گزارش" value={formData.report_date} onChange={v => setFormData(prev => ({ ...prev, report_date: v }))} />
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">شیفت</label>
            <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.shift} onChange={e => setFormData(prev => ({ ...prev, shift: e.target.value }))}>
              <option value="A">شیفت A</option>
              <option value="B">شیفت B</option>
              <option value="C">شیفت C</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">کد نمونه *</label>
            <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.sample_code} onChange={e => setFormData(prev => ({ ...prev, sample_code: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">محل نمونه‌برداری</label>
            <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.sample_location} onChange={e => setFormData(prev => ({ ...prev, sample_location: e.target.value }))} />
          </div>
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="Fe %" value={formData.fe_percent} onChange={e => setFormData(prev => ({ ...prev, fe_percent: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="FeO %" value={formData.feo_percent} onChange={e => setFormData(prev => ({ ...prev, feo_percent: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="S %" value={formData.s_percent} onChange={e => setFormData(prev => ({ ...prev, s_percent: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="Moisture %" value={formData.moisture_percent} onChange={e => setFormData(prev => ({ ...prev, moisture_percent: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="Blaine" value={formData.blaine} onChange={e => setFormData(prev => ({ ...prev, blaine: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="Mesh Size" value={formData.mesh_size} onChange={e => setFormData(prev => ({ ...prev, mesh_size: e.target.value }))} />
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
        onPrint={(item) => openReportTemplatePreview(navigate, 'lab-report', item)}
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
