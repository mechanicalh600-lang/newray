
import React, { useState, useRef, useEffect } from 'react';
import { generateTrackingCode, getShamsiDate, parseShamsiDate } from '../utils';
import { FileSignature, Plus, Users, Save, X, Trash2, Printer, Share2, Edit, Home, Loader2, CheckSquare, RefreshCw } from 'lucide-react';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { TimePicker24 } from '../components/TimePicker24';
import { SmartTable } from '../components/SmartTable';
import { startWorkflow, getItemsByModule, fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import { Logo } from '../components/Logo';

export const Meetings: React.FC<{ user: User }> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'NEW' | 'VIEW'>('LIST');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic Data Lists
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [roleList, setRoleList] = useState<any[]>([]);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

  useEffect(() => {
      fetchMeetings();
      fetchMasterData('personnel').then(setPersonnelList);
      fetchMasterData('org_chart').then(setRoleList);
      fetchAdminAvatar();
  }, [viewMode]);

  const fetchMeetings = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('meeting_minutes').select('*').order('created_at', { ascending: false });
      if (data) setItems(data);
      setIsLoading(false);
  };

  const fetchAdminAvatar = async () => {
      // Find admin user's avatar
      const { data } = await supabase.from('app_users').select('avatar').eq('role', 'ADMIN').limit(1).single();
      if(data) setAdminAvatar(data.avatar);
  }

  // --- Form States ---
  const [formData, setFormData] = useState({
      subject: '',
      location: '',
      meetingDate: getShamsiDate(),
      startTime: '',
      endTime: '',
  });

  // Decisions
  const [decisions, setDecisions] = useState<{id: string, text: string}[]>([]);
  const [currentDecision, setCurrentDecision] = useState('');
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);

  // Attendees
  const [attendees, setAttendees] = useState<{name: string, role: string}[]>([]);
  const [currentAttendee, setCurrentAttendee] = useState({ name: '', role: '' });

  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]); // Changed to any[] to support both File and DB objects

  // Report View State
  const [reportData, setReportData] = useState<any>(null);

  // --- Handlers ---

  const handleAddAttendee = () => {
      if(!currentAttendee.name || !currentAttendee.role) {
          alert("لطفا نام و سمت را انتخاب کنید");
          return;
      }
      setAttendees([...attendees, currentAttendee]);
      setCurrentAttendee({ name: '', role: '' });
  };

  const removeAttendee = (index: number) => {
      setAttendees(attendees.filter((_, i) => i !== index));
  };

  const handleAddDecision = () => {
      if(!currentDecision.trim()) return;
      
      if(editingDecisionId) {
          setDecisions(decisions.map(d => d.id === editingDecisionId ? { ...d, text: currentDecision } : d));
          setEditingDecisionId(null);
      } else {
          setDecisions([...decisions, { id: Math.random().toString(), text: currentDecision }]);
      }
      setCurrentDecision('');
  };

  const handleEditDecision = (decision: {id: string, text: string}) => {
      setCurrentDecision(decision.text);
      setEditingDecisionId(decision.id);
  };

  const handleDeleteDecision = (id: string) => {
      setDecisions(decisions.filter(d => d.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFiles([...attachedFiles, ...Array.from(e.target.files)]);
    }
  };

  // Convert number to Persian word/number
  const toFarsiNumber = (n: number) => {
      const farsiDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
      return n.toString().replace(/\d/g, x => farsiDigits[parseInt(x)]);
  };

  const isTimeValid = () => {
      if (!formData.startTime || !formData.endTime) return false;
      const [h1, m1] = formData.startTime.split(':').map(Number);
      const [h2, m2] = formData.endTime.split(':').map(Number);
      return (h2 > h1) || (h2 === h1 && m2 > m1);
  };

  const isFormValid = () => {
      return formData.subject && isTimeValid() && attendees.length > 0 && decisions.length > 0;
  };

  const handleCancel = () => {
      if(formData.subject || attendees.length > 0) {
          if(window.confirm('آیا از انصراف و پاک شدن اطلاعات اطمینان دارید؟')) {
              resetForm();
              setViewMode('LIST');
          }
      } else {
          resetForm();
          setViewMode('LIST');
      }
  };

  const resetForm = () => {
      setFormData({ subject: '', location: '', meetingDate: getShamsiDate(), startTime: '', endTime: '' });
      setAttendees([]);
      setDecisions([]);
      setAttachedFiles([]);
      setReportData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!isFormValid()) return;

    setIsSubmitting(true);
    let payload: any = null;
    let trackingCode = '';

    try {
        trackingCode = await fetchNextTrackingCode('G');
        
        // Handle Creator ID: Ensure it's a valid UUID or NULL (for hardcoded admin)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validCreatorId = uuidRegex.test(user.id) ? user.id : null;

        payload = {
            tracking_code: trackingCode,
            subject: formData.subject,
            location: formData.location,
            meeting_date: formData.meetingDate,
            start_time: formData.startTime,
            end_time: formData.endTime,
            attendees: attendees,
            decisions: decisions,
            // Map File objects to simple metadata for storage
            attached_files: attachedFiles.map(f => ({ 
                name: f.name || 'unknown', 
                size: f.size || 0, 
                type: f.type || 'application/octet-stream' 
            })), 
            creator_id: validCreatorId,
            status: 'PENDING'
        };

        const { error } = await supabase.from('meeting_minutes').insert([payload]);
        if(error) throw error;

        // Legacy Workflow Integration
        startWorkflow('MEETING', payload, user, trackingCode, `صورتجلسه: ${formData.subject}`);

        alert('صورتجلسه با موفقیت ثبت شد.');
        setReportData(payload); // Show report immediately
        setViewMode('VIEW');

    } catch (err: any) {
        console.error("Submission Error:", err);
        // Robust Error Message Extraction
        const errorMessage = err?.message || err?.error_description || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'خطای ناشناخته';
        
        alert(`خطا در ذخیره‌سازی ابری: \n${errorMessage}\n\nگزارش به صورت آفلاین نمایش داده می‌شود و می‌توانید آن را چاپ کنید.`);
        
        // Fallback: Show report anyway so user doesn't lose data
        if (payload) {
             // Try to save locally via workflow store as backup
             try {
                 startWorkflow('MEETING', payload, user, trackingCode || 'OFFLINE', `صورتجلسه (آفلاین): ${formData.subject}`);
             } catch (e) { 
                 console.warn('Local save warning:', e); 
             }

             setReportData(payload);
             setViewMode('VIEW');
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `صورتجلسه ${reportData.subject}`,
                  text: `صورتجلسه شماره ${reportData.tracking_code} مورخ ${reportData.meeting_date}`,
                  url: window.location.href
              });
          } catch (err) {
              console.error('Error sharing:', err);
          }
      } else {
          handlePrint(); 
      }
  };

  const handleViewDetails = (item: any) => {
      setReportData(item);
      // Populate attachedFiles for view based on saved data
      setAttachedFiles(item.attached_files || []);
      setViewMode('VIEW');
  };

  // --- REPORT VIEW (PRINT) ---
  if (viewMode === 'VIEW' && reportData) {
      return (
          <div className="bg-gray-100 min-h-screen p-4 flex justify-center text-black">
              <style>{`
                  @media print {
                      @page { size: A4; margin: 0; }
                      body { background: white; -webkit-print-color-adjust: exact; }
                      .no-print { display: none !important; }
                      .print-container { width: 210mm !important; min-height: 297mm !important; padding: 20mm !important; margin: 0 !important; box-shadow: none !important; }
                      aside, header, footer { display: none !important; }
                  }
              `}</style>

              <div className="print-container bg-white shadow-2xl relative text-sm space-y-6 font-sans box-border w-[210mm] min-h-[297mm] p-[20mm]">
                  {/* Header - Updated Layout */}
                  <div className="flex justify-between items-center border-b-4 border-[#800020] pb-4 mb-6 relative min-h-[100px]">
                      {/* Logo (Right) */}
                      <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center shadow-sm">
                          {/* Admin Avatar Logic */}
                          {adminAvatar ? (
                              <img src={adminAvatar} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                              <Logo className="w-full h-full object-contain" />
                          )}
                      </div>

                      {/* Title (Center) - Absolutely Centered */}
                      <div className="flex flex-col items-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <h1 className="text-xl font-black text-[#800020] whitespace-nowrap">شرکت توسعه معدنی و صنعتی صبانور</h1>
                          <span className="text-sm font-bold text-gray-700 mt-2 bg-gray-100 px-4 py-1 rounded-full border border-gray-200">فرم صورتجلسه</span>
                      </div>

                      {/* Metadata (Left) - Aligned */}
                      <div className="w-48 text-xs flex flex-col gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 font-bold">شماره:</span>
                              <span className="font-mono font-bold text-sm text-[#800020]">{reportData.tracking_code}</span>
                          </div>
                          <div className="w-full border-t border-gray-200 border-dashed"></div>
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 font-bold">تاریخ:</span>
                              <span className="font-mono font-bold">{reportData.meeting_date}</span>
                          </div>
                          <div className="w-full border-t border-gray-200 border-dashed"></div>
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 font-bold">پیوست:</span>
                              <span className="font-bold">{attachedFiles.length > 0 ? 'دارد' : 'ندارد'}</span>
                          </div>
                      </div>
                  </div>

                  {/* Meta Grid */}
                  <div className="grid grid-cols-2 gap-4 border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <div><span className="text-gray-500">موضوع جلسه:</span> <span className="font-bold">{reportData.subject}</span></div>
                      <div><span className="text-gray-500">مکان برگزاری:</span> <span className="font-bold">{reportData.location || '-'}</span></div>
                      <div><span className="text-gray-500">زمان شروع:</span> <span className="font-bold font-mono">{reportData.start_time}</span></div>
                      <div><span className="text-gray-500">زمان پایان:</span> <span className="font-bold font-mono">{reportData.end_time}</span></div>
                  </div>

                  {/* Attendees */}
                  <div>
                      <h3 className="font-bold text-[#800020] border-b-2 border-[#800020] pb-1 mb-3 inline-block">حاضرین در جلسه</h3>
                      <table className="w-full border-collapse border border-gray-300 text-center">
                          <thead>
                              <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 w-10">ردیف</th>
                                  <th className="border border-gray-300 p-2">نام و نام خانوادگی</th>
                                  <th className="border border-gray-300 p-2">سمت / واحد</th>
                                  <th className="border border-gray-300 p-2">امضاء</th>
                              </tr>
                          </thead>
                          <tbody>
                              {reportData.attendees.map((att: any, idx: number) => (
                                  <tr key={idx}>
                                      <td className="border border-gray-300 p-2">{toFarsiNumber(idx + 1)}</td>
                                      <td className="border border-gray-300 p-2 font-bold">{att.name}</td>
                                      <td className="border border-gray-300 p-2">{att.role}</td>
                                      <td className="border border-gray-300 p-2"></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Decisions */}
                  <div>
                      <h3 className="font-bold text-[#800020] border-b-2 border-[#800020] pb-1 mb-3 inline-block">تصمیمات متخذه</h3>
                      <div className="border border-gray-300 rounded-lg p-4 space-y-4 min-h-[200px]">
                          {reportData.decisions.map((decision: any, idx: number) => (
                              <div key={idx} className="flex gap-2 text-justify leading-relaxed border-b border-dashed border-gray-200 pb-2 last:border-0">
                                  <span className="font-bold text-[#800020]">{toFarsiNumber(idx + 1)}.</span>
                                  <span>{decision.text}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="no-print fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-center gap-4 shadow-lg z-50">
                      <button onClick={() => setViewMode('LIST')} className="bg-gray-100 text-gray-800 px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-gray-200 font-bold transition">
                          <Home className="w-5 h-5"/> بازگشت
                      </button>
                      <button onClick={handlePrint} className="bg-blue-600 text-white px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-xl font-bold">
                          <Printer className="w-5 h-5"/> چاپ (PDF)
                      </button>
                      <button onClick={handleShare} className="bg-green-600 text-white px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-green-700 shadow-xl font-bold">
                          <Share2 className="w-5 h-5"/> اشتراک گذاری
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const extraActions = (
      <button 
        onClick={fetchMeetings} 
        className="p-2.5 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:rotate-180 transition duration-500 shadow-sm" 
        title="بروزرسانی"
      >
          <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
  );

  if (viewMode === 'LIST') {
      return (
          <div className="max-w-7xl mx-auto pb-20">
              <SmartTable
                title="مدیریت صورتجلسات"
                icon={FileSignature}
                data={items}
                onAdd={() => { resetForm(); setViewMode('NEW'); }}
                isLoading={isLoading}
                extraActions={extraActions}
                columns={[
                    { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span> },
                    { header: 'موضوع جلسه', accessor: (i: any) => <span className="font-bold">{i.subject}</span> },
                    { header: 'تاریخ برگزاری', accessor: (i: any) => i.meeting_date },
                    { header: 'زمان', accessor: (i: any) => `${i.start_time} - ${i.end_time}` },
                    { header: 'مکان', accessor: (i: any) => i.location },
                    { header: 'تصمیمات', accessor: (i: any) => <span className="bg-blue-50 text-blue-700 px-2 rounded font-bold">{i.decisions?.length || 0} مورد</span> },
                ]}
                onViewDetails={handleViewDetails}
              />
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
                <FileSignature className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">ثبت صورتجلسه جدید</h1>
        </div>
        <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
      </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <label className="block text-sm mb-1 font-medium">موضوع جلسه <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" 
                    required 
                    placeholder="عنوان اصلی جلسه..."
                />
             </div>
             <div>
                <label className="block text-sm mb-1 font-medium">محل برگزاری</label>
                <input 
                    type="text" 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" 
                />
             </div>
             <div>
                <ShamsiDatePicker 
                    label="تاریخ برگزاری"
                    value={formData.meetingDate}
                    onChange={d => setFormData({...formData, meetingDate: d})}
                />
             </div>
             <div>
                <TimePicker24 
                    label="ساعت شروع"
                    value={formData.startTime}
                    onChange={t => setFormData({...formData, startTime: t})}
                />
             </div>
             <div>
                <TimePicker24 
                    label="ساعت اتمام"
                    value={formData.endTime}
                    onChange={t => setFormData({...formData, endTime: t})}
                    error={formData.endTime && !isTimeValid() ? 'ساعت اتمام باید بعد از شروع باشد' : undefined}
                />
             </div>
          </div>

          {/* Attendees Section */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
             <label className="block text-sm mb-3 font-bold flex items-center gap-2 text-blue-800 dark:text-blue-300">
                 <Users className="w-4 h-4" /> حاضرین در جلسه <span className="text-red-500">*</span>
             </label>
             <div className="flex gap-2 mb-3 items-end">
                 <div className="flex-[1] min-w-0">
                     <label className="text-xs text-gray-500 block mb-1">نام شخص</label>
                     <select 
                        className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 outline-none text-sm"
                        value={currentAttendee.name}
                        onChange={e => setCurrentAttendee({...currentAttendee, name: e.target.value})}
                     >
                         <option value="">انتخاب...</option>
                         {personnelList.map(p => (
                             <option key={p.id} value={p.full_name}>{p.full_name}</option>
                         ))}
                     </select>
                 </div>
                 <div className="flex-[2] min-w-0">
                     <label className="text-xs text-gray-500 block mb-1">سمت / مسئولیت</label>
                     <select 
                        className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 outline-none text-sm"
                        value={currentAttendee.role}
                        onChange={e => setCurrentAttendee({...currentAttendee, role: e.target.value})}
                     >
                         <option value="">انتخاب...</option>
                         {roleList.map(r => (
                             <option key={r.id} value={r.name}>{r.name}</option>
                         ))}
                     </select>
                 </div>
                 <button type="button" onClick={handleAddAttendee} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 h-[38px] w-[38px] flex items-center justify-center">
                     <Plus className="w-5 h-5"/>
                 </button>
             </div>
             
             {attendees.length > 0 ? (
                 <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                     {attendees.map((att, idx) => (
                         <div key={idx} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                             <div className="flex items-center gap-2 text-sm">
                                 <span className="font-bold">{att.name}</span>
                                 <span className="text-gray-400 text-xs">|</span>
                                 <span className="text-gray-500 dark:text-gray-400 text-xs">{att.role}</span>
                             </div>
                             <button type="button" onClick={() => removeAttendee(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                         </div>
                     ))}
                 </div>
             ) : (
                 <p className="text-xs text-gray-500 text-center py-2 bg-white/50 rounded border border-dashed">هنوز کسی اضافه نشده است.</p>
             )}
          </div>

          {/* Decisions Section */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
             <label className="block text-sm mb-3 font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                 <CheckSquare className="w-4 h-4" /> تصمیمات متخذه <span className="text-red-500">*</span>
             </label>
             
             <div className="flex gap-2 mb-3">
                 <input 
                    type="text"
                    value={currentDecision}
                    onChange={e => setCurrentDecision(e.target.value)}
                    placeholder="شرح تصمیم..."
                    className="flex-1 p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddDecision())}
                 />
                 <button 
                    type="button" 
                    onClick={handleAddDecision}
                    className={`bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition ${!currentDecision.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                     {editingDecisionId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                 </button>
             </div>

             <div className="space-y-2 max-h-60 overflow-y-auto">
                 {decisions.length === 0 && <p className="text-sm text-gray-400 text-center py-2 italic">تصمیمی ثبت نشده است.</p>}
                 {decisions.map((decision, index) => (
                     <div key={decision.id} className="flex justify-between items-start bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 group">
                         <div className="flex gap-3">
                             <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5">
                                 {toFarsiNumber(index + 1)}
                             </span>
                             <span className="text-sm text-justify leading-relaxed">{decision.text}</span>
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button type="button" onClick={() => handleEditDecision(decision)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit className="w-4 h-4"/></button>
                             <button type="button" onClick={() => handleDeleteDecision(decision.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                         </div>
                     </div>
                 ))}
             </div>
          </div>

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={handleCancel} className="flex-1 border border-gray-300 dark:border-gray-600 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500">انصراف</button>
            <button 
                type="submit" 
                disabled={!isFormValid() || isSubmitting}
                className={`flex-[2] text-white py-3 rounded-xl shadow hover:bg-red-800 flex justify-center gap-2 font-bold transition
                    ${isFormValid() && !isSubmitting ? 'bg-primary' : 'bg-gray-400 cursor-not-allowed'}
                `}
            >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />} ثبت نهایی صورتجلسه
            </button>
          </div>
        </form>
    </div>
  );
};
