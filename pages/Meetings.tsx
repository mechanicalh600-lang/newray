
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { FileSignature } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';

interface Props {
  user: User;
}

export const Meetings: React.FC<Props> = ({ user }) => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    let res = meetings;
    if (filterDate) {
      res = res.filter(m => m.meeting_date === filterDate);
    }
    setFilteredMeetings(res);
  }, [meetings, filterDate]);

  const fetchMeetings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('meeting_minutes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setMeetings(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('meeting_minutes').delete().in('id', ids);
    setMeetings(prev => prev.filter(m => !ids.includes(m.id)));
    setSelectedIds([]);
  };

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <ShamsiDatePicker label="تاریخ جلسه" value={filterDate} onChange={setFilterDate} />
      </div>
    </div>
  );

  if (viewMode === 'NEW') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">ثبت صورتجلسه جدید</h2>
        <div className="text-center text-gray-500 py-10">فرم صورتجلسه در حال پیاده‌سازی است...</div>
        <button onClick={() => setViewMode('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
      <DataPage
        title="مدیریت صورتجلسات"
        icon={FileSignature}
        data={filteredMeetings}
        isLoading={loading}
        onAdd={() => setViewMode('NEW')}
        onReload={fetchMeetings}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => setViewMode('NEW')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        exportName="Meetings"
        columns={[
          { header: 'کد پیگیری', accessor: (m: any) => <span className="font-mono font-bold">{m.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'موضوع جلسه', accessor: (m: any) => m.subject, sortKey: 'subject' },
          { header: 'تاریخ', accessor: (m: any) => m.meeting_date, sortKey: 'meeting_date' },
          { header: 'مکان', accessor: (m: any) => m.location || '-', sortKey: 'location' },
          { header: 'وضعیت', accessor: (m: any) => m.status, sortKey: 'status' },
        ]}
      />
  );
};

export default Meetings;
