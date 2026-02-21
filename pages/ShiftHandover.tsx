
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { 
  Clipboard, Save, X, ArrowRight, Trash2, 
  UserCheck, CalendarOff, UserX, Loader2, Check, ArrowLeft, Search,
} from 'lucide-react';
import { getShamsiDate, parseShamsiDate } from '../utils';
import { fetchMasterData, fetchShiftReports, saveShiftReport, fetchNextTrackingCode } from '../workflowStore';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { DataPage } from '../components/DataPage';
import * as XLSX from 'xlsx';

import { 
    getProductionTimes, SHIFT_TYPE_MAP, parseTimeToMinutes,
    AttendanceStatus, LeaveType, FeedInput, TABS
} from './ShiftHandoverTypes';
import { 
    TabProduction, TabMills, TabHydrocyclones, TabDrumMagnets, 
    TabConcentrateFilters, TabThickeners, TabRecoveryFilters, TabDowntime 
} from './ShiftHandoverTabs';
import { ShiftReportView } from './ShiftHandoverReport';
import { supabase } from '../supabaseClient';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { ensureDefaultShiftReportTemplate } from '../services/reportTemplates';

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

  const formatDateTime = (raw?: string) => {
    if (!raw) return '-';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    const time = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = dt.toLocaleDateString('fa-IR');
    return `${time} | ${date}`;
  };

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
  const [attendanceSearch, setAttendanceSearch] = useState<{ present: string; leave: string; absent: string }>({ present: '', leave: '', absent: '' }); 

  const [production, setProduction] = useState<{
      lineA: Record<string, number>,
      lineB: Record<string, number>
  }>({ lineA: {}, lineB: {} });

  const [feedInfo, setFeedInfo] = useState<{
      lineA: Record<string, FeedInput[]>,
      lineB: Record<string, FeedInput[]>
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
  const [validationTouched, setValidationTouched] = useState(false);

  useEffect(() => {
      ensureDefaultShiftReportTemplate();
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
          const formattedData = data.map((d: any) => {
              const a = Number(d.total_production_a) || 0;
              const b = Number(d.total_production_b) || 0;
              return {
                  ...d,
                  total_production_a: a,
                  total_production_b: b,
                  total_feed_sum: a + b
              };
          });
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
      if (tabId === 2) {
          const times = getProductionTimes(shiftInfo.type);
          for (const line of ['lineA', 'lineB'] as const) {
              if (!feedLinesActive[line]) continue;
              const lineFeed = feedInfo[line] || {};
              for (const time of times) {
                  const arr = lineFeed[time];
                  const sum = (arr && Array.isArray(arr) ? arr : []).reduce((a, f) => a + Number(f?.percent || 0), 0);
                  if (sum !== 100) return false;
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
      if (isReadOnly) return true;
      if (!shiftInfo.date || !shiftInfo.shiftDuration) return false;
      
      const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
      const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
      const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
      
      if (totalA !== shiftMins || totalB !== shiftMins) return false;

      return true;
  };

  const getValidationIssues = (): { tabId: number; message: string }[] => {
      if (isReadOnly) return [];
      const issues: { tabId: number; message: string }[] = [];
      if (!shiftInfo.name) issues.push({ tabId: 1, message: 'شیفت انتخاب نشده است.' });
      if (!shiftInfo.type) issues.push({ tabId: 1, message: 'نوبت کاری انتخاب نشده است.' });
      if (!shiftInfo.date) issues.push({ tabId: 1, message: 'تاریخ شیفت وارد نشده است.' });
      if (!shiftInfo.shiftDuration || parseTimeToMinutes(shiftInfo.shiftDuration) <= 0) {
          issues.push({ tabId: 1, message: 'مدت شیفت معتبر نیست.' });
      }
      if (!Object.keys(attendanceMap).length) {
          issues.push({ tabId: 1, message: 'حداقل وضعیت حضور یک نفر باید ثبت شود.' });
      }
      const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
      const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
      const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
      if (shiftMins > 0 && (totalA !== shiftMins || totalB !== shiftMins)) {
          issues.push({ tabId: 9, message: 'جمع کارکرد/توقف هر خط باید با مدت شیفت برابر باشد.' });
      }
      return issues;
  };

  const validationIssues = getValidationIssues();
  const firstValidationIssue = validationIssues[0];

  // Helper functions for state updates (passed to tabs)
  const productionTimes = getProductionTimes(shiftInfo.type);
  const handleTonnageChange = (line: 'lineA' | 'lineB', time: string, val: string) => {
      if (isReadOnly) return;
      const numVal = Number(val);
      if (numVal < 0) return;
      const timeIdx = productionTimes.indexOf(time);
      if (timeIdx < 0) {
          setProduction(prev => ({ ...prev, [line]: { ...prev[line], [time]: numVal } }));
          return;
      }
      setProduction(prev => {
          const newLine = { ...prev[line] };
          for (let i = timeIdx; i < productionTimes.length; i++) {
              const t = productionTimes[i];
              if (t) newLine[t] = numVal;
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
      setFeedInfo({ lineA: {}, lineB: {} });
      setFeedLinesActive({ lineA: true, lineB: true });
      setBallMills({
          lineA: {
              primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
              secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] }
          },
          lineB: {
               primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
               secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] }
          }
      });
      setHydrocyclones({
          lineA: {
              primary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
              secondary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' }
          },
          lineB: {
              primary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
              secondary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' }
          }
      });
      setDrumMagnets({
          lineA: { active: false, single: false, upper: false, middle: false, lower: false, description: '' },
          lineB: { active: false, single: false, upper: false, middle: false, lower: false, description: '' }
      });
      setConcentrateFilters({
          lineA: { active: false, operator: '', hours: '', cloths: [] as string[] },
          lineB: { active: false, operator: '', hours: '', cloths: [] as string[] },
          reserve: { active: false, operator: '', hours: '', cloths: [] as string[] }
      });
      setThickeners({
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
      setRecoveryFilters({
          lineA: [
              { active: false, operator: '', hours: '', cloths: [] as string[] },
              { active: false, operator: '', hours: '', cloths: [] as string[] }
          ],
          lineB: [
              { active: false, operator: '', hours: '', cloths: [] as string[] },
              { active: false, operator: '', hours: '', cloths: [] as string[] }
          ]
      });
      setPumps({ process: [], cleanWater: [] });
      setDowntime({
          lineA: { workTime: '', stopTime: '', reason: '' },
          lineB: { workTime: '', stopTime: '', reason: '' },
          generalDescription: ['']
      });
      setAttendanceMap({});
      setLeaveTypes({});
      setFooter({ nextShiftActions: [''] });
      setValidationTouched(false);
      setViewMode('FORM');
      setActiveTab(1);
  };

  const handleConfirmSubmit = async () => {
      setValidationTouched(true);
      if (validationIssues.length > 0) {
          setActiveTab(firstValidationIssue?.tabId || 1);
          alert(`فرم ناقص است:\n${validationIssues.map(v => `• ${v.message}`).join('\n')}`);
          return;
      }
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
        "نوبت کاری": SHIFT_TYPE_MAP[item.shift_type] || item.shift_type,
        "سرپرست شیفت": item.supervisor_name,
        "خوراک خط A": item.total_production_a,
        "خوراک خط B": item.total_production_b
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
  const ensureFeedSlots = (arr: FeedInput[] | undefined, minLen: number): FeedInput[] => {
      const out = [...(arr || [{ type: '', percent: 0 }])];
      while (out.length <= minLen) out.push({ type: '', percent: 0 });
      return out;
  };
  const handleFeedTypeChange = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, value: string) => {
      if (isReadOnly) return;
      const time = productionTimes[timeIdx];
      if (!time) return;
      setFeedInfo(prev => {
          const newLine = { ...prev[line] };
          const current = ensureFeedSlots(newLine[time], feedIdx);
          const updated = current.map((f, i) => i === feedIdx ? { ...f, type: value, isCustom: false } : { ...f });
          const copy = () => updated.map(f => ({ ...f }));
          for (let i = timeIdx; i < productionTimes.length; i++) {
              const t = productionTimes[i];
              if (t) newLine[t] = copy();
          }
          return { ...prev, [line]: newLine };
      });
  };
  const handleCustomFeedType = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, value: string) => {
      if (isReadOnly) return;
      const time = productionTimes[timeIdx];
      if (!time) return;
      setFeedInfo(prev => {
          const newLine = { ...prev[line] };
          const current = ensureFeedSlots(newLine[time], feedIdx);
          const updated = current.map((f, i) => i === feedIdx ? { ...f, type: value, isCustom: true } : { ...f });
          const copy = () => updated.map(f => ({ ...f }));
          for (let i = timeIdx; i < productionTimes.length; i++) {
              const t = productionTimes[i];
              if (t) newLine[t] = copy();
          }
          return { ...prev, [line]: newLine };
      });
  };
  const resetFeedType = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number) => {
      if (isReadOnly) return;
      const time = productionTimes[timeIdx];
      if (!time) return;
      setFeedInfo(prev => {
          const newLine = { ...prev[line] };
          const current = ensureFeedSlots(newLine[time], feedIdx);
          const updated = current.map((f, i) => i === feedIdx ? { type: '', percent: 0, isCustom: false } : { ...f });
          const copy = () => updated.map(f => ({ ...f }));
          for (let i = timeIdx; i < productionTimes.length; i++) {
              const t = productionTimes[i];
              if (t) newLine[t] = copy();
          }
          return { ...prev, [line]: newLine };
      });
  };
  const handleFeedPercentChange = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, value: string) => {
      if (isReadOnly) return;
      const time = productionTimes[timeIdx];
      if (!time) return;
      setFeedInfo(prev => {
          const newLine = { ...prev[line] };
          const current = ensureFeedSlots(newLine[time], feedIdx);
          let sumPrev = 0;
          for (let i = 0; i < feedIdx; i++) sumPrev += Number(current[i]?.percent || 0);
          const maxPercent = Math.max(0, 100 - sumPrev);
          const numVal = Math.max(0, Math.min(maxPercent, Number(value) || 0));
          const updated = current.map((f, i) => i === feedIdx ? { ...f, percent: numVal } : { ...f });
          const copy = () => updated.map(f => ({ ...f }));
          for (let i = timeIdx; i < productionTimes.length; i++) {
              const t = productionTimes[i];
              if (t) newLine[t] = copy();
          }
          return { ...prev, [line]: newLine };
      });
  };
  const handleAddBallCharge = (line: 'lineA' | 'lineB', millType: 'primary' | 'secondary') => {
      if (isReadOnly) return;
      const millData = ballMills[line][millType];
      const size = Number(millData.ballSize);
      const count = Number(millData.barrelCount);
      if (!size || !count) return;
      setBallMills(prev => ({
          ...prev,
          [line]: {
              ...prev[line],
              [millType]: {
                  ...prev[line][millType],
                  charges: [...prev[line][millType].charges, { size, count }],
                  ballSize: '',
                  barrelCount: ''
              }
          }
      }));
  };
  const handleRemoveBallCharge = (line: 'lineA' | 'lineB', millType: 'primary' | 'secondary', idx: number) => {
      if (isReadOnly) return;
      setBallMills(prev => ({
          ...prev,
          [line]: {
              ...prev[line],
              [millType]: {
                  ...prev[line][millType],
                  charges: prev[line][millType].charges.filter((_: any, i: number) => i !== idx)
              }
          }
      }));
  };

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
    <div className="w-full max-w-full pb-24">
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
                              <select disabled={isReadOnly} value={shiftInfo.name} onChange={e => setShiftInfo({...shiftInfo, name: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm disabled:opacity-60">
                                  {['A', 'B', 'C'].map(s => <option key={s} value={s}>شیفت {s}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-1">نوبت کاری</label>
                              <select disabled={isReadOnly} value={shiftInfo.type} onChange={e => setShiftInfo({...shiftInfo, type: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm disabled:opacity-60">
                                  <option value="Day1">روز کار اول</option>
                                  <option value="Day2">روز کار دوم</option>
                                  <option value="Night1">شب کار اول</option>
                                  <option value="Night2">شب کار دوم</option>
                              </select>
                          </div>
                          <div>
                              <div className="w-full">
                                  <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">مدت شیفت</label>
                                  <ClockTimePicker value={shiftInfo.shiftDuration} onChange={t => !isReadOnly && setShiftInfo({...shiftInfo, shiftDuration: t})} />
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
                                        <div className="relative mb-3">
                                            <div className="relative">
                                                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder=""
                                                    className="w-full pr-8 pl-2 py-2 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-green-500"
                                                    value={attendanceSearch.present}
                                                    onChange={e => setAttendanceSearch(s => ({ ...s, present: e.target.value }))}
                                                />
                                            </div>
                                            {attendanceSearch.present && (
                                                <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                                                    {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).slice(0, 10).map(p => (
                                                        <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => { handleAttendanceChange(p.id, 'PRESENT'); setAttendanceSearch(s => ({ ...s, present: '' })); }}>
                                                            {p.full_name}
                                                        </button>
                                                    ))}
                                                    {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                                        <div className="relative mb-3">
                                            <div className="relative">
                                                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder=""
                                                    className="w-full pr-8 pl-2 py-2 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-orange-500"
                                                    value={attendanceSearch.leave}
                                                    onChange={e => setAttendanceSearch(s => ({ ...s, leave: e.target.value }))}
                                                />
                                            </div>
                                            {attendanceSearch.leave && (
                                                <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                                                    {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).slice(0, 10).map(p => (
                                                        <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => { handleAttendanceChange(p.id, 'LEAVE'); setAttendanceSearch(s => ({ ...s, leave: '' })); }}>
                                                            {p.full_name}
                                                        </button>
                                                    ))}
                                                    {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                                        <div className="relative mb-3">
                                            <div className="relative">
                                                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder=""
                                                    className="w-full pr-8 pl-2 py-2 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-red-500"
                                                    value={attendanceSearch.absent}
                                                    onChange={e => setAttendanceSearch(s => ({ ...s, absent: e.target.value }))}
                                                />
                                            </div>
                                            {attendanceSearch.absent && (
                                                <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                                                    {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).slice(0, 10).map(p => (
                                                        <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { handleAttendanceChange(p.id, 'ABSENT'); setAttendanceSearch(s => ({ ...s, absent: '' })); }}>
                                                            {p.full_name}
                                                        </button>
                                                    ))}
                                                    {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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

          {validationTouched && validationIssues.length > 0 && (
            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">
              <div className="font-bold mb-1">موارد نیازمند اصلاح</div>
              <div className="flex flex-wrap gap-2">
                {validationIssues.map((issue, idx) => (
                  <button
                    key={`${issue.tabId}-${idx}`}
                    type="button"
                    onClick={() => setActiveTab(issue.tabId)}
                    className="px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100"
                  >
                    تب {issue.tabId}: {issue.message}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 2 && (
              <TabProduction 
                  production={production} feedInfo={feedInfo} isReadOnly={isReadOnly}
                  handleTonnageChange={handleTonnageChange} 
                  handleFeedTypeChange={handleFeedTypeChange}
                  handleCustomFeedType={handleCustomFeedType}
                  resetFeedType={resetFeedType}
                  handleFeedPercentChange={handleFeedPercentChange}
                  feedLinesActive={feedLinesActive} 
                  setFeedLinesActive={setFeedLinesActive}
                  shiftType={shiftInfo.type}
              />
          )}
          {activeTab === 3 && <TabMills ballMills={ballMills} setBallMills={setBallMills} isReadOnly={isReadOnly} handleAddBallCharge={handleAddBallCharge} handleRemoveBallCharge={handleRemoveBallCharge} />}
          {activeTab === 4 && <TabHydrocyclones hydrocyclones={hydrocyclones} setHydrocyclones={setHydrocyclones} isReadOnly={isReadOnly} />}
          {activeTab === 5 && <TabDrumMagnets drumMagnets={drumMagnets} setDrumMagnets={setDrumMagnets} isReadOnly={isReadOnly} handleVoiceInputMultiline={handleVoiceInputMultiline} />}
          {activeTab === 6 && <TabConcentrateFilters concentrateFilters={concentrateFilters} setConcentrateFilters={setConcentrateFilters} isReadOnly={isReadOnly} validateDurationVsShift={validateDurationVsShift} personnel={personnel} attendanceMap={attendanceMap} />}
          {activeTab === 7 && <TabThickeners thickeners={thickeners} setThickeners={setThickeners} isReadOnly={isReadOnly} handleThickenerMetaChange={handleThickenerMetaChange} handleThickenerDataChange={handleThickenerDataChange} />}
          {activeTab === 8 && <TabRecoveryFilters recoveryFilters={recoveryFilters} setRecoveryFilters={setRecoveryFilters} isReadOnly={isReadOnly} validateDurationVsShift={validateDurationVsShift} personnel={personnel} attendanceMap={attendanceMap} />}
          {activeTab === 9 && <TabDowntime downtime={downtime} setDowntime={setDowntime} footer={footer} setFooter={setFooter} pumps={pumps} setPumps={setPumps} isReadOnly={isReadOnly} handleDowntimeChange={handleDowntimeChange} handleDynamicListChange={handleDynamicListChange} addDynamicRecord={addDynamicRecord} removeDynamicRecord={removeDynamicRecord} handleVoiceInputMultiline={handleVoiceInputMultiline} handleVoiceInputDynamic={handleVoiceInputDynamic} shiftDuration={shiftInfo.shiftDuration} />}

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
          { header: 'تاریخ شیفت', accessor: (i: any) => i.shift_date, sortKey: 'shift_date' },
          { header: 'تاریخ ثبت', accessor: (i: any) => formatDateTime(i.created_at), sortKey: 'created_at' },
          { header: 'شیفت', accessor: (i: any) => i.shift_name, sortKey: 'shift_name' },
          { header: 'نوبت کاری', accessor: (i: any) => SHIFT_TYPE_MAP[i.shift_type] || i.shift_type, sortKey: 'shift_type' },
          { header: 'سرپرست شیفت', accessor: (i: any) => i.supervisor_name || '---', sortKey: 'supervisor_name' },
          { header: 'خوراک خط A', accessor: (i: any) => <span className="text-blue-600 font-bold">{i.total_production_a}</span>, sortKey: 'total_production_a' },
          { header: 'خوراک خط B', accessor: (i: any) => <span className="text-red-600 font-bold">{i.total_production_b}</span>, sortKey: 'total_production_b' },
          { header: 'مجموع خوراک مصرفی', accessor: (i: any) => <span className="font-bold">{(i.total_feed_sum ?? (Number(i.total_production_a) || 0) + (Number(i.total_production_b) || 0))}</span>, sortKey: 'total_feed_sum' },
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