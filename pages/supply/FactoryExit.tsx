import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { Truck, Plus, Save, Loader2, X, Trash2 } from 'lucide-react';
import { DataPage } from '../../components/DataPage';
import { ShamsiDatePicker } from '../../components/ShamsiDatePicker';
import { ClockTimePicker } from '../../components/ClockTimePicker';
import { supabase } from '../../supabaseClient';
import { getShamsiDate } from '../../utils';
import { fetchMasterData, fetchNextTrackingCode } from '../../workflowStore';
import { startEntityWorkflow } from '../../services/entityWorkflow';

interface LineItem {
  id: string;
  partId: string;
  name: string;
  code: string;
  qty: number;
  unit: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تایید شده',
  EXITED: 'خروج انجام شد',
  CANCELLED: 'لغو',
};

interface Props {
  user: User;
}

export const FactoryExit: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [parts, setParts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [currentItem, setCurrentItem] = useState({ partId: '', name: '', code: '', qty: 1, unit: 'عدد' });
  const [itemSearch, setItemSearch] = useState('');

  const [form, setForm] = useState({
    exitDate: getShamsiDate(),
    exitTime: '08:00',
    destination: '',
    recipientName: '',
    recipientOrg: '',
    vehiclePlate: '',
    driverName: '',
    gatePassNo: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
    fetchMasterData('parts').then((d: any) => setParts(d || []));
    fetchMasterData('measurement_units').then((d: any) => setUnits(d || []));
  }, []);

  useEffect(() => {
    let res = items;
    if (filterStatus !== 'ALL') res = res.filter(i => i.status === filterStatus);
    setFiltered(res);
  }, [items, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('factory_goods_exits').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('factory_goods_exits').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const addLineItem = () => {
    const name = currentItem.partId
      ? (parts.find((p: any) => p.id === currentItem.partId)?.name || currentItem.name)
      : currentItem.name;
    if (!name?.trim() || currentItem.qty <= 0) return;
    setLineItems(prev => [...prev, {
      id: `li-${Date.now()}`,
      partId: currentItem.partId,
      name: name.trim(),
      code: currentItem.code,
      qty: currentItem.qty,
      unit: currentItem.unit,
    }]);
    setCurrentItem({ partId: '', name: '', code: '', qty: 1, unit: units[0]?.title || 'عدد' });
  };

  const resetForm = () => {
    setForm({
      exitDate: getShamsiDate(),
      exitTime: '08:00',
      destination: '',
      recipientName: '',
      recipientOrg: '',
      vehiclePlate: '',
      driverName: '',
      gatePassNo: '',
      description: '',
    });
    setLineItems([]);
    setViewMode('LIST');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const code = await fetchNextTrackingCode('FEX');
      const row = {
        tracking_code: code,
        exit_date: form.exitDate,
        exit_time: form.exitTime,
        destination: form.destination?.trim() || null,
        recipient_name: form.recipientName?.trim() || null,
        recipient_org: form.recipientOrg?.trim() || null,
        vehicle_plate: form.vehiclePlate?.trim() || null,
        driver_name: form.driverName?.trim() || null,
        gate_pass_no: form.gatePassNo?.trim() || null,
        line_items: lineItems,
        description: form.description?.trim() || null,
        status: 'PENDING',
        requester_id: user.id,
        requester_name: user.fullName,
      };
      const { data: inserted, error } = await supabase.from('factory_goods_exits').insert(row).select('id').single();
      if (error) throw error;
      await startEntityWorkflow('FACTORY_EXIT', user, {
        entityId: inserted.id,
        trackingCode: code,
        title: `خروج کالا ${code}`,
        data: row,
      });
      await fetchData();
      resetForm();
      alert(`مجوز خروج با شماره ${code} ثبت شد.`);
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'ثبت ناموفق'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredParts = parts.filter((p: any) => {
    const s = itemSearch.toLowerCase();
    if (!s) return true;
    return (p.name || '').toLowerCase().includes(s) || (p.code || '').toLowerCase().includes(s);
  });

  const columns = [
    { header: 'شماره', accessor: (r: any) => <span className="font-mono font-bold">{r.tracking_code}</span> },
    { header: 'تاریخ', accessor: (r: any) => r.exit_date },
    { header: 'مقصد', accessor: (r: any) => r.destination || '—' },
    { header: 'تحویل‌گیرنده', accessor: (r: any) => r.recipient_name || '—' },
    { header: 'تعداد اقلام', accessor: (r: any) => (Array.isArray(r.line_items) ? r.line_items.length : 0) },
    { header: 'وضعیت', accessor: (r: any) => STATUS_LABELS[r.status] || r.status },
  ];

  if (viewMode === 'NEW') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fadeIn">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 p-6 space-y-5">
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Truck className="w-6 h-6 text-primary" /> خروج کالا/قطعه از کارخانه</h2>
            <button type="button" onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">تاریخ خروج</label>
              <ShamsiDatePicker value={form.exitDate} onChange={v => setForm(f => ({ ...f, exitDate: v }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ساعت</label>
              <ClockTimePicker value={form.exitTime} onChange={v => setForm(f => ({ ...f, exitTime: v }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">مقصد</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تحویل‌گیرنده</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سازمان / شرکت</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.recipientOrg} onChange={e => setForm(f => ({ ...f, recipientOrg: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">پلاک خودرو</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.vehiclePlate} onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">راننده</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">شماره مجوز گیت</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.gatePassNo} onChange={e => setForm(f => ({ ...f, gatePassNo: e.target.value }))} />
            </div>
          </div>

          <div className="border rounded-xl p-4 dark:border-gray-600 space-y-3">
            <h3 className="font-bold text-sm">اقلام خروجی *</h3>
            <input className="w-full p-2 border rounded-lg dark:bg-gray-700 text-sm" placeholder="جستجوی قطعه..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <select className="md:col-span-2 p-2 border rounded-lg dark:bg-gray-700 text-sm" value={currentItem.partId}
                onChange={e => {
                  const p = parts.find((x: any) => x.id === e.target.value);
                  setCurrentItem({
                    partId: e.target.value,
                    name: p?.name || '',
                    code: p?.code || '',
                    qty: currentItem.qty,
                    unit: currentItem.unit,
                  });
                }}>
                <option value="">انتخاب از انبار / نام دستی</option>
                {filteredParts.slice(0, 50).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
              <input className="p-2 border rounded-lg dark:bg-gray-700 text-sm" placeholder="نام کالا" value={currentItem.name}
                onChange={e => setCurrentItem(c => ({ ...c, name: e.target.value, partId: '' }))} />
              <input type="number" min={1} className="p-2 border rounded-lg dark:bg-gray-700 text-sm" value={currentItem.qty}
                onChange={e => setCurrentItem(c => ({ ...c, qty: Number(e.target.value) || 0 }))} />
              <button type="button" onClick={addLineItem} className="p-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {lineItems.length > 0 && (
              <table className="w-full text-sm mt-2">
                <thead><tr className="border-b dark:border-gray-600"><th className="text-right p-2">کالا</th><th className="p-2">مقدار</th><th></th></tr></thead>
                <tbody>
                  {lineItems.map((it, idx) => (
                    <tr key={it.id} className="border-b dark:border-gray-700">
                      <td className="p-2">{it.name} {it.code ? `(${it.code})` : ''}</td>
                      <td className="p-2 text-center">{it.qty} {it.unit}</td>
                      <td className="p-2"><button type="button" onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-red-500" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <textarea className="w-full p-2.5 border rounded-xl dark:bg-gray-700 h-20" placeholder="توضیحات" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

          <button type="submit" disabled={isSubmitting || lineItems.length === 0} className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            ثبت مجوز خروج
          </button>
        </form>
      </div>
    );
  }

  return (
    <DataPage
      title="خروج کالا/قطعه از کارخانه"
      icon={Truck}
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
      exportName="FactoryExit"
      userId={user.id}
    />
  );
};

export default FactoryExit;
