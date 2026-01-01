
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Award, Users, Search, X, Check, FileText, Loader2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { startWorkflow, fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { generateTrackingCode } from '../utils';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';

export const Performance: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dynamic Master Data
  const [periods, setPeriods] = useState<any[]>([]);
  const [availableCriteria, setAvailableCriteria] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);

  // Fetch Data
  useEffect(() => {
      fetchEvaluations();
      fetchMasterData('evaluation_periods').then(setPeriods);
      fetchMasterData('evaluation_criteria').then(setAvailableCriteria);
      fetchMasterData('personnel').then(setPersonnelList);
  }, [view]);

  // Fetch from dedicated table instead of workflow items for persistence check
  const fetchEvaluations = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await supabase
              .from('performance_evaluations')
              .select('*')
              .order('created_at', { ascending: false });
          
          if (!error && data) {
              setItems(data.map(d => ({
                  ...d,
                  // Map DB columns to what SmartTable expects if names differ, 
                  // but here we align mostly.
                  personnelName: d.personnel_name,
                  totalScore: d.total_score,
                  criteria: d.criteria_data
              })));
          }
      } catch (e) {
          console.error("Fetch Error:", e);
      } finally {
          setIsLoading(false);
      }
  };
  
  const [formData, setFormData] = useState<{
      personnelId: string;
      personnelName: string;
      unit: string;
      org_unit_id?: string;
      period: string;
      criteria: { label: string; score: number; max: number }[];
  }>({
    personnelId: '',
    personnelName: '',
    unit: '',
    period: '',
    criteria: []
  });

  // Set default period if loaded
  useEffect(() => {
      if(periods.length > 0 && !formData.period) {
          setFormData(prev => ({ ...prev, period: periods[0].title }));
      }
  }, [periods]);

  const totalScore = formData.criteria.reduce((acc, curr) => acc + curr.score, 0);
  const maxPossibleScore = formData.criteria.reduce((acc, curr) => acc + curr.max, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personnelId) {
        alert("لطفا پرسنل مورد نظر را انتخاب کنید.");
        return;
    }
    if (formData.criteria.length === 0) {
        alert("هیچ شاخص ارزیابی برای واحد سازمانی این پرسنل تعریف نشده است.");
        return;
    }

    setIsLoading(true);
    try {
        // 1. Generate Unique Tracking Code
        const trackingCode = await fetchNextTrackingCode('G'); 

        // 2. Validate Evaluator ID (Handle '1' vs UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validEvaluatorId = user.id && uuidRegex.test(user.id) ? user.id : null;

        // 3. Prepare Data Payload
        const evaluationPayload = {
            tracking_code: trackingCode,
            personnel_id: formData.personnelId,
            personnel_name: formData.personnelName,
            unit: formData.unit,
            period: formData.period,
            total_score: totalScore,
            criteria_data: formData.criteria,
            evaluator_id: validEvaluatorId,
            description: `ارزیابی توسط ${user.fullName}`,
            status: 'PENDING'
        };

        // 4. Insert into Dedicated Table
        const { error } = await supabase.from('performance_evaluations').insert([evaluationPayload]);
        if (error) throw error;

        // 5. Start Workflow (for process tracking)
        // We pass the same data to the workflow so it appears in the inbox
        startWorkflow(
            'PERFORMANCE', 
            {...formData, totalScore}, 
            user, 
            trackingCode, 
            `ارزیابی عملکرد: ${formData.personnelName} - ${formData.period}`
        );

        alert(`فرم ارزیابی با موفقیت ثبت شد.\nکد رهگیری: ${trackingCode}`);
        setView('LIST');
        
        // Reset form
        setFormData({ 
            personnelId: '', 
            personnelName: '', 
            unit: '', 
            org_unit_id: '',
            period: periods[0]?.title || '', 
            criteria: []
        });

    } catch (err: any) {
        console.error("Save Error:", err);
        alert('خطا در ذخیره‌سازی اطلاعات: ' + (err.message || JSON.stringify(err)));
    } finally {
        setIsLoading(false);
    }
  };

  const handleScoreChange = (index: number, val: number) => {
    const max = formData.criteria[index].max;
    if (val > max) {
        alert(`شما نمی‌توانید نمره‌ای بیشتر از سقف مجاز (${max}) وارد کنید.`);
        return;
    }
    const newCriteria = [...formData.criteria];
    newCriteria[index].score = Math.max(0, val);
    setFormData({...formData, criteria: newCriteria});
  };

  const selectPersonnel = (p: any) => {
      // Filter criteria based on personnel's unit
      const relevantCriteria = availableCriteria.filter((c: any) => c.org_unit_id === p.org_unit_id);
      
      const newCriteria = relevantCriteria.map((c: any) => ({ 
          label: c.title, 
          score: 0, 
          max: c.max_score 
      }));

      setFormData({
          ...formData,
          personnelId: p.id,
          personnelName: p.full_name,
          unit: p.unit,
          org_unit_id: p.org_unit_id,
          criteria: newCriteria
      });
      setShowPersonnelModal(false);

      if (relevantCriteria.length === 0) {
          alert('هشدار: برای واحد سازمانی این پرسنل، فرم ارزیابی (شاخص) تعریف نشده است. لطفا با مدیر سیستم تماس بگیرید.');
      }
  };

  const handleExport = () => {
      if (items.length === 0) return alert('داده‌ای برای خروجی وجود ندارد');
      
      const headers = ["کد پیگیری", "نام پرسنل", "واحد", "دوره ارزیابی", "امتیاز کل", "تاریخ ثبت"];
      const rows = items.map(item => [
          item.tracking_code || item.trackingCode,
          item.personnelName,
          item.unit,
          item.period,
          item.totalScore,
          new Date(item.created_at).toLocaleDateString('fa-IR')
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `performance_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const extraActions = (
      <div className="flex gap-2">
          <button 
            onClick={fetchEvaluations} 
            className="p-2.5 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:rotate-180 transition duration-500 shadow-sm" 
            title="بروزرسانی"
          >
              <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
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
                title="ارزیابی عملکرد پرسنل"
                icon={Award}
                data={items}
                onAdd={() => setView('NEW')}
                isLoading={isLoading}
                extraActions={extraActions}
                columns={[
                    { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code || i.trackingCode}</span> },
                    { header: 'نام پرسنل', accessor: (i: any) => <span className="font-bold">{i.personnelName}</span> },
                    { header: 'واحد', accessor: (i: any) => i.unit },
                    { header: 'دوره ارزیابی', accessor: (i: any) => i.period },
                    { header: 'امتیاز کل', accessor: (i: any) => {
                        // Dynamically calculate max if saved or use default 100
                        const max = i.criteria ? i.criteria.reduce((a:any, b:any) => a + b.max, 0) : 100;
                        return (
                        <span className={`font-bold ${i.totalScore >= (max*0.8) ? 'text-green-600' : 'text-orange-500'}`}>
                            {i.totalScore} / {max}
                        </span>
                    )}},
                    { header: 'تاریخ ثبت', accessor: (i: any) => new Date(i.created_at).toLocaleDateString('fa-IR') },
                ]}
              />
          </div>
      );
  }

  return (
       <div className="max-w-3xl mx-auto pb-20">
         <h2 className="text-xl font-bold mb-6">ثبت ارزیابی عملکرد جدید</h2>
         <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
               <div className="space-y-2">
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">انتخاب پرسنل <span className="text-red-500">*</span></label>
                   {formData.personnelName ? (
                       <div className="flex items-center justify-between bg-white dark:bg-gray-600 p-3 rounded-lg border border-primary/30">
                           <div>
                               <p className="font-bold">{formData.personnelName}</p>
                               <p className="text-xs text-gray-500 dark:text-gray-300">واحد: {formData.unit}</p>
                           </div>
                           <button type="button" onClick={() => setShowPersonnelModal(true)} className="text-primary text-sm underline">تغییر</button>
                       </div>
                   ) : (
                       <button 
                         type="button" 
                         onClick={() => setShowPersonnelModal(true)}
                         className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition flex items-center justify-center gap-2"
                        >
                           <Users className="w-5 h-5" />
                           انتخاب از لیست پرسنل
                       </button>
                   )}
               </div>

               <div className="space-y-2">
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">دوره ارزیابی <span className="text-red-500">*</span></label>
                   <select 
                      value={formData.period}
                      onChange={e => setFormData({...formData, period: e.target.value})}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-600 outline-none focus:ring-2 focus:ring-primary"
                   >
                      {periods.length > 0 ? periods.map(p => (
                          <option key={p.id} value={p.title}>{p.title}</option>
                      )) : <option>دوره ای تعریف نشده</option>}
                   </select>
               </div>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center border-b pb-2 mb-4">
                   <h3 className="font-bold">شاخص‌های ارزیابی {formData.unit ? `(واحد ${formData.unit})` : ''}</h3>
                   {formData.unit && (
                       <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                           <FileText className="w-3 h-3" /> فرم اختصاصی واحد
                       </span>
                   )}
               </div>
               
               {formData.personnelId ? (
                   formData.criteria.length > 0 ? formData.criteria.map((c, idx) => (
                     <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition animate-fadeIn">
                        <div className="mb-2 md:mb-0">
                            <span className="font-medium block">{idx + 1}. {c.label}</span>
                            <span className="text-xs text-gray-500">حداکثر نمره قابل قبول: {c.max}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="0"
                              max={c.max}
                              value={c.score}
                              onChange={e => handleScoreChange(idx, Number(e.target.value))}
                              className="w-20 p-2 border rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-primary dark:bg-gray-600"
                            />
                            <span className="text-gray-400 text-sm">/ {c.max}</span>
                        </div>
                     </div>
                   )) : (
                       <div className="text-center p-6 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                           <p>⚠️ هیچ فرم ارزیابی برای واحد "{formData.unit}" تعریف نشده است.</p>
                       </div>
                   )
               ) : (
                   <p className="text-center text-gray-400 py-4 border-2 border-dashed rounded-xl">لطفا ابتدا پرسنل را انتخاب کنید تا فرم مربوطه بارگذاری شود.</p>
               )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 pb-2 border-t dark:border-gray-700">
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4">
                   <span className="font-bold text-lg text-blue-800 dark:text-blue-300">مجموع امتیاز کسب شده</span>
                   <div className="flex items-baseline gap-1">
                       <span className="text-4xl font-black text-primary">{totalScore}</span>
                       <span className="text-gray-500">/ {maxPossibleScore || 100}</span>
                   </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setView('LIST')} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">انصراف</button>
                  <button 
                    type="submit" 
                    disabled={formData.criteria.length === 0 || isLoading}
                    className="flex-1 bg-primary text-white py-3 rounded-xl shadow-lg hover:bg-red-800 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'ثبت نهایی و ارسال'}
                  </button>
                </div>
            </div>
         </form>

         {/* Personnel Selector Modal */}
         {showPersonnelModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                     <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                         <h3 className="font-bold text-lg">انتخاب پرسنل</h3>
                         <button onClick={() => setShowPersonnelModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
                     </div>
                     <div className="p-4 border-b dark:border-gray-700">
                         <div className="relative">
                             <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                             <input type="text" placeholder="جستجو نام یا واحد..." className="w-full pr-10 pl-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" />
                         </div>
                     </div>
                     <div className="overflow-y-auto flex-1 p-2">
                         <table className="w-full text-right text-sm">
                             <thead className="text-gray-500 bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                 <tr>
                                     <th className="p-3">نام و نام خانوادگی</th>
                                     <th className="p-3">واحد سازمانی</th>
                                     <th className="p-3">انتخاب</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y dark:divide-gray-700">
                                 {personnelList.length > 0 ? personnelList.map(p => (
                                     <tr key={p.id} onClick={() => selectPersonnel(p)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition">
                                         <td className="p-3 font-bold">{p.full_name}</td>
                                         <td className="p-3 text-gray-500 dark:text-gray-400">{p.unit}</td>
                                         <td className="p-3">
                                             <button className="bg-primary/10 text-primary p-1.5 rounded-full">
                                                 <Check className="w-4 h-4" />
                                             </button>
                                         </td>
                                     </tr>
                                 )) : (
                                     <tr><td colSpan={3} className="p-4 text-center">پرسنلی یافت نشد.</td></tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
         )}
       </div>
  );
};
