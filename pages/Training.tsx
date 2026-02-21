import React, { useState, useEffect } from 'react';
import { Award, Save, Loader2, X } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { supabase } from '../supabaseClient';
import { fetchMasterData } from '../workflowStore';

const LEVELS = [
  { value: 'Beginner', label: 'مقدماتی' },
  { value: 'Intermediate', label: 'متوسط' },
  { value: 'Expert', label: 'پیشرفته / مدرس' },
];

const BLANK_SKILL = { personnelId: '', skillName: '', level: 'Beginner', certDate: '', expiryDate: '' };

export const Training: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSkill, setNewSkill] = useState(BLANK_SKILL);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    fetchMasterData('personnel').then((d: any) => setPersonnelList(d || []));
    supabase.from('training_courses').select('id, title').order('title').then(({ data }) => setCoursesList(data || []));
  }, []);

  useEffect(() => {
    let res = skills;
    if (filterLevel !== 'ALL') {
      res = res.filter(s => s.level === filterLevel);
    }
    setFilteredSkills(res);
  }, [skills, filterLevel]);

  const fetchSkills = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('personnel_skills')
      .select('*, personnel(full_name, personnel_code)')
      .order('created_at', { ascending: false });
    if (data) {
      setSkills(data.map((s: any) => ({
        ...s,
        full_name: s.personnel?.full_name,
        personnel_code: s.personnel?.personnel_code,
      })));
    }
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('personnel_skills').delete().in('id', ids);
    setSkills(prev => prev.filter(s => !ids.includes(s.id)));
    setSelectedIds([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.personnelId || !newSkill.skillName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await supabase.from('personnel_skills').insert({
        personnel_id: newSkill.personnelId,
        skill_name: newSkill.skillName,
        level: newSkill.level || null,
        certificate_date: newSkill.certDate || null,
        expiry_date: newSkill.expiryDate || null,
      });
      alert('مهارت با موفقیت ثبت شد.');
      setIsModalOpen(false);
      setNewSkill(BLANK_SKILL);
      fetchSkills();
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'خطا در ذخیره'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLevelLabel = (v: string) => LEVELS.find(l => l.value === v)?.label || v;

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">سطح تسلط</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="ALL">همه</option>
          {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <h3 className="font-bold text-lg mb-4">ثبت مهارت جدید</h3>
              <div>
                <label className="block text-sm mb-1 font-bold">پرسنل <span className="text-red-500">*</span></label>
                <select required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newSkill.personnelId} onChange={e => setNewSkill({...newSkill, personnelId: e.target.value})}>
                  <option value="">انتخاب کنید...</option>
                  {(personnelList || []).map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold">عنوان مهارت / دوره <span className="text-red-500">*</span></label>
                <select required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newSkill.skillName} onChange={e => setNewSkill({...newSkill, skillName: e.target.value})}>
                  <option value="">انتخاب دوره آموزشی...</option>
                  {(coursesList || []).map((c: any) => <option key={c.id} value={c.title}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold">سطح تسلط</label>
                <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newSkill.level} onChange={e => setNewSkill({...newSkill, level: e.target.value})}>
                  {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><ShamsiDatePicker label="تاریخ مدرک" value={newSkill.certDate} onChange={d => setNewSkill({...newSkill, certDate: d})} /></div>
                <div><ShamsiDatePicker label="تاریخ انقضا" value={newSkill.expiryDate} onChange={d => setNewSkill({...newSkill, expiryDate: d})} disableFuture={false} /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">انصراف</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white py-2.5 rounded-lg hover:bg-red-800 flex items-center justify-center gap-2 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} ثبت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DataPage
        title="ماتریس مهارت پرسنل"
        icon={Award}
        data={filteredSkills}
        isLoading={loading}
        onAdd={() => setIsModalOpen(true)}
        onReload={fetchSkills}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => {}}
        onViewDetails={() => {}}
        exportName="Skills"
        columns={[
          { header: 'نام پرسنل', accessor: (s: any) => s.full_name || '-', sortKey: 'full_name' },
          { header: 'کد پرسنلی', accessor: (s: any) => s.personnel_code || '-', sortKey: 'personnel_code' },
          { header: 'نام مهارت', accessor: (s: any) => s.skill_name, sortKey: 'skill_name' },
          { header: 'سطح', accessor: (s: any) => getLevelLabel(s.level) || s.level || '-', sortKey: 'level' },
          { header: 'تاریخ مدرک', accessor: (s: any) => s.certificate_date || '-', sortKey: 'certificate_date' },
          { header: 'تاریخ انقضا', accessor: (s: any) => s.expiry_date || '-', sortKey: 'expiry_date' },
        ]}
      />
    </>
  );
};
export default Training;