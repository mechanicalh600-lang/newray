
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { FileSignature, Plus, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
}

export const Meetings: React.FC<Props> = ({ user }) => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  const confirmDelete = async () => {
    await supabase.from('meeting_minutes').delete().in('id', selectedIds);
    setMeetings(prev => prev.filter(m => !selectedIds.includes(m.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredMeetings.filter(m => selectedIds.includes(m.id))
      : filteredMeetings;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Meetings");
    XLSX.writeFile(wb, `meetings_${Date.now()}.xlsx`);
  };

  const extraActions = (
    <>
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => setViewMode('NEW')} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="جلسه جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchMeetings} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">تاریخ جلسه</label>
        <input 
          type="text" 
          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" 
          placeholder="1403/--/--" 
          value={filterDate} 
          onChange={e => setFilterDate(e.target.value)} 
        />
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
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف جلسه"
        message={`آیا از حذف ${selectedIds.length} جلسه انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="مدیریت صورتجلسات"
        icon={FileSignature}
        data={filteredMeetings}
        isLoading={loading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'کد پیگیری', accessor: (m: any) => <span className="font-mono font-bold">{m.tracking_code}</span> },
          { header: 'موضوع جلسه', accessor: (m: any) => m.subject },
          { header: 'تاریخ', accessor: (m: any) => m.meeting_date },
          { header: 'مکان', accessor: (m: any) => m.location || '-' },
          { header: 'وضعیت', accessor: (m: any) => m.status },
        ]}
      />
    </div>
  );
};

export default Meetings;
