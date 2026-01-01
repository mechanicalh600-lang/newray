
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { 
  Clipboard, Save, Users, Factory, Activity, 
  Droplet, Layers, Wrench, Mic, Loader2, StopCircle,
  Magnet, UserX, Trash2, Clock, CheckSquare, Power,
  Filter, Recycle, Plus, Printer, Share2, ArrowRight, Home, Check, X, Disc, AlertTriangle, ArrowLeft,
  UserCheck, CalendarOff, Download, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { getShamsiDate, generateTrackingCode, parseShamsiDate } from '../utils';
import { fetchMasterData, fetchShiftReports, saveShiftReport, fetchNextTrackingCode } from '../workflowStore';
import { supabase } from '../supabaseClient';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { ClothGrid } from '../components/ClothGrid';
import { Logo } from '../components/Logo';
import { SmartTable } from '../components/SmartTable';

interface Props {
  user: User;
}

const PRODUCTION_TIMES = [
    "07:30", "08:30", "09:30", "10:30", "11:30", "12:30",
    "01:30", "02:30", "03:30", "04:30", "05:30", "06:30"
];

const THICKENER_TIMES = ["08:00", "11:00", "02:00", "05:00"];
const FEED_TYPES_OPTIONS = ["گلالی", "باباعلی", "شهرک", "چنار", "سایر"];
const BALL_SIZES = [25, 30, 40, 50, 60, 70, 80, 90, 100];

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE';
type LeaveType = 'HOURLY' | 'DAILY';

interface FeedInput {
    type: string;
    percent: number;
    isCustom?: boolean; 
}

interface BallCharge {
    size: number;
    count: number;
}

const PIE_COLORS = ['#22c55e', '#ef4444']; // Green for Run, Red for Stop

// Shift Mapping
const SHIFT_TYPE_MAP: Record<string, string> = {
    'Day1': 'روز کار اول',
    'Day2': 'روز کار دوم',
    'Night1': 'شب کار اول',
    'Night2': 'شب کار دوم'
};

// Default feed array for type safety
const DEFAULT_FEEDS: [FeedInput, FeedInput, FeedInput] = [
    {type:'', percent:0}, {type:'', percent:0}, {type:'', percent:0}
];

// Helper for Persian Numbers
const toPersianNum = (num: number) => {
    return num.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
};

export const ShiftHandover: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'VIEW'>('LIST');
  const [activeTab, setActiveTab] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listeningField, setListeningField] = useState<{ section: 'downtime' | 'footer' | 'thickener' | 'downtimeReason', index: number, subIndex?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportsList, setReportsList] = useState<any[]>([]);
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
      const data = await fetchShiftReports();
      const formattedData = data.map((d: any) => ({
          ...d,
          total_production_a: Number(d.total_production_a),
          total_production_b: Number(d.total_production_b)
      }));
      setReportsList(formattedData);
  };

  const isReadOnly = viewMode === 'VIEW' && !showReport;

  // --- Helper Components ---
  
  // Circular Turquoise Toggle Button
  const ToggleButton = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
      <button 
          type="button" 
          onClick={onClick}
          disabled={isReadOnly}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border-2 transform active:scale-95 ${
              active 
              ? 'bg-cyan-500 border-cyan-500 text-white shadow-cyan-200 shadow-md' 
              : 'bg-white border-gray-300 text-gray-300 hover:border-gray-400'
          }`}
          title={active ? 'روشن' : 'خاموش'}
      >
          <Power className="w-5 h-5" />
      </button>
  );

  // Define OperatorSelect component locally to use personnel list from scope
  const OperatorSelect = ({ value, onChange, filterPresent = false }: { value: string, onChange: (val: string) => void, filterPresent?: boolean }) => {
      const list = filterPresent 
        ? personnel.filter(p => attendanceMap[p.id] === 'PRESENT') 
        : personnel;

      return (
          <select 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              disabled={isReadOnly}
              className="w-full p-2 rounded text-xs border bg-white dark:bg-gray-700 outline-none"
          >
              <option value="">انتخاب اپراتور...</option>
              {list.map(p => (
                  <option key={p.id} value={p.full_name}>{p.full_name}</option>
              ))}
          </select>
      );
  };

  // --- VALIDATION LOGIC ---
  const checkTabValidity = (tabId: number): boolean => {
      if (isReadOnly) return true;

      if (tabId === 1) {
          if (!shiftInfo.date || !shiftInfo.shiftDuration) return false;
      }

      if (tabId === 2) {
          for (const line of ['lineA', 'lineB'] as const) {
              for (const t of PRODUCTION_TIMES) {
                  const feeds = feedInfo[line][t];
                  const tonnage = production[line][t];
                  
                  if (tonnage > 0) {
                      if (!feeds) return false; 
                      const sum = (feeds[0]?.percent || 0) + (feeds[1]?.percent || 0);
                      if (sum === 0) return false; 
                      if (sum > 100) return false;
                  }
                  
                  if (feeds) {
                      if (feeds[0].type && feeds[0].percent <= 0) return false;
                      if (feeds[1].type && feeds[1].percent <= 0) return false;
                  }
              }
          }
      }

      if (tabId === 3) {
          for (const line of ['lineA', 'lineB'] as const) {
              for (const type of ['primary', 'secondary'] as const) {
                  const m = ballMills[line][type];
                  if (m.active) {
                      if (!m.amp08 || !m.dens08 || !m.amp02 || !m.dens02) return false;
                  }
              }
          }
      }

      if (tabId === 4) {
          for (const line of ['lineA', 'lineB'] as const) {
              for (const type of ['primary', 'secondary'] as const) {
                  const h = hydrocyclones[line][type];
                  if (h.active) {
                      if (h.activeCyclones.length === 0) return false;
                  }
              }
          }
      }

      if (tabId === 5) {
          for (const line of ['lineA', 'lineB'] as const) {
              const d = drumMagnets[line];
              if (d.active) {
                  if (!d.single && !d.upper && !d.middle && !d.lower) return false;
              }
          }
      }

      if (tabId === 6) {
          for (const key of ['lineA', 'lineB', 'reserve'] as const) {
              // @ts-ignore
              const f = concentrateFilters[key];
              if (f.active) {
                  if (!f.operator || !f.hours) return false;
              }
          }
      }

      if (tabId === 7) {
          for (const line of ['lineA', 'lineB'] as const) {
              // @ts-ignore
              for (const t of thickeners[line]) {
                  if (t.active) {
                      if (!t.hoursWorked || !t.channelOutput) return false;
                      // Enforce data entry for ALL time slots for active thickeners
                      for (const time of THICKENER_TIMES) {
                          const tData = t.data[time];
                          if (!tData || !tData.pressure || !tData.jack || !tData.mudLine) return false;
                      }
                  }
              }
          }
      }

      if (tabId === 8) {
          for (const line of ['lineA', 'lineB'] as const) {
              // @ts-ignore
              for (const f of recoveryFilters[line]) {
                  if (f.active) {
                      if (!f.operator || !f.hours) return false;
                  }
              }
          }
      }

      if (tabId === 9) {
          const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
          const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
          const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
          
          if (totalA !== shiftMins || totalB !== shiftMins) return false;
      }

      return true;
  };

  const validateAllTabs = (): boolean => {
      // Check tabs 1 through 9
      for (let i = 1; i <= 9; i++) {
          if (!checkTabValidity(i)) return false;
      }
      return true;
  };

  const TABS = [
    { id: 1, label: 'اطلاعات شیفت', icon: Users },
    { id: 2, label: 'خوراک', icon: Factory },
    { id: 3, label: 'بالمیل', icon: Activity },
    { id: 4, label: 'هیدروسیکلون', icon: Magnet },
    { id: 5, label: 'درام مگنت', icon: Magnet },
    { id: 6, label: 'فیلتر کنسانتره', icon: Layers },
    { id: 7, label: 'تیکنر', icon: Droplet },
    { id: 8, label: 'فیلتر بازیافت', icon: Recycle },
    { id: 9, label: 'توقفات و پمپ', icon: StopCircle },
  ];

  const parseTimeToMinutes = (timeStr: string): number => {
      if(!timeStr || timeStr === '00:00') return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h * 60) + m;
  };

  // Helper validation for time durations vs shift duration
  const validateDurationVsShift = (durationStr: string): boolean => {
      const dur = parseTimeToMinutes(durationStr);
      const shift = parseTimeToMinutes(shiftInfo.shiftDuration);
      return dur <= shift;
  }

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
              // Propagate to subsequent hours
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
      const newFeeds = JSON.parse(JSON.stringify(currentFeeds)) as [FeedInput, FeedInput, FeedInput]; // Deep copy
      
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
      if (numVal > 100) numVal = 100; // Force Max 100

      const otherFeedIdx = feedIdx === 0 ? 1 : 0;
      const otherVal = newFeeds[otherFeedIdx].percent || 0;
      
      if (numVal + otherVal > 100) {
          alert('مجموع درصد خوراک‌ها نمی‌تواند بیشتر از ۱۰۰٪ باشد.');
          return;
      }
      
      newFeeds[feedIdx] = { ...newFeeds[feedIdx], percent: numVal };
      
      // If Feed 1 becomes 100%, clear Feed 2
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
      if (value !== '' && Number(value) < 0) return; // Prevent negative values
      
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

  const handleVoiceInputMultiline = (setter: (val: string) => void, currentValue: string) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert('مرورگر شما از قابلیت تبدیل گفتار به نوشتار پشتیبانی نمی‌کند.');
          return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.interimResults = false;
      
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
      // Reset other states minimally for new record
      setDowntime({
          lineA: { workTime: '', stopTime: '', reason: '' },
          lineB: { workTime: '', stopTime: '', reason: '' },
          generalDescription: ['']
      });
      setAttendanceMap({});
      setViewMode('FORM');
      setActiveTab(1);
  };

  const handleConfirmSubmit = async () => {
      setIsSubmitting(true);
      try {
          const code = await fetchNextTrackingCode('T');
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
          
          alert('گزارش با موفقیت ثبت شد.');
          setIsConfirmModalOpen(false);
          setReportData(payload); // Show the report
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
      // Rehydrate logic to edit mode if needed, but for now we just show report
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

  const handleViewForm = (item: any) => {
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
      setShowReport(false);
      setViewMode('VIEW'); 
  };

  const listActions = (
      <button onClick={() => window.print()} className="bg-white border p-2 rounded hover:bg-gray-50 text-gray-600">
          <Printer className="w-5 h-5" />
      </button>
  );

  const getDayOfWeek = (dateStr: string) => {
      const date = parseShamsiDate(dateStr);
      if (!date) return '';
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      return days[date.getDay()];
  };

  const handleAttendanceChange = (personId: string, status: AttendanceStatus) => {
      setAttendanceMap(prev => ({
          ...prev,
          [personId]: status
      }));
  };

  const handleRemoveAttendance = (personId: string) => {
      setAttendanceMap(prev => {
          const newMap = { ...prev };
          delete newMap[personId];
          return newMap;
      });
  };

  const calculateFeedPercentages = (lineFeedInfo: any) => {
      const typeCounts: Record<string, number> = {};
      let totalEntries = 0;

      if (!lineFeedInfo) return [];

      Object.values(lineFeedInfo).forEach((hourFeeds: any) => {
          if (Array.isArray(hourFeeds)) {
              hourFeeds.forEach((feed: any) => {
                  if (feed && feed.type && feed.percent > 0) {
                      const key = feed.type;
                      typeCounts[key] = (typeCounts[key] || 0) + feed.percent;
                      totalEntries += feed.percent;
                  }
              });
          }
      });

      if (totalEntries === 0) return [];

      return Object.entries(typeCounts).map(([type, totalPercent]) => ({
          type,
          avgPercent: Math.round(totalPercent / (Object.keys(lineFeedInfo).length || 1))
      })).filter(x => x.avgPercent > 0);
  };

  // --- REPORT VIEW COMPONENT ---
  if (viewMode === 'VIEW' && reportData) {
      const totalFeedA = reportData.totalA || 0;
      const totalFeedB = reportData.totalB || 0;
      const shiftHours = parseTimeToMinutes(reportData.shiftInfo.shiftDuration) / 60;
      
      const presentCount = Object.values(reportData.attendanceMap || {}).filter(s => s === 'PRESENT').length;
      const leaveCount = Object.values(reportData.attendanceMap || {}).filter(s => s === 'LEAVE').length;
      const absentCount = Object.values(reportData.attendanceMap || {}).filter(s => s === 'ABSENT').length;

      // Chart Data Prep
      const lineAWork = parseTimeToMinutes(reportData.downtime.lineA.workTime);
      const lineAStop = parseTimeToMinutes(reportData.downtime.lineA.stopTime);
      const lineBWork = parseTimeToMinutes(reportData.downtime.lineB.workTime);
      const lineBStop = parseTimeToMinutes(reportData.downtime.lineB.stopTime);

      const chartDataA = [
          { name: 'کارکرد', value: lineAWork, color: '#22c55e' },
          { name: 'توقف', value: lineAStop, color: '#ef4444' }
      ];
      const chartDataB = [
          { name: 'کارکرد', value: lineBWork, color: '#22c55e' },
          { name: 'توقف', value: lineBStop, color: '#ef4444' }
      ];

      const barChartData = PRODUCTION_TIMES.map(t => ({
          time: t,
          lineA: reportData.production.lineA[t] || 0,
          lineB: reportData.production.lineB[t] || 0
      }));

      const handleDownloadPDF = () => {
          const element = document.getElementById('report-content');
          if (!element) return;
          
          const dateLatin = reportData.shiftInfo.date.replace(/\//g, '-');
          const fileNameLat = `ShiftReport_${dateLatin}_Shift${reportData.shiftInfo.name}_${reportData.shiftInfo.type}.pdf`;

          const script = document.createElement('script');
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => {
              const opt = {
                  margin: 0,
                  filename: fileNameLat,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
              };
              // @ts-ignore
              window.html2pdf().set(opt).from(element).save();
          };
          document.body.appendChild(script);
      };

      const handleShareReport = async () => {
          const element = document.getElementById('report-content');
          if (!element) return;

          if (!(window as any).html2pdf) {
              const script = document.createElement('script');
              script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
              script.onload = () => handleShareReport();
              document.body.appendChild(script);
              return;
          }

          const dateLatin = reportData.shiftInfo.date.replace(/\//g, '-');
          const fileNameLat = `ShiftReport_${dateLatin}_Shift${reportData.shiftInfo.name}_${reportData.shiftInfo.type}.pdf`;

          const opt = {
              margin: 0,
              filename: fileNameLat,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          try {
              // @ts-ignore
              const worker = window.html2pdf().set(opt).from(element).toPdf();
              const blob = await worker.output('blob');
              
              const file = new File([blob], fileNameLat, { type: 'application/pdf' });

              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                      files: [file],
                      title: 'گزارش شیفت',
                      text: `گزارش شیفت ${reportData.shiftInfo.date}`
                  });
              } else {
                  throw new Error('Sharing files not supported');
              }
          } catch (e) {
              console.error("Sharing failed:", e);
              alert('امکان اشتراک‌گذاری فایل در این مرورگر وجود ندارد. لینک به اشتراک گذاشته می‌شود.');
              if (navigator.share) {
                      navigator.share({ title: 'گزارش شیفت', url: window.location.href });
              }
          }
      };

      return (
          <div className="bg-gray-100 min-h-screen p-4 flex flex-col items-center gap-4 text-black">
              {/* Actions Bar */}
              <div className="fixed bottom-4 z-50 flex gap-4 no-print bg-white/90 backdrop-blur p-3 rounded-2xl shadow-xl border border-gray-200">
                  <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold transition">
                      <ArrowRight className="w-5 h-5"/> بازگشت
                  </button>
                  <button onClick={handleShareReport} className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-bold transition">
                      <Share2 className="w-5 h-5"/> اشتراک گذاری
                  </button>
                  <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-bold transition">
                      <Download className="w-5 h-5"/> دانلود PDF
                  </button>
                  <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-[#800020] text-white rounded-xl font-bold shadow-lg hover:bg-red-800 transition">
                      <Printer className="w-5 h-5"/> چاپ
                  </button>
              </div>

              {/* REPORT CONTAINER (A4) */}
              <div id="report-content" className="bg-white shadow-2xl w-[210mm] min-h-[297mm] mx-auto p-[10mm] box-border relative print:w-full print:shadow-none print:m-0 print:p-0">
                  <style>{`
                      @media print {
                          @page { size: A4; margin: 0; }
                          body, html { height: auto; overflow: visible; background: white; }
                          .no-print { display: none !important; }
                          /* Hide all parents except the report content path */
                          body > div > div { display: none; } /* Specific to this layout structure */
                          
                          #report-content {
                              position: absolute;
                              top: 0;
                              left: 0;
                              width: 210mm;
                              margin: 0;
                              padding: 0;
                              box-shadow: none;
                              z-index: 9999;
                              visibility: visible;
                              height: auto !important;
                              overflow: visible !important;
                          }
                          /* Ensure pages break */
                          .page-break { page-break-before: always; margin-top: 2rem; display: block; }
                          
                          /* Hide everything else visually */
                          body * { visibility: hidden; }
                          #report-content, #report-content * { visibility: visible; }
                      }
                  `}</style>

                  {/* --- PAGE 1 --- */}
                  <div className="h-[277mm] relative flex flex-col box-border">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b-4 border-[#800020] pb-4 mb-4">
                          
                          {/* Avatar/Logo */}
                          <div className="w-1/4 flex justify-start">
                              <div className="w-20 h-20 rounded-full border-2 border-[#800020] overflow-hidden shadow-sm">
                                  {adminAvatar ? <img src={adminAvatar} className="w-full h-full object-cover" alt="Admin" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"><Users className="w-8 h-8"/></div>}
                              </div>
                          </div>

                          {/* Titles */}
                          <div className="text-center flex-1">
                              <h1 className="text-xl font-black text-[#800020] mb-1">شرکت توسعه معدنی و صنعتی صبانور</h1>
                              <h2 className="text-sm font-bold text-gray-700 px-3 py-1">گزارش شیفت تولید کارخانه کنسانتره همدان</h2>
                          </div>

                          {/* Info */}
                          <div className="w-1/4 text-xs space-y-1.5 text-right font-medium text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <div className="flex justify-between"><span>کد رهگیری</span> <span className="font-mono font-bold text-black">{reportData.code}</span></div>
                              <div className="border-t border-dashed border-gray-300"></div>
                              <div className="flex justify-between"><span>تاریخ</span> <span className="font-bold text-black text-left" dir="ltr">{reportData.shiftInfo.date} ({getDayOfWeek(reportData.shiftInfo.date)})</span></div>
                              <div className="border-t border-dashed border-gray-300"></div>
                              <div className="flex justify-between"><span>شیفت</span> <span className="font-bold text-black text-left" dir="ltr">{SHIFT_TYPE_MAP[reportData.shiftInfo.type]} ({reportData.shiftInfo.name})</span></div>
                          </div>
                      </div>

                      {/* Summary Boxes */}
                      <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl text-center">
                              <span className="block text-[10px] text-blue-600 font-bold mb-1">خوراک مصرفی خط A</span>
                              <div className="flex flex-col items-center">
                                  <span className="text-xl font-black text-blue-800">{totalFeedA.toLocaleString()} <span className="text-xs font-normal">تن</span></span>
                              </div>
                          </div>
                          <div className="bg-red-50 border border-red-100 p-2 rounded-xl text-center">
                              <span className="block text-[10px] text-red-600 font-bold mb-1">خوراک مصرفی خط B</span>
                              <div className="flex flex-col items-center">
                                  <span className="text-xl font-black text-red-800">{totalFeedB.toLocaleString()} <span className="text-xs font-normal">تن</span></span>
                              </div>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center flex flex-col justify-center">
                              <span className="block text-[10px] text-gray-600 font-bold mb-1">مدت شیفت</span>
                              <span className="text-xl font-black text-gray-800">{shiftHours} <span className="text-xs font-normal">ساعت</span></span>
                          </div>
                          <div className="bg-green-50 border border-green-100 p-2 rounded-xl text-center flex flex-col justify-center gap-1">
                              <span className="block text-[10px] text-green-700 font-bold mb-1 border-b border-green-200">وضعیت نفرات</span>
                              <div className="flex justify-between text-[10px] px-1"><span>حاضر:</span> <span className="font-bold">{presentCount}</span></div>
                              <div className="flex justify-between text-[10px] px-1"><span>مرخصی:</span> <span className="font-bold">{leaveCount}</span></div>
                              <div className="flex justify-between text-[10px] px-1"><span>غایب:</span> <span className="font-bold text-red-600">{absentCount}</span></div>
                          </div>
                      </div>

                      {/* Charts: Separate Rows */}
                      
                      {/* Row 1: Pie Charts + Bar Chart */}
                      <div className="grid grid-cols-3 gap-4 mb-4 h-48">
                          {/* Pie A */}
                          <div className="bg-blue-50/50 rounded-xl p-2 border border-blue-100 relative flex flex-col items-center justify-center">
                              <h4 className="text-[10px] font-bold text-blue-800 absolute top-2 right-2">وضعیت خط A</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                      <Pie data={chartDataA} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                                          {chartDataA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                      </Pie>
                                  </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-3 text-[10px]">
                                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> {reportData.downtime.lineA.workTime}</div>
                                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> {reportData.downtime.lineA.stopTime}</div>
                              </div>
                          </div>
                          
                          {/* Pie B */}
                          <div className="bg-red-50/50 rounded-xl p-2 border border-red-100 relative flex flex-col items-center justify-center">
                              <h4 className="text-[10px] font-bold text-red-800 absolute top-2 right-2">وضعیت خط B</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                      <Pie data={chartDataB} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                                          {chartDataB.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                      </Pie>
                                  </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-3 text-[10px]">
                                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> {reportData.downtime.lineB.workTime}</div>
                                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> {reportData.downtime.lineB.stopTime}</div>
                              </div>
                          </div>

                          {/* Bar Chart (Consumption) */}
                          <div className="bg-white border border-gray-200 rounded-xl p-1 relative flex flex-col">
                              <h4 className="text-xs font-bold text-gray-500 absolute top-2 right-2">نمودار میزان مصرف خوراک</h4>
                              <div className="flex-1 mt-4">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="time" tick={{fontSize: 8, angle: -45, textAnchor: 'end'}} interval={0} height={40} tickMargin={5} />
                                          <YAxis tick={{fontSize: 9}} width={30} tickMargin={5} />
                                          <Bar dataKey="lineA" name="خط A" fill="#3b82f6" radius={[2,2,0,0]} />
                                          <Bar dataKey="lineB" name="خط B" fill="#ef4444" radius={[2,2,0,0]} />
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                      </div>

                      {/* Charts Row 2 (Line Chart) */}
                      <div className="h-32 bg-white border border-gray-200 rounded-xl p-2 mb-4 relative">
                          <h4 className="text-xs font-bold text-gray-500 absolute top-2 right-2">نمودار نوسان خوراک دهی</h4>
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={barChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="time" tick={{fontSize: 9}} />
                                  <YAxis tick={{fontSize: 9}} width={30} />
                                  <Line type="monotone" dataKey="lineA" stroke="#3b82f6" strokeWidth={2} dot={false} name="خط A" />
                                  <Line type="monotone" dataKey="lineB" stroke="#ef4444" strokeWidth={2} dot={false} name="خط B" />
                              </LineChart>
                          </ResponsiveContainer>
                      </div>

                      {/* Detailed Stats Boxes (Bottom of Page 1) */}
                      <div className="flex gap-4 flex-1 mb-4 min-h-[200px]">
                          {/* Line A Detail */}
                          <div className="flex-1 bg-blue-50 rounded-xl border border-blue-200 p-2 flex flex-col gap-2">
                              <h3 className="font-bold text-blue-800 border-b border-blue-200 pb-1 text-xs text-center">خلاصه وضعیت خط A</h3>
                              
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  {/* Ball Mills */}
                                  <div className="bg-white/60 rounded p-1.5">
                                      <strong className="block text-blue-700 mb-0.5 border-b border-blue-100">بالمیل اولیه</strong>
                                      <div className="flex justify-between"><span>جریان:</span> <span>{reportData.ballMills.lineA.primary.amp08}</span></div>
                                      <div className="flex justify-between"><span>دانسیته:</span> <span>{reportData.ballMills.lineA.primary.dens08}</span></div>
                                      <div className="mt-1 pt-1 border-t border-dashed">
                                          {reportData.ballMills.lineA.primary.charges.length > 0 ? reportData.ballMills.lineA.primary.charges.map((c:any, i:number) => <div key={i}>سایز {c.size}: {c.count}</div>) : 'بدون شارژ'}
                                      </div>
                                  </div>
                                  <div className="bg-white/60 rounded p-1.5">
                                      <strong className="block text-blue-700 mb-0.5 border-b border-blue-100">بالمیل ثانویه</strong>
                                      <div className="flex justify-between"><span>جریان:</span> <span>{reportData.ballMills.lineA.secondary.amp08}</span></div>
                                      <div className="flex justify-between"><span>دانسیته:</span> <span>{reportData.ballMills.lineA.secondary.dens08}</span></div>
                                      <div className="mt-1 pt-1 border-t border-dashed">
                                          {reportData.ballMills.lineA.secondary.charges.length > 0 ? reportData.ballMills.lineA.secondary.charges.map((c:any, i:number) => <div key={i}>سایز {c.size}: {c.count}</div>) : 'بدون شارژ'}
                                      </div>
                                  </div>
                                  
                                  {/* Filters */}
                                  <div className="bg-white/60 rounded p-1.5 col-span-2 flex justify-between items-center">
                                      <strong className="text-blue-700">فیلتر کنسانتره:</strong>
                                      <span>{reportData.concentrateFilters.lineA.cloths.length} پارچه تعویضی</span>
                                  </div>
                              </div>
                          </div>

                          {/* Line B Detail */}
                          <div className="flex-1 bg-red-50 rounded-xl border border-red-200 p-2 flex flex-col gap-2">
                              <h3 className="font-bold text-red-800 border-b border-red-200 pb-1 text-xs text-center">خلاصه وضعیت خط B</h3>
                              
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  {/* Ball Mills */}
                                  <div className="bg-white/60 rounded p-1.5">
                                      <strong className="block text-red-700 mb-0.5 border-b border-red-100">بالمیل اولیه</strong>
                                      <div className="flex justify-between"><span>جریان:</span> <span>{reportData.ballMills.lineB.primary.amp08}</span></div>
                                      <div className="flex justify-between"><span>دانسیته:</span> <span>{reportData.ballMills.lineB.primary.dens08}</span></div>
                                      <div className="mt-1 pt-1 border-t border-dashed">
                                          {reportData.ballMills.lineB.primary.charges.length > 0 ? reportData.ballMills.lineB.primary.charges.map((c:any, i:number) => <div key={i}>سایز {c.size}: {c.count}</div>) : 'بدون شارژ'}
                                      </div>
                                  </div>
                                  <div className="bg-white/60 rounded p-1.5">
                                      <strong className="block text-red-700 mb-0.5 border-b border-red-100">بالمیل ثانویه</strong>
                                      <div className="flex justify-between"><span>جریان:</span> <span>{reportData.ballMills.lineB.secondary.amp08}</span></div>
                                      <div className="flex justify-between"><span>دانسیته:</span> <span>{reportData.ballMills.lineB.secondary.dens08}</span></div>
                                      <div className="mt-1 pt-1 border-t border-dashed">
                                          {reportData.ballMills.lineB.secondary.charges.length > 0 ? reportData.ballMills.lineB.secondary.charges.map((c:any, i:number) => <div key={i}>سایز {c.size}: {c.count}</div>) : 'بدون شارژ'}
                                      </div>
                                  </div>
                                  
                                  {/* Filters */}
                                  <div className="bg-white/60 rounded p-1.5 col-span-2 flex justify-between items-center">
                                      <strong className="text-red-700">فیلتر کنسانتره:</strong>
                                      <span>{reportData.concentrateFilters.lineB.cloths.length} پارچه تعویضی</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                  </div>

                  <div className="page-break"></div>

                  {/* --- PAGE 2 --- */}
                  <div className="h-[277mm] flex flex-col pt-10 box-border">
                      
                      {/* 1. Downtime Reasons */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 min-h-[150px]">
                          <h3 className="font-bold text-[#800020] border-b pb-2 mb-2 text-sm">علل توقف خطوط</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="text-xs leading-relaxed p-3 bg-white rounded border border-gray-100 h-full">
                                  <strong className="block text-blue-600 mb-2 border-b border-blue-50 pb-1">خط A:</strong>
                                  {reportData.downtime.lineA.reason || 'توقفی ثبت نشده است.'}
                              </div>
                              <div className="text-xs leading-relaxed p-3 bg-white rounded border border-gray-100 h-full">
                                  <strong className="block text-red-600 mb-2 border-b border-red-50 pb-1">خط B:</strong>
                                  {reportData.downtime.lineB.reason || 'توقفی ثبت نشده است.'}
                              </div>
                          </div>
                      </div>

                      {/* 2. General Description */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex-1 min-h-[200px]">
                          <h3 className="font-bold text-yellow-800 border-b border-yellow-200 pb-2 mb-2 text-sm">توضیحات کلی شیفت</h3>
                          <div className="text-xs leading-relaxed text-justify p-2">
                              {reportData.downtime.generalDescription.map((desc: string, i: number) => (
                                  <p key={i} className="mb-2 border-b border-dashed border-yellow-100 pb-1 last:border-0">• {desc}</p>
                              ))}
                              {reportData.downtime.generalDescription.length === 0 && <span className="text-gray-400">موردی ثبت نشده است.</span>}
                          </div>
                      </div>

                      {/* 3. Next Shift Actions */}
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-auto min-h-[150px]">
                          <h3 className="font-bold text-green-800 border-b border-green-200 pb-2 mb-2 text-sm">اقدامات لازم برای شیفت بعد</h3>
                          <div className="text-xs leading-relaxed text-justify p-2">
                              {reportData.footer.nextShiftActions.map((action: string, i: number) => (
                                  <p key={i} className="mb-2 border-b border-dashed border-green-100 pb-1 last:border-0">• {action}</p>
                              ))}
                              {reportData.footer.nextShiftActions.length === 0 && <span className="text-gray-400">موردی ثبت نشده است.</span>}
                          </div>
                      </div>

                      {/* Signatures */}
                      <div className="mt-auto pt-10 pb-8">
                          <div className="grid grid-cols-3 gap-8 text-center">
                              <div className="flex flex-col gap-12">
                                  <span className="font-bold text-sm text-gray-700">سرپرست شیفت</span>
                                  <div className="border-b-2 border-gray-300 w-3/4 mx-auto"></div>
                                  <span className="text-xs text-gray-500">{reportData.shiftInfo.supervisorName}</span>
                              </div>
                              <div className="flex flex-col gap-12">
                                  <span className="font-bold text-sm text-gray-700">کارشناس فرآیند</span>
                                  <div className="border-b-2 border-gray-300 w-3/4 mx-auto"></div>
                              </div>
                              <div className="flex flex-col gap-12">
                                  <span className="font-bold text-sm text-gray-700">رئیس تولید</span>
                                  <div className="border-b-2 border-gray-300 w-3/4 mx-auto"></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // Render FORM (Default Mode)
  if (viewMode === 'FORM') {
    const isNextDisabled = !checkTabValidity(activeTab);

    return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
        <div className="flex items-center gap-2">
            <Clipboard className="w-8 h-8 text-primary" />
            <div>
                <h1 className="text-2xl font-bold">ثبت گزارش شیفت جدید</h1>
            </div>
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
          
          {/* TAB 1: Shift Info */}
          {activeTab === 1 && (
              /* ... (Existing TAB 1 Content) ... */
              <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                          <div>
                              <label className="block text-xs font-bold mb-1">شیفت</label>
                              <select value={shiftInfo.name} onChange={e => setShiftInfo({...shiftInfo, name: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm">
                                  {['A', 'B', 'C'].map(s => <option key={s} value={s}>شیفت {s}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-1">نوبت کاری</label>
                              <select value={shiftInfo.type} onChange={e => setShiftInfo({...shiftInfo, type: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm">
                                  <option value="Day1">روز کار اول</option>
                                  <option value="Day2">روز کار دوم</option>
                                  <option value="Night1">شب کار اول</option>
                                  <option value="Night2">شب کار دوم</option>
                              </select>
                          </div>
                          <div>
                              <div className="w-full">
                                  <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">مدت شیفت</label>
                                  <ClockTimePicker value={shiftInfo.shiftDuration} onChange={t => setShiftInfo({...shiftInfo, shiftDuration: t})} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-1">روز هفته</label>
                              <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm">{getDayOfWeek(shiftInfo.date)}</div>
                          </div>
                          <div>
                              <div className="w-full">
                                  <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">تاریخ</label>
                                  <ShamsiDatePicker value={shiftInfo.date} onChange={d => !isReadOnly && setShiftInfo({...shiftInfo, date: d})} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-1">سرپرست شیفت</label>
                              <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 truncate text-sm">{shiftInfo.supervisorName}</div>
                          </div>
                      </div>
                  </div>

                  {/* Personnel Attendance */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">وضعیت حضور و غیاب پرسنل</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Present Column */}
                            <div className="flex flex-col gap-3">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-t-xl border-b-2 border-green-500 flex items-center justify-center gap-2">
                                    <UserCheck className="w-5 h-5 text-green-700 dark:text-green-400" />
                                    <h4 className="font-bold text-green-700 dark:text-green-400 text-center">حاضرین</h4>
                                </div>
                                <div className="bg-green-50/50 dark:bg-green-900/10 p-3 rounded-b-xl border border-green-200 dark:border-green-800 min-h-[200px]">
                                    {!isReadOnly && (
                                        <select 
                                            className="w-full p-2 mb-3 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-green-500"
                                            onChange={(e) => {
                                                if(e.target.value) handleAttendanceChange(e.target.value, 'PRESENT');
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">+ افزودن نفر</option>
                                            {personnel.filter(p => !attendanceMap[p.id]).map(p => (
                                                <option key={p.id} value={p.id}>{p.full_name}</option>
                                            ))}
                                        </select>
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

                            {/* Leave Column */}
                            <div className="flex flex-col gap-3">
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-t-xl border-b-2 border-orange-500 flex items-center justify-center gap-2">
                                    <CalendarOff className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                                    <h4 className="font-bold text-orange-700 dark:text-orange-400 text-center">مرخصی</h4>
                                </div>
                                <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-b-xl border border-orange-200 dark:border-orange-800 min-h-[200px]">
                                    {!isReadOnly && (
                                        <select 
                                            className="w-full p-2 mb-3 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-orange-500"
                                            onChange={(e) => {
                                                if(e.target.value) handleAttendanceChange(e.target.value, 'LEAVE');
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">+ افزودن نفر</option>
                                            {personnel.filter(p => !attendanceMap[p.id]).map(p => (
                                                <option key={p.id} value={p.id}>{p.full_name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="space-y-2">
                                        {personnel.filter(p => attendanceMap[p.id] === 'LEAVE').map(p => (
                                            <div key={p.id} className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-orange-500">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium">{p.full_name}</span>
                                                    {!isReadOnly && <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                                                </div>
                                                <div className="flex gap-2 text-xs bg-orange-50 dark:bg-orange-900/10 p-1.5 rounded">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input type="radio" name={`leave-${p.id}`} checked={leaveTypes[p.id] === 'HOURLY'} onChange={() => setLeaveTypes(prev => ({ ...prev, [p.id]: 'HOURLY' }))} /> ساعتی
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input type="radio" name={`leave-${p.id}`} checked={leaveTypes[p.id] === 'DAILY'} onChange={() => setLeaveTypes(prev => ({ ...prev, [p.id]: 'DAILY' }))} /> روزانه
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Absent Column */}
                            <div className="flex flex-col gap-3">
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-t-xl border-b-2 border-red-500 flex items-center justify-center gap-2">
                                    <UserX className="w-5 h-5 text-red-700 dark:text-red-400" />
                                    <h4 className="font-bold text-red-700 dark:text-red-400 text-center">غایبین</h4>
                                </div>
                                <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-b-xl border border-red-200 dark:border-red-800 min-h-[200px]">
                                    {!isReadOnly && (
                                        <select 
                                            className="w-full p-2 mb-3 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-red-500"
                                            onChange={(e) => {
                                                if(e.target.value) handleAttendanceChange(e.target.value, 'ABSENT');
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">+ افزودن نفر</option>
                                            {personnel.filter(p => !attendanceMap[p.id]).map(p => (
                                                <option key={p.id} value={p.id}>{p.full_name}</option>
                                            ))}
                                        </select>
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

          {/* ... TABS 2-8 SAME AS BEFORE ... */}
          {activeTab === 2 && ( 
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                  {['lineA', 'lineB'].map(line => (
                      <div key={line} className="mb-8">
                          <h3 className={`font-bold mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>خط {line === 'lineA' ? 'A' : 'B'}</h3>
                          <div className="overflow-x-auto">
                              <table className="w-full text-center text-xs">
                                  <thead>
                                      <tr className="bg-gray-100 dark:bg-gray-700">
                                          <th className="p-2">ساعت</th>
                                          <th className="p-2">تناژ</th>
                                          <th className="p-2">نوع خوراک</th>
                                          <th className="p-2">درصد</th>
                                          <th className="p-2">نوع خوراک 2</th>
                                          <th className="p-2">درصد</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {PRODUCTION_TIMES.map((time, idx) => {
                                          const feeds = feedInfo[line as 'lineA'|'lineB'][time] || DEFAULT_FEEDS;
                                          const feed1Percent = feeds[0]?.percent || 0;
                                          const feed2Percent = feeds[1]?.percent || 0;
                                          const needsFeed2 = feed1Percent > 0 && feed1Percent < 100;
                                          
                                          const filteredFeed2Options = FEED_TYPES_OPTIONS.filter(o => o !== feeds[0].type);

                                          return (
                                          <tr key={time} className="border-b dark:border-gray-700">
                                              <td className="p-2 font-bold">{time}</td>
                                              <td className="p-1"><input type="number" className="w-24 p-1 text-center border rounded font-bold" value={production[line as 'lineA'|'lineB'][time] || ''} onChange={e => handleTonnageChange(line as any, time, e.target.value)} /></td>
                                              <td className="p-1">
                                                  {feeds[0]?.isCustom ? (
                                                      <div className="flex items-center gap-1">
                                                          <input type="text" className="w-24 p-1 border rounded text-xs" value={feeds[0].type} onChange={e => handleCustomFeedType(line as any, idx, 0, e.target.value)} disabled={isReadOnly} placeholder="نام خوراک..." autoFocus />
                                                          <button type="button" onClick={() => resetFeedType(line as any, idx, 0)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3"/></button>
                                                      </div>
                                                  ) : (
                                                      <select className="w-24 p-1 border rounded" value={feeds[0].type} onChange={e => handleFeedTypeChange(line as any, idx, 0, e.target.value)} disabled={isReadOnly}>
                                                          <option value="">-</option>
                                                          {FEED_TYPES_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                                                      </select>
                                                  )}
                                              </td>
                                              <td className="p-1"><input type="number" min="0" max="100" className="w-12 p-1 text-center border rounded" value={feeds[0].percent || ''} onChange={e => handleFeedPercentChange(line as any, idx, 0, e.target.value)} required /></td>
                                              <td className="p-1">
                                                  {needsFeed2 ? (
                                                      feeds[1]?.isCustom ? (
                                                          <div className="flex items-center gap-1">
                                                              <input type="text" className="w-24 p-1 border rounded text-xs" value={feeds[1].type} onChange={e => handleCustomFeedType(line as any, idx, 1, e.target.value)} disabled={isReadOnly} placeholder="نام خوراک..." autoFocus />
                                                              <button type="button" onClick={() => resetFeedType(line as any, idx, 1)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3"/></button>
                                                          </div>
                                                      ) : (
                                                          feeds[1].type || feeds[1].percent > 0 ? (
                                                              <select className="w-24 p-1 border rounded" value={feeds[1].type} onChange={e => handleFeedTypeChange(line as any, idx, 1, e.target.value)} disabled={isReadOnly}>
                                                                  <option value="">-</option>
                                                                  {filteredFeed2Options.map(o=><option key={o} value={o}>{o}</option>)}
                                                              </select>
                                                          ) : (
                                                              <div className="flex justify-center"><Plus className="w-4 h-4 text-green-500 cursor-pointer" onClick={() => handleFeedTypeChange(line as any, idx, 1, filteredFeed2Options[0])} /></div>
                                                          )
                                                      )
                                                  ) : (
                                                      <span className="text-gray-300">-</span>
                                                  )}
                                              </td>
                                              <td className="p-1">
                                                  {needsFeed2 ? (
                                                      (feeds[1].type || feeds[1].percent > 0) ? (
                                                          <input type="number" min="0" max="100" className="w-12 p-1 text-center border rounded" value={feeds[1].percent || ''} onChange={e => handleFeedPercentChange(line as any, idx, 1, e.target.value)} />
                                                      ) : null
                                                  ) : (
                                                      <span className="text-gray-300">-</span>
                                                  )}
                                              </td>
                                          </tr>
                                      )})}
                                  </tbody>
                                  <tfoot>
                                      <tr className="bg-gray-50 dark:bg-gray-700/50 font-bold border-t dark:border-gray-600">
                                          <td className="p-3 text-center">مجموع</td>
                                          <td className={`p-3 text-center text-sm font-black ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>
                                              {Object.values(production[line as 'lineA'|'lineB']).reduce((a: number, b: number) => a + (Number(b) || 0), 0).toLocaleString()} تن
                                          </td>
                                          <td colSpan={4}></td>
                                      </tr>
                                  </tfoot>
                              </table>
                          </div>
                      </div>
                  ))}
              </div>
          )}
          {activeTab === 3 && ( 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ... Ball Mills Content ... */}
                  {['lineA', 'lineB'].map((line: any) => (
                      <div key={line} className="space-y-4">
                          <h3 className={`font-bold text-center ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>بالمیل‌های خط {line === 'lineA' ? 'A' : 'B'}</h3>
                          {['primary', 'secondary'].map((millType: any) => {
                              const millData = (ballMills as any)[line][millType];
                              const usedSizes = millData.charges.map((c: any) => c.size);
                              const availableSizes = BALL_SIZES.filter(s => !usedSizes.includes(s));

                              return (
                                  <div key={millType} className="border rounded-xl p-4 bg-white dark:bg-gray-800">
                                      <div className="flex justify-between mb-3">
                                          <h4 className="font-bold text-sm">{millType === 'primary' ? 'بالمیل شماره 1' : 'بالمیل شماره 2'}</h4>
                                          <ToggleButton active={millData.active} onClick={() => setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], active: !millData.active}}}))} />
                                      </div>
                                      {millData.active && (
                                          <div className="space-y-3 animate-fadeIn">
                                              <div className="bg-gray-50 p-2 rounded">
                                                  <div className="text-xs font-bold text-gray-500 text-center border-b pb-1 mb-2">ساعت 08:00</div>
                                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                                      <div className="relative">
                                                          <input type="number" min="0" placeholder="جریان *" className={`w-full p-2 border rounded pl-6 ${Number(millData.amp08) > 970 ? 'text-red-600 font-bold' : ''}`} value={millData.amp08} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], amp08: e.target.value}} })) }} />
                                                          <span className="absolute left-2 top-2 text-gray-400 font-bold">A</span>
                                                      </div>
                                                      <div className="relative">
                                                          <input type="number" min="0" placeholder="دانسیته *" className={`w-full p-2 border rounded pl-10`} value={millData.dens08} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], dens08: e.target.value}} })) }} />
                                                          <span className="absolute left-2 top-2 text-gray-400 font-bold">Gr/Lit</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="bg-gray-50 p-2 rounded">
                                                  <div className="text-xs font-bold text-gray-500 text-center border-b pb-1 mb-2">ساعت 02:00</div>
                                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                                      <div className="relative">
                                                          <input type="number" min="0" placeholder="جریان *" className={`w-full p-2 border rounded pl-6 ${Number(millData.amp02) > 970 ? 'text-red-600 font-bold' : ''}`} value={millData.amp02} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], amp02: e.target.value}} })) }} />
                                                          <span className="absolute left-2 top-2 text-gray-400 font-bold">A</span>
                                                      </div>
                                                      <div className="relative">
                                                          <input type="number" min="0" placeholder="دانسیته *" className={`w-full p-2 border rounded pl-10`} value={millData.dens02} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], dens02: e.target.value}} })) }} />
                                                          <span className="absolute left-2 top-2 text-gray-400 font-bold">Gr/Lit</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="bg-gray-50 p-2 rounded text-xs mt-2">
                                                  <label className="block mb-1 font-bold text-gray-500">شارژ گلوله</label>
                                                  <div className="flex gap-1 mb-2">
                                                      <select className="flex-1 p-1 border rounded" value={millData.ballSize} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], ballSize: e.target.value}} })) }}>
                                                          <option value="">سایز</option>
                                                          {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                                                      </select>
                                                      <input type="number" min="1" className="w-16 p-1 border rounded text-center" placeholder="تعداد" value={millData.barrelCount} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], barrelCount: e.target.value}} })) }} />
                                                      <button 
                                                        type="button" 
                                                        onClick={() => handleAddBallCharge(line, millType)} 
                                                        className="bg-green-500 text-white p-1 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                        disabled={!millData.ballSize || !millData.barrelCount || Number(millData.barrelCount) <= 0}
                                                      >
                                                          <Plus className="w-4 h-4"/>
                                                      </button>
                                                  </div>
                                                  {millData.charges.map((c: any, idx: number) => (
                                                      <div key={idx} className="flex justify-between bg-white px-2 py-1 rounded mb-1 shadow-sm">
                                                          <span>سایز {c.size}: {c.count} بشکه</span>
                                                          <button type="button" onClick={() => handleRemoveBallCharge(line, millType, idx)} className="text-red-500"><Trash2 className="w-3 h-3"/></button>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                  ))}
              </div>
          )}
          {activeTab === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ... Hydrocyclone Content ... */}
                  {['lineA', 'lineB'].map((line: any) => (
                      <div key={line} className="space-y-4">
                          <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>هیدروسیکلون‌های خط {line === 'lineA' ? 'A' : 'B'}</h3>
                          {['primary', 'secondary'].map((cycType: any) => {
                              const data = (hydrocyclones as any)[line][cycType];
                              return (
                                  <div key={cycType} className="border rounded-xl p-4 bg-white dark:bg-gray-800">
                                      <div className="flex justify-between mb-3">
                                          <h4 className="font-bold text-sm">{cycType === 'primary' ? 'هیدروسیکلون شماره 1' : 'هیدروسیکلون شماره 2'}</h4>
                                          <ToggleButton active={data.active} onClick={() => setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], active: !data.active}}}))} />
                                      </div>
                                      {data.active && (
                                          <div className="space-y-3 animate-fadeIn">
                                              <div className="grid grid-cols-2 gap-2 text-xs items-center bg-gray-50 p-2 rounded">
                                                  <span className="font-bold text-gray-500 col-span-2 text-center border-b pb-1 mb-1">ساعت 08:00</span>
                                                  <div className="relative">
                                                      <input type="number" min="0" placeholder="فشار" className="w-full p-2 border rounded text-center pl-8" value={data.pressure08} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], pressure08: e.target.value}} })) }} />
                                                      <span className="absolute left-2 top-2 text-gray-400 font-bold">Bar</span>
                                                  </div>
                                                  <input type="text" placeholder="زاویه چتر" className="w-full p-2 border rounded text-center" value={data.angle08} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], angle08: e.target.value}} })) }} />
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 text-xs items-center bg-gray-50 p-2 rounded">
                                                  <span className="font-bold text-gray-500 col-span-2 text-center border-b pb-1 mb-1">ساعت 02:00</span>
                                                  <div className="relative">
                                                      <input type="number" min="0" placeholder="فشار" className="w-full p-2 border rounded text-center pl-8" value={data.pressure02} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], pressure02: e.target.value}} })) }} />
                                                      <span className="absolute left-2 top-2 text-gray-400 font-bold">Bar</span>
                                                  </div>
                                                  <input type="text" placeholder="زاویه چتر" className="w-full p-2 border rounded text-center" value={data.angle02} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], angle02: e.target.value}} })) }} />
                                              </div>
                                              <div className={`pt-2 rounded p-2 ${data.activeCyclones.length === 0 ? 'bg-red-50 border border-red-300' : ''}`}>
                                                  <p className="text-xs font-bold text-gray-500 mb-2 text-center">سیکلون‌های فعال</p>
                                                  <div className="grid grid-cols-6 md:grid-cols-12 gap-1 justify-items-center">
                                                      {Array.from({length: 12}, (_, i) => i + 1).map(n => (
                                                          <button key={n} type="button" onClick={() => {
                                                              const active = data.activeCyclones.includes(n);
                                                              const newActive = active ? data.activeCyclones.filter((x:number)=>x!==n) : [...data.activeCyclones, n];
                                                              setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], activeCyclones: newActive}} }));
                                                          }} className={`w-7 h-7 rounded-full border text-[10px] font-bold transition-all ${data.activeCyclones.includes(n) ? 'bg-cyan-500 text-white shadow-md transform scale-110 border-cyan-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{n}</button>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                  ))}
              </div>
          )}
          {activeTab === 5 && ( 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['lineA', 'lineB'].map((line: any) => {
                      const data = (drumMagnets as any)[line];
                      const drumLabels: any = { single: 'درام تکی', upper: 'درام بالایی طبقاتی', middle: 'درام میانی طبقاتی', lower: 'درام پایینی طبقاتی' };
                      const hasSelection = data.single || data.upper || data.middle || data.lower;
                      return (
                          <div key={line} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between mb-4">
                                  <h3 className={`font-bold text-center ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>درام های مگنت خط {line === 'lineA' ? 'A' : 'B'}</h3>
                                  <ToggleButton active={data.active} onClick={() => setDrumMagnets((prev: any) => ({...prev, [line]: {...prev[line], active: !data.active}}))} />
                              </div>
                              {data.active && (
                                  <div className="animate-fadeIn">
                                      <div className={`grid grid-cols-1 gap-3 mb-4 p-2 rounded ${!hasSelection ? 'bg-red-50 border border-red-200' : ''}`}>
                                          {['single', 'upper', 'middle', 'lower'].map(magType => (
                                              <button key={magType} type="button" onClick={() => setDrumMagnets((prev: any) => ({...prev, [line]: {...prev[line], [magType]: !prev[line][magType]}}))} className={`p-3 rounded-lg border text-sm font-bold transition-all ${ (drumMagnets as any)[line][magType] ? 'bg-cyan-500 text-white border-cyan-600 shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100' }`}>{drumLabels[magType]}</button>
                                          ))}
                                      </div>
                                      <div className="relative">
                                          <textarea className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none" placeholder="توضیحات..." rows={3} value={(drumMagnets as any)[line].description} onChange={e => { const val = e.target.value; setDrumMagnets((prev: any) => ({...prev, [line]: {...prev[line], description: val}} )) }} />
                                      </div>
                                  </div>
                              )}
                          </div>
                      )
                  })}
              </div>
          )}
          {activeTab === 6 && ( 
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['lineA', 'lineB', 'reserve'].map((key) => {
                      const data = (concentrateFilters as any)[key];
                      const title = key === 'lineA' ? 'فیلتر کنسانتره خط A' : key === 'lineB' ? 'فیلتر کنسانتره خط B' : 'فیلتر کنسانتره رزرو';
                      return (
                          <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-xl border">
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-bold text-sm">{title}</h4>
                                  <ToggleButton active={data.active} onClick={() => setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], active: !data.active}}))} />
                              </div>
                              {data.active && (
                                  <div className="animate-fadeIn space-y-3">
                                      <div className={!data.operator ? 'border border-red-300 rounded p-1' : ''}>
                                          <OperatorSelect 
                                            value={data.operator} 
                                            onChange={(val: string) => setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], operator: val}}))} 
                                            filterPresent={true}
                                          />
                                      </div>
                                      <div className={`w-full ${!data.hours ? 'border border-red-300 rounded p-1' : ''}`}>
                                          <ClockTimePicker 
                                            label="مدت کارکرد" 
                                            value={data.hours} 
                                            onChange={(val) => {
                                                if (validateDurationVsShift(val)) {
                                                    setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], hours: val}}));
                                                } else {
                                                    alert('مدت کارکرد نمی‌تواند بیشتر از کل مدت شیفت باشد.');
                                                }
                                            }} 
                                          />
                                      </div>
                                      <div className="mt-2"><ClothGrid title={title} selectedCloths={data.cloths} onChange={(sel) => setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], cloths: sel}}))} /></div>
                                  </div>
                              )}
                          </div>
                      )
                  })}
              </div>
          )}
          {activeTab === 7 && ( 
              <div className="space-y-6">
                  {['lineA', 'lineB'].map((line: any) => (
                      <div key={line} className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                          <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>تیکنرهای خط {line === 'lineA' ? 'A' : 'B'}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {[0, 1, 2].map((tIdx) => {
                                  const thickener = (thickeners as any)[line][tIdx];
                                  return (
                                      <div key={tIdx} className="border rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm">
                                          <div className="flex justify-between items-center mb-3">
                                              <h4 className="font-bold text-sm">تیکنر شماره {tIdx + 1}</h4>
                                              <ToggleButton active={thickener.active} onClick={() => handleThickenerMetaChange(line, tIdx, 'active', !thickener.active)} />
                                          </div>
                                          {thickener.active && (
                                              <div className="animate-fadeIn space-y-3">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                      <div className={!thickener.hoursWorked ? 'border border-red-300 rounded' : ''}>
                                                          <ClockTimePicker label="مدت کارکرد" value={thickener.hoursWorked} onChange={(val) => handleThickenerMetaChange(line, tIdx, 'hoursWorked', val)} />
                                                      </div>
                                                      <div className={!thickener.channelOutput ? 'border border-red-300 rounded' : ''}>
                                                          <ClockTimePicker label="خروجی به کانال" value={thickener.channelOutput} onChange={(val) => handleThickenerMetaChange(line, tIdx, 'channelOutput', val)} />
                                                      </div>
                                                  </div>
                                                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                                      <div className="grid grid-cols-4 gap-1 mb-2 text-center text-[10px] text-gray-500 font-bold">
                                                          <div>ساعت</div><div>فشار (Bar)</div><div>ارتفاع جک (cm)</div><div>خط گل (cm)</div>
                                                      </div>
                                                      {THICKENER_TIMES.map(time => (
                                                          <div key={time} className="grid grid-cols-4 gap-2 mb-2 items-center">
                                                              <span className="font-bold bg-white dark:bg-gray-600 p-1.5 rounded text-center text-xs shadow-sm">{time}</span>
                                                              <input type="number" min="0" className="border rounded p-1.5 text-center text-xs w-full" value={thickener.data[time]?.pressure || ''} onChange={e => handleThickenerDataChange(line, tIdx, time, 'pressure', e.target.value)} />
                                                              <input type="number" min="0" className="border rounded p-1.5 text-center text-xs w-full" value={thickener.data[time]?.jack || ''} onChange={e => handleThickenerDataChange(line, tIdx, time, 'jack', e.target.value)} />
                                                              <input type="number" min="0" className="border rounded p-1.5 text-center text-xs w-full" value={thickener.data[time]?.mudLine || ''} onChange={e => handleThickenerDataChange(line, tIdx, time, 'mudLine', e.target.value)} />
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          )}
          {activeTab === 8 && ( 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['lineA', 'lineB'].map((line: any) => (
                      <div key={line} className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                          <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>فیلترهای بازیافت خط {line === 'lineA' ? 'A' : 'B'}</h3>
                          {[0, 1].map((idx) => {
                              const data = (recoveryFilters as any)[line][idx];
                              const title = `فیلتر بازیافت شماره ${idx + 1}`;
                              return (
                                  <div key={idx} className="bg-white dark:bg-gray-900 border rounded-xl p-4 mb-4 last:mb-0 shadow-sm">
                                      <div className="flex justify-between items-center mb-3">
                                          <h4 className="font-bold text-sm">{title}</h4>
                                          <ToggleButton active={data.active} onClick={() => {const newLine = [...(recoveryFilters as any)[line]];newLine[idx].active = !data.active;setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));}} />
                                      </div>
                                      {data.active && (
                                          <div className="animate-fadeIn space-y-3">
                                              <div className={!data.operator ? 'border border-red-300 rounded p-1' : ''}>
                                                  <OperatorSelect 
                                                    value={data.operator} 
                                                    onChange={(val: string) => {const newLine = [...(recoveryFilters as any)[line]];newLine[idx].operator = val;setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));}} 
                                                    filterPresent={true}
                                                  />
                                              </div>
                                              <div className={!data.hours ? 'border border-red-300 rounded p-1' : ''}>
                                                  <ClockTimePicker 
                                                    label="مدت کارکرد" 
                                                    value={data.hours} 
                                                    onChange={(val) => {
                                                        if (validateDurationVsShift(val)) {
                                                            const newLine = [...(recoveryFilters as any)[line]];
                                                            newLine[idx].hours = val;
                                                            setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));
                                                        } else {
                                                            alert('مدت کارکرد نمی‌تواند بیشتر از کل مدت شیفت باشد.');
                                                        }
                                                    }} 
                                                  />
                                              </div>
                                              <div className="mt-2"><ClothGrid title={`${title} خط ${line === 'lineA' ? 'A' : 'B'}`} selectedCloths={data.cloths} onChange={(sel) => {const newLine = [...(recoveryFilters as any)[line]];newLine[idx].cloths = sel;setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));}} /></div>
                                          </div>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                  ))}
              </div>
          )}

          {/* TAB 9: Downtime & Pumps */}
          {activeTab === 9 && ( 
              <div className="space-y-6">
                  {/* Downtime */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {['lineA', 'lineB'].map((line: any) => {
                          const stopTime = (downtime as any)[line].stopTime;
                          const workTime = (downtime as any)[line].workTime;
                          const hasStopTime = parseTimeToMinutes(stopTime) > 0;
                          
                          const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
                          const total = parseTimeToMinutes(workTime) + parseTimeToMinutes(stopTime);
                          const isValidSum = total === shiftMins;

                          return (
                              <div key={line} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                  <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>مدت کارکرد / توقف خط {line === 'lineA' ? 'A' : 'B'}</h3>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div><ClockTimePicker label="مدت کارکرد" value={(downtime as any)[line].workTime} onChange={val => handleDowntimeChange(line, 'workTime', val)} /></div>
                                      <div><ClockTimePicker label="مدت توقف" value={(downtime as any)[line].stopTime} onChange={val => handleDowntimeChange(line, 'stopTime', val)} /></div>
                                  </div>
                                  
                                  {!isValidSum && (
                                      <div className="text-red-500 text-xs text-center mb-2 font-bold animate-pulse">
                                          مجموع کارکرد و توقف خط با مدت شیفت برابر نیست
                                      </div>
                                  )}

                                  {hasStopTime && (
                                      <div className="animate-fadeIn">
                                          <label className="block text-sm font-bold mb-1 text-gray-500">علت توقفات</label>
                                          <div className="relative">
                                              <textarea className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 min-h-[80px]" placeholder="توضیحات..." value={(downtime as any)[line].reason} onChange={e => setDowntime((prev: any) => ({...prev, [line]: {...prev[line], reason: e.target.value}}))} disabled={isReadOnly} />
                                              {!isReadOnly && (<button type="button" className="absolute bottom-3 left-3 p-1 rounded-full text-gray-400 hover:text-primary" onClick={() => handleVoiceInputMultiline((val) => setDowntime((prev: any) => ({...prev, [line]: {...prev[line], reason: val}})), (downtime as any)[line].reason)}><Mic className="w-5 h-5" /></button>)}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )
                      })}
                  </div>
                  
                  {/* Pumps */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <h3 className="font-bold mb-6 text-center text-lg">وضعیت پمپ استیشن</h3>
                      <div className="grid grid-cols-2 gap-8">
                          <div className="text-center">
                              <h4 className="text-sm font-bold mb-3 text-gray-600 dark:text-gray-300">پمپ‌های پروسس</h4>
                              <div className="flex justify-center gap-3">
                                  {['1', '2', '3'].map(p => (
                                      <button key={p} type="button" disabled={isReadOnly} onClick={() => {const active = pumps.process.includes(p);setPumps(prev => ({...prev, process: active ? prev.process.filter(x=>x!==p) : [...prev.process, p]}));}} className={`w-12 h-12 rounded-full border font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center relative ${pumps.process.includes(p) ? 'bg-cyan-600 text-white border-cyan-700 shadow-lg' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                                          <Disc className="w-6 h-6"/>
                                          <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] w-5 h-5 rounded-full border flex items-center justify-center font-bold">{p}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div className="text-center">
                              <h4 className="text-sm font-bold mb-3 text-gray-600 dark:text-gray-300">پمپ‌های آب تمیز</h4>
                              <div className="flex justify-center gap-3">
                                  {['1', '2', '3'].map(p => (
                                      <button key={p} type="button" disabled={isReadOnly} onClick={() => {const active = pumps.cleanWater.includes(p);setPumps(prev => ({...prev, cleanWater: active ? prev.cleanWater.filter(x=>x!==p) : [...prev.cleanWater, p]}));}} className={`w-12 h-12 rounded-full border font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center relative ${pumps.cleanWater.includes(p) ? 'bg-cyan-400 text-white border-cyan-500 shadow-lg' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                                          <Droplet className="w-6 h-6"/>
                                          <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] w-5 h-5 rounded-full border flex items-center justify-center font-bold">{p}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* General Description */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-lg">توضیحات شیفت</h3>
                          {!isReadOnly && (
                              <button 
                                type="button" 
                                onClick={() => addDynamicRecord('downtime')} 
                                disabled={downtime.generalDescription.length > 0 && !downtime.generalDescription[downtime.generalDescription.length - 1].trim()}
                                className={`bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center transition ${downtime.generalDescription.length > 0 && !downtime.generalDescription[downtime.generalDescription.length - 1].trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                              >
                                <Plus className="w-5 h-5"/>
                              </button>
                          )}
                      </div>
                      {downtime.generalDescription.map((desc, idx) => (
                          <div key={idx} className="flex gap-2 mb-3">
                              <span className="font-bold text-gray-400 w-6 pt-2">{toPersianNum(idx + 1)}.</span>
                              <div className="relative flex-1">
                                  <textarea value={desc} onChange={e => handleDynamicListChange('downtime', idx, e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 min-h-[60px]" disabled={isReadOnly} />
                                  {!isReadOnly && <button type="button" className="absolute bottom-3 left-3 p-1 rounded-full text-gray-400 hover:text-primary" onClick={() => handleVoiceInputDynamic('downtime', idx)}><Mic className="w-4 h-4" /></button>}
                              </div>
                              {!isReadOnly && <button type="button" onClick={() => removeDynamicRecord('downtime', idx)} className="text-red-500 self-center hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-5 h-5"/></button>}
                          </div>
                      ))}
                      {downtime.generalDescription.length === 0 && <p className="text-center text-gray-400 text-sm py-4">موردی ثبت نشده است.</p>}
                  </div>

                  {/* Next Shift Actions */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-lg">اقدامات لازم شیفت بعد</h3>
                          {!isReadOnly && (
                              <button 
                                type="button" 
                                onClick={() => addDynamicRecord('footer')} 
                                disabled={footer.nextShiftActions.length > 0 && !footer.nextShiftActions[footer.nextShiftActions.length - 1].trim()}
                                className={`bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center transition ${footer.nextShiftActions.length > 0 && !footer.nextShiftActions[footer.nextShiftActions.length - 1].trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                              >
                                <Plus className="w-5 h-5"/>
                              </button>
                          )}
                      </div>
                      {footer.nextShiftActions.map((action, idx) => (
                          <div key={idx} className="flex gap-2 mb-3">
                              <span className="font-bold text-gray-400 w-6 pt-2">{toPersianNum(idx + 1)}.</span>
                              <div className="relative flex-1">
                                  <textarea value={action} onChange={e => handleDynamicListChange('footer', idx, e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 min-h-[60px]" disabled={isReadOnly} />
                                  {!isReadOnly && <button type="button" className="absolute bottom-3 left-3 p-1 rounded-full text-gray-400 hover:text-primary" onClick={() => handleVoiceInputDynamic('footer', idx)}><Mic className="w-4 h-4" /></button>}
                              </div>
                              {!isReadOnly && <button type="button" onClick={() => removeDynamicRecord('footer', idx)} className="text-red-500 self-center hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-5 h-5"/></button>}
                          </div>
                      ))}
                      {footer.nextShiftActions.length === 0 && <p className="text-center text-gray-400 text-sm py-4">موردی ثبت نشده است.</p>}
                  </div>
              </div>
          )}

          {/* Navigation Buttons */}
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
                        type="submit" 
                        disabled={isSubmitting || !validateAllTabs()}
                        className={`bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition flex items-center gap-2 transform active:scale-95 font-bold text-lg ${(!validateAllTabs() || isSubmitting) ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''}`}
                      >
                          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <Save className="w-6 h-6" />}
                          ثبت نهایی گزارش
                      </button>
                  )
              ) : (
                  <button 
                    type="button" 
                    onClick={() => setActiveTab(prev => Math.min(9, prev + 1))} 
                    disabled={!checkTabValidity(activeTab)}
                    className={`px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold ${!checkTabValidity(activeTab) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                      مرحله بعد <ArrowLeft className="w-5 h-5" />
                  </button>
              )}
          </div>
      </form>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                  <div className="p-6 text-center">
                      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                          <Check className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">ثبت نهایی گزارش</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                          آیا از صحت اطلاعات وارد شده اطمینان دارید؟
                          <br/>
                          پس از ثبت، امکان ویرایش توسط شما وجود نخواهد داشت.
                      </p>
                      
                      <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setIsConfirmModalOpen(false)}
                            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition font-bold text-gray-700 dark:text-gray-300"
                          >
                              بازگشت و اصلاح
                          </button>
                          <button 
                            type="button"
                            onClick={handleConfirmSubmit}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg transition font-bold"
                          >
                              بله، ثبت شود
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
    )
  }

  // Render Default (LIST)
  return (
      <div className="max-w-7xl mx-auto pb-20">
          <SmartTable
            title="گزارشات تولید"
            icon={Clipboard}
            data={reportsList}
            onAdd={handleCreateNew}
            columns={[
                { header: 'کد گزارش', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span> },
                { header: 'تاریخ', accessor: (i: any) => i.shift_date },
                { header: 'شیفت', accessor: (i: any) => i.shift_name },
                { header: 'نوع شیفت', accessor: (i: any) => SHIFT_TYPE_MAP[i.shift_type] || i.shift_type },
                { header: 'سرپرست', accessor: (i: any) => i.supervisor_name || '---' },
                { header: 'خوراک مصرفی A', accessor: (i: any) => <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">{i.total_production_a}</span> },
                { header: 'خوراک مصرفی B', accessor: (i: any) => <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{i.total_production_b}</span> },
            ]}
            onViewDetails={handleViewReport}
            onEdit={handleViewForm}
            extraActions={listActions}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
          />
      </div>
  );
};
