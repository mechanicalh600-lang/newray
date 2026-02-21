import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Package, Plus, Trash2, CheckCircle, XCircle, RefreshCw, FileSpreadsheet, Save, Loader2, X, Pencil } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import { getShamsiDate } from '../utils';
import { fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import * as XLSX from 'xlsx';

interface PartItem { partId: string; partName: string; partCode?: string; qty: number; unit: string; id?: string }

interface Props {
  user: User;
}

export const PartRequests: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [parts, setParts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [formData, setFormData] = useState({ description: '', workOrderCode: '', requestDate: getShamsiDate() });
  const [lineItems, setLineItems] = useState<PartItem[]>([]);
  const [currentItem, setCurrentItem] = useState<PartItem>({ partId: '', partName: '', qty: 0, unit: 'عدد' });
  const [isEditingItem, setIsEditingItem] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchMasterData('parts').then((d: any) => setParts(d || []));
    fetchMasterData('measurement_units').then((d: any) => setUnits(d || []));
  }, []);

  useEffect(() => {
    let res = items;
    if (filterStatus !== 'ALL') {
      res = res.filter(i => i.status === filterStatus);
    }
    setFilteredItems(res);
  }, [items, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('part_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const filteredParts = (parts || []).filter((p: any) => {
    const s = (itemSearch || '').toLowerCase();
    if (!s) return true;
    return (p.name || '').toLowerCase().includes(s) || (p.code || '').toLowerCase().includes(s);
  });

  const handlePartSelect = (partId: string) => {
    const part = parts.find((p: any) => p.id === partId);
    if (part) {
      const unitTitle = units.find((u: any) => u.id === (part.consumption_unit_id || part.stock_unit_id))?.title || (units[0]?.title || 'عدد');
      setCurrentItem({
        partId: part.id,
        partName: part.name || '',
        partCode: part.code,
        qty: currentItem.qty || 1,
        unit: unitTitle,
      });
    } else {
      setCurrentItem(prev => ({ ...prev, partId: '', partName: '', partCode: '' }));
    }
  };

  const handleAddItem = () => {
    const name = currentItem.partId ? (parts.find((p: any) => p.id === currentItem.partId)?.name || currentItem.partName) : currentItem.partName;
    if (!name?.trim() || !currentItem.qty || currentItem.qty <= 0 || !currentItem.unit) return;
    const item: PartItem = {
      partId: currentItem.partId,
      partName: name.trim(),
      partCode: currentItem.partCode,
      qty: currentItem.qty,
      unit: currentItem.unit,
      id: `item-${Date.now()}`,
    };
    if (isEditingItem !== null) {
      setLineItems(prev => prev.map((it, i) => i === isEditingItem ? item : it));
      setIsEditingItem(null);
    } else {
      setLineItems(prev => [...prev, item]);
    }
    setCurrentItem({ partId: '', partName: '', qty: 0, unit: (units && units[0]) ? units[0].title : 'عدد' });
  };

  const handleEditItem = (idx: number) => {
    const it = lineItems[idx];
    setCurrentItem({ partId: it.partId, partName: it.partName, partCode: it.partCode, qty: it.qty, unit: it.unit });
    setIsEditingItem(idx);
  };

  const handleRemoveItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
    if (isEditingItem === idx) { setCurrentItem({ partId: '', partName: '', qty: 0, unit: (units && units[0]) ? units[0].title : 'عدد' }); setIsEditingItem(null); }
    else if (isEditingItem !== null && isEditingItem > idx) setIsEditingItem(isEditingItem - 1);
  };

  const handleReset = () => {
    setFormData({ description: '', workOrderCode: '', requestDate: getShamsiDate() });
    setLineItems([]);
    setCurrentItem({ partId: '', partName: '', qty: 0, unit: (units && units[0]) ? units[0].title : 'عدد' });
    setIsEditingItem(null);
    setView('LIST');
  };

  const isFormValid = () => lineItems.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const trackingCode = await fetchNextTrackingCode('PR');
      const payload = {
        tracking_code: trackingCode,
        requester_id: user.id,
        requester_name: user.fullName || 'ناشناس',
        request_date: formData.requestDate,
        description: formData.description?.trim() || null,
        work_order_code: formData.workOrderCode?.trim() || null,
        status: 'PENDING',
        items: lineItems.map(it => ({
          part_id: it.partId || null,
          part_name: it.partName,
          part_code: it.partCode,
          qty: it.qty,
          unit: it.unit,
        })),
      };
      const { error } = await supabase.from('part_requests').insert(payload);
      if (error) throw error;
      alert('درخواست قطعه با موفقیت ثبت شد.');
      handleReset();
      fetchData();
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'خطا در ذخیره'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;
      
    if (dataToExport.length === 0) {
      alert('داده‌ای برای گزارش وجود ندارد.');
      return;
    }

    const rows = dataToExport.map(item => ({
      "کد پیگیری": item.tracking_code,
      "درخواست کننده": item.requester_name,
      "تاریخ درخواست": item.request_date,
      "وضعیت": item.status,
      "توضیحات": item.description
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PartRequests");
    XLSX.writeFile(wb, `part_requests_${Date.now()}.xlsx`);
  };

  const confirmDelete = async () => {
    await supabase.from('part_requests').delete().in('id', selectedIds);
    setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const extraActions = (
    <>
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => setView('NEW')} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="درخواست جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchData} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

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

  if (view === 'NEW') {
    return (
      <div className="w-full max-w-full pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><Package className="w-6 h-6 text-primary"/> درخواست کالا</h1>
          <button onClick={handleReset} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">اطلاعات درخواست</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">توضیحات</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" placeholder="شرح درخواست..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">تاریخ درخواست</label>
                <input type="text" value={formData.requestDate} readOnly className="w-full p-2.5 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">کد دستور کار</label>
                <input type="text" value={formData.workOrderCode} onChange={e => setFormData({...formData, workOrderCode: e.target.value})} className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" placeholder="WO-0001..." />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600"/>
              {isEditingItem !== null ? 'ویرایش قلم کالا' : 'افزودن قلم کالا'}
            </h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 mb-1">انتخاب قطعه <span className="text-red-500">*</span></label>
              <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="جستجو در لیست قطعات..." className="w-full p-2 mb-2 border rounded-lg text-sm" />
              <select value={currentItem.partId} onChange={e => handlePartSelect(e.target.value)} className="w-full p-3 border rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary">
                <option value="">-- قطعه را انتخاب کنید --</option>
                {filteredParts.slice(0, 100).map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">نام قطعه (اگر در لیست نبود)</label>
                <input type="text" value={currentItem.partName} onChange={e => setCurrentItem({...currentItem, partName: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary" placeholder="نام قطعه..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">تعداد <span className="text-red-500">*</span></label>
                <input type="number" min={0.01} step={0.01} value={currentItem.qty || ''} onChange={e => setCurrentItem({...currentItem, qty: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-center font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">واحد <span className="text-red-500">*</span></label>
                <select value={currentItem.unit || 'عدد'} onChange={e => setCurrentItem({...currentItem, unit: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary">
                  {(units && units.length > 0 ? units : [{ id: '1', title: 'عدد' }]).map((u: any) => <option key={u.id} value={u.title}>{u.title}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={handleAddItem} className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 font-bold transition">
                <Plus className="w-5 h-5" /> افزودن به لیست
              </button>
            </div>
          </div>

          {lineItems.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">لیست اقلام درخواستی</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b dark:border-gray-600 text-right"><th className="py-2 px-2">ردیف</th><th className="py-2 px-2">نام قطعه</th><th className="py-2 px-2">تعداد</th><th className="py-2 px-2">واحد</th><th className="py-2 px-2 w-20">عملیات</th></tr></thead>
                  <tbody>
                    {lineItems.map((it, idx) => (
                      <tr key={it.id || idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-2 px-2">{idx + 1}</td>
                        <td className="py-2 px-2">{it.partName}</td>
                        <td className="py-2 px-2 font-bold">{it.qty}</td>
                        <td className="py-2 px-2">{it.unit}</td>
                        <td className="py-2 px-2 flex gap-1">
                          <button type="button" onClick={() => handleEditItem(idx)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4"/></button>
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={handleReset} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
            <button type="submit" disabled={!isFormValid() || isSubmitting} className={`flex-[2] py-3 rounded-xl shadow flex justify-center gap-2 font-bold transition ${isFormValid() && !isSubmitting ? 'bg-primary text-white hover:bg-red-800' : 'bg-gray-400 text-gray-500 cursor-not-allowed'}`}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />} ثبت درخواست
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف درخواست"
        message={`آیا از حذف ${selectedIds.length} مورد انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="لیست درخواست قطعه"
        icon={Package}
        data={filteredItems}
        isLoading={loading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'درخواست کننده', accessor: (i: any) => i.requester_name, sortKey: 'requester_name' },
          { header: 'تاریخ', accessor: (i: any) => i.request_date, sortKey: 'request_date' },
          { header: 'وضعیت', accessor: (i: any) => (
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              i.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
              i.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
              'bg-yellow-100 text-yellow-700'
            }`}>
              {i.status === 'PENDING' ? 'در حال بررسی' : i.status === 'APPROVED' ? 'تایید شده' : 'رد شده'}
            </span>
          ), sortKey: 'status' },
          { header: 'توضیحات', accessor: (i: any) => i.description || '-', sortKey: 'description' },
          { header: 'اقلام', accessor: (i: any) => Array.isArray(i.items) ? i.items.length + ' قلم' : '-', sortKey: 'items' },
        ]}
      />
    </div>
  );
};

export default PartRequests;