
import React, { useState, useEffect, useRef } from 'react';
import { Project, User } from '../types';
import { Briefcase, Plus, TrendingUp, CheckSquare, Trash2, Save, X, Edit, Upload, Paperclip, AlertCircle, FileText, Loader2, Mic, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { startWorkflow, getItemsByModule, fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { getShamsiDate, gregorianToJalali } from '../utils';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';

interface Milestone {
  id: string;
  title: string;
  weight: number; 
  progress: number;
}

interface Objective {
    id: string;
    text: string;
}

export const Projects: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [items, setItems] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load data
  useEffect(() => {
      fetchProjects();
      fetchMasterData('personnel').then(setPersonnelList);
  }, [view]);

  const fetchProjects = async () => {
      setLoading(true);
      try {
          // Fetch directly from projects table for accurate list
          const { data, error } = await supabase
              .from('projects')
              .select('*')
              .order('created_at', { ascending: false });
          
          if (!error && data) {
              setItems(data.map((p: any) => ({
                  ...p,
                  trackingCode: p.tracking_code,
                  startDate: p.start_date,
                  manager: p.manager_name
              })));
          } else {
              // Fallback to workflow items if table is empty
              const storedItems = getItemsByModule('PROJECT');
              setItems(storedItems.map(item => ({
                  ...item,
                  ...item.data
              })));
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };
  
  // Use Omit to override the strict 'number' type of budget from Project interface with 'number | string' for form handling
  const [formData, setFormData] = useState<Omit<Partial<Project>, 'budget'> & { managerId?: string, budget?: number | string }>({
    title: '',
    manager: '', // Will store Name for display
    managerId: '', // Will store UUID for DB reference
    budget: '', // Changed to empty string to allow optional
    startDate: getShamsiDate(),
    endDate: '',
    description: '', // Added description
  });

  // Objectives State
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [newObjective, setNewObjective] = useState('');
  const [editingObjId, setEditingObjId] = useState<string | null>(null);

  // Milestones State
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState({ title: '', weight: 10 });

  // Attachments State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // --- Voice Input Handler ---
  const handleVoiceInput = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert('مرورگر شما از قابلیت تبدیل گفتار به نوشتار پشتیبانی نمی‌کند.');
          return;
      }
      
      if (listening) {
          setListening(false);
          return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setFormData(prev => ({
              ...prev,
              description: prev.description ? `${prev.description} ${transcript}` : transcript
          }));
      };
      
      recognition.start();
  };

  // --- Objective Handlers ---
  const handleAddObjective = () => {
      if (!newObjective.trim()) return;
      
      if (editingObjId) {
          setObjectives(objectives.map(obj => obj.id === editingObjId ? { ...obj, text: newObjective } : obj));
          setEditingObjId(null);
      } else {
          setObjectives([...objectives, { id: Math.random().toString(), text: newObjective }]);
      }
      setNewObjective('');
  };

  const handleEditObjective = (obj: Objective) => {
      setNewObjective(obj.text);
      setEditingObjId(obj.id);
  };

  const handleDeleteObjective = (id: string) => {
      setObjectives(objectives.filter(o => o.id !== id));
  };

  // --- Milestone Handlers ---
  const handleAddMilestone = () => {
      if(!newMilestone.title) return;
      
      if (newMilestone.weight < 0) {
          alert('درصد وزن نمی‌تواند کمتر از صفر باشد.');
          return;
      }

      const currentTotalWeight = milestones.reduce((acc, curr) => acc + curr.weight, 0);
      if (currentTotalWeight + newMilestone.weight > 100) {
          alert(`مجموع وزن‌ها نمی‌تواند بیشتر از ۱۰۰٪ باشد. وزن باقی‌مانده: ${100 - currentTotalWeight}٪`);
          return;
      }

      setMilestones([...milestones, {
          id: Math.random().toString(),
          title: newMilestone.title,
          weight: newMilestone.weight,
          progress: 0
      }]);
      setNewMilestone({ title: '', weight: 10 });
  };

  const removeMilestone = (id: string) => {
      setMilestones(milestones.filter(m => m.id !== id));
  };

  const calculateTotalProgress = () => {
      const totalWeight = milestones.reduce((acc, curr) => acc + curr.weight, 0);
      if (totalWeight === 0) return 0;
      const weightedProgress = milestones.reduce((acc, curr) => acc + (curr.progress * curr.weight), 0);
      return Math.round(weightedProgress / totalWeight);
  };

  // --- File Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles: File[] = Array.from(e.target.files);
          const validFiles = newFiles.filter(f => f.size <= 10 * 1024 * 1024); // 10MB limit
          
          if (validFiles.length !== newFiles.length) {
              alert('برخی فایل‌ها به دلیل حجم بیش از ۱۰ مگابایت حذف شدند.');
          }
          
          setAttachedFiles(prev => [...prev, ...validFiles]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- Manager Selection ---
  const handleManagerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      const person = personnelList.find(p => p.id === selectedId);
      if (person) {
          setFormData({ ...formData, managerId: person.id, manager: person.full_name });
      } else {
          setFormData({ ...formData, managerId: '', manager: '' });
      }
  };

  // --- Validation ---
  const isFormValid = () => {
      const totalWeight = milestones.reduce((acc, curr) => acc + curr.weight, 0);
      return (
          formData.title && 
          formData.managerId && 
          objectives.length > 0 && 
          (milestones.length === 0 || totalWeight === 100)
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
        // Generate Unique Tracking Code
        const date = new Date();
        const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
        const prefix = `P${String(j.jy).substring(2)}${String(j.jm).padStart(2, '0')}`;
        const trackingCode = await fetchNextTrackingCode(prefix);
        
        // Clean Budget String (Remove Commas)
        const rawBudget = String(formData.budget).replace(/,/g, '');

        // 1. Prepare Data for DB
        const projectPayload = {
            tracking_code: trackingCode,
            title: formData.title,
            manager_id: formData.managerId || null,
            manager_name: formData.manager,
            budget: rawBudget === '' ? 0 : Number(rawBudget),
            start_date: formData.startDate,
            end_date: formData.endDate,
            description: formData.description,
            status: 'PLANNED',
            progress: calculateTotalProgress()
        };

        // 2. Insert into 'projects' table
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .insert([projectPayload])
            .select()
            .single();

        if (projectError) throw projectError;
        const projectId = projectData.id;

        // 3. Insert Objectives
        if (objectives.length > 0) {
            const objectivesPayload = objectives.map(obj => ({
                project_id: projectId,
                objective_text: obj.text
            }));
            const { error: objError } = await supabase
                .from('project_objectives')
                .insert(objectivesPayload);
            
            if (objError) throw objError;
        }

        // 4. Insert Milestones
        if (milestones.length > 0) {
            const milestonesPayload = milestones.map(m => ({
                project_id: projectId,
                title: m.title,
                weight_percent: m.weight,
                progress_percent: m.progress
            }));
            const { error: mileError } = await supabase
                .from('project_milestones')
                .insert(milestonesPayload);

            if (mileError) throw mileError;
        }
        
        // 5. Start Workflow (Cartable Integration)
        const workflowData = {
            ...projectPayload,
            id: projectId, // Use real DB ID
            objectives,
            milestones,
            fileNames: attachedFiles.map(f => f.name)
        };
        
        startWorkflow('PROJECT', workflowData, user, trackingCode, `پروژه: ${formData.title}`);
        
        alert(`پروژه با کد رهگیری ${trackingCode} با موفقیت ثبت شد.`);
        handleReset();
    } catch (error: any) {
        console.error(error);
        alert('خطا در ثبت پروژه: ' + (error.message || JSON.stringify(error)));
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleReset = () => {
      setView('LIST');
      setFormData({
          title: '',
          manager: '',
          managerId: '',
          budget: '',
          startDate: getShamsiDate(),
          endDate: '',
          description: ''
      });
      setObjectives([]);
      setMilestones([]);
      setAttachedFiles([]);
      setNewObjective('');
      setEditingObjId(null);
  };

  const handleCancel = () => {
      if (formData.title || objectives.length > 0) {
          if (window.confirm('آیا از انصراف و لغو تغییرات اطمینان دارید؟')) {
              handleReset();
          }
      } else {
          handleReset();
      }
  };

  const handleExport = () => {
      if (items.length === 0) return alert('داده‌ای برای خروجی وجود ندارد');
      
      const headers = ["کد پروژه", "عنوان", "مدیر پروژه", "تاریخ شروع", "تاریخ پایان", "بودجه", "پیشرفت", "وضعیت"];
      const rows = items.map(item => [
          item.trackingCode,
          item.title,
          item.manager,
          item.startDate,
          item.end_date || '-',
          item.budget || '0',
          (item.progress || 0) + '%',
          item.status === 'PENDING' ? 'در حال اجرا' : 'تکمیل شده'
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `projects_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const extraActions = (
      <div className="flex gap-2">
          <button 
            onClick={fetchProjects} 
            className="p-2.5 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:rotate-180 transition duration-500 shadow-sm" 
            title="بروزرسانی"
          >
              <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExport}
            className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition font-medium"
          >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="hidden md:inline">خروجی اکسل</span>
          </button>
      </div>
  );

  if (view === 'LIST') {
      return (
          <div className="max-w-7xl mx-auto pb-20">
              <SmartTable
                title="مدیریت و کنترل پروژه‌ها"
                icon={Briefcase}
                data={items}
                onAdd={() => setView('NEW')}
                isLoading={loading}
                extraActions={extraActions}
                columns={[
                    { header: 'کد پروژه', accessor: (i: any) => <span className="font-mono font-bold">{i.trackingCode}</span> },
                    { header: 'عنوان پروژه', accessor: (i: any) => <span className="font-bold">{i.title}</span> },
                    { header: 'مدیر پروژه', accessor: (i: any) => i.manager }, 
                    { header: 'تاریخ شروع', accessor: (i: any) => i.startDate },
                    { header: 'بودجه (ریال)', accessor: (i: any) => i.budget ? Number(i.budget).toLocaleString() : '---' },
                    { header: 'پیشرفت', accessor: (i: any) => (
                        <div className="w-24">
                            <div className="flex justify-between text-xs mb-1">
                                <span>{i.progress || 0}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${i.progress || 0}%` }}></div>
                            </div>
                        </div>
                    )},
                    { header: 'وضعیت', accessor: (i: any) => (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                            {i.status === 'PENDING' ? 'در حال اجرا' : 'تکمیل شده'}
                        </span>
                    )}
                ]}
              />
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-2 mb-6">
             <Briefcase className="w-8 h-8 text-primary" />
             <h2 className="text-xl font-bold">تعریف و کنترل پروژه جدید</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6">
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-1 font-medium">عنوان پروژه <span className="text-red-500">*</span></label>
                <input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" 
                  placeholder="نام پروژه..."
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">مدیر پروژه <span className="text-red-500">*</span></label>
                <select
                  value={formData.managerId}
                  onChange={handleManagerChange}
                  className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="">انتخاب کنید...</option>
                    {personnelList.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.unit})</option>
                    ))}
                </select>
              </div>
              <div>
                 <ShamsiDatePicker 
                    label="تاریخ شروع"
                    value={formData.startDate || ''}
                    onChange={(d) => setFormData({...formData, startDate: d})}
                    disableFuture={false}
                 />
              </div>
              <div>
                 <ShamsiDatePicker 
                    label="تاریخ پایان (تخمین)"
                    value={formData.endDate || ''}
                    onChange={(d) => setFormData({...formData, endDate: d})}
                    disableFuture={false}
                 />
              </div>
               <div>
                  <label className="block text-sm mb-1 font-medium">بودجه مصوب (ریال)</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={formData.budget} 
                    onChange={e => {
                        const val = e.target.value.replace(/,/g, '');
                        if(!/^\d*$/.test(val)) return;
                        const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        setFormData({...formData, budget: formatted});
                    }}
                    className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary text-left" 
                    placeholder="اختیاری..."
                  />
                </div>
          </div>

          <div>
                <label className="block text-sm mb-1 font-medium">توضیحات تکمیلی</label>
                <div className="relative">
                    <textarea 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                        placeholder="توضیحات پروژه..."
                    />
                    <button 
                        type="button" 
                        onClick={handleVoiceInput} 
                        className={`absolute left-2 bottom-2 p-2 rounded-full transition ${listening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-primary'}`}
                    >
                        {listening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                    </button>
                </div>
          </div>

          {/* Objectives - Dynamic List */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
             <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                 <CheckSquare className="w-5 h-5"/> اهداف و محدوده پروژه <span className="text-red-500">*</span>
             </h3>
             
             <div className="flex gap-2 mb-3">
                 <input 
                    type="text"
                    value={newObjective}
                    onChange={e => setNewObjective(e.target.value)}
                    placeholder="هدف یا محدوده پروژه را وارد کنید..."
                    className="flex-1 p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddObjective())}
                 />
                 <button 
                    type="button" 
                    onClick={handleAddObjective}
                    className={`bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition ${!newObjective.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                     {editingObjId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                 </button>
             </div>

             <div className="space-y-2 max-h-60 overflow-y-auto">
                 {objectives.length === 0 && <p className="text-sm text-gray-400 text-center py-2">موردی ثبت نشده است.</p>}
                 {objectives.map((obj, index) => (
                     <div key={obj.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                         <div className="flex items-center gap-3">
                             <span className="bg-blue-100 text-blue-800 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{index + 1}</span>
                             <span className="text-sm">{obj.text}</span>
                         </div>
                         <div className="flex gap-2">
                             <button type="button" onClick={() => handleEditObjective(obj)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit className="w-4 h-4"/></button>
                             <button type="button" onClick={() => handleDeleteObjective(obj.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                         </div>
                     </div>
                 ))}
             </div>
          </div>

          {/* WBS */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5"/> فازهای اجرایی (WBS)
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="عنوان فاز (مثلاً: فونداسیون)" 
                    className="w-full sm:flex-[2] p-2 border rounded-lg dark:bg-gray-700 outline-none"
                    value={newMilestone.title}
                    onChange={e => setNewMilestone({...newMilestone, title: e.target.value})}
                  />
                  <div className="flex gap-2 w-full sm:flex-1">
                      <div className="relative flex-1">
                          <input 
                            type="number" 
                            min="0"
                            placeholder="درصد وزنی" 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 text-center outline-none pl-6"
                            value={newMilestone.weight}
                            onChange={e => setNewMilestone({...newMilestone, weight: Number(e.target.value)})}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                      </div>
                      <button type="button" onClick={handleAddMilestone} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 flex-shrink-0 w-10 flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                      </button>
                  </div>
              </div>

              {milestones.length > 0 ? (
                  <div className="space-y-2">
                      <div className="grid grid-cols-12 text-xs text-gray-500 px-2">
                          <span className="col-span-8">شرح فعالیت</span>
                          <span className="col-span-2 text-center">درصد وزنی</span>
                          <span className="col-span-2 text-center">حذف</span>
                      </div>
                      {milestones.map(m => (
                          <div key={m.id} className="grid grid-cols-12 items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                              <span className="col-span-8 font-medium flex items-center gap-2">
                                  <CheckSquare className="w-4 h-4 text-green-500" /> {m.title}
                              </span>
                              <span className="col-span-2 text-center bg-blue-50 text-blue-700 rounded px-1 text-sm font-bold">{m.weight}%</span>
                              <div className="col-span-2 flex justify-center">
                                  <button type="button" onClick={() => removeMilestone(m.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      ))}
                      <div className="mt-2 text-left text-sm font-bold flex justify-end gap-2 items-center">
                          <span>مجموع وزن:</span>
                          <span className={`px-2 py-1 rounded ${milestones.reduce((a,b)=>a+b.weight,0) === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {milestones.reduce((a,b)=>a+b.weight,0)}%
                          </span>
                      </div>
                  </div>
              ) : (
                  <p className="text-center text-gray-400 text-sm py-4">هنوز فازی تعریف نشده است.</p>
              )}
          </div>

          {/* Attachments */}
          <div>
             <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileChange} />
             <div className="flex items-center justify-between mb-2">
                 <label className="font-bold text-sm flex items-center gap-2"><Paperclip className="w-4 h-4"/> مستندات پروژه</label>
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 text-xs flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition border border-blue-200">
                     <Upload className="w-3 h-3" /> افزودن فایل
                 </button>
             </div>
             
             {attachedFiles.length === 0 && <p className="text-xs text-gray-400 italic">هیچ فایلی ضمیمه نشده است (اختیاری)</p>}
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                 {attachedFiles.map((file, idx) => (
                     <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                         <div className="flex items-center gap-2 overflow-hidden">
                             <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                             <span className="text-xs truncate">{file.name}</span>
                             <span className="text-[10px] text-gray-400">({(file.size/1024/1024).toFixed(2)} MB)</span>
                         </div>
                         <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-3 h-3"/></button>
                     </div>
                 ))}
             </div>
          </div>

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={handleCancel} className="flex-1 border border-gray-300 dark:border-gray-600 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition">
                <X className="w-5 h-5" /> انصراف
            </button>
            <button 
                type="submit" 
                disabled={!isFormValid() || isSubmitting}
                className={`flex-[2] text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition font-bold
                    ${isFormValid() && !isSubmitting ? 'bg-primary hover:bg-red-800' : 'bg-gray-400 cursor-not-allowed opacity-70'}
                `}
            >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />}
                ایجاد پروژه و شروع گردش کار
            </button>
          </div>
        </form>
      </div>
  );
};
