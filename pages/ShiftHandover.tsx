
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { 
  Clipboard, Save, X, Printer, ArrowRight, Trash2, 
  UserCheck, CalendarOff, UserX, Loader2, Check, AlertTriangle, Search,
  Eye, FileText, RefreshCw, FileSpreadsheet, Plus, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { getShamsiDate, parseShamsiDate, gregorianToJalali } from '../utils';
import { fetchMasterData, fetchShiftReports, saveShiftReport, fetchNextTrackingCode, fetchNextShiftCode } from '../workflowStore';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { ClothGrid } from '../components/ClothGrid';
import { Logo } from '../components/Logo';
// Removed SmartTable import as we implement manual table for exact match

// Refactored Imports
import { 
    PRODUCTION_TIMES, FEED_TYPES_OPTIONS, BALL_SIZES, THICKENER_TIMES, 
    SHIFT_TYPE_MAP, DEFAULT_FEEDS, TABS, toPersianNum, parseTimeToMinutes,
    AttendanceStatus, LeaveType, FeedInput, BallCharge
} from './ShiftHandoverTypes';
import { 
    TabProduction, TabMills, TabHydrocyclones, TabDrumMagnets, 
    TabConcentrateFilters, TabThickeners, TabRecoveryFilters, TabDowntime 
} from './ShiftHandoverTabs';
import { ShiftReportView } from './ShiftHandoverReport';

interface Props {
  user: User;
}

// --- Helper Component for Searchable Personnel Input ---
const PersonSearchInput = ({ data, onSelect, disabled, placeholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = data.filter((p: any) => p && (p.full_name?.includes(search) || (p.personnel_code && p.personnel_code.includes(search))));

    return (
        <div className="relative mb-3" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full p-2 pr-9 text-sm border rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            {isOpen && search && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto mt-1 animate-fadeIn">
                    {filtered.length > 0 ? filtered.map((p: any) => (
                        <div
                            key={p.id}
                            className="p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex justify-between items-center"
                            onClick={() => { onSelect(p.id); setSearch(''); setIsOpen(false); }}
                        >
                            <span className="font-medium">{p.full_name}</span>
                            {p.personnel_code && <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-900 px-1 rounded">{p.personnel_code}</span>}
                        </div>
                    )) : (
                        <div className="p-3 text-xs text-gray-400 text-center">موردی یافت نشد</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ShiftHandover: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'VIEW'>('LIST');
  const [activeTab, setActiveTab] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listeningField, setListeningField] = useState<{ section: 'downtime' | 'footer' | 'thickener' | 'downtimeReason', index: number, subIndex?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // List View States
  const [loading, setLoading] = useState(false);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [paginatedItems, setPaginatedItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isFormViewOnly, setIsFormViewOnly] = useState(false); // New state to force read-only in form view
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

  const [personnel, setPersonnel] = useState<any[]>([]);

  // Form State
  const [shiftInfo, setShiftInfo] = useState({
      name: 'A',
      type: 'Day1',
      date: getShamsiDate(),
      shiftDuration: '12:00',
      supervisor: user.id,
      supervisorName: user.fullName 
  });

  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [leaveTypes, setLeaveTypes] = useState<Record<string, LeaveType>>({}); 

  const [production, setProduction] = useState<{
      lineA: Record<string, number>,
      lineB: Record<string, number>
  }>({ lineA: {}, lineB: {} });

  const [feedInfo, setFeedInfo] = useState<{
      lineA: Record<string, [FeedInput, FeedInput, FeedInput]>,
      lineB: Record<string, [FeedInput, FeedInput, FeedInput]>
  }>({ lineA: {}, lineB: {} });

  // UI State for Production Tab - Default OFF as requested
  const [feedLinesActive, setFeedLinesActive] = useState({ lineA: false, lineB: false });

  const [ballMills, setBallMills] = useState({
      lineA: {
          primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as BallCharge[] },
          secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as BallCharge[] }
      },
      lineB: {
           primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as BallCharge[] },
           secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as BallCharge[] }
      }
  });

  const [hydrocyclones, setHydrocyclones] = useState({
      lineA: {
          primary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
          secondary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' }
      },
      lineB: {
          primary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
          secondary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' }
      }
  });

  const [drumMagnets, setDrumMagnets] = useState({
      lineA: { active: false, single: false, upper: false, middle: false, lower: false, description: '' },
      lineB: { active: false, single: false, upper: false, middle: false, lower: false, description: '' }
  });

  const [concentrateFilters, setConcentrateFilters] = useState({
      lineA: { active: false, operator: '', hours: '', cloths: [] as string[] },
      lineB: { active: false, operator: '', hours: '', cloths: [] as string[] },
      reserve: { active: false, operator: '', hours: '', cloths: [] as string[] }
  });

  const [thickeners, setThickeners] = useState<{
      lineA: { active: boolean, hoursWorked: string, channelOutput: string, description: string, data: Record<string, { pressure: string, jack: string, mudLine: string }> }[]; 
      lineB: { active: boolean, hoursWorked: string, channelOutput: string, description: string, data: Record<string, { pressure: string, jack: string, mudLine: string }> }[];
  }>({
      lineA: [
          { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
          { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
          { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} }
      ],
      lineB: [
          { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
          { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
          { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} }
      ]
  });

  const [recoveryFilters, setRecoveryFilters] = useState({
      lineA: [
          { active: false, operator: '', hours: '', cloths: [] as string[] }, 
          { active: false, operator: '', hours: '', cloths: [] as string[] } 
      ],
      lineB: [
          { active: false, operator: '', hours: '', cloths: [] as string[] },
          { active: false, operator: '', hours: '', cloths: [] as string[] }
      ]
  });

  const [pumps, setPumps] = useState({
      process: [] as string[], 
      cleanWater: [] as string[]
  });

  const [downtime, setDowntime] = useState({
      lineA: { workTime: '', stopTime: '', reason: '' },
      lineB: { workTime: '', stopTime: '', reason: '' },
      generalDescription: [''] as string[]
  });

  const [footer, setFooter] = useState({
      nextShiftActions: [''] as string[]
  });

  useEffect(() => {
      fetchMasterData('personnel').then(data => {
          setPersonnel(data);
          setAttendanceMap({});
      });
      loadReports();
      fetchAdminAvatar();
  }, []);

  const fetchAdminAvatar = async () => {
      const { data } = await supabase.from('app_users').select('avatar').eq('role', 'ADMIN').limit(1).single();
      if(data) setAdminAvatar(data.avatar);
  };

  const loadReports = async () => {
      setLoading(true);
      try {
          const data = await fetchShiftReports();
          const formattedData = data.map((d: any) => ({
              ...d,
              total_production_a: Number(d.total_production_a),
              total_production_b: Number(d.total_production_b)
          }));
          setReportsList(formattedData);
      } catch (e) {
          console.error("Error loading reports", e);
      } finally {
          setLoading(false);
      }
  };

  // Filter Logic
  useEffect(() => {
    let res = reportsList;
    if (searchTerm) {
        res = res.filter(item => 
            item.tracking_code.includes(searchTerm) ||
            item.shift_date.includes(searchTerm) ||
            (item.supervisor_name && item.supervisor_name.includes(searchTerm))
        );
    }
    setFilteredItems(res);
    setCurrentPage(1);
  }, [reportsList, searchTerm]);

  // Pagination Logic
  useEffect(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    setPaginatedItems(filteredItems.slice(start, end));
  }, [filteredItems, currentPage, rowsPerPage]);

  const handleExport = () => {
    if (filteredItems.length === 0) {
        alert('داده‌ای برای گزارش وجود ندارد.');
        return;
    }
    const header = ["کد گزارش", "تاریخ", "شیفت", "نوع شیفت", "سرپرست", "خوراک A", "خوراک B"];
    const rows = filteredItems.map(item => [
        item.tracking_code,
        item.shift_date,
        item.shift_name,
        SHIFT_TYPE_MAP[item.shift_type] || item.shift_type,
        item.supervisor_name,
        item.total_production_a,
        item.total_production_b
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + header.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shift_reports_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Logic for ReadOnly Mode: Either Viewing Report (ViewMode) OR Viewing Form (Form Mode + ReadOnly Flag)
  const isReadOnly = (viewMode === 'VIEW' && !showReport) || (viewMode === 'FORM' && isFormViewOnly);

  const checkTabValidity = (tabId: number): boolean => {
      if (isReadOnly) return true;
      // Strict validation for tab 9 based on user request
      if (tabId === 9) {
          const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
          const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
          const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
          if (totalA !== shiftMins || totalB !== shiftMins) return false;
      }
      return true; 
  };

  const validateAllTabs = (): boolean => {
      if (isReadOnly) return true;
      // Basic mandatory validation + explicit downtime validation
      if (!shiftInfo.date || !shiftInfo.shiftDuration) return false;
      
      const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
      const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
      const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
      
      if (totalA !== shiftMins || totalB !== shiftMins) return false;

      return true;
  };

  // --- Handlers ---

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(paginatedItems.map((i: any) => i.id));
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

  const getDayOfWeek = (dateStr: string) => {
      const date = parseShamsiDate(dateStr);
      if (!date) return '';
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      return days[date.getDay()];
  };

  const handleAttendanceChange = (personId: string, status: AttendanceStatus) => {
      setAttendanceMap(prev => ({ ...prev, [personId]: status }));
  };

  const handleRemoveAttendance = (personId: string) => {
      setAttendanceMap(prev => {
          const newMap = { ...prev };
          delete newMap[personId];
          return newMap;
      });
  };

  const propagateFeedChanges = (line: 'lineA' | 'lineB', startTimeIdx: number, newFeeds: [FeedInput, FeedInput, FeedInput]) => {
      setFeedInfo(prev => {
          const currentLine = { ...prev[line] };
          for (let i = startTimeIdx; i < PRODUCTION_TIMES.length; i++) {
              currentLine[PRODUCTION_TIMES[i]] = JSON.parse(JSON.stringify(newFeeds)); 
          }
          return { ...prev, [line]: currentLine };
      });
  };

  const handleTonnageChange = (line: 'lineA' | 'lineB', time: string, val: string) => {
      if(isReadOnly) return;
      const numVal = Number(val);
      if (numVal < 0) return; 
      const timeIndex = PRODUCTION_TIMES.indexOf(time);
      
      setProduction(prev => {
          const newLine = { ...prev[line] };
          if (timeIndex !== -1) {
              for(let i = timeIndex; i < PRODUCTION_TIMES.length; i++) {
                  newLine[PRODUCTION_TIMES[i]] = numVal;
              }
          }
          return { ...prev, [line]: newLine };
      });
  };

  const handleFeedTypeChange = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, val: string) => {
      if(isReadOnly) return;
      const time = PRODUCTION_TIMES[timeIdx];
      const currentFeeds = feedInfo[line][time] || DEFAULT_FEEDS;
      const newFeeds = JSON.parse(JSON.stringify(currentFeeds)) as [FeedInput, FeedInput, FeedInput]; 
      
      if (val === "سایر") {
          newFeeds[feedIdx] = { ...newFeeds[feedIdx], type: '', isCustom: true };
      } else {
          newFeeds[feedIdx] = { ...newFeeds[feedIdx], type: val, isCustom: false };
      }
      propagateFeedChanges(line, timeIdx, newFeeds);
  };

  const handleCustomFeedType = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, val: string) => {
      if(isReadOnly) return;
      const time = PRODUCTION_TIMES[timeIdx];
      const currentFeeds = feedInfo[line][time] || DEFAULT_FEEDS;
      const newFeeds = JSON.parse(JSON.stringify(currentFeeds)) as [FeedInput, FeedInput, FeedInput];
      newFeeds[feedIdx] = { ...newFeeds[feedIdx], type: val, isCustom: true };
      propagateFeedChanges(line, timeIdx, newFeeds);
  }

  const resetFeedType = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number) => {
      if(isReadOnly) return;
      const time = PRODUCTION_TIMES[timeIdx];
      const currentFeeds = feedInfo[line][time] || DEFAULT_FEEDS;
      const newFeeds = JSON.parse(JSON.stringify(currentFeeds)) as [FeedInput, FeedInput, FeedInput];
      newFeeds[feedIdx] = { ...newFeeds[feedIdx], type: '', isCustom: false, percent: 0 };
      propagateFeedChanges(line, timeIdx, newFeeds);
  }

  const handleFeedPercentChange = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, val: string) => {
      if(isReadOnly) return;
      const time = PRODUCTION_TIMES[timeIdx];
      const currentFeeds = feedInfo[line][time] || DEFAULT_FEEDS;
      const newFeeds = JSON.parse(JSON.stringify(currentFeeds)) as [FeedInput, FeedInput, FeedInput];
      
      let numVal = Number(val);
      if (numVal < 0) numVal = 0;
      if (numVal > 100) numVal = 100; 

      const otherFeedIdx = feedIdx === 0 ? 1 : 0;
      const otherVal = newFeeds[otherFeedIdx].percent || 0;
      
      if (numVal + otherVal > 100) {
          alert('مجموع درصد خوراک‌ها نمی‌تواند بیشتر از ۱۰۰٪ باشد.');
          return;
      }
      
      newFeeds[feedIdx] = { ...newFeeds[feedIdx], percent: numVal };
      if (feedIdx === 0 && numVal === 100) {
          newFeeds[1] = { type: '', percent: 0, isCustom: false };
      }
      propagateFeedChanges(line, timeIdx, newFeeds);
  };

  const handleAddBallCharge = (line: 'lineA' | 'lineB', millType: 'primary' | 'secondary') => {
      const current = ballMills[line][millType];
      if (!current.ballSize || !current.barrelCount || Number(current.barrelCount) <= 0) return;
      
      setBallMills(prev => ({
          ...prev,
          [line]: {
              ...prev[line],
              [millType]: {
                  ...prev[line][millType],
                  charges: [...prev[line][millType].charges, { size: Number(current.ballSize), count: Number(current.barrelCount) }],
                  ballSize: '',
                  barrelCount: ''
              }
          }
      }));
  };

  const handleRemoveBallCharge = (line: 'lineA' | 'lineB', millType: 'primary' | 'secondary', index: number) => {
      setBallMills(prev => ({
          ...prev,
          [line]: {
              ...prev[line],
              [millType]: {
                  ...prev[line][millType],
                  charges: prev[line][millType].charges.filter((_, i) => i !== index)
              }
          }
      }));
  };

  const validateDurationVsShift = (durationStr: string): boolean => {
      const dur = parseTimeToMinutes(durationStr);
      const shift = parseTimeToMinutes(shiftInfo.shiftDuration);
      return dur <= shift;
  }

  const handleThickenerMetaChange = (line: 'lineA' | 'lineB', idx: number, field: string, value: any) => {
      if ((field === 'hoursWorked' || field === 'channelOutput') && !validateDurationVsShift(value)) {
          alert('مدت زمان نمی‌تواند بیشتر از کل مدت شیفت باشد.');
          return;
      }
      setThickeners(prev => {
          const newLine = [...prev[line]];
          newLine[idx] = { ...newLine[idx], [field]: value };
          return { ...prev, [line]: newLine };
      });
  };

  const handleThickenerDataChange = (line: 'lineA' | 'lineB', idx: number, time: string, field: string, value: any) => {
      if (value !== '' && Number(value) < 0) return; 
      setThickeners(prev => {
          const newLine = [...prev[line]];
          const currentData = newLine[idx].data[time] || { pressure: '', jack: '', mudLine: '' };
          newLine[idx].data = {
              ...newLine[idx].data,
              [time]: { ...currentData, [field]: value }
          };
          return { ...prev, [line]: newLine };
      });
  };

  const handleDowntimeChange = (line: 'lineA' | 'lineB', field: 'workTime' | 'stopTime', val: string) => {
      if(isReadOnly) return;
      setDowntime(prev => ({
          ...prev,
          [line]: { ...prev[line], [field]: val }
      }));
  };

  const handleDynamicListChange = (section: 'downtime' | 'footer', index: number, value: string, append = false) => {
      if (section === 'downtime') {
          setDowntime(prev => {
              const list = [...prev.generalDescription];
              list[index] = append && list[index] ? `${list[index]} ${value}` : value;
              return { ...prev, generalDescription: list };
          });
      } else {
          setFooter(prev => {
              const list = [...prev.nextShiftActions];
              list[index] = append && list[index] ? `${list[index]} ${value}` : value;
              return { ...prev, nextShiftActions: list };
          });
      }
  };

  const addDynamicRecord = (section: 'downtime' | 'footer') => {
      if (section === 'downtime') {
          setDowntime(prev => ({ ...prev, generalDescription: [...prev.generalDescription, ''] }));
      } else {
          setFooter(prev => ({ ...prev, nextShiftActions: [...prev.nextShiftActions, ''] }));
      }
  };

  const removeDynamicRecord = (section: 'downtime' | 'footer', index: number) => {
      if (section === 'downtime') {
          setDowntime(prev => ({ ...prev, generalDescription: prev.generalDescription.filter((_, i) => i !== index) }));
      } else {
          setFooter(prev => ({ ...prev, nextShiftActions: prev.nextShiftActions.filter((_, i) => i !== index) }));
      }
  };

  const handleVoiceInputMultiline = (setter: (val: string) => void, currentValue: string) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) { alert('مرورگر پشتیبانی نمی‌کند.'); return; }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setter(currentValue ? `${currentValue} ${transcript}` : transcript);
      };
      recognition.start();
  };

  const handleVoiceInputDynamic = (section: 'downtime' | 'footer', index: number) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleDynamicListChange(section, index, transcript, true);
      };
      recognition.start();
  };

  const handleCreateNew = () => {
      setShiftInfo({
          name: 'A',
          type: 'Day1',
          date: getShamsiDate(),
          shiftDuration: '12:00',
          supervisor: user.id,
          supervisorName: user.fullName 
      });
      setProduction({ lineA: {}, lineB: {} });
      setDowntime({
          lineA: { workTime: '', stopTime: '', reason: '' },
          lineB: { workTime: '', stopTime: '', reason: '' },
          generalDescription: ['']
      });
      setAttendanceMap({});
      setIsFormViewOnly(false); // Enable editing
      setViewMode('FORM');
      setActiveTab(1);
  };

  const handleConfirmSubmit = async () => {
      setIsSubmitting(true);
      try {
          // Generate prefix: T + Year(3 digits) + Month(2 digits)
          // e.g., T40302
          const date = new Date();
          const { jy, jm } = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
          const yearStr = String(jy).substring(1); // 1403 -> 403
          const monthStr = String(jm).padStart(2, '0');
          const prefix = `T${yearStr}${monthStr}`;

          // IMPORTANT: Use specific shift report code generator to check shift_reports table, not cartable
          const code = await fetchNextShiftCode(prefix);
          
          const payload = {
              code,
              shiftInfo,
              production,
              feedInfo,
              ballMills,
              hydrocyclones,
              drumMagnets,
              concentrateFilters,
              thickeners,
              recoveryFilters,
              pumps,
              downtime,
              footer,
              totalA: Object.values(production.lineA).reduce((a: number, b: number)=>a+b,0),
              totalB: Object.values(production.lineB).reduce((a: number, b: number)=>a+b,0),
              attendanceMap: attendanceMap, // Save attendance map
              leaveTypes: leaveTypes // Save leave types
          };
          
          await saveShiftReport(payload);
          
          // Delay to show success message briefly
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setReportData(payload); // Show the report
          setIsConfirmModalOpen(false); // Close Modal only after success
          setViewMode('VIEW'); // Switch to View Mode directly
          
      } catch (e: any) {
          alert('خطا در ثبت گزارش: ' + (e.message || JSON.stringify(e)));
          console.error("Shift Submit Error:", e);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleViewReport = (item: any) => {
      const data = item.full_data;
      setReportData(data);
      if(data) {
          setShiftInfo(data.shiftInfo);
          setProduction(data.production);
          setFeedInfo(data.feedInfo || { lineA: {}, lineB: {} });
          setBallMills(data.ballMills);
          setHydrocyclones(data.hydrocyclones);
          setDrumMagnets(data.drumMagnets);
          setConcentrateFilters(data.concentrateFilters);
          setThickeners(data.thickeners);
          setRecoveryFilters(data.recoveryFilters);
          setPumps(data.pumps);
          setDowntime(data.downtime);
          setFooter(data.footer);
          setAttendanceMap(data.attendanceMap || {});
          setLeaveTypes(data.leaveTypes || {});
      }
      setViewMode('VIEW');
  };

  const handleViewFormOnly = (item: any) => {
      // Rehydrate for viewing in form layout (Read Only)
      const data = item.full_data;
      if(data) {
          setShiftInfo(data.shiftInfo);
          setProduction(data.production);
          setFeedInfo(data.feedInfo || { lineA: {}, lineB: {} });
          setBallMills(data.ballMills);
          setHydrocyclones(data.hydrocyclones);
          setDrumMagnets(data.drumMagnets);
          setConcentrateFilters(data.concentrateFilters);
          setThickeners(data.thickeners);
          setRecoveryFilters(data.recoveryFilters);
          setPumps(data.pumps);
          setDowntime(data.downtime);
          setFooter(data.footer);
          setAttendanceMap(data.attendanceMap || {});
          setLeaveTypes(data.leaveTypes || {});
      }
      setIsFormViewOnly(true); // Force Read-Only Mode
      setViewMode('FORM');
  };

  const listActions = (
      <button onClick={() => window.print()} className="bg-white border p-2 rounded hover:bg-gray-50 text-gray-600">
          <Printer className="w-5 h-5" />
      </button>
  );

  if (viewMode === 'VIEW' && reportData) {
      return (
          <ShiftReportView 
            reportData={reportData} 
            adminAvatar={adminAvatar} 
            onBack={() => setViewMode('LIST')} 
          />
      );
  }

  if (viewMode === 'FORM') {
      return (
        <div className="max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
                <div className="flex items-center gap-2">
                    <Clipboard className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold">
                        {isFormViewOnly ? 'مشاهده فرم گزارش شیفت' : 'ثبت گزارش شیفت جدید'}
                    </h1>
                </div>
                <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky top-16 z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <div className="flex min-w-max">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 
                                ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <tab.icon className="w-5 h-5" /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsConfirmModalOpen(true); }}>
                
                {activeTab === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Shift Info Block */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold mb-1">شیفت</label>
                                    <select value={shiftInfo.name} onChange={e => setShiftInfo({...shiftInfo, name: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm" disabled={isReadOnly}>
                                        {['A', 'B', 'C'].map(s => <option key={s} value={s}>شیفت {s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">نوبت کاری</label>
                                    <select value={shiftInfo.type} onChange={e => setShiftInfo({...shiftInfo, type: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm" disabled={isReadOnly}>
                                        <option value="Day1">روز کار اول</option>
                                        <option value="Day2">روز کار دوم</option>
                                        <option value="Night1">شب کار اول</option>
                                        <option value="Night2">شب کار دوم</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="w-full">
                                        <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">مدت شیفت</label>
                                        <div className={isReadOnly ? 'pointer-events-none' : ''}>
                                            <ClockTimePicker value={shiftInfo.shiftDuration} onChange={t => setShiftInfo({...shiftInfo, shiftDuration: t})} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">روز هفته</label>
                                    <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm">{getDayOfWeek(shiftInfo.date)}</div>
                                </div>
                                <div>
                                    <div className="w-full">
                                        <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">تاریخ</label>
                                        <div className={isReadOnly ? 'pointer-events-none' : ''}>
                                            <ShamsiDatePicker value={shiftInfo.date} onChange={d => setShiftInfo({...shiftInfo, date: d})} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">سرپرست شیفت</label>
                                    <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 truncate text-sm">{shiftInfo.supervisorName}</div>
                                </div>
                            </div>
                        </div>

                        {/* Personnel Attendance Block */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">وضعیت حضور و غیاب پرسنل</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Present */}
                                <div className="flex flex-col gap-3">
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-t-xl border-b-2 border-green-500 flex items-center justify-center gap-2">
                                        <UserCheck className="w-5 h-5 text-green-700 dark:text-green-400" />
                                        <h4 className="font-bold text-green-700 dark:text-green-400 text-center">حاضرین</h4>
                                    </div>
                                    <div className="bg-green-50/50 dark:bg-green-900/10 p-3 rounded-b-xl border border-green-200 dark:border-green-800 min-h-[200px]">
                                        {!isReadOnly && (
                                            <PersonSearchInput
                                                placeholder="+ افزودن نفر"
                                                data={personnel.filter(p => !attendanceMap[p.id])}
                                                onSelect={(id: string) => handleAttendanceChange(id, 'PRESENT')}
                                                disabled={isReadOnly}
                                            />
                                        )}
                                        <div className="space-y-2">
                                            {personnel.filter(p => attendanceMap[p.id] === 'PRESENT').map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-green-500">
                                                    <span className="text-sm font-medium">{p.full_name}</span>
                                                    {!isReadOnly && <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Leave */}
                                <div className="flex flex-col gap-3">
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-t-xl border-b-2 border-orange-500 flex items-center justify-center gap-2">
                                        <CalendarOff className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                                        <h4 className="font-bold text-orange-700 dark:text-orange-400 text-center">مرخصی</h4>
                                    </div>
                                    <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-b-xl border border-orange-200 dark:border-orange-800 min-h-[200px]">
                                        {!isReadOnly && (
                                            <PersonSearchInput
                                                placeholder="+ افزودن نفر"
                                                data={personnel.filter(p => !attendanceMap[p.id])}
                                                onSelect={(id: string) => handleAttendanceChange(id, 'LEAVE')}
                                                disabled={isReadOnly}
                                            />
                                        )}
                                        <div className="space-y-2">
                                            {personnel.filter(p => attendanceMap[p.id] === 'LEAVE').map(p => (
                                                <div key={p.id} className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-orange-500">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-medium">{p.full_name}</span>
                                                        {!isReadOnly && <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                                                    </div>
                                                    <div className="flex gap-2 text-xs bg-orange-50 dark:bg-orange-900/10 p-1.5 rounded">
                                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={isReadOnly} checked={leaveTypes[p.id] === 'HOURLY'} onChange={() => setLeaveTypes(prev => ({ ...prev, [p.id]: 'HOURLY' }))} /> ساعتی</label>
                                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={isReadOnly} checked={leaveTypes[p.id] === 'DAILY'} onChange={() => setLeaveTypes(prev => ({ ...prev, [p.id]: 'DAILY' }))} /> روزانه</label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Absent */}
                                <div className="flex flex-col gap-3">
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-t-xl border-b-2 border-red-500 flex items-center justify-center gap-2">
                                        <UserX className="w-5 h-5 text-red-700 dark:text-red-400" />
                                        <h4 className="font-bold text-red-700 dark:text-red-400 text-center">غایبین</h4>
                                    </div>
                                    <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-b-xl border border-red-200 dark:border-red-800 min-h-[200px]">
                                        {!isReadOnly && (
                                            <PersonSearchInput
                                                placeholder="+ افزودن نفر"
                                                data={personnel.filter(p => !attendanceMap[p.id])}
                                                onSelect={(id: string) => handleAttendanceChange(id, 'ABSENT')}
                                                disabled={isReadOnly}
                                            />
                                        )}
                                        <div className="space-y-2">
                                            {personnel.filter(p => attendanceMap[p.id] === 'ABSENT').map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-red-500">
                                                    <span className="text-sm font-medium">{p.full_name}</span>
                                                    {!isReadOnly && <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 2 && <TabProduction {...{production, feedInfo, isReadOnly, handleTonnageChange, handleFeedTypeChange, handleCustomFeedType, resetFeedType, handleFeedPercentChange, feedLinesActive, setFeedLinesActive}} />}
                {activeTab === 3 && <TabMills {...{ballMills, setBallMills, isReadOnly, handleAddBallCharge, handleRemoveBallCharge}} />}
                {activeTab === 4 && <TabHydrocyclones {...{hydrocyclones, setHydrocyclones, isReadOnly}} />}
                {activeTab === 5 && <TabDrumMagnets {...{drumMagnets, setDrumMagnets, isReadOnly, handleVoiceInputMultiline}} />}
                {activeTab === 6 && <TabConcentrateFilters {...{concentrateFilters, setConcentrateFilters, isReadOnly, validateDurationVsShift, personnel, attendanceMap}} />}
                {activeTab === 7 && <TabThickeners {...{thickeners, setThickeners, isReadOnly, handleThickenerMetaChange, handleThickenerDataChange}} />}
                {activeTab === 8 && <TabRecoveryFilters {...{recoveryFilters, setRecoveryFilters, isReadOnly, validateDurationVsShift, personnel, attendanceMap}} />}
                {activeTab === 9 && <TabDowntime {...{downtime, setDowntime, footer, setFooter, pumps, setPumps, isReadOnly, handleDowntimeChange, handleDynamicListChange, addDynamicRecord, removeDynamicRecord, handleVoiceInputMultiline, handleVoiceInputDynamic, shiftDuration: shiftInfo.shiftDuration}} />}

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700 pb-20">
                    <button 
                        type="button" 
                        onClick={() => setActiveTab(prev => Math.max(1, prev - 1))} 
                        disabled={activeTab === 1} 
                        className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2"
                    >
                        <ArrowRight className="w-5 h-5" /> مرحله قبل
                    </button>
                    
                    {activeTab === 9 ? (
                        !isReadOnly && (
                            <button 
                                type="button"
                                disabled={!validateAllTabs() || isSubmitting}
                                onClick={() => setIsConfirmModalOpen(true)}
                                className={`bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition flex items-center gap-2 transform active:scale-95 font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none`}
                            >
                                <Save className="w-6 h-6" />
                                ثبت نهایی گزارش
                            </button>
                        )
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => setActiveTab(prev => Math.min(9, prev + 1))} 
                            className={`px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold bg-blue-600 text-white hover:bg-blue-700`}
                        >
                            مرحله بعد <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                    )}
                </div>
            </form>

            {/* Confirmation Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all border border-gray-100 dark:border-gray-700">
                        
                        {isSubmitting ? (
                            <div className="p-10 flex flex-col items-center justify-center text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping opacity-75"></div>
                                    <div className="relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg border-2 border-blue-500">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">لطفا منتظر بمانید...</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">
                                    در حال ثبت اطلاعات و دریافت کد رهگیری
                                </p>
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">تایید نهایی گزارش</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            آیا از صحت تمام اطلاعات وارد شده اطمینان دارید؟
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl mb-6 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>پس از ثبت، امکان ویرایش گزارش وجود نخواهد داشت.</li>
                                        <li>کد رهگیری یکتا برای این گزارش صادر می‌شود.</li>
                                    </ul>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setIsConfirmModalOpen(false)}
                                        className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition font-bold text-gray-700 dark:text-gray-300 text-sm"
                                    >
                                        بازگشت و بررسی
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleConfirmSubmit}
                                        className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-900/20 transition font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        بله، ثبت نهایی
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      );
  }

  // Render Default (LIST)
  return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                        <Clipboard className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">مدیریت گزارشات شیفت</h1>
                        <p className="text-xs text-gray-500 mt-1">لیست گزارشات ثبت شده تولید</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={loadReports} className="p-2.5 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:rotate-180 transition duration-500 shadow-sm" title="بروزرسانی">
                        <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                    onClick={handleExport}
                    className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition font-medium"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        <span className="hidden md:inline">خروجی اکسل</span>
                    </button>
                    <button 
                    onClick={handleCreateNew}
                    className="bg-primary text-white px-4 py-2.5 rounded-xl shadow-lg shadow-red-900/20 flex items-center gap-2 hover:bg-red-800 transition transform active:scale-95 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline">ثبت گزارش جدید</span>
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="جستجو (کد، تاریخ، سرپرست...)" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                </div>
                <button className="bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full min-w-[1200px] text-right text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
                            <tr>
                                <th className="p-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        onChange={handleSelectAll}
                                        checked={paginatedItems.length > 0 && selectedIds.length === paginatedItems.length}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                    />
                                </th>
                                <th className="p-4">کد گزارش</th>
                                <th className="p-4">تاریخ</th>
                                <th className="p-4">شیفت</th>
                                <th className="p-4">نوع شیفت</th>
                                <th className="p-4">سرپرست</th>
                                <th className="p-4">خوراک A</th>
                                <th className="p-4">خوراک B</th>
                                <th className="p-4">عملیات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                            <span>در حال دریافت اطلاعات...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item: any) => (
                                    <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${selectedIds.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="p-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => handleSelectOne(item.id)}
                                                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-600 dark:text-gray-300">{item.tracking_code}</td>
                                        <td className="p-4">{item.shift_date}</td>
                                        <td className="p-4">{item.shift_name}</td>
                                        <td className="p-4">{SHIFT_TYPE_MAP[item.shift_type] || item.shift_type}</td>
                                        <td className="p-4">{item.supervisor_name || '---'}</td>
                                        <td className="p-4"><span className="text-blue-600 font-bold">{item.total_production_a}</span></td>
                                        <td className="p-4"><span className="text-red-600 font-bold">{item.total_production_b}</span></td>
                                        <td className="p-4 flex gap-2">
                                            <button 
                                                onClick={() => handleViewReport(item)} 
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" 
                                                title="مشاهده PDF"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleViewFormOnly(item)} 
                                                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition" 
                                                title="مشاهده فرم"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                                        <Clipboard className="w-12 h-12 mb-4 opacity-20" />
                                        <span>گزارشی یافت نشد.</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>نمایش</span>
                        <select 
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1 outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>ردیف در هر صفحه</span>
                        <span className="mr-2 px-2 border-r border-gray-300 dark:border-gray-600">
                            مجموع: {filteredItems.length} رکورد
                        </span>
                        {selectedIds.length > 0 && (
                             <span className="mr-2 px-2 text-primary font-bold animate-fadeIn">
                                 {selectedIds.length} مورد انتخاب شده
                             </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="px-4 text-sm font-bold">
                            صفحه {currentPage} از {Math.ceil(filteredItems.length / rowsPerPage) || 1}
                        </span>
                        <button 
                            disabled={currentPage >= Math.ceil(filteredItems.length / rowsPerPage)}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
  );
};
