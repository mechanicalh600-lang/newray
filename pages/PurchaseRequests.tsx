import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ShoppingCart, Save, Loader2, X, Mic } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { getShamsiDate } from '../utils';
import { fetchMasterData } from '../workflowStore';

const LOCATIONS = ['ستاد (دفتر مرکزی)', 'مجتمع (کارخانه)'];
const PRIORITIES = ['عادی', 'فوری', 'بحرانی (توقف تولید)'];

interface Props {
  user: User;
}

const generateRequestNumber = (): string => {
  const now = new Date();
  const jy = now.getFullYear() - 621;
  const yearPart = String(jy).slice(-2).padStart(2, '0');
  const serial = Math.floor(Math.random() * 9000) + 1000;
  return `${yearPart}/${serial}`;
};

export const PurchaseRequests: React.FC<Props> = ({ user }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [units, setUnits] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    requestNumber: '', requestDate: getShamsiDate(), location: LOCATIONS[0], priority: PRIORITIES[0],
    desc: '', qty: 0, unit: 'عدد',
  });
  const [requestNumberError, setRequestNumberError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    fetchMasterData('measurement_units').then((d: any) => setUnits(d || []));
  }, []);

  useEffect(() => {
    let res = requests;
    if (filterStatus !== 'ALL') {
      res = res.filter(r => r.status === filterStatus);
    }
    setFilteredRequests(res);
  }, [requests, filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('purchase_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('purchase_requests').delete().in('id', ids);
    setRequests(prev => prev.filter(r => !ids.includes(r.id)));
    setSelectedIds([]);
  };

  const handleRequestNumberChange = (val: string) => {
    const cleaned = val.replace(/[^0-9/]/g, '');
    if (cleaned.length <= 7) {
      setFormData(prev => ({ ...prev, requestNumber: cleaned }));
      if (cleaned.length >= 6 && !/^\d{2}\/\d{4}$/.test(cleaned)) {
        setRequestNumberError('فرمت: XX/XXXX (مثال: 03/1234)');
      } else {
        setRequestNumberError('');
      }
    }
  };

  const handleReset = () => {
    setFormData({
      requestNumber: generateRequestNumber(),
      requestDate: getShamsiDate(),
      location: LOCATIONS[0],
      priority: PRIORITIES[0],
      desc: '',
      qty: 0,
      unit: (units && units[0]) ? units[0].title : 'عدد',
    });
    setRequestNumberError('');
    setView('LIST');
  };

  const isFormValid = () =>
    !!formData.requestNumber?.trim() &&
    !!formData.desc?.trim() &&
    !!formData.qty &&
    formData.qty > 0 &&
    !!formData.unit &&
    !requestNumberError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('purchase_requests').insert({
        request_number: formData.requestNumber.trim(),
        requester_id: user.id,
        requester_name: user.fullName || 'ناشناس',
        request_date: formData.requestDate,
        description: formData.desc.trim(),
        qty: formData.qty,
        unit: formData.unit,
        location: formData.location || null,
        priority: formData.priority || null,
        status: 'PENDING',
      });
      if (error) throw error;
      alert('درخواست خرید با موفقیت ثبت و به بازرگانی ارسال شد.');
      handleReset();
      fetchRequests();
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'خطا در ذخیره'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="PENDING">در حال بررسی</option>
          <option value="APPROVED">تایید شده</option>
          <option value="REJECTED">رد شده</option>
        </select>
      </div>
    </div>
  );

  const getStatusLabel = (s: string) => ({ PENDING: 'در حال بررسی', APPROVED: 'تایید شده', REJECTED: 'رد شده' }[s] || s);

  if (view === 'NEW') {
    return (
      <div className="w-full max-w-full pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><ShoppingCart className="w-6 h-6 text-primary"/> درخواست خرید</h1>
          <button onClick={handleReset} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">درخواست دهنده</label>
              <input type="text" value={user.fullName} disabled className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">شماره درخواست (فرمت: 03/1234) <span className="text-red-500">*</span></label>
              <input type="text" value={formData.requestNumber} onChange={e => handleRequestNumberChange(e.target.value)} maxLength={7} required placeholder="03/1234" className={`w-full p-2.5 border rounded-xl font-mono text-center bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary ${requestNumberError ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
              {requestNumberError && <p className="text-xs text-red-500 mt-1">{requestNumberError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">تاریخ درخواست</label>
              <ShamsiDatePicker value={formData.requestDate} onChange={d => setFormData({...formData, requestDate: d})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">محل خرید</label>
              <select value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2.5 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary">
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">اولویت</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full p-2.5 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">شرح درخواست <span className="text-red-500">*</span></label>
            <div className="relative">
              <textarea value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} required placeholder="مشخصات فنی دقیق کالا یا خدمات..." className="w-full h-32 p-3 pl-10 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary resize-none" />
              <button type="button" className="absolute left-3 bottom-3 text-gray-400 hover:text-primary transition-colors" title="ضبط صوتی (به زودی)"><Mic className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">تعداد <span className="text-red-500">*</span></label>
              <input type="number" value={formData.qty || ''} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} required min={0.01} className="w-full p-2.5 border rounded-xl text-center font-bold bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">واحد <span className="text-red-500">*</span></label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-2.5 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary">
                {(units && units.length > 0 ? units : [{ id: '1', title: 'عدد' }]).map((u: any) => <option key={u.id} value={u.title}>{u.title}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={handleReset} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">انصراف</button>
            <button type="submit" disabled={!isFormValid() || isSubmitting} className="flex-[2] bg-primary text-white py-4 rounded-xl font-bold shadow-lg flex justify-center gap-2 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} ثبت و ارسال به بازرگانی
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
      <DataPage
        title="درخواست‌های خرید"
        icon={ShoppingCart}
        data={filteredRequests}
        isLoading={loading}
        onAdd={() => {
          setFormData(prev => ({ ...prev, requestNumber: generateRequestNumber(), requestDate: getShamsiDate(), desc: '', qty: 0, unit: (units && units[0]) ? units[0].title : 'عدد' }));
          setView('NEW');
        }}
        onReload={fetchRequests}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => setView('NEW')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        exportName="PurchaseRequests"
        columns={[
          { header: 'شماره درخواست', accessor: (r: any) => <span className="font-mono font-bold">{r.request_number}</span>, sortKey: 'request_number' },
          { header: 'درخواست کننده', accessor: (r: any) => r.requester_name, sortKey: 'requester_name' },
          { header: 'تاریخ درخواست', accessor: (r: any) => r.request_date, sortKey: 'request_date' },
          { header: 'شرح کالا/خدمات', accessor: (r: any) => r.description, sortKey: 'description' },
          { header: 'تعداد', accessor: (r: any) => `${r.qty} ${r.unit || ''}`, sortKey: 'qty' },
          { header: 'وضعیت', accessor: (r: any) => getStatusLabel(r.status) || r.status, sortKey: 'status' },
          { header: 'محل', accessor: (r: any) => r.location || '-', sortKey: 'location' },
          { header: 'اولویت', accessor: (r: any) => r.priority || '-', sortKey: 'priority' },
        ]}
      />
  );
};

export default PurchaseRequests;
