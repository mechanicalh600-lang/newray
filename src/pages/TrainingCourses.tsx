
import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

export const TrainingCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  const confirmDelete = async () => {
    await supabase.from('training_courses').delete().in('id', selectedIds);
    setCourses(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredCourses.filter(c => selectedIds.includes(c.id))
      : filteredCourses;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Courses");
    XLSX.writeFile(wb, `courses_${Date.now()}.xlsx`);
  };

  const extraActions = (
    <>
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => alert('تعریف دوره جدید (شبیه‌سازی)')} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="دوره جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchCourses} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">برگزار کننده</label>
        <input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterProvider} onChange={e => setFilterProvider(e.target.value)} placeholder="نام موسسه..." />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف دوره"
        message={`آیا از حذف ${selectedIds.length} دوره انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="لیست دوره‌های آموزشی"
        icon={BookOpen}
        data={filteredCourses}
        isLoading={loading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'کد دوره', accessor: (c: any) => <span className="font-mono font-bold">{c.code}</span> },
          { header: 'عنوان دوره', accessor: (c: any) => c.title },
          { header: 'مدت (ساعت)', accessor: (c: any) => c.duration_hours },
          { header: 'برگزار کننده', accessor: (c: any) => c.provider },
        ]}
      />
    </div>
  );
};

export default TrainingCourses;
