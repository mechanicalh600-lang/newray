
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { FlaskConical, Info, Factory, Package, Trash2, Calendar, User as UserIcon, ChevronRight, ChevronLeft, Save, UserCheck, CalendarOff, UserX, Search, X } from 'lucide-react';
import { ShamsiDatePicker } from '../../components/ShamsiDatePicker';
import { DataPage } from '../../components/DataPage';
import { openReportTemplatePreview } from '../../utils/reportTemplateNavigation';
import { ensureDefaultReportTemplate } from '../../services/reportTemplates';
import { fetchNextTrackingCode, fetchMasterData } from '../../workflowStore';
import { supabase } from '../../supabaseClient';
import { AttendanceStatus, LeaveType } from '../../features/reports/presets/shift/ShiftHandoverTypes';
import { parseShamsiDate, getShiftRotation, getShamsiDate } from '../../utils';

const LAB_TABS = [
  { id: 1, label: 'اطلاعات گزارش', icon: Info },
  { id: 2, label: 'خوراک', icon: Factory },
  { id: 3, label: 'محصول ۱', icon: Package },
  { id: 4, label: 'محصول ۲', icon: Package },
  { id: 5, label: 'باطله', icon: Trash2 },
] as const;

const TIME_SLOTS_DAY = ['10:00', '15:00', '17:00'];
const TIME_SLOTS_NIGHT = ['22:00', '03:00', '05:00'];

export type LabShiftType = string;
/** روز/شب بر اساس مقدار نوبت کاری (از جدول shift_types) */
function shiftTypeToDayNight(t: string): 'DAY' | 'NIGHT' {
  if (!t) return 'DAY';
  return t.startsWith('Day') || t === 'Day1' || t === 'Day2' ? 'DAY' : 'NIGHT';
}

const QUALITY_PARAMS = ['Fe', 'FeO', 'S', 'K80', 'Moisture', 'Blaine'] as const;
const SECTIONS = ['feed', 'product1', 'product2', 'waste'] as const;
const TABLE_COL = 'w-[14.28%]';
const SECTION_LABELS: Record<string, string> = { feed: 'خوراک', product1: 'محصول ۱', product2: 'محصول ۲', waste: 'باطله' };

type ParamRow = Record<string, string>;
type SectionData = { lineA: { magnet: Record<string, ParamRow>; flotation: Record<string, ParamRow> }; lineB: { magnet: Record<string, ParamRow>; flotation: Record<string, ParamRow> } };
type QualityData = Record<string, SectionData>;

function buildEmptyParamRow(): ParamRow {
  return { Fe: '', FeO: '', S: '', K80: '', Moisture: '', Blaine: '' };
}

function buildEmptySectionData(timeSlots: string[]): SectionData {
  const fill = (slots: string[]) => {
    const o: Record<string, ParamRow> = {};
    slots.forEach(t => { o[t] = buildEmptyParamRow(); });
    return o;
  };
  return {
    lineA: { magnet: fill(timeSlots), flotation: fill(timeSlots) },
    lineB: { magnet: fill(timeSlots), flotation: fill(timeSlots) },
  };
}

function buildEmptyQualityData(shiftType: 'DAY' | 'NIGHT'): QualityData {
  const slots = shiftType === 'DAY' ? TIME_SLOTS_DAY : TIME_SLOTS_NIGHT;
  const data: QualityData = {} as QualityData;
  SECTIONS.forEach(sec => { data[sec] = buildEmptySectionData(slots); });
  return data;
}

function mergeQualityDataWithSlots(existing: QualityData, shiftType: 'DAY' | 'NIGHT'): QualityData {
  const slots = shiftType === 'DAY' ? TIME_SLOTS_DAY : TIME_SLOTS_NIGHT;
  const out: QualityData = {} as QualityData;
  SECTIONS.forEach(sec => {
    const prev = existing[sec];
    if (prev) {
      const ensureSlots = (m: Record<string, ParamRow>) => {
        const next: Record<string, ParamRow> = {};
        slots.forEach(t => { next[t] = { ...buildEmptyParamRow(), ...(m[t] || {}) }; });
        return next;
      };
      out[sec] = {
        lineA: { magnet: ensureSlots(prev.lineA?.magnet || {}), flotation: ensureSlots(prev.lineA?.flotation || {}) },
        lineB: { magnet: ensureSlots(prev.lineB?.magnet || {}), flotation: ensureSlots(prev.lineB?.flotation || {}) },
      };
    } else {
      out[sec] = buildEmptySectionData(slots);
    }
  });
  return out;
}

