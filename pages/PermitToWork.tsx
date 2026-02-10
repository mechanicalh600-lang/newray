
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ShieldCheck, Flame, FileSignature, AlertTriangle, CheckSquare, X } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import { fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { ClockTimePicker } from '../components/ClockTimePicker';

export const PermitToWork: React.FC<{ user: User }> = ({ user }) => {
  const [permits, setPermits] = useState<any[]>([]);
  const [filteredPermits, setFilteredPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [newPermit, setNewPermit] = useState({
      type: 'HOT_WORK', equipmentId: '', hazards: [] as string[], precautions: [] as string[], startTime: '', endTime: ''
  });
  const HAZARDS = ['گازهای قابل اشتعال', 'خطر برق‌گرفتگی', 'سقوط از ارتفاع', 'کمبود اکسیژن', 'مواد شیمیایی'];
  const PRECAUTIONS = ['ایزولاسیون الکتریکی', 'تهویه مناسب', 'استفاده از کمربند ایمنی', 'حضور نفر کمکی', 'کپسول آتش‌نشانی'];

  useEffect(() => {
      fetchPermits();
      fetchMasterData('equipment').then(setEquipmentList);
  }, []);

  useEffect(() => {
      let res = permits;
      if (filterType !== 'ALL') res = res.filter(p => p.permit_type === filterType);
      if (filterStatus !== 'ALL') res = res.filter(p => p.status === filterStatus);
      setFilteredPermits(res);
  }, [permits, filterType, filterStatus]);

  const fetchPermits = async () => {
      setLoading(true);
      const { data } = await supabase.from('work_permits').select('*, equipment(name)').order('created_at', { ascending: false });
      if (data) { setPermits(data); setFilteredPermits(data); }
      setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
      alert("حذف مجوز (شبیه‌سازی)");
      setPermits(prev => prev.filter(i => !ids.includes(i.id)));
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const code = await fetchNextTrackingCode('PTW');
          await supabase.from('work_permits').insert({
              tracking_code: code,
              permit_type: newPermit.type,
              equipment_id: newPermit.equipmentId,
              hazards: newPermit.hazards,
              precautions: newPermit.precautions,
              start_time: newPermit.startTime,
              end_time: newPermit.endTime,
              requester_id: user.id,
              status: 'PENDING'
          });
          setIsModalOpen(false);
          fetchPermits();
          alert(`مجوز کار با شماره ${code} صادر شد.`);
      } catch (e) { alert('خطا'); }
  };

  const getPermitLabel = (type: string) => {
      switch(type) {
          case 'HOT_WORK': return { label: 'کار گرم', color: 'text-red-600 bg-red-50 border-red-100', icon: Flame };
          case 'COLD_WORK': return { label: 'کار سرد', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: FileSignature };
          case 'HEIGHT': return { label: 'کار در ارتفاع', color: 'text-orange-600 bg-orange-50 border-orange-100', icon: AlertTriangle };
          default: return { label: type, color: 'text-gray-600 bg-gray-50 border-gray-200', icon: ShieldCheck };
      }
  };

  const columns = [
      { header: 'شماره مجوز', accessor: (p: any) => <span className="font-mono font-bold">{p.tracking_code}</span> },
      { header: 'نوع مجوز', accessor: (p: any) => { const i = getPermitLabel(p.permit_type); const Icon=i.icon; return <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold w-fit border ${i.color}`}><Icon className="w-3 h-3"/> {i.label}</span>; } },
      { header: 'تجهیز', accessor: (p: any) => p.equipment?.name || '---' },
      { header: 'زمان شروع', accessor: (p: any) => p.start_time },
      { header: 'زمان پایان', accessor: (p: any) => p.end_time },
      { header: 'وضعیت', accessor: (p: any) => p.status },
  ];

  const filterContent = (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">نوع مجوز</label>
              <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="ALL">همه</option>
                  <option value="HOT_WORK">کار گرم</option>
                  <option value="COLD_WORK">کار سرد</option>
              </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
              <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="ALL">همه</option>
                  <option value="PENDING">در انتظار</option>
                  <option value="APPROVED">تایید شده</option>
              </select>
          </div>
      </div>
  );

  return (
    <>
      <DataPage
        title="مجوزهای کار (PTW)"
        icon={ShieldCheck}
        data={filteredPermits}
        isLoading={loading}
        columns={columns}
        onAdd={() => setIsModalOpen(true)}
        onReload={fetchPermits}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        exportName="Permits"
      />
      
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-scaleIn">
                  <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-green-600"/> صدور پرمیت جدید</h3>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm mb-1">نوع مجوز</label><select className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={newPermit.type} onChange={e => setNewPermit({...newPermit, type: e.target.value})}><option value="HOT_WORK">کار گرم</option><option value="COLD_WORK">کار سرد</option><option value="HEIGHT">کار در ارتفاع</option><option value="CONFINED_SPACE">فضای بسته</option></select></div>
                      <div><label className="block text-sm mb-1">تجهیز</label><select className="w-full p-2.5 border rounded-xl dark:bg-gray-700" value={newPermit.equipmentId} onChange={e => setNewPermit({...newPermit, equipmentId: e.target.value})}><option value="">انتخاب...</option>{equipmentList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                      <div><ClockTimePicker label="ساعت شروع" value={newPermit.startTime} onChange={t => setNewPermit({...newPermit, startTime: t})} /></div>
                      <div><ClockTimePicker label="ساعت پایان" value={newPermit.endTime} onChange={t => setNewPermit({...newPermit, endTime: t})} /></div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900"><h4 className="font-bold text-red-700 mb-3 text-sm flex items-center gap-2"><Flame className="w-4 h-4"/> خطرات</h4><div className="grid grid-cols-2 gap-2">{HAZARDS.map(h => (<label key={h} className="flex items-center gap-2 text-xs font-medium cursor-pointer"><input type="checkbox" checked={newPermit.hazards.includes(h)} onChange={() => { const list = newPermit.hazards.includes(h) ? newPermit.hazards.filter(i=>i!==h) : [...newPermit.hazards, h]; setNewPermit({...newPermit, hazards: list}); }} /> {h}</label>))}</div></div>
                  <div className="pt-4 border-t dark:border-gray-700 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border rounded-xl hover:bg-gray-100 transition">انصراف</button>
                      <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-xl shadow hover:bg-red-800 transition">صدور مجوز</button>
                  </div>
              </form>
          </div>
      )}
    </>
  );
};

export default PermitToWork;
