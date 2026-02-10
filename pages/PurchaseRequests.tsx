
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ShoppingCart } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

interface Props {
  user: User;
}

export const PurchaseRequests: React.FC<Props> = ({ user }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const handleDelete = async (ids: string[]) => {
    await supabase.from('purchase_requests').delete().in('id', ids);
    setRequests(prev => prev.filter(r => !ids.includes(r.id)));
    setSelectedIds([]);
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
      <DataPage
        title="درخواست‌های خرید"
        icon={ShoppingCart}
        data={filteredRequests}
        isLoading={loading}
        onAdd={() => setView('NEW')}
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
          { header: 'وضعیت', accessor: (r: any) => r.status, sortKey: 'status' },
        ]}
      />
  );
};

export default PurchaseRequests;