interface Props {
  user: User;
}

export const LabReport: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [activeTab, setActiveTab] = useState(1);

  const [reportDate, setReportDate] = useState(() => getShamsiDate());
  const [shift, setShift] = useState<string>('');
  const [shiftType, setShiftType] = useState<LabShiftType>('');
  const [qualityData, setQualityData] = useState<QualityData>(() => buildEmptyQualityData('DAY'));

  const [shiftsList, setShiftsList] = useState<{ code: string; name: string; sort_order?: number }[]>([]);
  const [shiftTypesList, setShiftTypesList] = useState<{ code: string; title: string; value: string; sort_order?: number }[]>([]);

  const [personnel, setPersonnel] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [leaveTypes, setLeaveTypes] = useState<Record<string, LeaveType>>({});
  const [attendanceSearch, setAttendanceSearch] = useState<{ present: string; leave: string; absent: string }>({ present: '', leave: '', absent: '' });

  const timeSlots = shiftTypeToDayNight(shiftType) === 'DAY' ? TIME_SLOTS_DAY : TIME_SLOTS_NIGHT;

  useEffect(() => {
    ensureDefaultReportTemplate('lab-report', 'قالب پیش فرض گزارش آزمایشگاه');
    fetchReports();
  }, []);

  useEffect(() => {
    const loadMaster = async () => {
      const [rShifts, rTypes] = await Promise.all([
        supabase.from('shifts').select('code, name, sort_order').order('sort_order', { ascending: true }),
        supabase.from('shift_types').select('code, title, value, sort_order').order('sort_order', { ascending: true }),
      ]);
      if (rShifts.data?.length) {
        setShiftsList(rShifts.data);
        setShift(s => s === '' ? rShifts.data![0].code : s);
      }
      if (rTypes.data?.length) {
        setShiftTypesList(rTypes.data);
        setShiftType(st => st === '' ? rTypes.data![0].value : st);
      }
    };
    loadMaster();
  }, []);

  useEffect(() => {
    fetchMasterData('personnel').then((data: any) => setPersonnel(data || []));
  }, []);

  useEffect(() => {
    let res = items;
    if (filterDate) res = res.filter(i => i.report_date === filterDate);
    if (filterCode) res = res.filter(i => (i.sample_code || '').includes(filterCode));
    setFilteredItems(res);
  }, [items, filterDate, filterCode]);

  useEffect(() => {
    setQualityData(prev => mergeQualityDataWithSlots(prev, shiftTypeToDayNight(shiftType)));
  }, [shiftType]);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lab_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const formatDateTime = (raw?: string) => {
    if (!raw) return '-';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    const time = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = dt.toLocaleDateString('fa-IR');
    return `${time} | ${date}`;
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('lab_reports').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <ShamsiDatePicker label="تاریخ" value={filterDate} onChange={setFilterDate} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">کد گزارش</label>
        <input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterCode} onChange={e => setFilterCode(e.target.value)} placeholder="LAB-..." />
      </div>
    </div>
  );

  const handleAttendanceChange = (personId: string, status: AttendanceStatus) => setAttendanceMap(prev => ({ ...prev, [personId]: status }));
  const handleRemoveAttendance = (personId: string) => setAttendanceMap(prev => { const next = { ...prev }; delete next[personId]; return next; });

  if (view === 'NEW') {
    const dayOfWeek = reportDate ? (() => {
      const date = parseShamsiDate(reportDate);
      if (!date) return '';
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      return days[date.getDay()];
    })() : '';

    const submitForm = async () => {
      if (!reportDate) {
        alert('تاریخ گزارش الزامی است.');
        return;
      }
      if (!shift || !shiftType) {
        alert('شیفت و نوبت کاری را از اطلاعات پایه انتخاب کنید.');
        return;
      }
      const tracking_code = await fetchNextTrackingCode('LAB-');
      const payload = {
        tracking_code,
        report_date: reportDate,
        shift: shiftTypeToDayNight(shiftType),
        sample_code: '',
        sample_location: '',
        operator_id: user.id || null,
        full_data: { ...qualityData, _shift: shift, _shiftType: shiftType, attendanceMap, leaveTypes },
      };
      const { error } = await supabase.from('lab_reports').insert([payload]);
      if (error) {
        alert(`خطا در ثبت: ${error.message}`);
        return;
      }
      alert('گزارش آزمایشگاه ثبت شد.');
      setReportDate('');
      setShiftType('DAY');
      setQualityData(buildEmptyQualityData('DAY'));
      setActiveTab(1);
      await fetchReports();
      setView('LIST');
    };

    const setSectionCell = (section: string, line: 'lineA' | 'lineB', sub: 'magnet' | 'flotation', time: string, param: string, value: string) => {
      setQualityData(prev => {
        const sec = prev[section];
        if (!sec) return prev;
        const next = { ...prev };
        next[section] = { ...sec };
        next[section][line] = { ...sec[line] };
        next[section][line][sub] = { ...sec[line][sub] };
        next[section][line][sub][time] = { ...(sec[line][sub][time] || buildEmptyParamRow()), [param]: value };
        return next;
      });
    };

    const renderQualityTab = (sectionKey: string) => {
      const section = qualityData[sectionKey];
      if (!section) return null;
      const title = SECTION_LABELS[sectionKey] || sectionKey;
      return (
        <div className="space-y-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">{title}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* خط A */}
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 overflow-hidden">
              <div className="bg-cyan-100 dark:bg-cyan-900/40 px-4 py-2 font-bold text-sm text-cyan-900 dark:text-cyan-100">خط A</div>
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">مغناطیس</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-600 table-fixed">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className={`p-2 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>ساعت</th>
                          {QUALITY_PARAMS.map(p => <th key={p} className={`p-1 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>{p}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map(time => (
                          <tr key={time} className="bg-white dark:bg-gray-800">
                            <td className={`p-2 border border-gray-200 dark:border-gray-600 font-medium text-center ${TABLE_COL}`}>{time}</td>
                            {QUALITY_PARAMS.map(param => (
                              <td key={param} className={`p-0.5 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>
                                <input type="number" step="any" inputMode="decimal" className="lab-report-number w-full min-w-0 px-1 py-0.5 text-center text-sm border-0 rounded bg-white dark:bg-gray-800" dir="ltr"
                                  value={section.lineA.magnet[time]?.[param] ?? ''}
                                  onChange={e => setSectionCell(sectionKey, 'lineA', 'magnet', time, param, e.target.value)} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">فلوتاسیون</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-600 table-fixed">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className={`p-2 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>ساعت</th>
                          {QUALITY_PARAMS.map(p => <th key={p} className={`p-1 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>{p}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map(time => (
                          <tr key={time} className="bg-white dark:bg-gray-800">
                            <td className={`p-2 border border-gray-200 dark:border-gray-600 font-medium text-center ${TABLE_COL}`}>{time}</td>
                            {QUALITY_PARAMS.map(param => (
                              <td key={param} className={`p-0.5 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>
                                <input type="number" step="any" inputMode="decimal" className="lab-report-number w-full min-w-0 px-1 py-0.5 text-center text-sm border-0 rounded bg-white dark:bg-gray-800" dir="ltr"
                                  value={section.lineA.flotation[time]?.[param] ?? ''}
                                  onChange={e => setSectionCell(sectionKey, 'lineA', 'flotation', time, param, e.target.value)} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            {/* خط B */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="bg-red-100 dark:bg-red-900/40 px-4 py-2 font-bold text-sm text-red-900 dark:text-red-100">خط B</div>
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">مغناطیس</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-600 table-fixed">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className={`p-2 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>ساعت</th>
                          {QUALITY_PARAMS.map(p => <th key={p} className={`p-1 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>{p}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map(time => (
                          <tr key={time} className="bg-white dark:bg-gray-800">
                            <td className={`p-2 border border-gray-200 dark:border-gray-600 font-medium text-center ${TABLE_COL}`}>{time}</td>
                            {QUALITY_PARAMS.map(param => (
                              <td key={param} className={`p-0.5 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>
                                <input type="number" step="any" inputMode="decimal" className="lab-report-number w-full min-w-0 px-1 py-0.5 text-center text-sm border-0 rounded bg-white dark:bg-gray-800" dir="ltr"
                                  value={section.lineB.magnet[time]?.[param] ?? ''}
                                  onChange={e => setSectionCell(sectionKey, 'lineB', 'magnet', time, param, e.target.value)} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">فلوتاسیون</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-600 table-fixed">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className={`p-2 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>ساعت</th>
                          {QUALITY_PARAMS.map(p => <th key={p} className={`p-1 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>{p}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map(time => (
                          <tr key={time} className="bg-white dark:bg-gray-800">
                            <td className={`p-2 border border-gray-200 dark:border-gray-600 font-medium text-center ${TABLE_COL}`}>{time}</td>
                            {QUALITY_PARAMS.map(param => (
                              <td key={param} className={`p-0.5 border border-gray-200 dark:border-gray-600 text-center ${TABLE_COL}`}>
                                <input type="number" step="any" inputMode="decimal" className="lab-report-number w-full min-w-0 px-1 py-0.5 text-center text-sm border-0 rounded bg-white dark:bg-gray-800" dir="ltr"
                                  value={section.lineB.flotation[time]?.[param] ?? ''}
                                  onChange={e => setSectionCell(sectionKey, 'lineB', 'flotation', time, param, e.target.value)} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="report-form w-full max-w-full h-full min-h-0 flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-between items-center flex-shrink-0 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-2xl font-bold">ثبت گزارش آزمایشگاه</h2>
          <button
            type="button"
            onClick={() => setView('LIST')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            aria-label="بستن فرم"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex min-w-max">
            {LAB_TABS.map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <tab.icon className="w-5 h-5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-1">
          <div className="py-4 space-y-4">
        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 min-w-0 min-h-[5rem]">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-2.5 rounded-full shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">روز هفته</label>
                  <span className="block p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm font-medium text-gray-800 dark:text-white">{dayOfWeek || '—'}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-w-0 min-h-[5rem] flex flex-col justify-center">
                <ShamsiDatePicker label="تاریخ گزارش" value={reportDate} onChange={setReportDate} />
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-w-0 min-h-[5rem] flex flex-col justify-center">
                <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">شیفت</label>
                <select className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 outline-none text-sm" value={shift} onChange={e => setShift(e.target.value)}>
                  {shiftsList.length === 0 && <option value="">در حال بارگذاری...</option>}
                  {shiftsList.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-w-0 min-h-[5rem] flex flex-col justify-center">
                <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">نوبت کاری</label>
                <select value={shiftType} onChange={e => setShiftType(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 outline-none text-sm">
                  {shiftTypesList.length === 0 && <option value="">در حال بارگذاری...</option>}
                  {shiftTypesList.map(st => (
                    <option key={st.code} value={st.value}>{st.title}</option>
                  ))}
                </select>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 min-w-0 min-h-[5rem]">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-full shrink-0">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">ثبت‌کننده گزارش</label>
                  <span className="block p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600 text-sm font-bold text-gray-800 dark:text-white truncate">{user?.fullName || 'ناشناس'}</span>
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
                    <div className="relative mb-3">
                      <div className="relative">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="جستجو..." className="w-full pr-8 pl-2 py-2 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-green-500" value={attendanceSearch.present} onChange={e => setAttendanceSearch(s => ({ ...s, present: e.target.value }))} />
                      </div>
                      {attendanceSearch.present && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                          {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).slice(0, 10).map(p => (
                            <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => { handleAttendanceChange(p.id, 'PRESENT'); setAttendanceSearch(s => ({ ...s, present: '' })); }}>{p.full_name}</button>
                          ))}
                          {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).length === 0 && <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {personnel.filter(p => attendanceMap[p.id] === 'PRESENT').map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-green-500">
                          <span className="text-sm font-medium">{p.full_name}</span>
                          <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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
                    <div className="relative mb-3">
                      <div className="relative">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="جستجو..." className="w-full pr-8 pl-2 py-2 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-orange-500" value={attendanceSearch.leave} onChange={e => setAttendanceSearch(s => ({ ...s, leave: e.target.value }))} />
                      </div>
                      {attendanceSearch.leave && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                          {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).slice(0, 10).map(p => (
                            <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => { handleAttendanceChange(p.id, 'LEAVE'); setAttendanceSearch(s => ({ ...s, leave: '' })); }}>{p.full_name}</button>
                          ))}
                          {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).length === 0 && <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {personnel.filter(p => attendanceMap[p.id] === 'LEAVE').map(p => (
                        <div key={p.id} className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-orange-500">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{p.full_name}</span>
                            <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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
                    <div className="relative mb-3">
                      <div className="relative">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="جستجو..." className="w-full pr-8 pl-2 py-2 text-sm border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-red-500" value={attendanceSearch.absent} onChange={e => setAttendanceSearch(s => ({ ...s, absent: e.target.value }))} />
                      </div>
                      {attendanceSearch.absent && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                          {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).slice(0, 10).map(p => (
                            <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { handleAttendanceChange(p.id, 'ABSENT'); setAttendanceSearch(s => ({ ...s, absent: '' })); }}>{p.full_name}</button>
                          ))}
                          {personnel.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).length === 0 && <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {personnel.filter(p => attendanceMap[p.id] === 'ABSENT').map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-red-500">
                          <span className="text-sm font-medium">{p.full_name}</span>
                          <button type="button" onClick={() => handleRemoveAttendance(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 2 && renderQualityTab('feed')}
        {activeTab === 3 && renderQualityTab('product1')}
        {activeTab === 4 && renderQualityTab('product2')}
        {activeTab === 5 && renderQualityTab('waste')}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between pt-4 pb-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button type="button" onClick={() => setActiveTab(prev => Math.max(1, prev - 1))} disabled={activeTab === 1} className="px-6 py-3 rounded-xl border hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2">
            <ChevronRight className="w-5 h-5" /> مرحله قبل
          </button>
          {activeTab === LAB_TABS.length ? (
            <button type="button" onClick={submitForm} className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition flex items-center gap-2 transform active:scale-95 font-bold text-lg">
              <Save className="w-6 h-6" /> ذخیره گزارش
            </button>
          ) : (
            <button type="button" onClick={() => setActiveTab(prev => Math.min(LAB_TABS.length, prev + 1))} className="px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold bg-blue-600 text-white hover:bg-blue-700">
              مرحله بعد <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <DataPage
      title="گزارشات آزمایشگاه"
      icon={FlaskConical}
      data={filteredItems}
      isLoading={loading}
      onAdd={() => { setView('NEW'); setReportDate(getShamsiDate()); const firstType = shiftTypesList[0]?.value ?? ''; setShift(shiftsList[0]?.code ?? ''); setShiftType(firstType); setQualityData(buildEmptyQualityData(shiftTypeToDayNight(firstType))); setAttendanceMap({}); setLeaveTypes({}); setAttendanceSearch({ present: '', leave: '', absent: '' }); setActiveTab(1); }}
      onReload={fetchReports}
      onDelete={handleDelete}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      filterContent={filterContent}
      onEdit={() => setView('NEW')}
      onViewDetails={() => alert('مشاهده جزئیات')}
      onPrint={(item) => openReportTemplatePreview(navigate, 'lab-report', item)}
      exportName="LabReports"
      columns={[
        { header: 'کد گزارش', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code}</span>, sortKey: 'tracking_code' },
        { header: 'تاریخ گزارش', accessor: (i: any) => i.report_date, sortKey: 'report_date' },
        { header: 'نوبت کاری', accessor: (i: any) => { const val = i.full_data?._shiftType; if (!val) return i.shift === 'DAY' ? 'روز' : i.shift === 'NIGHT' ? 'شب' : i.shift || '—'; const st = shiftTypesList.find(s => s.value === val); return st ? st.title : val; }, sortKey: 'shift' },
        { header: 'تاریخ ثبت', accessor: (i: any) => formatDateTime(i.created_at), sortKey: 'created_at' },
      ]}
    />
  );
};

export default LabReport;
