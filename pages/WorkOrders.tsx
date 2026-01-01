
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Save, Plus, Paperclip, Trash2, AlertTriangle, CheckCircle, Loader2, Timer, Activity, ListChecks, Search, Clock, ChevronDown, Check, Users, Factory, FileText, Wrench, X, Layers } from 'lucide-react';
import { generateTrackingCode, compareShamsiDateTime, isFutureDate, calculateDurationMinutes, formatMinutesToTime, getShamsiDate, getTime, gregorianToJalali } from '../utils';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { useNavigate } from 'react-router-dom';
import { startWorkflow, fetchMasterData, fetchNextWorkOrderCode } from '../workflowStore';
import { supabase } from '../supabaseClient';

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
  isViewOnly?: boolean; // New prop for read-only viewing
}

// --- Helper Components ---

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    displayMode?: 'LABEL' | 'VALUE'; // New Prop to control what is shown after selection
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled, className, displayMode = 'LABEL' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initialize search term
    useEffect(() => {
        if (!isOpen) {
             const selected = options.find(o => o.value === value);
             if (selected) {
                 // If displayMode is VALUE, show value (Code), else show Label
                 setSearchTerm(displayMode === 'VALUE' ? selected.value : selected.label);
             } else {
                 setSearchTerm(value || '');
             }
        }
    }, [value, isOpen, options, displayMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Revert logic on close without selection
                const selected = options.find(o => o.value === value);
                if (selected) {
                    setSearchTerm(displayMode === 'VALUE' ? selected.value : selected.label);
                } else {
                    setSearchTerm(value || '');
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, options, displayMode]);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative" title={value ? options.find(o => o.value === value)?.label : ''}>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    className={`w-full p-2.5 pr-8 border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                />
                {disabled ? (
                    <ChevronDown className="absolute left-2 top-3 w-4 h-4 text-gray-400" />
                ) : (
                    <Search className="absolute left-2 top-3 w-4 h-4 text-gray-400" />
                )}
            </div>
            {isOpen && !disabled && (
                <div className="absolute top-full right-0 left-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow-lg z-50 animate-fadeIn">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.value}
                                className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 last:border-0 flex flex-col"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                    setSearchTerm(displayMode === 'VALUE' ? opt.value : opt.label);
                                }}
                            >
                                <span className="font-bold">{opt.value}</span>
                                <span className="text-xs text-gray-500">{opt.label}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-gray-400 text-xs">موردی یافت نشد</div>
                    )}
                </div>
            )}
        </div>
    );
};

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
  const [allParts, setAllParts] = useState<any[]>([]); // New: Parts List
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
        const pts = await fetchMasterData('parts'); // Fetch parts
        
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

  // Bi-directional Filter Logic: Equipment Code Change
  const handleEquipmentChange = (code: string) => {
      const equip = allEquipment.find(eq => eq.code === code);
      
      if (!equip) {
          // Reset
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

      // Filter Local Names based on selected Equipment's Class & Group
      if (equip.class_id && equip.group_id) {
          const relevantLocalNames = allLocalNames.filter(ln => 
              ln.class_id === equip.class_id && ln.group_id === equip.group_id
          );
          setFilteredLocalNames(relevantLocalNames);
      } else {
          setFilteredLocalNames(allLocalNames);
      }
  };

  // Bi-directional Filter Logic: Local Name Change
  const handleLocalNameChange = (localNameStr: string) => {
      const localNameObj = allLocalNames.find(ln => ln.local_name === localNameStr);

      setFormData(prev => ({ ...prev, equipLocalName: localNameStr }));

      if (localNameObj && localNameObj.class_id && localNameObj.group_id) {
          // Filter Equipment based on selected Local Name's Class & Group
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
          id: Math.random().toString(), 
          name: '', 
          startDate: formData.startDate,
          startTime: formData.startTime || '08:00',
          endDate: formData.endDate,
          endTime: formData.endTime || '16:00',
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

  // Logic to handle part selection from DB list
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
              // Try to map DB unit ID to Unit Title
              const unitObj = units.find(u => u.id === selectedPart.consumption_unit_id) || units.find(u => u.id === selectedPart.stock_unit_id);
              const unitTitle = unitObj ? unitObj.title : (units[0]?.title || 'عدد');

              return {
                  ...row,
                  code: selectedPart.code || '',
                  name: selectedPart.name || '',
                  unit: unitTitle
              };
          }
          // Fallback manual entry if typed not found
          return { ...row, [mode === 'CODE' ? 'code' : 'name']: value };
      }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newDocs = Array.from(e.target.files).map((file: File) => ({
        id: Math.random().toString(),
        name: file.name
      }));
      setDocRows(prev => [...prev, ...newDocs]);
      e.target.value = '';
    }
  };

  const handleRemoveRow = (setter: React.Dispatch<React.SetStateAction<any[]>>, id: string) => {
      setter(prev => prev.filter(item => item.id !== id));
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
        
        const invalidParts = partRows.some(p => p.qty <= 0);
        if (invalidParts) return "تعداد قطعات مصرفی باید بزرگتر از صفر باشد.";
    }
    return null;
  };

  const isFormValid = () => {
      if (isViewOnly) return true;
      if (!formData.shift) return false;
      if (!formData.equipCode) return false;
      if (!formData.equipLocalName) return false;
      if (!formData.productionLine) return false;
      if (!formData.locationId) return false;
      if (!formData.workCategory) return false;
      if (!formData.priority) return false;
      if (!formData.workType) return false;
      if (!formData.failureDesc) return false;

      if (isExecutorMode) {
          if (!formData.actionDesc) return false;
          if (!formData.downtime || !formData.repairTime) return false;
      }
      return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) return;

    setErrorMsg(null);
    const error = validateForm();
    if (error) {
        setErrorMsg(error);
        window.scrollTo(0,0);
        return;
    }

    if (!window.confirm(isExecutorMode ? "آیا از پایان کار و ثبت نهایی اطمینان دارید؟" : "آیا از ثبت درخواست و ارسال به کارتابل اطمینان دارید؟")) {
        return;
    }

    const fullData = { 
        ...formData, 
        downtime: isExecutorMode ? timeToMinutes(formData.downtime) : 0,
        repairTime: isExecutorMode ? timeToMinutes(formData.repairTime) : 0,
        labor: laborRows, 
        parts: partRows, 
        docs: docRows 
    };
    
    if (isExecutorMode && onProcessComplete) {
        onProcessComplete(fullData);
    } else {
        setIsSubmitting(true);
        try {
            const date = new Date();
            const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
            const year = String(j.jy).substring(1); 
            const month = String(j.jm).padStart(2, '0');
            const prefix = `W${year}${month}`;

            const uniqueCode = await fetchNextWorkOrderCode(prefix);

            const safeRequesterId = toUuidOrNull(user.id);
            const safeEquipmentId = toUuidOrNull(allEquipment.find(e => e.code === formData.equipCode)?.id);
            const safeLocationId = toUuidOrNull(formData.locationId);

            const dbPayload = {
                tracking_code: uniqueCode,
                requester_id: safeRequesterId,
                requester_name: user.fullName,
                request_date: formData.reportDate,
                request_time: formData.reportTime,
                shift: formData.shift,
                equipment_id: safeEquipmentId,
                equipment_code: formData.equipCode,
                equipment_name: formData.equipName,
                local_name: formData.equipLocalName,
                location_id: safeLocationId,
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
            if (dbError) {
                console.error("Database Insert Error:", dbError);
                throw new Error("خطا در ذخیره دستور کار در دیتابیس.");
            }

            const cartableItem = startWorkflow(
                'WORK_ORDER', 
                fullData, 
                user, 
                uniqueCode, 
                `درخواست کار: ${formData.equipName || formData.equipLocalName} - ${formData.failureDesc.substring(0, 30)}...`
            );
            
            if (cartableItem) {
                setWorkflowStarted(true);
                setTrackingCode(uniqueCode);
            } else {
                setErrorMsg("خطا در ایجاد فرآیند. لطفا دوباره تلاش کنید.");
            }
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
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                          <CheckCircle className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold mb-1">{workflowStarted ? 'درخواست ثبت و وارد کارتابل شد' : 'درخواست ثبت شد'}</h2>
                      <p className="opacity-90 font-mono text-lg">{trackingCode}</p>
                  </div>
                  <div className="p-6 space-y-3">
                      <button onClick={() => navigate('/work-orders')} className="w-full bg-white border border-gray-200 dark:bg-gray-700 py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-gray-50 dark:hover:bg-gray-600">
                          <ListChecks className="w-5 h-5" /> بازگشت به لیست دستور کارها
                      </button>
                      <button onClick={() => navigate('/')} className="w-full text-gray-500 py-2 text-sm">بازگشت به داشبورد</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
        <div className="flex items-center gap-2">
            <Wrench className="w-8 h-8 text-primary" />
            <div>
                <h1 className="text-2xl font-bold">{pageTitle}</h1>
                {isExecutorMode && !isViewOnly && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">حالت اجرایی</span>}
            </div>
        </div>
        <button onClick={() => navigate('/work-orders')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky top-16 z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex min-w-max">
              {TABS_CONFIG.filter(t => !t.hidden).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 
                        ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                      <tab.icon className="w-5 h-5" /> {tab.label}
                  </button>
              ))}
          </div>
      </div>

       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
             {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 flex items-start gap-3 text-sm animate-pulse border border-red-100">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
              </div>
          )}

          {activeTab === 'GENERAL' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">درخواست کننده</span>
                      <span className="font-bold text-sm">{formData.requester}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">تاریخ گزارش</span>
                      <span className="font-bold text-sm font-mono">{formData.reportDate}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">ساعت گزارش</span>
                      <span className="font-bold text-sm font-mono">{formData.reportTime}</span>
                  </div>
                  <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">شیفت کاری <span className="text-red-500">*</span></label>
                      <select 
                        required
                        value={formData.shift}
                        onChange={(e) => setFormData({...formData, shift: e.target.value})}
                        disabled={isExecutorMode || isViewOnly}
                        className={`text-sm font-bold border rounded outline-none ${isExecutorMode || isViewOnly ? 'bg-transparent border-none cursor-not-allowed' : 'bg-white dark:bg-gray-800 p-1 cursor-pointer'}`}
                      >
                          <option value="">انتخاب...</option>
                          <option value="DayWork">روزکار</option>
                          <option value="A">شیفت A</option>
                          <option value="B">شیفت B</option>
                          <option value="C">شیفت C</option>
                      </select>
                  </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 mb-2">مشخصات تجهیز</h3>
                  
                  {/* Equipment and Local Name Selection - Now Searchable */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">کد تجهیز <span className="text-red-500">*</span></label>
                        {isExecutorMode || isViewOnly ? (
                            <input type="text" value={formData.equipCode} disabled className="w-full p-2.5 border rounded-xl bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                        ) : (
                            <SearchableSelect 
                                value={formData.equipCode}
                                options={filteredEquipment.map(eq => ({ value: eq.code, label: `${eq.code} - ${eq.name}` }))}
                                onChange={handleEquipmentChange}
                                placeholder="جستجو کد تجهیز..."
                                displayMode="VALUE" // Added to only show the code in the input
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">نام تجهیز</label>
                        <input type="text" readOnly value={formData.equipName} className="w-full p-2.5 border rounded-xl bg-gray-200 dark:bg-gray-600 cursor-not-allowed opacity-70" placeholder="پس از انتخاب کد پر می‌شود" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">نام محلی تجهیز <span className="text-red-500">*</span></label>
                         {isExecutorMode || isViewOnly ? (
                             <div title={formData.equipLocalName}>
                                <input type="text" value={formData.equipLocalName} disabled className="w-full p-2.5 border rounded-xl bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                             </div>
                         ) : (
                             <div title={formData.equipLocalName}>
                                <SearchableSelect
                                    value={formData.equipLocalName}
                                    options={filteredLocalNames.map(ln => ({ value: ln.local_name, label: ln.local_name }))}
                                    onChange={handleLocalNameChange}
                                    placeholder="جستجو نام محلی..."
                                />
                             </div>
                         )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">محل وقوع</label>
                        <input 
                            type="text"
                            disabled={isExecutorMode || isViewOnly}
                            value={formData.locationDetail}
                            onChange={(e) => setFormData({...formData, locationDetail: e.target.value})}
                            placeholder="مثال: طبقه دوم، نوار نقاله..."
                            className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">خط تولید <span className="text-red-500">*</span></label>
                        <select 
                            required
                            disabled={isExecutorMode || isViewOnly}
                            value={formData.productionLine}
                            onChange={(e) => setFormData({...formData, productionLine: e.target.value})}
                            className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                        >
                            <option value="">انتخاب کنید</option>
                            <option value="Line A">Line A</option>
                            <option value="Line B">Line B</option>
                            <option value="Line A&B">Line A&B</option>
                        </select>
                    </div>
                      <div>
                            <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">محل استقرار <span className="text-red-500">*</span></label>
                            <select 
                                disabled={isExecutorMode || isViewOnly}
                                value={formData.locationId}
                                onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                                className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                            >
                                <option value="">انتخاب کنید...</option>
                                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                      </div>
                  </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">نوع فعالیت <span className="text-red-500">*</span></label>
                      <select required disabled={isExecutorMode || isViewOnly} value={formData.workType} onChange={(e) => setFormData({...formData, workType: e.target.value})} className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}>
                          <option value="REPAIR">تعمیرات اضطراری (EM)</option>
                          <option value="PM">نت پیشگیرانه (PM)</option>
                          <option value="PROJECT">پروژه / اصلاح</option>
                          <option value="INSPECTION">بازرسی فنی</option>
                          <option value="SERVICE">سرویس عمومی</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">نوع کار (دیسیپلین) <span className="text-red-500">*</span></label>
                      <select required disabled={isExecutorMode || isViewOnly} value={formData.workCategory} onChange={(e) => setFormData({...formData, workCategory: e.target.value})} className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}>
                          <option value="MECHANICAL">مکانیک</option>
                          <option value="ELECTRICAL">برق</option>
                          <option value="INSTRUMENTATION">ابزار دقیق</option>
                          <option value="FACILITIES">تأسیسات صنعتی</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">اولویت <span className="text-red-500">*</span></label>
                      <select required disabled={isExecutorMode || isViewOnly} value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}>
                          <option value="NORMAL">عادی</option>
                          <option value="URGENT">فوری</option>
                          <option value="CRITICAL">بحرانی (توقف تولید)</option>
                      </select>
                  </div>
               </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">شرح خرابی / درخواست <span className="text-red-500">*</span></label>
                <div className="relative">
                    <textarea 
                        required
                        readOnly={isExecutorMode || isViewOnly}
                        className={`w-full p-4 border rounded-xl h-28 pl-10 resize-none ${isExecutorMode || isViewOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700'}`}
                        placeholder="توضیحات خرابی را وارد کنید..."
                        value={formData.failureDesc}
                        onChange={(e) => setFormData({...formData, failureDesc: e.target.value})}
                    ></textarea>
                    {!isExecutorMode && !isViewOnly && (
                        <button type="button" onClick={() => handleVoiceInput('failureDesc')} className={`absolute left-2 bottom-2 p-2 transition rounded-full ${listeningField === 'failureDesc' ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-primary'}`}>
                            {listeningField === 'failureDesc' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}
                </div>
              </div>

              {isExecutorMode && (
                  <div className="space-y-6 border-t-2 border-dashed border-gray-300 dark:border-gray-600 pt-6 mt-2">
                       <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                           <Activity className="w-5 h-5" /> گزارش انجام کار (تکمیل توسط مجری)
                       </h3>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">اقدام صورت گرفته <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <textarea 
                                    required 
                                    readOnly={isViewOnly}
                                    className={`w-full p-4 border rounded-xl h-28 pl-10 outline-none resize-none ${isViewOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                                    placeholder="شرح کامل تعمیرات انجام شده..." 
                                    value={formData.actionDesc} 
                                    onChange={(e) => setFormData({...formData, actionDesc: e.target.value})}
                                ></textarea>
                                {!isViewOnly && (
                                    <button type="button" onClick={() => handleVoiceInput('actionDesc')} className={`absolute left-2 bottom-2 p-2 transition rounded-full ${listeningField === 'actionDesc' ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-primary'}`}>
                                        {listeningField === 'actionDesc' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4">
                             {/* Optimized Layout for Mobile */}
                             <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${isViewOnly ? 'pointer-events-none opacity-80' : ''}`}>
                                <div className="flex flex-col gap-3">
                                    <ShamsiDatePicker label="تاریخ شروع" value={formData.startDate} onChange={(d) => setFormData({...formData, startDate: d})} />
                                    <ClockTimePicker label="ساعت شروع" value={formData.startTime} onChange={(t) => setFormData({...formData, startTime: t})} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <ShamsiDatePicker label="تاریخ پایان" value={formData.endDate} onChange={(d) => setFormData({...formData, endDate: d})} />
                                    <ClockTimePicker label="ساعت پایان" value={formData.endTime} onChange={(t) => setFormData({...formData, endTime: t})} />
                                </div>
                            </div>
                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isViewOnly ? 'pointer-events-none opacity-80' : ''}`}>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5">مدت توقف (ساعت:دقیقه) <span className="text-red-500">*</span></label>
                                    <ClockTimePicker 
                                        value={formData.downtime} 
                                        onChange={(t) => setFormData({...formData, downtime: t})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5">زمان خالص تعمیر (ساعت:دقیقه) <span className="text-red-500">*</span></label>
                                    <ClockTimePicker 
                                        value={formData.repairTime} 
                                        onChange={(t) => setFormData({...formData, repairTime: t})} 
                                    />
                                </div>
                            </div>
                        </div>
                  </div>
              )}
            </div>
          )}

          {activeTab === 'LABOR' && (
              <div className="space-y-4 animate-fadeIn">
                  {laborRows.map((row) => (
                      <div key={row.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 space-y-3 relative">
                          {!isViewOnly && <button type="button" onClick={() => handleRemoveRow(setLaborRows, row.id)} className="absolute top-4 left-4 p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5" /></button>}
                          
                          <div className="flex-1 ml-8">
                                <label className="text-xs text-gray-500 mb-1 block">نام تکنسین <span className="text-red-500">*</span></label>
                                <SearchableSelect 
                                    value={row.name}
                                    options={personnelList.map(p => ({ value: p.full_name, label: p.full_name }))}
                                    onChange={(val) => updateLaborRow(row.id, 'name', val)}
                                    placeholder="جستجو نام تکنسین..."
                                    className="w-full"
                                    disabled={isViewOnly}
                                />
                          </div>
                          
                          {/* Date/Time pickers for labor */}
                          <div className={`grid grid-cols-2 gap-3 ${isViewOnly ? 'pointer-events-none opacity-80' : ''}`}>
                              <ShamsiDatePicker label="تاریخ شروع" value={row.startDate} onChange={(d) => updateLaborRow(row.id, 'startDate', d)} />
                              <ClockTimePicker label="ساعت شروع" value={row.startTime} onChange={(t) => updateLaborRow(row.id, 'startTime', t)} />
                              <ShamsiDatePicker label="تاریخ پایان" value={row.endDate} onChange={(d) => updateLaborRow(row.id, 'endDate', d)} />
                              <ClockTimePicker label="ساعت پایان" value={row.endTime} onChange={(t) => updateLaborRow(row.id, 'endTime', t)} />
                          </div>

                          {/* Duration Badge */}
                          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-600">
                              <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  مدت کارکرد: {formatMinutesToTime(row.durationMinutes)}
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  {/* Total Labor Hours Footer */}
                  {laborRows.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                          <span className="font-bold text-blue-800 dark:text-blue-300">مجموع نفر ساعت:</span>
                          <span className="font-black text-lg text-blue-900 dark:text-blue-200">
                              {formatMinutesToTime(laborRows.reduce((sum, row) => sum + row.durationMinutes, 0))}
                          </span>
                      </div>
                  )}

                  {!isViewOnly && <button type="button" onClick={handleAddLabor} className="w-full flex items-center justify-center gap-2 text-primary border-2 border-dashed border-primary/30 px-4 py-3 rounded-lg hover:bg-primary/5 transition"><Plus className="w-4 h-4" /> افزودن نیروی کار</button>}
              </div>
          )}

           {activeTab === 'PARTS' && (
              <div className="space-y-4 animate-fadeIn">
                  {partRows.map((row) => (
                      <div key={row.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3 relative">
                          {!isViewOnly && <button type="button" onClick={() => handleRemoveRow(setPartRows, row.id)} className="absolute top-4 left-4 p-1.5 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>}
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">کد قطعه</label>
                                  {isViewOnly ? (
                                      <input type="text" value={row.code} disabled className="w-full p-2 border rounded-lg bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                                  ) : (
                                      <SearchableSelect 
                                          value={row.code}
                                          options={allParts.map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }))}
                                          onChange={(val) => handlePartSelect(row.id, val, 'CODE')}
                                          placeholder="جستجو کد..."
                                          displayMode="VALUE"
                                      />
                                  )}
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">نام قطعه <span className="text-red-500">*</span></label>
                                  {isViewOnly ? (
                                      <input type="text" value={row.name} disabled className="w-full p-2 border rounded-lg bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                                  ) : (
                                      <SearchableSelect 
                                          value={row.name}
                                          options={allParts.map(p => ({ value: p.name, label: p.name }))}
                                          onChange={(val) => handlePartSelect(row.id, val, 'NAME')}
                                          placeholder="جستجو نام قطعه..."
                                      />
                                  )}
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">تعداد <span className="text-red-500">*</span></label>
                                  <input 
                                    type="number" 
                                    value={row.qty} 
                                    onChange={(e) => updatePartRow(row.id, 'qty', Number(e.target.value))} 
                                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800"
                                    min="0.01" step="0.01"
                                    disabled={isViewOnly}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">واحد <span className="text-red-500">*</span></label>
                                  <select value={row.unit} onChange={(e) => updatePartRow(row.id, 'unit', e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" disabled={isViewOnly}>
                                      {units.length > 0 ? units.map(u => (
                                          <option key={u.id} value={u.title}>{u.title}</option>
                                      )) : <option value="عدد">عدد</option>}
                                  </select>
                              </div>
                          </div>
                      </div>
                  ))}
                   {!isViewOnly && <button type="button" onClick={handleAddPart} className="w-full flex items-center justify-center gap-2 text-primary border-2 border-dashed border-primary/30 px-4 py-3 rounded-lg hover:bg-primary/5 transition"><Plus className="w-4 h-4" /> افزودن قطعه مصرفی</button>}
              </div>
          )}

           {activeTab === 'DOCS' && (
              <div className="space-y-6 animate-fadeIn">
                   {!isViewOnly && (
                       <>
                           <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileChange} />
                           <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500 mb-2 font-medium">فایل‌ها را اینجا رها کنید یا کلیک کنید</p>
                          </div>
                       </>
                   )}
                  {docRows.length > 0 && (
                      <div className="space-y-2">
                          <h4 className="text-sm font-bold text-gray-500">فایل‌های پیوست شده:</h4>
                          {docRows.map(doc => (
                              <div key={doc.id} className="flex justify-between items-center bg-white dark:bg-gray-700 border p-3 rounded-lg shadow-sm">
                                  <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
                                  {!isViewOnly && <button type="button" onClick={() => handleRemoveRow(setDocRows, doc.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>}
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {!isViewOnly && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button 
                    disabled={!isFormValid() || isSubmitting} 
                    type="submit" 
                    className={`bg-primary text-white px-8 py-3 rounded-xl shadow-lg shadow-red-900/20 flex items-center gap-2 hover:bg-red-800 transition transform active:scale-95 ${(!isFormValid() || isSubmitting) ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 shadow-none' : ''}`}
                  >
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
