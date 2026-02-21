import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { FileSignature, Plus, Trash2, Save, Loader2, X, Users } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { getShamsiDate } from '../utils';
import { compareShamsiDateTime } from '../utils';
import { fetchMasterData, fetchNextTrackingCode } from '../workflowStore';

const MEETING_ROLES = ['رئیس جلسه', 'دبیر', 'عضو', 'ناظر', 'مهمان'];

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

  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [roleList, setRoleList] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    subject: '', location: '', meetingDate: getShamsiDate(), startTime: '08:00', endTime: '10:00',
  });
  const [attendees, setAttendees] = useState<{ name: string; role: string }[]>([]);
  const [currentAttendee, setCurrentAttendee] = useState<{ name: string; role: string }>({ name: '', role: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMeetings();
    fetchMasterData('personnel').then((data: any) => setPersonnelList(data || []));
    fetchMasterData('user_groups').then((data: any) => {
      const roles = (data || []).map((r: any) => ({ id: r.id, name: r.name || r.code || '-' }));
      setRoleList(roles.length > 0 ? roles : MEETING_ROLES.map((n, i) => ({ id: String(i), name: n })));
    });
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

  const isTimeValid = () => {
    if (!formData.startTime || !formData.endTime) return true;
    return compareShamsiDateTime(formData.meetingDate, formData.startTime, formData.meetingDate, formData.endTime) < 0;
  };

  const handleAddAttendee = () => {
    if (!currentAttendee.name?.trim()) return;
    setAttendees(prev => [...prev, { name: currentAttendee.name.trim(), role: currentAttendee.role || '-' }]);
    setCurrentAttendee({ name: '', role: '' });
  };

  const removeAttendee = (idx: number) => setAttendees(prev => prev.filter((_, i) => i !== idx));

  const isFormValid = () =>
    !!formData.subject?.trim() && attendees.length > 0 && isTimeValid();

  const handleCancel = () => {
    setFormData({ subject: '', location: '', meetingDate: getShamsiDate(), startTime: '08:00', endTime: '10:00' });
    setAttendees([]);
    setCurrentAttendee({ name: '', role: '' });
    setViewMode('LIST');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const trackingCode = await fetchNextTrackingCode('MT');
      const { error } = await supabase.from('meeting_minutes').insert({
        tracking_code: trackingCode,
        subject: formData.subject.trim(),
        location: formData.location?.trim() || null,
        meeting_date: formData.meetingDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        attendees: attendees.map(a => ({ name: a.name, role: a.role })),
        status: 'DRAFT',
      });
      if (error) throw error;
      alert('صورتجلسه با موفقیت ثبت شد.');
      handleCancel();
      fetchMeetings();
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'خطا در ذخیره'));
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="w-full max-w-full pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><FileSignature className="w-6 h-6 text-primary"/> ثبت صورتجلسه</h1>
          <button onClick={handleCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1 font-medium">موضوع جلسه <span className="text-red-500">*</span></label>
              <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" placeholder="عنوان اصلی جلسه..." />
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">محل برگزاری</label>
              <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2.5 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <ShamsiDatePicker label="تاریخ برگزاری" value={formData.meetingDate} onChange={d => setFormData({...formData, meetingDate: d})} />
            </div>
            <div>
              <ClockTimePicker label="ساعت شروع" value={formData.startTime} onChange={t => setFormData({...formData, startTime: t})} />
            </div>
            <div>
              <ClockTimePicker label="ساعت اتمام" value={formData.endTime} onChange={t => setFormData({...formData, endTime: t})} error={formData.endTime && !isTimeValid() ? 'ساعت اتمام باید بعد از شروع باشد' : undefined} />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <label className="block text-sm mb-3 font-bold flex items-center gap-2 text-blue-800 dark:text-blue-300"><Users className="w-4 h-4" /> حاضرین در جلسه <span className="text-red-500">*</span></label>
            <div className="flex gap-2 mb-3 items-end">
              <div className="flex-[1] min-w-0">
                <label className="text-xs text-gray-500 block mb-1">نام شخص</label>
                <select className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 outline-none text-sm" value={currentAttendee.name} onChange={e => setCurrentAttendee({...currentAttendee, name: e.target.value})}>
                  <option value="">انتخاب...</option>
                  {(personnelList || []).map((p: any) => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="flex-[2] min-w-0">
                <label className="text-xs text-gray-500 block mb-1">سمت / مسئولیت</label>
                <select className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 outline-none text-sm" value={currentAttendee.role} onChange={e => setCurrentAttendee({...currentAttendee, role: e.target.value})}>
                  <option value="">انتخاب...</option>
                  {roleList.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <button type="button" onClick={handleAddAttendee} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 h-[38px] w-[38px] flex items-center justify-center"><Plus className="w-5 h-5"/></button>
            </div>
            {attendees.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {attendees.map((att, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold">{att.name}</span>
                      <span className="text-gray-400 text-xs">|</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{att.role}</span>
                    </div>
                    <button type="button" onClick={() => removeAttendee(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2 bg-white/50 rounded border border-dashed">هنوز کسی اضافه نشده است.</p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={handleCancel} className="flex-1 border border-gray-300 dark:border-gray-600 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500">انصراف</button>
            <button type="submit" disabled={!isFormValid() || isSubmitting} className={`flex-[2] text-white py-3 rounded-xl shadow hover:bg-red-800 flex justify-center gap-2 font-bold transition ${isFormValid() && !isSubmitting ? 'bg-primary' : 'bg-gray-400 cursor-not-allowed'}`}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />} ثبت نهایی صورتجلسه
            </button>
          </div>
        </form>
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
          { header: 'کد پیگیری', accessor: (m: any) => <span className="font-mono font-bold">{m.tracking_code || '-'}</span>, sortKey: 'tracking_code' },
          { header: 'موضوع جلسه', accessor: (m: any) => m.subject, sortKey: 'subject' },
          { header: 'تاریخ', accessor: (m: any) => m.meeting_date || '-', sortKey: 'meeting_date' },
          { header: 'ساعت', accessor: (m: any) => (m.start_time && m.end_time) ? `${m.start_time} - ${m.end_time}` : '-', sortKey: 'start_time' },
          { header: 'مکان', accessor: (m: any) => m.location || '-', sortKey: 'location' },
          { header: 'حاضرین', accessor: (m: any) => (Array.isArray(m.attendees) ? m.attendees.map((a: any) => a.name).join(' | ') : '-') || '-', sortKey: 'attendees' },
        ]}
      />
  );
};

export default Meetings;
