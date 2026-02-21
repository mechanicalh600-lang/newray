
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Timer, Plus, Play, Search, Edit, Trash2, FileSpreadsheet, RefreshCw, Filter, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { fetchMasterData } from '../workflowStore';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

const PMSchedulerComponent: React.FC<{ user: User }> = ({ user }) => {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/097c7630-12f5-40fb-a619-4417ec1884fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PMScheduler.tsx:mount', message: 'PMScheduler mounted', data: {}, timestamp: Date.now(), hypothesisId: 'H3-pms-mount' }) }).catch(() => {});
  } catch (_) {}
  // #endregion
  const [plans, setPlans] = useState<any[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newPlan, setNewPlan] = useState({
    title: '',
    equipmentId: '',
    frequencyType: 'WEEKLY',
    frequencyValue: 1,
    nextRunDate: '',
    description: ''
  });

  const [filterFreq, setFilterFreq] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchMasterData('equipment').then(setEquipmentList);
  }, []);

  useEffect(() => {
    let res = plans;
    if (searchTerm) {
      res = res.filter(p =>
        p.title.includes(searchTerm) ||
        p.equipName?.includes(searchTerm) ||
        p.equipCode?.includes(searchTerm)
      );
    }
    if (filterFreq !== 'ALL') {
      res = res.filter(p => p.frequency_type === filterFreq);
    }
    if (filterStatus !== 'ALL') {
      const isActive = filterStatus === 'ACTIVE';
      res = res.filter(p => p.is_active === isActive);
    }
    setFilteredPlans(res);
  }, [plans, searchTerm, filterFreq, filterStatus]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pm_plans')
        .select(`*, equipment(name, code)`)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map((p: any) => {
          const { equipment, ...rest } = p;
          // #region agent log
          try {
            const eqName = equipment?.name; const eqCode = equipment?.code;
            if (typeof eqName === 'object' || typeof eqCode === 'object') {
              fetch('http://127.0.0.1:7242/ingest/097c7630-12f5-40fb-a619-4417ec1884fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PMScheduler:fetchPlans:mapping', message: 'equipment name/code is object', data: { eqType: typeof eqName, eqCodeType: typeof eqCode }, timestamp: Date.now(), hypothesisId: 'H4-equipment-obj' }) }).catch(() => {});
            }
          } catch (_) {}
          // #endregion
          const row: Record<string, string | number | boolean | null> = {
            id: rest.id ?? '',
            title: rest.title ?? '',
            equipment_id: rest.equipment_id ?? null,
            frequency_type: rest.frequency_type ?? '',
            frequency_value: Number(rest.frequency_value) || 0,
            next_run_date: rest.next_run_date ?? null,
            description: rest.description ?? null,
            is_active: Boolean(rest.is_active),
            last_run_date: rest.last_run_date ?? null,
            created_at: rest.created_at != null ? String(rest.created_at) : null,
            equipName: equipment?.name ? String(equipment.name) : '---',
            equipCode: equipment?.code ? String(equipment.code) : '---'
          };
          return row;
        });
        setPlans(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: newPlan.title,
        equipment_id: newPlan.equipmentId,
        frequency_type: newPlan.frequencyType,
        frequency_value: newPlan.frequencyValue,
        next_run_date: newPlan.nextRunDate,
        description: newPlan.description,
        is_active: true
      };
      await supabase.from('pm_plans').insert([payload]);
      setIsModalOpen(false);
      fetchPlans();
      alert('برنامه نت با موفقیت ایجاد شد.');
      setNewPlan({
        title: '',
        equipmentId: '',
        frequencyType: 'WEEKLY',
        frequencyValue: 1,
        nextRunDate: '',
        description: ''
      });
    } catch (e) {
      alert('خطا در ثبت برنامه.');
    }
  };

  const handleDelete = async (ids: string[]) => {
    const { error } = await supabase.from('pm_plans').delete().in('id', ids);
    if (error) throw error;
    setPlans(prev => prev.filter(p => !ids.includes(p.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = () => handleDelete(selectedIds);

  const handleIssueWorkOrder = () => {
    alert(`صدور دستور کار برای ${selectedIds.length} مورد انتخاب شده انجام شد (شبیه‌سازی).`);
    setSelectedIds([]);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? filteredPlans.filter(p => selectedIds.includes(p.id))
      : filteredPlans;
    if (dataToExport.length === 0) return alert('داده‌ای برای خروجی وجود ندارد');

    const rows = dataToExport.map(item => {
      const row: Record<string, string | number | null> = {
        "عنوان برنامه": item.title ?? '',
        "تجهیز": item.equipName ?? '',
        "کد تجهیز": item.equipCode ?? '',
        "نوع تکرار": item.frequency_type ?? '',
        "مقدار": Number(item.frequency_value) || 0,
        "اجرای بعدی": item.next_run_date ?? '',
        "وضعیت": item.is_active ? 'فعال' : 'غیرفعال'
      };
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM_Plans");
    XLSX.writeFile(wb, `pm_scheduler_${Date.now()}.xlsx`);
  };

  const getFrequencyLabel = (type: string, val: number) => {
    if (type === 'WEEKLY') return `هر ${val} هفته`;
    if (type === 'MONTHLY') return `هر ${val} ماه`;
    if (type === 'HOURS') return `هر ${val} ساعت کارکرد`;
    return type;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filteredPlans.map(p => p.id) : []);
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="w-full max-w-full pb-20 space-y-2">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف برنامه نت"
        message={`آیا از حذف ${selectedIds.length} مورد انتخاب شده اطمینان دارید؟`}
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
          <Timer className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">زمان‌بندی نت پیشگیرانه (PM)</h1>
          <p className="text-xs text-gray-500 mt-1">مدیریت و مشاهده لیست برنامه‌های PM</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در برنامه‌ها..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {selectedIds.length > 0 && (
              <>
                <button onClick={handleIssueWorkOrder} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="صدور دستور کار">
                  <Play className="w-5 h-5" />
                </button>
                {selectedIds.length === 1 && (
                  <button onClick={() => alert('ویرایش (پیاده‌سازی نشده)')} className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition" title="ویرایش">
                    <Edit className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
              </>
            )}
            <button onClick={() => setIsModalOpen(true)} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="جدید">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button onClick={fetchPlans} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg border transition ${isFilterOpen ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}
              title="فیلترها"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        {isFilterOpen && (
          <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 p-4 animate-fadeIn grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">نوع تکرار</label>
              <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterFreq} onChange={e => setFilterFreq(e.target.value)}>
                <option value="ALL">همه</option>
                <option value="WEEKLY">هفتگی</option>
                <option value="MONTHLY">ماهانه</option>
                <option value="HOURS">ساعت کارکرد</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
              <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="ALL">همه</option>
                <option value="ACTIVE">فعال</option>
                <option value="INACTIVE">غیرفعال</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 relative">
        <div className="overflow-x-auto min-h-[520px]">
          <table className="w-full text-right text-sm">
            <thead className="reports-table-header text-gray-800 dark:text-gray-200 font-medium border-b-2 border-orange-300/60 dark:border-orange-600/50 shadow-sm">
              <tr className="cursor-default">
                <th className="px-3 pt-3 pb-2 w-10 border-l border-gray-200 dark:border-gray-700/50">
                  <button type="button" onClick={handleSelectAll} className={`inline-flex items-center justify-center p-1 rounded-full ${filteredPlans.length > 0 && selectedIds.length === filteredPlans.length ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-green-600'}`}>
                    {filteredPlans.length > 0 && selectedIds.length === filteredPlans.length ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                </th>
                <th className="px-3 pt-3 pb-2 whitespace-nowrap min-w-[120px] border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">عنوان برنامه</th>
                <th className="px-3 pt-3 pb-2 whitespace-nowrap min-w-[120px] border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">تجهیز</th>
                <th className="px-3 pt-3 pb-2 whitespace-nowrap min-w-[100px] border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">تکرار</th>
                <th className="px-3 pt-3 pb-2 whitespace-nowrap min-w-[110px] border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">اجرای بعدی</th>
                <th className="px-3 pt-3 pb-2 whitespace-nowrap min-w-[110px] border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">آخرین اجرا</th>
                <th className="px-3 pt-3 pb-2 whitespace-nowrap min-w-[80px] border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">در حال دریافت اطلاعات...</td></tr>
              ) : filteredPlans.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">موردی یافت نشد.</td></tr>
              ) : (
                filteredPlans.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${selectedIds.includes(p.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-3 py-2 border-l border-gray-100 dark:border-gray-700/50">
                      <button type="button" onClick={() => handleSelectOne(p.id)} className={`p-1.5 rounded-full ${selectedIds.includes(p.id) ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-green-600'}`}>
                        {selectedIds.includes(p.id) ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 border-l border-gray-100 dark:border-gray-700/50 font-bold text-gray-700 dark:text-gray-200">{String(p.title ?? '')}</td>
                    <td className="px-3 py-2 border-l border-gray-100 dark:border-gray-700/50">
                      <div className="flex flex-col">
                        <span>{String(p.equipName ?? '')}</span>
                        <span className="text-xs text-gray-400 font-mono">{String(p.equipCode ?? '')}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-l border-gray-100 dark:border-gray-700/50">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold border border-blue-100">{getFrequencyLabel(String(p.frequency_type ?? ''), Number(p.frequency_value) || 0)}</span>
                    </td>
                    <td className="px-3 py-2 border-l border-gray-100 dark:border-gray-700/50 font-mono text-gray-600 dark:text-gray-300">{String(p.next_run_date ?? 'تعیین نشده')}</td>
                    <td className="px-3 py-2 border-l border-gray-100 dark:border-gray-700/50 font-mono text-gray-500">{String(p.last_run_date ?? '-')}</td>
                    <td className="px-3 py-2 border-l border-gray-100 dark:border-gray-700/50 last:border-l-0">
                      {p.is_active ? <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded border border-green-100">فعال</span> : <span className="text-gray-400 text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">غیرفعال</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">تعریف برنامه PM جدید</h3>

            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">عنوان برنامه</label>
              <input required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newPlan.title} onChange={e => setNewPlan({ ...newPlan, title: e.target.value })} placeholder="مثال: سرویس ماهیانه پمپ..." />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">تجهیز مرتبط</label>
              <select required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newPlan.equipmentId} onChange={e => setNewPlan({ ...newPlan, equipmentId: e.target.value })}>
                <option value="">انتخاب تجهیز...</option>
                {equipmentList.map(e => {
          // #region agent log
          const _eid = e?.id; const _en = e?.name; const _ec = e?.code;
          if (typeof _eid === 'object' || typeof _en === 'object' || typeof _ec === 'object') {
            try { fetch('http://127.0.0.1:7242/ingest/097c7630-12f5-40fb-a619-4417ec1884fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PMScheduler:equipmentList.map', message: 'equipment id/name/code is object', data: { idT: typeof _eid, nameT: typeof _en, codeT: typeof _ec }, timestamp: Date.now(), hypothesisId: 'H5-equip-select' }) }).catch(() => {}); } catch (_) {}
          }
          // #endregion
          return <option key={String(e?.id ?? '')} value={String(e?.id ?? '')}>{String(e?.name ?? '')} ({String(e?.code ?? '')})</option>;
        })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">نوع تکرار</label>
                <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newPlan.frequencyType} onChange={e => setNewPlan({ ...newPlan, frequencyType: e.target.value })}>
                  <option value="WEEKLY">هفتگی</option>
                  <option value="MONTHLY">ماهانه</option>
                  <option value="HOURS">کارکرد (ساعت)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">مقدار بازه</label>
                <input type="number" min="1" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 text-center outline-none focus:ring-2 focus:ring-primary" value={newPlan.frequencyValue} onChange={e => setNewPlan({ ...newPlan, frequencyValue: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <ShamsiDatePicker label="تاریخ اولین اجرا" value={newPlan.nextRunDate} onChange={d => setNewPlan({ ...newPlan, nextRunDate: d })} disableFuture={false} />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">توضیحات / چک لیست</label>
              <textarea className="w-full p-2.5 border rounded-xl dark:bg-gray-700 h-24 outline-none focus:ring-2 focus:ring-primary" value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} placeholder="شرح کارهایی که باید انجام شود..." />
            </div>

            <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">انصراف</button>
              <button type="submit" className="flex-1 bg-primary text-white py-2.5 rounded-xl hover:bg-red-800 transition shadow-lg">ذخیره برنامه</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { PMSchedulerComponent as PMScheduler };
export default PMSchedulerComponent;
