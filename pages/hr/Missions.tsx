import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { MapPin, Plus, Save, Loader2, X, Users } from 'lucide-react';
import { DataPage } from '../../components/DataPage';
import { ShamsiDatePicker } from '../../components/ShamsiDatePicker';
import { supabase } from '../../supabaseClient';
import { getShamsiDate } from '../../utils';
import { fetchMasterData, fetchNextTrackingCode } from '../../workflowStore';
import { startEntityWorkflow } from '../../services/entityWorkflow';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تایید',
  APPROVED: 'تایید شده',
  COMPLETED: 'انجام شده',
  CANCELLED: 'لغو شده',
};

const TRANSPORT_OPTIONS = ['شرکت', 'شخصی', 'وسیله عمومی', 'سایر'];

interface Props {
  user: User;
}

export const Missions: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    personnelId: '',
    personnelName: '',
    personnelCode: '',
    unit: '',
    missionDate: getShamsiDate(),
    startDate: getShamsiDate(),
    endDate: getShamsiDate(),
    destination: '',
    purpose: '',
    transportType: 'شرکت',
    approverName: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
    fetchMasterData('personnel').then((d: any) => setPersonnelList(d || []));
  }, []);

  useEffect(() => {
    let res = items;
    if (filterStatus !== 'ALL') res = res.filter(i => i.status === filterStatus);
    setFiltered(res);
  }, [items, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('personnel_missions').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('personnel_missions').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const resetForm = () => {
    setForm({
      personnelId: '',
      personnelName: '',
      personnelCode: '',
      unit: '',
      missionDate: getShamsiDate(),
      startDate: getShamsiDate(),
      endDate: getShamsiDate(),
      destination: '',
      purpose: '',
      transportType: 'شرکت',
      approverName: '',
      description: '',
    });
    setViewMode('LIST');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personnelName.trim() || !form.destination.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const code = await fetchNextTrackingCode('MIS');
      const row = {
        tracking_code: code,
        personnel_id: form.personnelId || null,
        personnel_name: form.personnelName.trim(),
        personnel_code: form.personnelCode || null,
        unit: form.unit || null,
        mission_date: form.missionDate,
        start_date: form.startDate,
        end_date: form.endDate,
        destination: form.destination.trim(),
        purpose: form.purpose?.trim() || null,
        transport_type: form.transportType,
        approver_name: form.approverName?.trim() || null,
        description: form.description?.trim() || null,
        status: 'PENDING',
        requester_id: user.id,
        requester_name: user.fullName,
      };
      const { data: inserted, error } = await supabase.from('personnel_missions').insert(row).select('id').single();
      if (error) throw error;
      await startEntityWorkflow('MISSION', user, {
        entityId: inserted.id,
        trackingCode: code,
        title: `مأموریت: ${form.personnelName.trim()} — ${form.destination.trim()}`,
        data: row,
      });
      await fetchData();
      resetForm();
      alert(`مأموریت با شماره ${code} ثبت شد.`);
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'ثبت مأموریت ناموفق بود'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'شماره', accessor: (r: any) => <span className="font-mono font-bold">{r.tracking_code}</span> },
    { header: 'پرسنل', accessor: (r: any) => r.personnel_name },
    { header: 'مقصد', accessor: (r: any) => r.destination },
    { header: 'از تاریخ', accessor: (r: any) => r.start_date },
    { header: 'تا تاریخ', accessor: (r: any) => r.end_date },
    { header: 'وضعیت', accessor: (r: any) => STATUS_LABELS[r.status] || r.status },
  ];

  const filterContent = (
    <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
      <option value="ALL">همه وضعیت‌ها</option>
      {Object.entries(STATUS_LABELS).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );

  const filteredPersonnel = personnelList.filter((p: any) => {
    const s = personnelSearch.toLowerCase();
    if (!s) return true;
    return (p.full_name || '').toLowerCase().includes(s) || (p.personnel_code || '').toLowerCase().includes(s);
  });

  if (viewMode === 'NEW') {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fadeIn">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 p-6 space-y-5">
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="w-6 h-6 text-primary" /> ثبت مأموریت</h2>
            <button type="button" onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">پرسنل مأمور *</label>
            <div className="flex gap-2">
              <input readOnly className="flex-1 p-2.5 border rounded-xl dark:bg-gray-700" value={form.personnelName || 'انتخاب پرسنل...'} />
              <button type="button" onClick={() => setShowPersonnelModal(true)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-1">
                <Users className="w-4 h-4" /> انتخاب
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">تاریخ مأموریت</label>
              <ShamsiDatePicker value={form.missionDate} onChange={v => setForm(f => ({ ...f, missionDate: v }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">از تاریخ</label>
              <ShamsiDatePicker value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تا تاریخ</label>
              <ShamsiDatePicker value={form.endDate} onChange={v => setForm(f => ({ ...f, endDate: v }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">مقصد *</label>
            <input required className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">موضوع / هدف مأموریت</label>
            <textarea className="w-full p-2.5 border rounded-xl dark:bg-gray-700 h-24" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">نوع حمل‌ونقل</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.transportType} onChange={e => setForm(f => ({ ...f, transportType: e.target.value }))}>
                {TRANSPORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاییدکننده</label>
              <input className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={form.approverName} onChange={e => setForm(f => ({ ...f, approverName: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">توضیحات</label>
            <textarea className="w-full p-2.5 border rounded-xl dark:bg-gray-700 h-20" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            ثبت مأموریت
          </button>
        </form>

        {showPersonnelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-4 border-b dark:border-gray-700 flex justify-between">
                <span className="font-bold">انتخاب پرسنل</span>
                <button type="button" onClick={() => setShowPersonnelModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <input className="m-4 p-2 border rounded-lg dark:bg-gray-700" placeholder="جستجو..." value={personnelSearch} onChange={e => setPersonnelSearch(e.target.value)} />
              <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1">
                {filteredPersonnel.map((p: any) => (
                  <button key={p.id} type="button" className="w-full text-right p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        personnelId: p.id,
                        personnelName: p.full_name || '',
                        personnelCode: p.personnel_code || '',
                        unit: p.unit || p.org_unit_name || '',
                      }));
                      setShowPersonnelModal(false);
                    }}>
                    {p.full_name} — {p.personnel_code || '-'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <DataPage
      title="مأموریت"
      icon={MapPin}
      data={filtered}
      columns={columns}
      isLoading={loading}
      onAdd={() => setViewMode('NEW')}
      onReload={fetchData}
      onDelete={handleDelete}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      filterContent={filterContent}
      exportName="Missions"
      userId={user.id}
    />
  );
};

export default Missions;
