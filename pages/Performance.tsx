import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Award, Plus, Trash2, RefreshCw, FileSpreadsheet, Loader2, Users, X } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import { fetchMasterData } from '../workflowStore';
import * as XLSX from 'xlsx';

interface Criterion { id: string; label: string; max: number; score: number }

interface Props {
  user: User;
}

export const Performance: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('ALL');
  const [periods, setPeriods] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [allCriteria, setAllCriteria] = useState<any[]>([]);
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    personnelId: string; personnelName: string; unit: string; period: string;
    criteria: Criterion[];
  }>({ personnelId: '', personnelName: '', unit: '', period: '', criteria: [] });

  useEffect(() => {
    fetchData();
    fetchMasterData('evaluation_periods').then((d: any) => setPeriods(d || []));
    fetchMasterData('personnel').then((d: any) => setPersonnelList(d || []));
    supabase.from('evaluation_criteria').select('*').order('created_at').then(({ data }) => setAllCriteria(data || []));
  }, []);

  useEffect(() => {
    let res = items;
    if (filterPeriod !== 'ALL') {
      res = res.filter(i => i.period === filterPeriod);
    }
    setFilteredItems(res);
  }, [items, filterPeriod]);

  useEffect(() => {
    if (!formData.personnelId) {
      setFormData(prev => ({ ...prev, criteria: [] }));
      return;
    }
    const person = personnelList.find((p: any) => p.id === formData.personnelId);
    const orgUnitId = person?.org_unit_id;
    const filtered = allCriteria.filter((c: any) =>
      !c.org_unit_id || c.org_unit_id === orgUnitId
    );
    setFormData(prev => ({
      ...prev,
      criteria: filtered.map((c: any) => ({
        id: c.id,
        label: c.title || c.name || '',
        max: Number(c.max_score) || 10,
        score: 0,
      })),
    }));
  }, [formData.personnelId, personnelList, allCriteria]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('performance_evaluations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setIsLoading(false);
  };

  const confirmDelete = async () => {
    await supabase.from('performance_evaluations').delete().in('id', selectedIds);
    setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance");
    XLSX.writeFile(wb, `performance_${Date.now()}.xlsx`);
  };

  const handleSelectPersonnel = (p: any) => {
    setFormData(prev => ({
      ...prev,
      personnelId: p.id,
      personnelName: p.full_name || '',
      unit: p.unit || p.org_unit_name || '-',
    }));
    setShowPersonnelModal(false);
  };

  const handleScoreChange = (idx: number, value: number) => {
    setFormData(prev => {
      const next = [...prev.criteria];
      const c = next[idx];
      if (!c) return prev;
      const score = Math.max(0, Math.min(c.max, value));
      next[idx] = { ...c, score };
      return { ...prev, criteria: next };
    });
  };

  const totalScore = formData.criteria.reduce((sum, c) => sum + (c?.score || 0), 0);
  const maxPossibleScore = formData.criteria.reduce((sum, c) => sum + (c?.max || 0), 0) || 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.criteria.length === 0 || isSubmitting || !formData.personnelId || !formData.period) return;
    setIsSubmitting(true);
    try {
      const criteriaScores = formData.criteria.map(c => ({ id: c.id, label: c.label, max: c.max, score: c.score }));
      await supabase.from('performance_evaluations').insert({
        personnel_id: formData.personnelId,
        personnel_name: formData.personnelName,
        unit: formData.unit,
        period: formData.period,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        criteria_scores: criteriaScores,
        status: 'SUBMITTED',
      });
      alert('ارزیابی با موفقیت ثبت و ارسال شد.');
      setFormData({ personnelId: '', personnelName: '', unit: '', period: '', criteria: [] });
      setView('LIST');
      fetchData();
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'خطا در ذخیره'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPersonnel = (personnelList || []).filter((p: any) => {
    const s = (personnelSearch || '').toLowerCase();
    if (!s) return true;
    return (p.full_name || '').toLowerCase().includes(s) || (p.unit || '').toLowerCase().includes(s) || (p.personnel_code || '').toLowerCase().includes(s);
  });

  const extraActions = (
    <>
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => setView('NEW')} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="ارزیابی جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchData} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">دوره ارزیابی</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
          <option value="ALL">همه</option>
          {(periods || []).map((p: any) => <option key={p.id} value={p.title}>{p.title}</option>)}
        </select>
      </div>
    </div>
  );

  if (view === 'NEW') {
    return (
      <div className="w-full max-w-full pb-24">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white mb-6"><Award className="w-6 h-6 text-primary"/> ارزیابی عملکرد</h1>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">انتخاب پرسنل <span className="text-red-500">*</span></label>
              {formData.personnelName ? (
                <div className="flex items-center justify-between bg-white dark:bg-gray-600 p-3 rounded-lg border border-primary/30">
                  <div><p className="font-bold">{formData.personnelName}</p><p className="text-xs text-gray-500 dark:text-gray-300">واحد: {formData.unit}</p></div>
                  <button type="button" onClick={() => setShowPersonnelModal(true)} className="text-primary text-sm underline">تغییر</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowPersonnelModal(true)} className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" /> انتخاب از لیست پرسنل
                </button>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">دوره ارزیابی <span className="text-red-500">*</span></label>
              <select required value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} className="w-full p-3 border rounded-lg bg-white dark:bg-gray-600 outline-none focus:ring-2 focus:ring-primary">
                <option value="">{(periods && periods.length > 0) ? 'انتخاب...' : 'دوره‌ای تعریف نشده'}</option>
                {(periods || []).map((p: any) => <option key={p.id} value={p.title}>{p.title}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b dark:border-gray-600 pb-2 mb-4">
              <h3 className="font-bold">شاخص‌های ارزیابی</h3>
            </div>
            {formData.criteria.length > 0 ? formData.criteria.map((c, idx) => (
              <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <div className="mb-2 md:mb-0">
                  <span className="font-medium block">{idx + 1}. {c.label}</span>
                  <span className="text-xs text-gray-500">حداکثر نمره قابل قبول: {c.max}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={c.max} value={c.score} onChange={e => handleScoreChange(idx, Number(e.target.value))} className="w-20 p-2 border rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-primary dark:bg-gray-600" />
                  <span className="text-gray-400 text-sm">/ {c.max}</span>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-4 border-2 border-dashed rounded-xl">لطفا ابتدا پرسنل را انتخاب کنید تا فرم مربوطه بارگذاری شود.</p>
            )}
          </div>

          <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 pb-2 border-t dark:border-gray-700">
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4">
              <span className="font-bold text-lg text-blue-800 dark:text-blue-300">مجموع امتیاز کسب شده</span>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-black text-primary">{totalScore}</span><span className="text-gray-500">/ {maxPossibleScore || 100}</span></div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('LIST')} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">انصراف</button>
              <button type="submit" disabled={formData.criteria.length === 0 || isSubmitting} className="flex-[2] bg-primary text-white py-3 rounded-xl shadow-lg hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'ثبت نهایی و ارسال'}
              </button>
            </div>
          </div>
        </form>

        {showPersonnelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPersonnelModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold">انتخاب پرسنل</h3>
                <button onClick={() => setShowPersonnelModal(false)}><X className="w-5 h-5"/></button>
              </div>
              <input type="text" value={personnelSearch} onChange={e => setPersonnelSearch(e.target.value)} placeholder="جستجو..." className="m-4 p-2 border rounded-lg" />
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredPersonnel.slice(0, 50).map((p: any) => (
                  <button key={p.id} type="button" onClick={() => handleSelectPersonnel(p)} className="w-full text-right p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <span className="font-medium">{p.full_name}</span>
                    <span className="text-xs text-gray-500 block">واحد: {p.unit || '-'}</span>
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
    <div className="w-full max-w-full pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف ارزیابی"
        message={`آیا از حذف ${selectedIds.length} مورد انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="ارزیابی عملکرد پرسنل"
        icon={Award}
        data={filteredItems}
        isLoading={isLoading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'نام پرسنل', accessor: (i: any) => i.personnel_name, sortKey: 'personnel_name' },
          { header: 'واحد', accessor: (i: any) => i.unit, sortKey: 'unit' },
          { header: 'دوره', accessor: (i: any) => i.period, sortKey: 'period' },
          { header: 'امتیاز کل', accessor: (i: any) => <span className="font-bold text-blue-600">{i.total_score}</span>, sortKey: 'total_score' },
          { header: 'وضعیت', accessor: (i: any) => i.status, sortKey: 'status' },
        ]}
      />
    </div>
  );
};

export default Performance;
