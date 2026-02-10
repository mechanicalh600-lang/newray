
import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

export const TrainingCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterProvider, setFilterProvider] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    let res = courses;
    if (filterProvider) {
      res = res.filter(c => c.provider?.includes(filterProvider));
    }
    setFilteredCourses(res);
  }, [courses, filterProvider]);

  const fetchCourses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('training_courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCourses(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('training_courses').delete().in('id', ids);
    setCourses(prev => prev.filter(c => !ids.includes(c.id)));
    setSelectedIds([]);
  };

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">برگزار کننده</label>
        <input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterProvider} onChange={e => setFilterProvider(e.target.value)} placeholder="نام موسسه..." />
      </div>
    </div>
  );

  return (
      <DataPage
        title="لیست دوره‌های آموزشی"
        icon={BookOpen}
        data={filteredCourses}
        isLoading={loading}
        onAdd={() => alert('تعریف دوره جدید (شبیه‌سازی)')}
        onReload={fetchCourses}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => alert('ویرایش')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        exportName="Courses"
        columns={[
          { header: 'کد دوره', accessor: (c: any) => <span className="font-mono font-bold">{c.code}</span>, sortKey: 'code' },
          { header: 'عنوان دوره', accessor: (c: any) => c.title, sortKey: 'title' },
          { header: 'مدت (ساعت)', accessor: (c: any) => c.duration_hours, sortKey: 'duration_hours' },
          { header: 'برگزار کننده', accessor: (c: any) => c.provider, sortKey: 'provider' },
        ]}
      />
  );
};

export default TrainingCourses;
