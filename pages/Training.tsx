
import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

export const Training: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const handleDelete = async (ids: string[]) => {
    await supabase.from('personnel_skills').delete().in('id', ids);
    setSkills(prev => prev.filter(s => !ids.includes(s.id)));
    setSelectedIds([]);
  };

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
      <DataPage
        title="ماتریس مهارت پرسنل"
        icon={Award}
        data={filteredSkills}
        isLoading={loading}
        onAdd={() => alert('ثبت مهارت جدید (شبیه‌سازی)')}
        onReload={fetchSkills}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => alert('ویرایش')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        exportName="Skills"
        columns={[
          { header: 'نام پرسنل', accessor: (s: any) => s.full_name, sortKey: 'full_name' },
          { header: 'کد پرسنلی', accessor: (s: any) => s.personnel_code, sortKey: 'personnel_code' },
          { header: 'نام مهارت', accessor: (s: any) => s.skill_name, sortKey: 'skill_name' },
          { header: 'سطح', accessor: (s: any) => s.level, sortKey: 'level' },
          { header: 'تاریخ اخذ مدرک', accessor: (s: any) => s.certificate_date || '-', sortKey: 'certificate_date' },
        ]}
      />
  );
};
export default Training;