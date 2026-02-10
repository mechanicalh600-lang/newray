
import React, { useState, useEffect } from 'react';
import { Award, Plus, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

export const Training: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState('ALL');

  useEffect(() => {
    fetchSkills();
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
      setSkills(data.map((s:any) => ({
        ...s,
        full_name: s.personnel?.full_name,
        personnel_code: s.personnel?.personnel_code
      })));
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    await supabase.from('personnel_skills').delete().in('id', selectedIds);
    setSkills(prev => prev.filter(s => !selectedIds.includes(s.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredSkills.filter(s => selectedIds.includes(s.id))
      : filteredSkills;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Skills");
    XLSX.writeFile(wb, `skills_${Date.now()}.xlsx`);
  };

  const extraActions = (
    <>
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => alert('ثبت مهارت جدید (شبیه‌سازی)')} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="مهارت جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchSkills} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">سطح تسلط</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="Beginner">مقدماتی</option>
          <option value="Intermediate">متوسط</option>
          <option value="Expert">پیشرفته</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف مهارت"
        message={`آیا از حذف ${selectedIds.length} مورد انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="ماتریس مهارت پرسنل"
        icon={Award}
        data={filteredSkills}
        isLoading={loading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'نام پرسنل', accessor: (s: any) => s.full_name },
          { header: 'کد پرسنلی', accessor: (s: any) => s.personnel_code },
          { header: 'نام مهارت', accessor: (s: any) => s.skill_name },
          { header: 'سطح', accessor: (s: any) => s.level },
          { header: 'تاریخ اخذ مدرک', accessor: (s: any) => s.certificate_date || '-' },
        ]}
      />
    </div>
  );
};
export default Training;
