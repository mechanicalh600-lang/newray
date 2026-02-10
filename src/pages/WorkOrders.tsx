
import React, { useState, useRef, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle, Loader2, ListChecks, Users, Factory, FileText, Wrench, X, Layers } from 'lucide-react';
import { generateTrackingCode, compareShamsiDateTime, isFutureDate, calculateDurationMinutes, formatMinutesToTime, getShamsiDate, getTime, gregorianToJalali } from '../utils';
import { useNavigate } from 'react-router-dom';
import { startWorkflow, fetchMasterData, fetchNextWorkOrderCode } from '../workflowStore';
import { supabase } from '../supabaseClient';
import { TabGeneral, TabLabor, TabParts, TabDocs } from './workOrder/WorkOrderTabs';

type Tab = 'GENERAL' | 'LABOR' | 'PARTS' | 'DOCS';

interface LaborRow {
    id: string;
    name: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    durationMinutes: number;
}

interface PartRow {
    id: string;
    code: string;
    name: string;
    qty: number;
    unit: string;
}

interface WorkOrdersProps {
  initialData?: any;
  onProcessComplete?: (data: any) => void;
  isViewOnly?: boolean; 
}

// Helper to convert HH:MM to total minutes
const timeToMinutes = (timeStr: string): number => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
};

// Helper to validate UUID
const toUuidOrNull = (id: string | null | undefined): string | null => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return id && uuidRegex.test(id) ? id : null;
};

