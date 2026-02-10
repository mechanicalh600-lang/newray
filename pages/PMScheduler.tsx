
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Timer, Plus, Play, Search, RefreshCw, Trash2, Edit, FileSpreadsheet, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { fetchMasterData } from '../workflowStore';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ConfirmModal } from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

export const PMScheduler: React.FC<{ user: User }> = ({ user }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterFreq, setFilterFreq] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [newPlan, setNewPlan] = useState({
      title: '',
      equipmentId: '',
      frequencyType: 'WEEKLY', // WEEKLY, MONTHLY, HOURS
      frequencyValue: 1,
      nextRunDate: '',
      description: ''
  });

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
              const mapped = data.map(p => ({
                  ...p,
                  equipName: p.equipment?.name || '---',
                  equipCode: p.equipment?.code || '---'
              }));
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

  const confirmDelete = async () => {
      try {
          const { error } = await supabase.from('pm_plans').delete().in('id', selectedIds);
          if (error) throw error;
          setPlans(prev => prev.filter(p => !selectedIds.includes(p.id)));
          setSelectedIds([]);
          setIsDeleteModalOpen(false);
      } catch (e) {
          alert('خطا در حذف.');
      }
  };

  const handleIssueWorkOrder = () => {
      alert(`صدور دستور کار برای ${selectedIds.length} مورد انتخاب شده انجام شد (شبیه‌سازی).`);
      setSelectedIds([]);
  };

  const handleExport = () => {
      if (filteredPlans.length === 0) return alert('داده‌ای برای خروجی وجود ندارد');
      
      const rows = filteredPlans.map(item => ({
          "عنوان برنامه": item.title,
          "تجهیز": item.equipName,
          "کد تجهیز": item.equipCode,
          "نوع تکرار": item.frequency_type,
          "مقدار": item.frequency_value,
          "اجرای بعدی": item.next_run_date,
          "وضعیت": item.is_active ? 'فعال' : 'غیرفعال'
      }));

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
      if (e.target.checked) {
          setSelectedIds(filteredPlans.map(p => p.id));
      } else {
          setSelectedIds([]);
      }
  };

  const handleSelectOne = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(i => i !== id));
      } else {
          setSelectedIds(prev => [...prev, id]);
      }
  };

  return (
      <div className="max-w-7xl mx-auto pb-20 p-4">
          <ConfirmModal 
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            title="حذف برنامه نت"
            message={`آیا مطمئن هستید که می‌خواهید ${selectedIds.length} برنامه انتخاب شده را حذف کنید؟ این عملیات غیرقابل بازگشت است.`}
          />

          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
               <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                    <Timer className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">زمان‌بندی نت پیشگیرانه (PM)</h1>
          </div>

          {/* Toolbar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
              <div className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
                  <div className="relative flex-1 w-full md:max-w-md">
                      <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                      <input 
                          type="text" 
                          placeholder="جستجو در برنامه‌ها (عنوان، تجهیز...)" 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      />
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      {selectedIds.length > 0 && (
                          <>
                              <button 
                                  onClick={handleIssueWorkOrder}
                                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition flex items-center gap-2"
                                  title="صدور دستور کار"
                              >
                                  <Play className="w-5 h-5" />
                                  <span className="text-xs font-bold hidden md:inline">صدور دستور کار</span>
                              </button>
                              
                              <div className="h-6 w-px bg-gray-300 mx-1"></div>

                              {selectedIds.length === 1 && (
                                  <button 
                                    className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition"
                                    title="ویرایش"
                                    onClick={() => alert('ویرایش (پیاده‌سازی نشده)')}
                                  >
                                      <Edit className="w-5 h-5" />
                                  </button>
                              )}
                              
                              <button 
                                  onClick={() => setIsDeleteModalOpen(true)}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                  title="حذف"
                              >
                                  <Trash2 className="w-5 h-5" />
                              </button>
                          </>
                      )}

                      <button 
                          onClick={() => setIsModalOpen(true)}
                          className="p-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition"
                          title="تعریف برنامه جدید"
                      >
                          <Plus className="w-5 h-5" />
                      </button>

                      <button 
                          onClick={handleExport}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                          title="خروجی اکسل"
                      >
                          <FileSpreadsheet className="w-5 h-5" />
                      </button>

                      <button 
                          onClick={fetchPlans} 
                          className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                          title="بروزرسانی"
                      >
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
                          <select 
                             className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 outline-none"
                             value={filterFreq}
                             onChange={e => setFilterFreq(e.target.value)}
                          >
                              <option value="ALL">همه</option>
                              <option value="WEEKLY">هفتگی</option>
                              <option value="MONTHLY">ماهانه</option>
                              <option value="HOURS">ساعت کارکرد</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
                          <select 
                             className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 outline-none"
                             value={filterStatus}
                             onChange={e => setFilterStatus(e.target.value)}
                          >
                              <option value="ALL">همه</option>
                              <option value="ACTIVE">فعال</option>
                              <option value="INACTIVE">غیرفعال</option>
                          </select>
                      </div>
                  </div>
              )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="overflow-x-auto min-h-[300px]">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
                          <tr>
                              <th className="p-4 w-10">
                                  <input 
                                    type="checkbox" 
                                    onChange={handleSelectAll}
                                    checked={filteredPlans.length > 0 && selectedIds.length === filteredPlans.length}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                  />
                              </th>
                              <th className="p-4">عنوان برنامه</th>
                              <th className="p-4">تجهیز</th>
                              <th className="p-4">تکرار</th>
                              <th className="p-4">اجرای بعدی</th>
                              <th className="p-4">آخرین اجرا</th>
                              <th className="p-4">وضعیت</th>
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
                                      <td className="p-4">
                                          <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(p.id)}
                                            onChange={() => handleSelectOne(p.id)}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                          />
                                      </td>
                                      <td className="p-4 font-bold text-gray-700 dark:text-gray-200">{p.title}</td>
                                      <td className="p-4">
                                          <div className="flex flex-col">
                                              <span>{p.equipName}</span>
                                              <span className="text-xs text-gray-400 font-mono">{p.equipCode}</span>
                                          </div>
                                      </td>
                                      <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold border border-blue-100">{getFrequencyLabel(p.frequency_type, p.frequency_value)}</span></td>
                                      <td className="p-4 font-mono text-gray-600 dark:text-gray-300">{p.next_run_date || 'تعیین نشده'}</td>
                                      <td className="p-4 font-mono text-gray-500">{p.last_run_date || '-'}</td>
                                      <td className="p-4">{p.is_active ? <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded border border-green-100">فعال</span> : <span className="text-gray-400 text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">غیرفعال</span>}</td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Modal code remains same... */}
          {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-scaleIn">
                      <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">تعریف برنامه PM جدید</h3>
                      
                      <div>
                          <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">عنوان برنامه</label>
                          <input required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newPlan.title} onChange={e => setNewPlan({...newPlan, title: e.target.value})} placeholder="مثال: سرویس ماهیانه پمپ..." />
                      </div>

                      <div>
                          <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">تجهیز مرتبط</label>
                          <select required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newPlan.equipmentId} onChange={e => setNewPlan({...newPlan, equipmentId: e.target.value})}>
                              <option value="">انتخاب تجهیز...</option>
                              {equipmentList.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">نوع تکرار</label>
                              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" value={newPlan.frequencyType} onChange={e => setNewPlan({...newPlan, frequencyType: e.target.value})}>
                                  <option value="WEEKLY">هفتگی</option>
                                  <option value="MONTHLY">ماهانه</option>
                                  <option value="HOURS">کارکرد (ساعت)</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">مقدار بازه</label>
                              <input type="number" min="1" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 text-center outline-none focus:ring-2 focus:ring-primary" value={newPlan.frequencyValue} onChange={e => setNewPlan({...newPlan, frequencyValue: Number(e.target.value)})} />
                          </div>
                      </div>

                      <div>
                          <ShamsiDatePicker label="تاریخ اولین اجرا" value={newPlan.nextRunDate} onChange={d => setNewPlan({...newPlan, nextRunDate: d})} disableFuture={false} />
                      </div>

                      <div>
                          <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">توضیحات / چک لیست</label>
                          <textarea className="w-full p-2.5 border rounded-xl dark:bg-gray-700 h-24 outline-none focus:ring-2 focus:ring-primary" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} placeholder="شرح کارهایی که باید انجام شود..." />
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

export default PMScheduler;
