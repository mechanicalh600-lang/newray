import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { Wrench, Save, Loader2, X } from 'lucide-react';
import { DataPage } from '../../components/DataPage';
import { ShamsiDatePicker } from '../../components/ShamsiDatePicker';
import { supabase } from '../../supabaseClient';
import { getShamsiDate } from '../../utils';
import { fetchMasterData, fetchNextTrackingCode } from '../../workflowStore';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'انجام شده',
  CANCELLED: 'لغو',
};

const SERVICE_TYPES: Record<string, string> = {
  REPAIR: 'تعمیرات',
  SERVICE: 'خدمات',
  INSPECTION: 'بازرسی',
  CALIBRATION: 'کالیبراسیون',
  INSTALLATION: 'نصب',
};

const URGENCY_LABELS: Record<string, string> = {
  LOW: 'عادی',
  NORMAL: 'متوسط',
  HIGH: 'فوری',
  CRITICAL: 'بحرانی',
};

interface Props {
  user: User;
}

export const ServiceRepair: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    requestDate: getShamsiDate(),
    equipmentId: '',
    equipmentName: '',
    equipmentCode: '',
    serviceType: 'REPAIR',
    vendorName: '',
    description: '',
    urgency: 'NORMAL',
    estimatedCost: '',
    completionDate: '',
  });

  useEffect(() => {
    fetchData();
    fetchMasterData('equipment').then(setEquipmentList);
  }, []);

  useEffect(() => {
    let res = items;
    if (filterStatus !== 'ALL') res = res.filter(i => i.status === filterStatus);
    setFiltered(res);
  }, [items, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('service_repair_requests').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('service_repair_requests').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const resetForm = () => {
    setForm({
      requestDate: getShamsiDate(),
      equipmentId: '',
      equipmentName: '',
      equipmentCode: '',
      serviceType: 'REPAIR',
      vendorName: '',
      description: '',
      urgency: 'NORMAL',
      estimatedCost: '',
      completionDate: '',
    });
    setViewMode('LIST');
  };

  const handleEquipmentChange = (id: string) => {
    const eq = equipmentList.find((e: any) => e.id === id);
    setForm(f => ({
      ...f,
      equipmentId: id,
      equipmentName: eq?.name || eq?.local_name || '',
      equipmentCode: eq?.code || eq?.equipment_code || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const code = await fetchNextTrackingCode('SRV');
      const { error } = await supabase.from('service_repair_requests').insert({
        tracking_code: code,
        request_date: form.requestDate,
        equipment_id: form.equipmentId || null,
        equipment_name: form.equipmentName?.trim() || null,
        equipment_code: form.equipmentCode?.trim() || null,
        service_type: form.serviceType,
        vendor_name: form.vendorName?.trim() || null,
        description: form.description.trim(),
        urgency: form.urgency,
        estimated_cost: form.estimatedCost ? Number(form.estimatedCost) : 0,
        completion_date: form.completionDate || null,
        status: 'PENDING',
        requester_id: user.id,
        requester_name: user.fullName,
      });
      if (error) throw error;
      await fetchData();
      resetForm();
      alert(`درخواست خدمات/تعمیرات با شماره ${code} ثبت شد.`);
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'ثبت ناموفق'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'شماره', accessor: (r: any) => <span className="font-mono font-bold">{r.tracking_code}</span> },
    { header: 'تاریخ', accessor: (r: any) => r.request_date },
    { header: 'نوع', accessor: (r: any) => SERVICE_TYPES[r.service_type] || r.service_type },
    { header: 'تجهیز', accessor: (r: any) => r.equipment_name || '—' },
    { header: 'پیمانکار', accessor: (r: any) => r.vendor_name || '—' },
    { header: 'فوریت', accessor: (r: any) => URGENCY_LABELS[r.urgency] || r.urgency },
    { header: 'وضعیت', accessor: (r: any) => STATUS_LABELS[r.status] || r.status },
  ];

  if (viewMode === 'NEW') {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fadeIn">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 p-6 space-y-5">
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Wrench className="w-6 h-6 text-primary" /> فرم خدمات / تعمیرات</h2>
            <button type="button" onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">تاریخ درخواست</label>
              <ShamsiDatePicker value={form.requestDate} onChange={v => setForm(f => ({ ...f, requestDate: v }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع درخواست</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}>
                {Object.entries(SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">تجهیز مرتبط</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.equipmentId} onChange={e => handleEquipmentChange(e.target.value)}>
                <option value="">— بدون تجهیز / انتخاب —</option>
                {equipmentList.map((eq: any) => (
                  <option key={eq.id} value={eq.id}>{eq.name || eq.local_name} ({eq.code || eq.equipment_code || '-'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">پیمانکار / ارائه‌دهنده</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">فوریت</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">برآورد هزینه (ریال)</label>
              <input type="number" min={0} className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاریخ پیش‌بینی اتمام</label>
              <ShamsiDatePicker value={form.completionDate} onChange={v => setForm(f => ({ ...f, completionDate: v }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">شرح درخواست *</label>
            <textarea required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 h-32" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="شرح کار، علت خرابی، خدمات مورد نیاز..." />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            ثبت درخواست
          </button>
        </form>
      </div>
    );
  }

  return (
    <DataPage
      title="خدمات / تعمیرات"
      icon={Wrench}
      data={filtered}
      columns={columns}
      isLoading={loading}
      onAdd={() => setViewMode('NEW')}
      onReload={fetchData}
      onDelete={handleDelete}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      filterContent={
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">همه</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      }
      exportName="ServiceRepair"
      userId={user.id}
    />
  );
};

export default ServiceRepair;
