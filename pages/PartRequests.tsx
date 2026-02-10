
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Package, Plus, Trash2, CheckCircle, XCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

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

  useEffect(() => {
    fetchData();
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
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">ثبت درخواست قطعه جدید</h2>
        <div className="text-center text-gray-500 py-10">فرم درخواست قطعه در حال پیاده‌سازی است...</div>
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
        ]}
      />
    </div>
  );
};

export default PartRequests;