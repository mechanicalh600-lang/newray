
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ShoppingCart, Plus, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
}

export const PurchaseRequests: React.FC<Props> = ({ user }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchRequests();
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

  const confirmDelete = async () => {
    await supabase.from('purchase_requests').delete().in('id', selectedIds);
    setRequests(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredRequests.filter(r => selectedIds.includes(r.id))
      : filteredRequests;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PurchaseRequests");
    XLSX.writeFile(wb, `purchase_requests_${Date.now()}.xlsx`);
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
      <button onClick={fetchRequests} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
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
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">ثبت درخواست خرید جدید</h2>
        <div className="text-center text-gray-500 py-10">فرم درخواست خرید در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف درخواست"
        message={`آیا از حذف ${selectedIds.length} مورد انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="درخواست‌های خرید"
        icon={ShoppingCart}
        data={filteredRequests}
        isLoading={loading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'شماره درخواست', accessor: (r: any) => <span className="font-mono font-bold">{r.request_number}</span> },
          { header: 'درخواست کننده', accessor: (r: any) => r.requester_name },
          { header: 'تاریخ درخواست', accessor: (r: any) => r.request_date },
          { header: 'شرح کالا/خدمات', accessor: (r: any) => r.description },
          { header: 'تعداد', accessor: (r: any) => `${r.qty} ${r.unit || ''}` },
          { header: 'وضعیت', accessor: (r: any) => r.status },
        ]}
      />
    </div>
  );
};

export default PurchaseRequests;
