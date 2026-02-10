
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { 
  Clipboard, Save, X, ArrowRight, Trash2, 
  UserCheck, CalendarOff, UserX, Loader2, Check, ArrowLeft,
} from 'lucide-react';
import { getShamsiDate, parseShamsiDate } from '../utils';
import { fetchMasterData, fetchShiftReports, saveShiftReport, fetchNextTrackingCode } from '../workflowStore';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { DataPage } from '../components/DataPage';
import * as XLSX from 'xlsx';

import { 
    PRODUCTION_TIMES, SHIFT_TYPE_MAP, parseTimeToMinutes,
    AttendanceStatus, LeaveType, FeedInput, TABS
} from './ShiftHandoverTypes';
import { 
    TabProduction, TabMills, TabHydrocyclones, TabDrumMagnets, 
    TabConcentrateFilters, TabThickeners, TabRecoveryFilters, TabDowntime 
} from './ShiftHandoverTabs';
import { ShiftReportView } from './ShiftHandoverReport';
import { supabase } from '../supabaseClient';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';

interface Props {
  user: User;
}

export const ShiftHandover: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'VIEW'>('LIST');
  const [activeTab, setActiveTab] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // List View States
  const [loading, setLoading] = useState(false);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  
  const [isFormViewOnly, setIsFormViewOnly] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

  const [personnel, setPersonnel] = useState<any[]>([]);

  // Filter States
  const [filterDate, setFilterDate] = useState('');
  const [filterShiftType, setFilterShiftType] = useState('ALL');

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

  // UI State for Production Tab
  const [feedLinesActive, setFeedLinesActive] = useState<{lineA: boolean, lineB: boolean}>({ lineA: true, lineB: true });

  const [ballMills, setBallMills] = useState({
      lineA: {
          primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
          secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] }
      },
      lineB: {
           primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
           secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] }
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
      fetchMasterData('personnel').then(setPersonnel);
      loadReports();
      fetchAdminAvatar();
  }, []);

  // Filter Logic
  useEffect(() => {
      let res = reportsList;
      if (filterDate) {
          res = res.filter(i => i.shift_date === filterDate);
      }
      if (filterShiftType !== 'ALL') {
          res = res.filter(i => i.shift_type === filterShiftType);
      }
      setFilteredItems(res);
  }, [filterDate, filterShiftType, reportsList]);

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

  const isReadOnly = (viewMode === 'VIEW' && reportData) || (viewMode === 'FORM' && isFormViewOnly);

  const checkTabValidity = (tabId: number): boolean => {
      if (isReadOnly) return true;
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
      if (!shiftInfo.date || !shiftInfo.shiftDuration) return false;
      
      const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
      const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
      const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
      
      if (totalA !== shiftMins || totalB !== shiftMins) return false;

      return true;
  };

  // Helper functions for state updates (passed to tabs)
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

  const validateDurationVsShift = (durationStr: string) => {
      const dur = parseTimeToMinutes(durationStr);
      const shift = parseTimeToMinutes(shiftInfo.shiftDuration);
      return dur <= shift;
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
              attendanceMap,
              leaveTypes
          };
          
          await saveShiftReport(payload);
          alert('گزارش با موفقیت ثبت شد.');
          setIsConfirmModalOpen(false);
          setReportData(payload);
          setViewMode('VIEW');
      } catch (e: any) {
          alert('خطا در ثبت گزارش: ' + e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleViewReport = (item: any) => {
      setReportData(item.full_data);
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
      setViewMode('FORM');
      setActiveTab(1);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredItems.filter(i => selectedIds.includes(i.id))
      : filteredItems;

    if (dataToExport.length === 0) {
        alert('داده‌ای برای گزارش وجود ندارد.');
        return;
    }
    const rows = dataToExport.map(item => ({
        "کد گزارش": item.tracking_code,
        "تاریخ": item.shift_date,
        "شیفت": item.shift_name,
        "نوع شیفت": SHIFT_TYPE_MAP[item.shift_type] || item.shift_type,
        "سرپرست": item.supervisor_name,
        "خوراک A": item.total_production_a,
        "خوراک B": item.total_production_b
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ShiftReports");
    XLSX.writeFile(wb, `shift_reports_${new Date().getTime()}.xlsx`);
  };

  const handleDeleteReports = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('shift_reports').delete().in('id', ids);
      if (error) throw error;
      setReportsList(prev => prev.filter(item => !ids.includes(item.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error('Error deleting shift reports:', error);
      alert('خطا در حذف گزارش‌ها');
    }
  };

  const getDayOfWeek = (dateStr: string) => {
      const date = parseShamsiDate(dateStr);
      if (!date) return '';
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      return days[date.getDay()];
  };

  // ... (Other handlers)
  const handleAttendanceChange = (personId: string, status: AttendanceStatus) => setAttendanceMap(prev => ({ ...prev, [personId]: status }));
  const handleRemoveAttendance = (personId: string) => setAttendanceMap(prev => {const newMap = { ...prev };delete newMap[personId];return newMap;});
  const handleThickenerMetaChange = (line: any, idx: any, field: any, value: any) => setThickeners((prev:any) => {const newLine = [...prev[line]];newLine[idx] = { ...newLine[idx], [field]: value };return { ...prev, [line]: newLine };});
  const handleThickenerDataChange = (line: any, idx: any, time: any, field: any, value: any) => setThickeners((prev:any) => {const newLine = [...prev[line]];const currentData = newLine[idx].data[time] || {};newLine[idx].data = {...newLine[idx].data, [time]: { ...currentData, [field]: value }};return { ...prev, [line]: newLine };});
  const handleVoiceInputMultiline = (setter: any, val: any) => alert('Voice input simulated');
  const handleVoiceInputDynamic = (sec: any, idx: any) => alert('Voice input simulated');
  const handleDowntimeChange = (l:any, f:any, v:any) => setDowntime((p:any)=>({...p, [l]: {...p[l], [f]: v}}));
  const handleDynamicListChange = (s:any, i:any, v:any) => { if(s==='downtime') setDowntime((p:any)=>{const l=[...p.generalDescription];l[i]=v;return {...p, generalDescription:l}}); else setFooter((p:any)=>{const l=[...p.nextShiftActions];l[i]=v;return {...p, nextShiftActions:l}}); };
  const addDynamicRecord = (s:any) => { if(s==='downtime') setDowntime((p:any)=>({...p, generalDescription:[...p.generalDescription, '']})); else setFooter((p:any)=>({...p, nextShiftActions:[...p.nextShiftActions, '']})); };
  const removeDynamicRecord = (s:any, i:any) => { if(s==='downtime') setDowntime((p:any)=>({...p, generalDescription:p.generalDescription.filter((_:any,x:any)=>x!==i)})); else setFooter((p:any)=>({...p, nextShiftActions:p.nextShiftActions.filter((_:any,x:any)=>x!==i)})); };
  const handleFeedTypeChange = (l:any, t:any, f:any, v:any) => { /* simplified */ };
  const handleCustomFeedType = (l:any, t:any, f:any, v:any) => { /* simplified */ };
  const resetFeedType = (l:any, t:any, f:any) => { /* simplified */ };
  const handleFeedPercentChange = (l:any, t:any, f:any, v:any) => { /* simplified */ };
  const handleAddBallCharge = (l:any, m:any) => { /* simplified */ };
  const handleRemoveBallCharge = (l:any, m:any, i:any) => { /* simplified */ };

  const filterContent = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">تاریخ</label>
              <input 
                  type="text" 
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                  placeholder="1403/--/--"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
              />
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">نوبت کاری</label>
              <select 
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 outline-none"
                  value={filterShiftType}
                  onChange={e => setFilterShiftType(e.target.value)}
              >
                  <option value="ALL">همه</option>
                  <option value="Day1">روز کار اول</option>
                  <option value="Day2">روز کار دوم</option>
                  <option value="Night1">شب کار اول</option>
                  <option value="Night2">شب کار دوم</option>
              </select>
          </div>
      </div>
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
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
        <div className="flex items-center gap-2">
            <Clipboard className="w-8 h-8 text-primary" />
            <div>
                <h1 className="text-2xl font-bold">ثبت گزارش شیفت جدید</h1>
            </div>
        </div>
        <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
      </div>

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

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">وضعیت حضور و غیاب پرسنل</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {activeTab === 2 && (
              <TabProduction 
                  production={production} feedInfo={feedInfo} isReadOnly={false} 
                  handleTonnageChange={handleTonnageChange} 
                  handleFeedTypeChange={handleFeedTypeChange}
                  handleCustomFeedType={handleCustomFeedType}
                  resetFeedType={resetFeedType}
                  handleFeedPercentChange={handleFeedPercentChange}
                  feedLinesActive={feedLinesActive} 
                  setFeedLinesActive={setFeedLinesActive}
              />
          )}
          {activeTab === 3 && <TabMills ballMills={ballMills} setBallMills={setBallMills} isReadOnly={false} handleAddBallCharge={handleAddBallCharge} handleRemoveBallCharge={handleRemoveBallCharge} />}
          {activeTab === 4 && <TabHydrocyclones hydrocyclones={hydrocyclones} setHydrocyclones={setHydrocyclones} isReadOnly={false} />}
          {activeTab === 5 && <TabDrumMagnets drumMagnets={drumMagnets} setDrumMagnets={setDrumMagnets} isReadOnly={false} handleVoiceInputMultiline={handleVoiceInputMultiline} />}
          {activeTab === 6 && <TabConcentrateFilters concentrateFilters={concentrateFilters} setConcentrateFilters={setConcentrateFilters} isReadOnly={false} validateDurationVsShift={validateDurationVsShift} personnel={personnel} attendanceMap={attendanceMap} />}
          {activeTab === 7 && <TabThickeners thickeners={thickeners} setThickeners={setThickeners} isReadOnly={false} handleThickenerMetaChange={handleThickenerMetaChange} handleThickenerDataChange={handleThickenerDataChange} />}
          {activeTab === 8 && <TabRecoveryFilters recoveryFilters={recoveryFilters} setRecoveryFilters={setRecoveryFilters} isReadOnly={false} validateDurationVsShift={validateDurationVsShift} personnel={personnel} attendanceMap={attendanceMap} />}
          {activeTab === 9 && <TabDowntime downtime={downtime} setDowntime={setDowntime} footer={footer} setFooter={setFooter} pumps={pumps} setPumps={setPumps} isReadOnly={false} handleDowntimeChange={handleDowntimeChange} handleDynamicListChange={handleDynamicListChange} addDynamicRecord={addDynamicRecord} removeDynamicRecord={removeDynamicRecord} handleVoiceInputMultiline={handleVoiceInputMultiline} handleVoiceInputDynamic={handleVoiceInputDynamic} shiftDuration={shiftInfo.shiftDuration} />}

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
    );
  }

  return (
      <DataPage
        title="گزارشات شیفت"
        icon={Clipboard}
        data={filteredItems}
        isLoading={loading}
        columns={[
          { header: 'کد گزارش', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'تاریخ', accessor: (i: any) => i.shift_date, sortKey: 'shift_date' },
          { header: 'شیفت', accessor: (i: any) => i.shift_name, sortKey: 'shift_name' },
          { header: 'نوع شیفت', accessor: (i: any) => SHIFT_TYPE_MAP[i.shift_type] || i.shift_type, sortKey: 'shift_type' },
          { header: 'سرپرست', accessor: (i: any) => i.supervisor_name || '---', sortKey: 'supervisor_name' },
          { header: 'خوراک مصرفی A', accessor: (i: any) => <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">{i.total_production_a}</span>, sortKey: 'total_production_a' },
          { header: 'خوراک مصرفی B', accessor: (i: any) => <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{i.total_production_b}</span>, sortKey: 'total_production_b' },
        ]}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onAdd={handleCreateNew}
        onReload={loadReports}
        onDelete={handleDeleteReports}
        onEdit={handleViewForm}
        onViewDetails={handleViewReport}
        onPrint={(item) => openReportTemplatePreview(navigate, 'shiftreport', item)}
        onExport={handleExport}
        exportName="ShiftReports"
      />
  );
};

export default ShiftHandover;