export const WorkOrders: React.FC<WorkOrdersProps> = ({ initialData, onProcessComplete, isViewOnly = false }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // If view only, treat it as executor mode for layout (show all tabs) but disable inputs
  const isExecutorMode = !!initialData || isViewOnly;
  const pageTitle = isViewOnly ? 'مشاهده دستور کار' : (isExecutorMode ? 'تکمیل دستور کار' : 'ثبت درخواست کار');

  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [listeningField, setListeningField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic Data States
  const [units, setUnits] = useState<any[]>([]);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [allLocalNames, setAllLocalNames] = useState<any[]>([]);
  const [allParts, setAllParts] = useState<any[]>([]); 
  const [locations, setLocations] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  
  // Filtered Options States
  const [filteredEquipment, setFilteredEquipment] = useState<any[]>([]);
  const [filteredLocalNames, setFilteredLocalNames] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
      equipCode: '',
      equipName: '',
      equipLocalName: '',
      locationId: '',
      locationDetail: '', 
      productionLine: '',
      requester: user.fullName || 'کاربر ناشناس',
      reportDate: getShamsiDate(),
      reportTime: getTime(),
      shift: '', 
      workCategory: 'MECHANICAL',
      workType: 'REPAIR',
      priority: 'NORMAL',
      failureDesc: '',
      actionDesc: '',
      startDate: getShamsiDate(),
      startTime: '',
      endDate: getShamsiDate(),
      endTime: '',
      downtime: '', 
      repairTime: '' 
  });

  const [laborRows, setLaborRows] = useState<LaborRow[]>([]);
  const [partRows, setPartRows] = useState<PartRow[]>([]);
  const [docRows, setDocRows] = useState<{id: string, name: string}[]>([]);

  // Initial Data Load
  useEffect(() => {
    const loadMasterData = async () => {
        const eq = await fetchMasterData('equipment');
        const ln = await fetchMasterData('equipment_local_names');
        const loc = await fetchMasterData('locations');
        const per = await fetchMasterData('personnel');
        const pts = await fetchMasterData('parts'); 
        
        setAllEquipment(eq);
        setAllLocalNames(ln);
        setFilteredEquipment(eq);
        setFilteredLocalNames(ln);
        setLocations(loc);
        setPersonnelList(per);
        setAllParts(pts);
        
        setUnits(await fetchMasterData('measurement_units'));
    };
    loadMasterData();

    if (initialData) {
        setFormData(prev => ({ 
            ...prev, 
            ...initialData,
            downtime: typeof initialData.downtime === 'number' ? formatMinutesToTime(initialData.downtime) : initialData.downtime,
            repairTime: typeof initialData.repairTime === 'number' ? formatMinutesToTime(initialData.repairTime) : initialData.repairTime
        }));
        if (initialData.labor || initialData.labor_details) setLaborRows(initialData.labor || initialData.labor_details || []);
        if (initialData.parts || initialData.used_parts) setPartRows(initialData.parts || initialData.used_parts || []);
        if (initialData.docs || initialData.attachments) setDocRows(initialData.docs || initialData.attachments || []);
    }
  }, [initialData]);

  // Bi-directional Filter Logic
  const handleEquipmentChange = (code: string) => {
      const equip = allEquipment.find(eq => eq.code === code);
      if (!equip) {
          setFormData(prev => ({ ...prev, equipCode: code, equipName: '', locationId: '' }));
          setFilteredLocalNames(allLocalNames);
          return;
      }
      setFormData(prev => ({
          ...prev,
          equipCode: code,
          equipName: equip.name,
          locationId: equip.location_id || ''
      }));
      if (equip.class_id && equip.group_id) {
          const relevantLocalNames = allLocalNames.filter(ln => 
              ln.class_id === equip.class_id && ln.group_id === equip.group_id
          );
          setFilteredLocalNames(relevantLocalNames);
      } else {
          setFilteredLocalNames(allLocalNames);
      }
  };

  const handleLocalNameChange = (localNameStr: string) => {
      const localNameObj = allLocalNames.find(ln => ln.local_name === localNameStr);
      setFormData(prev => ({ ...prev, equipLocalName: localNameStr }));
      if (localNameObj && localNameObj.class_id && localNameObj.group_id) {
          const relevantEquipment = allEquipment.filter(eq => 
              eq.class_id === localNameObj.class_id && eq.group_id === localNameObj.group_id
          );
          setFilteredEquipment(relevantEquipment);
      } else {
          setFilteredEquipment(allEquipment);
      }
  };

  const handleVoiceInput = (field: 'failureDesc' | 'actionDesc') => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert('مرورگر شما از قابلیت تبدیل گفتار به نوشتار پشتیبانی نمی‌کند.');
          return;
      }
      if (listeningField === field) {
          setListeningField(null);
          return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setListeningField(field);
      recognition.onend = () => setListeningField(null);
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setFormData(prev => ({
              ...prev,
              [field]: prev[field] ? `${prev[field]} ${transcript}` : transcript
          }));
      };
      recognition.start();
  };

  const handleAddLabor = () => {
      setLaborRows([...laborRows, { 
          id: Math.random().toString(), name: '', 
          startDate: formData.startDate, startTime: formData.startTime || '08:00',
          endDate: formData.endDate, endTime: formData.endTime || '16:00',
          durationMinutes: 0
      }]);
  };

  const updateLaborRow = (id: string, field: keyof LaborRow, value: any) => {
      setLaborRows(prev => prev.map(row => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value };
          if (['startDate', 'startTime', 'endDate', 'endTime'].includes(field)) {
              updated.durationMinutes = calculateDurationMinutes(
                  updated.startDate, updated.startTime,
                  updated.endDate, updated.endTime
              );
          }
          return updated;
      }));
  };

  const handleAddPart = () => {
      setPartRows([...partRows, { id: Math.random().toString(), code: '', name: '', qty: 1, unit: units[0]?.title || 'عدد' }]);
  };

  const updatePartRow = (id: string, field: keyof PartRow, value: any) => {
      setPartRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handlePartSelect = (id: string, value: string, mode: 'CODE' | 'NAME') => {
      let selectedPart;
      if (mode === 'CODE') {
           selectedPart = allParts.find(p => p.code === value);
      } else {
           selectedPart = allParts.find(p => p.name === value);
      }
      setPartRows(prev => prev.map(row => {
          if (row.id !== id) return row;
          if (selectedPart) {
              const unitObj = units.find(u => u.id === selectedPart.consumption_unit_id) || units.find(u => u.id === selectedPart.stock_unit_id);
              const unitTitle = unitObj ? unitObj.title : (units[0]?.title || 'عدد');
              return { ...row, code: selectedPart.code || '', name: selectedPart.name || '', unit: unitTitle };
          }
          return { ...row, [mode === 'CODE' ? 'code' : 'name']: value };
      }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newDocs = Array.from(e.target.files).map((file: File) => ({ id: Math.random().toString(), name: file.name }));
      setDocRows(prev => [...prev, ...newDocs]);
      e.target.value = '';
    }
  };

  const handleRemoveRow = (setter: any, id: string) => {
      if (setter) setter((prev: any[]) => prev.filter((item: any) => item.id !== id));
      else {
          // If setter is not passed directly (e.g. from tab component), check id to guess state
          if (laborRows.some(r => r.id === id)) setLaborRows(prev => prev.filter(r => r.id !== id));
          else if (partRows.some(r => r.id === id)) setPartRows(prev => prev.filter(r => r.id !== id));
          else if (docRows.some(r => r.id === id)) setDocRows(prev => prev.filter(r => r.id !== id));
      }
  };

  const validateForm = () => {
    if (isViewOnly) return null;
    if (!formData.shift) return "لطفا شیفت کاری را انتخاب کنید.";
    if (!formData.equipCode) return "لطفا کد تجهیز را انتخاب کنید.";
    if (!formData.equipLocalName) return "لطفا نام محلی تجهیز را مشخص کنید.";
    if (!formData.productionLine) return "لطفا خط تولید را مشخص کنید.";
    if (!formData.locationId) return "لطفا محل استقرار را مشخص کنید.";
    if (!formData.workCategory) return "لطفا نوع کار (دیسیپلین) را مشخص کنید.";
    if (!formData.failureDesc) return "شرح خرابی الزامی است.";
    if (isExecutorMode) {
        if (!formData.actionDesc) return "اقدام صورت گرفته الزامی است.";
        if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) return "لطفا زمان‌بندی کار را کامل وارد کنید.";
        if (!formData.downtime || !formData.repairTime) return "مدت توقف و زمان خالص تعمیر الزامی است.";
        if (isFutureDate(formData.startDate) || isFutureDate(formData.endDate)) return "تاریخ شروع و پایان نمی‌تواند بزرگتر از تاریخ امروز باشد.";
        if (compareShamsiDateTime(formData.startDate, formData.startTime, formData.endDate, formData.endTime) === 1) return "خطا: تاریخ و ساعت پایان نمی‌تواند کوچکتر از تاریخ و ساعت شروع باشد.";
        if (partRows.some(p => p.qty <= 0)) return "تعداد قطعات مصرفی باید بزرگتر از صفر باشد.";
    }
    return null;
  };

  const isFormValid = () => {
      if (isViewOnly) return true;
      if (!formData.shift || !formData.equipCode || !formData.equipLocalName || !formData.productionLine || !formData.locationId || !formData.workCategory || !formData.priority || !formData.workType || !formData.failureDesc) return false;
      if (isExecutorMode) {
          if (!formData.actionDesc || !formData.downtime || !formData.repairTime) return false;
      }
      return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) return;
    setErrorMsg(null);
    const error = validateForm();
    if (error) { setErrorMsg(error); window.scrollTo(0,0); return; }
    if (!window.confirm(isExecutorMode ? "آیا از پایان کار و ثبت نهایی اطمینان دارید؟" : "آیا از ثبت درخواست و ارسال به کارتابل اطمینان دارید؟")) return;

    const fullData = { ...formData, downtime: isExecutorMode ? timeToMinutes(formData.downtime) : 0, repairTime: isExecutorMode ? timeToMinutes(formData.repairTime) : 0, labor: laborRows, parts: partRows, docs: docRows };
    
    if (isExecutorMode && onProcessComplete) {
        onProcessComplete(fullData);
    } else {
        setIsSubmitting(true);
        try {
            const date = new Date();
            const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
            const prefix = `W${String(j.jy).substring(2)}${String(j.jm).padStart(2, '0')}`;
            const uniqueCode = await fetchNextWorkOrderCode(prefix);
            
            const dbPayload = {
                tracking_code: uniqueCode,
                requester_id: toUuidOrNull(user.id),
                requester_name: user.fullName,
                request_date: formData.reportDate,
                request_time: formData.reportTime,
                shift: formData.shift,
                equipment_id: toUuidOrNull(allEquipment.find(e => e.code === formData.equipCode)?.id),
                equipment_code: formData.equipCode,
                equipment_name: formData.equipName,
                local_name: formData.equipLocalName,
                location_id: toUuidOrNull(formData.locationId),
                location_details: formData.locationDetail, 
                production_line: formData.productionLine,
                work_category: formData.workCategory,
                work_type: formData.workType,
                priority: formData.priority,
                failure_description: formData.failureDesc,
                action_taken: formData.actionDesc,
                downtime: isExecutorMode ? timeToMinutes(formData.downtime) : 0,
                repair_time: isExecutorMode ? timeToMinutes(formData.repairTime) : 0,
                labor_details: laborRows,
                used_parts: partRows,
                attachments: docRows,
                status: 'REQUEST'
            };

            const { error: dbError } = await supabase.from('work_orders').insert([dbPayload]);
            if (dbError) throw new Error("خطا در ذخیره دستور کار در دیتابیس.");

            const cartableItem = startWorkflow('WORK_ORDER', fullData, user, uniqueCode, `درخواست کار: ${formData.equipName || formData.equipLocalName} - ${formData.failureDesc.substring(0, 30)}...`);
            if (cartableItem) { setWorkflowStarted(true); setTrackingCode(uniqueCode); }
            else setErrorMsg("خطا در ایجاد فرآیند. لطفا دوباره تلاش کنید.");
        } catch (err: any) {
            console.error(err);
            setErrorMsg("خطا: " + (err.message || "خطا در برقراری ارتباط با سرور"));
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  const TABS_CONFIG = [
      { id: 'GENERAL', label: 'اطلاعات اصلی', icon: FileText },
      { id: 'LABOR', label: 'کارکرد نفرات', icon: Users, hidden: !isExecutorMode },
      { id: 'PARTS', label: 'قطعات مصرفی', icon: Factory, hidden: !isExecutorMode },
      { id: 'DOCS', label: 'مستندات', icon: Layers }
  ];

  if (trackingCode) {
      return (
          <div className="max-w-2xl mx-auto pt-8 pb-20 px-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
                  <div className="bg-green-600 p-6 text-center text-white">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><CheckCircle className="w-10 h-10 text-white" /></div>
                      <h2 className="text-2xl font-bold mb-1">{workflowStarted ? 'درخواست ثبت و وارد کارتابل شد' : 'درخواست ثبت شد'}</h2>
                      <p className="opacity-90 font-mono text-lg">{trackingCode}</p>
                  </div>
                  <div className="p-6 space-y-3">
                      <button onClick={() => navigate('/work-orders')} className="w-full bg-white border border-gray-200 dark:bg-gray-700 py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-gray-50 dark:hover:bg-gray-600"><ListChecks className="w-5 h-5" /> بازگشت به لیست دستور کارها</button>
                      <button onClick={() => navigate('/')} className="w-full text-gray-500 py-2 text-sm">بازگشت به داشبورد</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
        <div className="flex items-center gap-2"><Wrench className="w-8 h-8 text-primary" /><div><h1 className="text-2xl font-bold">{pageTitle}</h1>{isExecutorMode && !isViewOnly && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">حالت اجرایی</span>}</div></div>
        <button onClick={() => navigate('/work-orders')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky top-16 z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex min-w-max">
              {TABS_CONFIG.filter(t => !t.hidden).map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as Tab)} className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-5 h-5" /> {tab.label}</button>
              ))}
          </div>
      </div>

       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
             {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 flex items-start gap-3 text-sm animate-pulse border border-red-100"><AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{errorMsg}</span></div>}

            {activeTab === 'GENERAL' && <TabGeneral formData={formData} setFormData={setFormData} isExecutorMode={isExecutorMode} isViewOnly={isViewOnly} listeningField={listeningField} handleVoiceInput={handleVoiceInput} filteredEquipment={filteredEquipment} filteredLocalNames={filteredLocalNames} locations={locations} handleEquipmentChange={handleEquipmentChange} handleLocalNameChange={handleLocalNameChange} />}
            {activeTab === 'LABOR' && <TabLabor isExecutorMode={isExecutorMode} laborRows={laborRows} isViewOnly={isViewOnly} handleRemoveRow={handleRemoveRow} personnelList={personnelList} updateLaborRow={updateLaborRow} handleAddLabor={handleAddLabor} formData={formData} setFormData={setFormData} listeningField={listeningField} handleVoiceInput={handleVoiceInput} />}
            {activeTab === 'PARTS' && <TabParts isExecutorMode={isExecutorMode} partRows={partRows} isViewOnly={isViewOnly} handleRemoveRow={handleRemoveRow} allParts={allParts} units={units} updatePartRow={updatePartRow} handlePartSelect={handlePartSelect} handleAddPart={handleAddPart} formData={formData} setFormData={setFormData} listeningField={listeningField} handleVoiceInput={handleVoiceInput} />}
            {activeTab === 'DOCS' && <TabDocs isExecutorMode={isExecutorMode} isViewOnly={isViewOnly} fileInputRef={fileInputRef} handleFileChange={handleFileChange} docRows={docRows} handleRemoveRow={handleRemoveRow} formData={formData} setFormData={setFormData} listeningField={listeningField} handleVoiceInput={handleVoiceInput} />}

            {!isViewOnly && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button disabled={!isFormValid() || isSubmitting} type="submit" className={`bg-primary text-white px-8 py-3 rounded-xl shadow-lg shadow-red-900/20 flex items-center gap-2 hover:bg-red-800 transition transform active:scale-95 ${(!isFormValid() || isSubmitting) ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 shadow-none' : ''}`}>
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />} 
                      {isExecutorMode ? 'ثبت و پایان دستور کار' : 'ثبت درخواست و ارسال به کارتابل'}
                  </button>
              </div>
            )}
        </form>
      </div>
    </div>
  );
};

export default WorkOrders;