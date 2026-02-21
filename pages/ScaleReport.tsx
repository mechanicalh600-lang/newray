
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Scale } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { ensureDefaultReportTemplate } from '../services/reportTemplates';
import { fetchNextTrackingCode } from '../workflowStore';

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
  const [formData, setFormData] = useState({
    report_date: '',
    truck_no: '',
    driver_name: '',
    material: '',
    gross_weight: '',
    tare_weight: '',
    net_weight: '',
    origin: '',
    destination: '',
  });

  useEffect(() => {
    ensureDefaultReportTemplate('scale-report', 'قالب پیش فرض گزارش باسکول');
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

  const formatDateTime = (raw?: string) => {
    if (!raw) return '-';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    const time = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = dt.toLocaleDateString('fa-IR');
    return `${time} | ${date}`;
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
    const submitForm = async () => {
      if (!formData.report_date || !formData.truck_no.trim() || !formData.material.trim()) {
        alert('تاریخ، پلاک خودرو و نوع محموله الزامی است.');
        return;
      }
      const gross = Number(formData.gross_weight || 0);
      const tare = Number(formData.tare_weight || 0);
      const net = formData.net_weight ? Number(formData.net_weight) : Math.max(0, gross - tare);
      const tracking_code = await fetchNextTrackingCode('SC-');
      const payload = {
        tracking_code,
        report_date: formData.report_date,
        truck_no: formData.truck_no,
        driver_name: formData.driver_name || null,
        material: formData.material,
        gross_weight: gross || null,
        tare_weight: tare || null,
        net_weight: net || null,
        origin: formData.origin || null,
        destination: formData.destination || null,
        operator_id: user.id || null,
      };
      const { error } = await supabase.from('scale_reports').insert([payload]);
      if (error) {
        alert(`خطا در ثبت: ${error.message}`);
        return;
      }
      alert('رکورد باسکول ثبت شد.');
      setFormData({
        report_date: '',
        truck_no: '',
        driver_name: '',
        material: '',
        gross_weight: '',
        tare_weight: '',
        net_weight: '',
        origin: '',
        destination: '',
      });
      await fetchReports();
      setView('LIST');
    };

    return (
      <div className="w-full max-w-full p-6 bg-white dark:bg-gray-800 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-bold mb-4">ثبت توزین جدید</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">تاریخ</label>
            <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.report_date} onChange={e => setFormData(prev => ({ ...prev, report_date: e.target.value }))} placeholder="1404/01/01" />
          </div>
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="پلاک خودرو *" value={formData.truck_no} onChange={e => setFormData(prev => ({ ...prev, truck_no: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="نام راننده" value={formData.driver_name} onChange={e => setFormData(prev => ({ ...prev, driver_name: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="نوع محموله *" value={formData.material} onChange={e => setFormData(prev => ({ ...prev, material: e.target.value }))} />
          <input type="number" min="0" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="وزن ناخالص" value={formData.gross_weight} onChange={e => setFormData(prev => ({ ...prev, gross_weight: e.target.value }))} />
          <input type="number" min="0" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="وزن خالص" value={formData.tare_weight} onChange={e => setFormData(prev => ({ ...prev, tare_weight: e.target.value }))} />
          <input type="number" min="0" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="وزن خالص (اختیاری)" value={formData.net_weight} onChange={e => setFormData(prev => ({ ...prev, net_weight: e.target.value }))} />
          <input className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="مبدا" value={formData.origin} onChange={e => setFormData(prev => ({ ...prev, origin: e.target.value }))} />
          <input className="md:col-span-2 w-full p-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="مقصد" value={formData.destination} onChange={e => setFormData(prev => ({ ...prev, destination: e.target.value }))} />
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
        title="گزارشات باسکول"
        icon={Scale}
        data={filteredItems}
        isLoading={loading}
        columns={[
          { header: 'کد گزارش', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'تاریخ توزین', accessor: (i: any) => i.report_date, sortKey: 'report_date' },
          { header: 'تاریخ ثبت', accessor: (i: any) => formatDateTime(i.created_at), sortKey: 'created_at' },
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
