/**
 * محتوای فرم گزارش شیفت – عین همین فرم در منوی گزارش شیفت
 * قابل استفاده در ReportFormDesign برای پیش‌نمایش قالب و در ShiftHandover
 */
import React, { useState } from 'react';
import { Clipboard, Trash2, UserCheck, CalendarOff, UserX, ArrowRight, ArrowLeft } from 'lucide-react';
import { getShamsiDate, parseShamsiDate } from '../utils';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { ClockTimePicker } from './ClockTimePicker';
import {
  getProductionTimes,
  TABS,
  parseTimeToMinutes,
  AttendanceStatus,
  LeaveType,
  FeedInput,
} from '../pages/ShiftHandoverTypes';
import {
  TabProduction,
  TabMills,
  TabHydrocyclones,
  TabDrumMagnets,
  TabConcentrateFilters,
  TabThickeners,
  TabRecoveryFilters,
  TabDowntime,
} from '../pages/ShiftHandoverTabs';

const getDayOfWeek = (dateStr: string) => {
  const date = parseShamsiDate(dateStr);
  if (!date) return '';
  const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  return days[date.getDay()];
};

const defaultFeedInfo = () => ({ lineA: {} as Record<string, [FeedInput, FeedInput, FeedInput]>, lineB: {} as Record<string, [FeedInput, FeedInput, FeedInput]> });
const defaultBallMills = () => ({
  lineA: {
    primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
    secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
  },
  lineB: {
    primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
    secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] as any[] },
  },
});
const defaultHydrocyclones = () => ({
  lineA: {
    primary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
    secondary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
  },
  lineB: {
    primary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
    secondary: { active: false, activeCyclones: [] as number[], pressure08: '', angle08: '', pressure02: '', angle02: '' },
  },
});
const defaultDrumMagnets = () => ({
  lineA: { active: false, single: false, upper: false, middle: false, lower: false, description: '' },
  lineB: { active: false, single: false, upper: false, middle: false, lower: false, description: '' },
});
const defaultConcentrateFilters = () => ({
  lineA: { active: false, operator: '', hours: '', cloths: [] as string[] },
  lineB: { active: false, operator: '', hours: '', cloths: [] as string[] },
  reserve: { active: false, operator: '', hours: '', cloths: [] as string[] },
});
const defaultThickeners = () => ({
  lineA: [
    { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
    { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
    { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
  ],
  lineB: [
    { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
    { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
    { active: false, hoursWorked: '', channelOutput: '', description: '', data: {} },
  ],
});
const defaultRecoveryFilters = () => ({
  lineA: [
    { active: false, operator: '', hours: '', cloths: [] as string[] },
    { active: false, operator: '', hours: '', cloths: [] as string[] },
  ],
  lineB: [
    { active: false, operator: '', hours: '', cloths: [] as string[] },
    { active: false, operator: '', hours: '', cloths: [] as string[] },
  ],
});

export interface ShiftReportFormContentProps {
  /** برای نمایش در حالت embed بدون هدر */
  embed?: boolean;
  readOnly?: boolean;
  personnel?: Array<{ id: string; full_name?: string; fullName?: string }>;
  showNavButtons?: boolean;
  showSubmitButton?: boolean;
  onSubmit?: () => void;
  onBack?: () => void;
  /** مقدار اولیه برای باز کردن فرم ویرایش */
  initialValue?: any;
}

export const ShiftReportFormContent: React.FC<ShiftReportFormContentProps> = ({
  embed = false,
  readOnly = false,
  personnel = [],
  showNavButtons = true,
  showSubmitButton = false,
  onSubmit,
  onBack,
  initialValue,
}) => {
  const personnelNorm = personnel.map(p => ({ id: p.id, full_name: p.full_name ?? p.fullName ?? '' }));

  const [activeTab, setActiveTab] = useState(1);
  const [shiftInfo, setShiftInfo] = useState({
    name: initialValue?.shiftInfo?.name ?? 'A',
    type: initialValue?.shiftInfo?.type ?? 'Day1',
    date: initialValue?.shiftInfo?.date ?? getShamsiDate(),
    shiftDuration: initialValue?.shiftInfo?.shiftDuration ?? '12:00',
    supervisor: initialValue?.shiftInfo?.supervisor ?? '',
    supervisorName: initialValue?.shiftInfo?.supervisorName ?? '',
  });
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>(initialValue?.attendanceMap ?? {});
  const [leaveTypes, setLeaveTypes] = useState<Record<string, LeaveType>>(initialValue?.leaveTypes ?? {});
  const [production, setProduction] = useState(initialValue?.production ?? { lineA: {}, lineB: {} });
  const [feedInfo, setFeedInfo] = useState(initialValue?.feedInfo ?? defaultFeedInfo());
  const [feedLinesActive, setFeedLinesActive] = useState(initialValue?.feedLinesActive ?? { lineA: true, lineB: true });
  const [ballMills, setBallMills] = useState(initialValue?.ballMills ?? defaultBallMills());
  const [hydrocyclones, setHydrocyclones] = useState(initialValue?.hydrocyclones ?? defaultHydrocyclones());
  const [drumMagnets, setDrumMagnets] = useState(initialValue?.drumMagnets ?? defaultDrumMagnets());
  const [concentrateFilters, setConcentrateFilters] = useState(initialValue?.concentrateFilters ?? defaultConcentrateFilters());
  const [thickeners, setThickeners] = useState(initialValue?.thickeners ?? defaultThickeners());
  const [recoveryFilters, setRecoveryFilters] = useState(initialValue?.recoveryFilters ?? defaultRecoveryFilters());
  const [pumps, setPumps] = useState(initialValue?.pumps ?? { process: [], cleanWater: [] });
  const [downtime, setDowntime] = useState(initialValue?.downtime ?? {
    lineA: { workTime: '', stopTime: '', reason: '' },
    lineB: { workTime: '', stopTime: '', reason: '' },
    generalDescription: [''],
  });
  const [footer, setFooter] = useState(initialValue?.footer ?? { nextShiftActions: [''] });

  const productionTimes = getProductionTimes(shiftInfo.type);

  const cascadeFeedToLater = (newLine: Record<string, any[]>, _line: 'lineA' | 'lineB', fromTimeIdx: number, updatedFeed: any[]) => {
    productionTimes.slice(fromTimeIdx).forEach(t => { newLine[t] = updatedFeed.map(f => ({ ...f })); });
  };

  const handleTonnageChange = (line: 'lineA' | 'lineB', time: string, timeIdx: number, val: string) => {
    if (readOnly) return;
    const numVal = Math.max(0, Number(val) || 0);
    const timesToUpdate = productionTimes.slice(timeIdx);
    setProduction(prev => {
      const newLine = { ...prev[line] };
      timesToUpdate.forEach(t => { newLine[t] = numVal; });
      return { ...prev, [line]: newLine };
    });
    setFeedInfo(prev => {
      const current = prev[line]?.[time];
      if (!current) return prev;
      const newLine = { ...prev[line] };
      timesToUpdate.forEach(t => { newLine[t] = current.map((f: any) => ({ ...f })); });
      return { ...prev, [line]: newLine };
    });
  };
  const handleFeedTypeChange = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, value: string) => {
    if (readOnly) return;
    const time = productionTimes[timeIdx];
    if (!time) return;
    setFeedInfo(prev => {
      const newLine = { ...prev[line] };
      const current = newLine[time] || [{ type: '', percent: 0 }];
      const arr = [...current];
      while (arr.length <= feedIdx) arr.push({ type: '', percent: 0 });
      arr[feedIdx] = { ...arr[feedIdx], type: value, isCustom: false };
      newLine[time] = arr;
      cascadeFeedToLater(newLine, line, timeIdx, arr);
      return { ...prev, [line]: newLine };
    });
  };
  const handleCustomFeedType = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, value: string) => {
    if (readOnly) return;
    const time = productionTimes[timeIdx];
    if (!time) return;
    setFeedInfo(prev => {
      const newLine = { ...prev[line] };
      const current = newLine[time] || [{ type: '', percent: 0 }];
      const arr = [...current];
      while (arr.length <= feedIdx) arr.push({ type: '', percent: 0 });
      arr[feedIdx] = { ...arr[feedIdx], type: value, isCustom: true };
      newLine[time] = arr;
      cascadeFeedToLater(newLine, line, timeIdx, arr);
      return { ...prev, [line]: newLine };
    });
  };
  const resetFeedType = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number) => {
    if (readOnly) return;
    const time = productionTimes[timeIdx];
    if (!time) return;
    setFeedInfo(prev => {
      const newLine = { ...prev[line] };
      const current = newLine[time] || [{ type: '', percent: 0 }];
      const arr = [...current];
      if (feedIdx < arr.length) arr[feedIdx] = { type: '', percent: 0, isCustom: false };
      newLine[time] = arr;
      cascadeFeedToLater(newLine, line, timeIdx, arr);
      return { ...prev, [line]: newLine };
    });
  };
  const handleFeedPercentChange = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, value: string) => {
    if (readOnly) return;
    const time = productionTimes[timeIdx];
    if (!time) return;
    setFeedInfo(prev => {
      const newLine = { ...prev[line] };
      const current = newLine[time] || [{ type: '', percent: 0 }];
      const arr = [...current];
      while (arr.length <= feedIdx) arr.push({ type: '', percent: 0 });
      const sumOthers = arr.reduce((s: number, f: any, i: number) => i === feedIdx ? s : s + Number(f?.percent || 0), 0);
      const maxAllowed = Math.max(1, 100 - sumOthers);
      const raw = Number(value) || 0;
      const numVal = Math.max(1, Math.min(100, Math.min(maxAllowed, raw)));
      arr[feedIdx] = { ...arr[feedIdx], percent: numVal };
      newLine[time] = arr;
      cascadeFeedToLater(newLine, line, timeIdx, arr);
      return { ...prev, [line]: newLine };
    });
  };
  const handleAddBallCharge = (line: 'lineA' | 'lineB', millType: 'primary' | 'secondary') => {
    if (readOnly) return;
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
          barrelCount: '',
        },
      },
    }));
  };
  const handleRemoveBallCharge = (line: 'lineA' | 'lineB', millType: 'primary' | 'secondary', idx: number) => {
    if (readOnly) return;
    setBallMills(prev => ({
      ...prev,
      [line]: {
        ...prev[line],
        [millType]: {
          ...prev[line][millType],
          charges: prev[line][millType].charges.filter((_: any, i: number) => i !== idx),
        },
      },
    }));
  };
  const validateDurationVsShift = (durationStr: string) => {
    const dur = parseTimeToMinutes(durationStr);
    const shift = parseTimeToMinutes(shiftInfo.shiftDuration);
    return dur <= shift;
  };
  const handleAttendanceChange = (personId: string, status: AttendanceStatus) =>
    setAttendanceMap(prev => ({ ...prev, [personId]: status }));
  const handleRemoveAttendance = (personId: string) =>
    setAttendanceMap(prev => {
      const newMap = { ...prev };
      delete newMap[personId];
      return newMap;
    });
  const handleThickenerMetaChange = (line: any, idx: any, field: any, value: any) =>
    setThickeners((prev: any) => {
      const newLine = [...prev[line]];
      newLine[idx] = { ...newLine[idx], [field]: value };
      return { ...prev, [line]: newLine };
    });
  const handleThickenerDataChange = (line: any, idx: any, time: any, field: any, value: any) =>
    setThickeners((prev: any) => {
      const newLine = [...prev[line]];
      const currentData = newLine[idx].data[time] || {};
      newLine[idx].data = { ...newLine[idx].data, [time]: { ...currentData, [field]: value } };
      return { ...prev, [line]: newLine };
    });
  const handleVoiceInputMultiline = () => {};
  const handleVoiceInputDynamic = () => {};
  const handleDowntimeChange = (l: any, f: any, v: any) =>
    setDowntime((p: any) => ({ ...p, [l]: { ...p[l], [f]: v } }));
  const handleDynamicListChange = (s: any, i: any, v: any) => {
    if (s === 'downtime') setDowntime((p: any) => ({ ...p, generalDescription: [...p.generalDescription].map((x, idx) => idx === i ? v : x) }));
    else setFooter((p: any) => ({ ...p, nextShiftActions: [...p.nextShiftActions].map((x, idx) => idx === i ? v : x) }));
  };
  const addDynamicRecord = (s: any) => {
    if (s === 'downtime') setDowntime((p: any) => ({ ...p, generalDescription: [...p.generalDescription, ''] }));
    else setFooter((p: any) => ({ ...p, nextShiftActions: [...p.nextShiftActions, ''] }));
  };
  const removeDynamicRecord = (s: any, i: any) => {
    if (s === 'downtime') setDowntime((p: any) => ({ ...p, generalDescription: p.generalDescription.filter((_: any, x: any) => x !== i) }));
    else setFooter((p: any) => ({ ...p, nextShiftActions: p.nextShiftActions.filter((_: any, x: any) => x !== i) }));
  };

  const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
  const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
  const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
  const isValid = totalA === shiftMins && totalB === shiftMins;

  return (
    <div className={embed ? '' : 'max-w-7xl mx-auto pb-24'}>
      {!embed && (
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
          <div className="flex items-center gap-2">
            <Clipboard className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">ثبت گزارش شیفت جدید</h1>
          </div>
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
              برگشت
            </button>
          )}
        </div>
      )}

      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto ${embed ? 'top-0' : 'top-16'}`}>
        <div className="flex min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 min-w-[100px]
                ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'}`}
            >
              <tab.icon className="w-5 h-5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}>
        {activeTab === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold mb-1">شیفت</label>
                  <select disabled={readOnly} value={shiftInfo.name} onChange={e => setShiftInfo({ ...shiftInfo, name: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm disabled:opacity-60">
                    {['A', 'B', 'C'].map(s => <option key={s} value={s}>شیفت {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">نوبت کاری</label>
                  <select disabled={readOnly} value={shiftInfo.type} onChange={e => setShiftInfo({ ...shiftInfo, type: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm disabled:opacity-60">
                    <option value="Day1">روز کار اول</option>
                    <option value="Day2">روز کار دوم</option>
                    <option value="Night1">شب کار اول</option>
                    <option value="Night2">شب کار دوم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">مدت شیفت</label>
                  <ClockTimePicker value={shiftInfo.shiftDuration} onChange={t => !readOnly && setShiftInfo({ ...shiftInfo, shiftDuration: t })} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">روز هفته</label>
                  <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm">{getDayOfWeek(shiftInfo.date)}</div>
                </div>
                <div>
                  <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">تاریخ</label>
                  <ShamsiDatePicker value={shiftInfo.date} onChange={d => !readOnly && setShiftInfo({ ...shiftInfo, date: d })} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">سرپرست شیفت</label>
                  <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 truncate text-sm">{shiftInfo.supervisorName || '—'}</div>
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
                    {!readOnly && (
                      <select className="w-full p-2 mb-3 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-green-500" onChange={(e) => { if (e.target.value) handleAttendanceChange(e.target.value, 'PRESENT'); e.target.value = ''; }}>
                        <option value="">+ افزودن نفر</option>
                        {personnelNorm.filter(p => !attendanceMap[p.id]).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    )}
                    <div className="space-y-2">
                      {personnelNorm.filter(p => attendanceMap[p.id] === 'PRESENT').map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-green-500">
                          <span className="text-sm font-medium">{p.full_name}</span>
                          {!readOnly && <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
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
                    {!readOnly && (
                      <select className="w-full p-2 mb-3 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-orange-500" onChange={(e) => { if (e.target.value) handleAttendanceChange(e.target.value, 'LEAVE'); e.target.value = ''; }}>
                        <option value="">+ افزودن نفر</option>
                        {personnelNorm.filter(p => !attendanceMap[p.id]).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    )}
                    <div className="space-y-2">
                      {personnelNorm.filter(p => attendanceMap[p.id] === 'LEAVE').map(p => (
                        <div key={p.id} className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-orange-500">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{p.full_name}</span>
                            {!readOnly && <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                          <div className="flex gap-2 text-xs bg-orange-50 dark:bg-orange-900/10 p-1.5 rounded">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name={`leave-${p.id}`} checked={leaveTypes[p.id] === 'HOURLY'} onChange={() => setLeaveTypes(prev => ({ ...prev, [p.id]: 'HOURLY' }))} disabled={readOnly} /> ساعتی
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name={`leave-${p.id}`} checked={leaveTypes[p.id] === 'DAILY'} onChange={() => setLeaveTypes(prev => ({ ...prev, [p.id]: 'DAILY' }))} disabled={readOnly} /> روزانه
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
                    {!readOnly && (
                      <select className="w-full p-2 mb-3 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-red-500" onChange={(e) => { if (e.target.value) handleAttendanceChange(e.target.value, 'ABSENT'); e.target.value = ''; }}>
                        <option value="">+ افزودن نفر</option>
                        {personnelNorm.filter(p => !attendanceMap[p.id]).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    )}
                    <div className="space-y-2">
                      {personnelNorm.filter(p => attendanceMap[p.id] === 'ABSENT').map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-red-500">
                          <span className="text-sm font-medium">{p.full_name}</span>
                          {!readOnly && <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
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
            production={production}
            feedInfo={feedInfo}
            isReadOnly={readOnly}
            productionTimes={productionTimes}
            handleTonnageChange={handleTonnageChange}
            handleFeedTypeChange={handleFeedTypeChange}
            handleCustomFeedType={handleCustomFeedType}
            resetFeedType={resetFeedType}
            handleFeedPercentChange={handleFeedPercentChange}
            feedLinesActive={feedLinesActive}
            setFeedLinesActive={setFeedLinesActive}
          />
        )}
        {activeTab === 3 && <TabMills ballMills={ballMills} setBallMills={setBallMills} isReadOnly={readOnly} handleAddBallCharge={handleAddBallCharge} handleRemoveBallCharge={handleRemoveBallCharge} />}
        {activeTab === 4 && <TabHydrocyclones hydrocyclones={hydrocyclones} setHydrocyclones={setHydrocyclones} isReadOnly={readOnly} />}
        {activeTab === 5 && <TabDrumMagnets drumMagnets={drumMagnets} setDrumMagnets={setDrumMagnets} isReadOnly={readOnly} handleVoiceInputMultiline={handleVoiceInputMultiline} />}
        {activeTab === 6 && <TabConcentrateFilters concentrateFilters={concentrateFilters} setConcentrateFilters={setConcentrateFilters} isReadOnly={readOnly} validateDurationVsShift={validateDurationVsShift} personnel={personnelNorm} attendanceMap={attendanceMap} />}
        {activeTab === 7 && <TabThickeners thickeners={thickeners} setThickeners={setThickeners} isReadOnly={readOnly} handleThickenerMetaChange={handleThickenerMetaChange} handleThickenerDataChange={handleThickenerDataChange} />}
        {activeTab === 8 && <TabRecoveryFilters recoveryFilters={recoveryFilters} setRecoveryFilters={setRecoveryFilters} isReadOnly={readOnly} validateDurationVsShift={validateDurationVsShift} personnel={personnelNorm} attendanceMap={attendanceMap} />}
        {activeTab === 9 && (
          <TabDowntime
            downtime={downtime}
            setDowntime={setDowntime}
            footer={footer}
            setFooter={setFooter}
            pumps={pumps}
            setPumps={setPumps}
            isReadOnly={readOnly}
            handleDowntimeChange={handleDowntimeChange}
            handleDynamicListChange={handleDynamicListChange}
            addDynamicRecord={addDynamicRecord}
            removeDynamicRecord={removeDynamicRecord}
            handleVoiceInputMultiline={handleVoiceInputMultiline}
            handleVoiceInputDynamic={handleVoiceInputDynamic}
            shiftDuration={shiftInfo.shiftDuration}
          />
        )}

        {showNavButtons && (
          <div className="flex justify-between pt-6 border-t dark:border-gray-700 pb-20">
            <button
              type="button"
              onClick={() => setActiveTab(prev => Math.max(1, prev - 1))}
              disabled={activeTab === 1}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              <ArrowRight className="w-5 h-5" /> مرحله قبل
            </button>
            {activeTab === 9 ? (
              showSubmitButton && !readOnly && (
                <button
                  type="submit"
                  disabled={!isValid}
                  className={`px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold ${!isValid ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-red-800'}`}
                >
                  ثبت نهایی گزارش
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab(prev => Math.min(9, prev + 1))}
                className="px-8 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow transition flex items-center gap-2 font-bold"
              >
                مرحله بعد <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
