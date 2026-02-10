
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Briefcase, Plus, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
}

export const Projects: React.FC<Props> = ({ user }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let res = projects;
    if (filterStatus !== 'ALL') {
      res = res.filter(p => p.status === filterStatus);
    }
    setFilteredProjects(res);
  }, [projects, filterStatus]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProjects(data);
    setLoading(false);
  };

  const confirmDelete = async () => {
    await supabase.from('projects').delete().in('id', selectedIds);
    setProjects(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredProjects.filter(p => selectedIds.includes(p.id))
      : filteredProjects;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `projects_${Date.now()}.xlsx`);
  };

  const extraActions = (
    <>
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => setView('NEW')} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="پروژه جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchProjects} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت پروژه</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="PLANNED">برنامه‌ریزی شده</option>
          <option value="IN_PROGRESS">در حال اجرا</option>
          <option value="COMPLETED">تکمیل شده</option>
          <option value="HALTED">متوقف شده</option>
        </select>
      </div>
    </div>
  );

  if (view === 'NEW') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">تعریف پروژه جدید</h2>
        <div className="text-center text-gray-500 py-10">فرم تعریف پروژه در حال پیاده‌سازی است...</div>
        <button onClick={() => setView('LIST')} className="bg-gray-200 px-4 py-2 rounded">بازگشت</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف پروژه"
        message={`آیا از حذف ${selectedIds.length} پروژه انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="مدیریت پروژه‌ها"
        icon={Briefcase}
        data={filteredProjects}
        isLoading={loading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'کد پروژه', accessor: (p: any) => <span className="font-mono font-bold">{p.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'عنوان پروژه', accessor: (p: any) => p.title, sortKey: 'title' },
          { header: 'مدیر پروژه', accessor: (p: any) => p.manager_name, sortKey: 'manager_name' },
          { header: 'شروع', accessor: (p: any) => p.start_date, sortKey: 'start_date' },
          { header: 'پایان', accessor: (p: any) => p.end_date, sortKey: 'end_date' },
          { header: 'پیشرفت', accessor: (p: any) => `${p.progress}%`, sortKey: 'progress' },
          { header: 'وضعیت', accessor: (p: any) => p.status, sortKey: 'status' },
        ]}
      />
    </div>
  );
};

export default Projects;
