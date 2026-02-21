import React, { useState, useEffect } from 'react';
import { BookOpen, Save, Loader2, X } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

const BLANK_COURSE = { id: '', code: '', title: '', duration_hours: '', provider: '' };

export const TrainingCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterProvider, setFilterProvider] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{ id: string; code: string; title: string; duration_hours: string | number; provider: string }>(BLANK_COURSE);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const openAddModal = () => {
    setEditingCourse(BLANK_COURSE);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    const id = selectedIds[0];
    const c = courses.find(x => x.id === id);
    if (c) {
      setEditingCourse({
        id: c.id,
        code: c.code || '',
        title: c.title || '',
        duration_hours: c.duration_hours ?? '',
        provider: c.provider || '',
      });
      setIsModalOpen(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse.title?.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        code: editingCourse.code?.trim() || null,
        title: editingCourse.title.trim(),
        duration_hours: editingCourse.duration_hours ? Number(editingCourse.duration_hours) : null,
        provider: editingCourse.provider?.trim() || null,
      };
      if (editingCourse.id) {
        await supabase.from('training_courses').update(payload).eq('id', editingCourse.id);
        alert('دوره با موفقیت ویرایش شد.');
      } else {
        await supabase.from('training_courses').insert(payload);
        alert('دوره با موفقیت اضافه شد.');
      }
      setIsModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      alert('خطا: ' + (err?.message || 'خطا در ذخیره'));
    } finally {
      setIsSubmitting(false);
    }
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
    <>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                <h3 className="font-bold text-lg">{editingCourse.id ? 'ویرایش دوره' : 'تعریف دوره جدید'}</h3>
                <button type="button" onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500"/></button>
              </div>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">کد دوره</label>
                  <input className="w-full p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={editingCourse.code} onChange={e => setEditingCourse({...editingCourse, code: e.target.value})} placeholder="اختیاری..." />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">عنوان دوره / مهارت <span className="text-red-500">*</span></label>
                  <input required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={editingCourse.title} onChange={e => setEditingCourse({...editingCourse, title: e.target.value})} placeholder="مثال: آموزش ایمنی عمومی" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1 font-medium">مدت (ساعت)</label>
                    <input type="number" className="w-full p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary text-center" value={editingCourse.duration_hours} onChange={e => setEditingCourse({...editingCourse, duration_hours: e.target.value})} placeholder="مثال: ۸" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 font-medium">برگزار کننده</label>
                    <input className="w-full p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={editingCourse.provider} onChange={e => setEditingCourse({...editingCourse, provider: e.target.value})} placeholder="مثال: واحد HSE" />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">انصراف</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white py-2.5 rounded-lg hover:bg-red-800 flex items-center justify-center gap-2 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4"/>}
                    {editingCourse.id ? 'ذخیره تغییرات' : 'افزودن دوره'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DataPage
        title="لیست دوره‌های آموزشی"
        icon={BookOpen}
        data={filteredCourses}
        isLoading={loading}
        onAdd={openAddModal}
        onReload={fetchCourses}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={openEditModal}
        onViewDetails={() => {}}
        exportName="Courses"
        columns={[
          { header: 'کد دوره', accessor: (c: any) => <span className="font-mono font-bold">{c.code || '-'}</span>, sortKey: 'code' },
          { header: 'عنوان دوره', accessor: (c: any) => c.title, sortKey: 'title' },
          { header: 'مدت (ساعت)', accessor: (c: any) => c.duration_hours ?? '-', sortKey: 'duration_hours' },
          { header: 'برگزار کننده', accessor: (c: any) => c.provider || '-', sortKey: 'provider' },
        ]}
      />
    </>
  );
};

export default TrainingCourses;
