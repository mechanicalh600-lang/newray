
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Lightbulb } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

interface Props {
  user: User;
}

export const Suggestions: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      .from('technical_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('technical_suggestions').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
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
        <h2 className="text-xl font-bold mb-4">ثبت پیشنهاد فنی جدید</h2>
        <div className="text-center text-gray-500 py-10">فرم ثبت پیشنهاد در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
      <DataPage
        title="نظام پیشنهادات فنی"
        icon={Lightbulb}
        data={filteredItems}
        isLoading={loading}
        onAdd={() => setView('NEW')}
        onReload={fetchData}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => setView('NEW')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        exportName="Suggestions"
        columns={[
          { header: 'کد رهگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'پیشنهاد دهنده', accessor: (i: any) => i.user_name || 'ناشناس', sortKey: 'user_name' },
          { header: 'شرح پیشنهاد', accessor: (i: any) => i.description, sortKey: 'description' },
          { header: 'وضعیت', accessor: (i: any) => i.status, sortKey: 'status' },
          { header: 'تاریخ ثبت', accessor: (i: any) => new Date(i.created_at).toLocaleDateString('fa-IR'), sortKey: 'created_at' },
        ]}
      />
  );
};

export default Suggestions;
