/**
 * محتوای فرم گزارش شیفت – عین همین فرم در منوی گزارش شیفت
 * قابل استفاده در ReportFormDesign برای پیش‌نمایش قالب و در ShiftHandover
 */
import React, { useState, useEffect, useRef } from 'react';
import { Clipboard, Trash2, UserCheck, CalendarOff, UserX, ChevronRight, ChevronLeft, Search, Users, Factory, Activity, Magnet, Layers, Droplet, Recycle, Clock3, ClipboardList, Settings, Settings2, Package, Database, Monitor, FlaskConical, Warehouse, Scale, ShieldCheck, HardHat, Wrench, AlertTriangle, BarChart3, FileText, Truck, Flame, Thermometer, Zap, Gauge, MapPin, Globe, Phone, Mail, Bell, Bookmark, Star, Heart, Flag, Tag, Key, Lock, Unlock, Home, Building2, Droplets, FileCheck, FolderOpen, BookOpen, Inbox, UserPlus, GraduationCap, Construction, Hammer, Cog, DoorOpen, PlugZap, BatteryCharging, Sun, Moon, Cloud, CloudRain, Wind, Umbrella, Snowflake, TreePine, Leaf, Pipette, TestTube2, Microscope, Stethoscope, HeartPulse, Cpu, Wifi, Radio, Car, Bike, Ship, Plane, Rocket, CircleDollarSign, Banknote, CreditCard, PieChart, TrendingUp, Target, Send, MessageSquare, ShieldAlert, Siren, Filter, RefreshCw, Download, Upload, Printer, Camera, Image as ImageIcon, Award, Trophy, GalleryVerticalEnd, AlignVerticalDistributeStart, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownLeft, Check, CheckCircle, CheckSquare, CheckCheck, BellDot, BellRing, Box, Fan, Drill, Fuel, Nut, Bolt, Cylinder, AirVent, RotateCw, Forklift, Cable, Boxes, Workflow, Radius, Pickaxe, Newspaper, Minimize, Mailbox, Layers2 } from 'lucide-react';
import { getShamsiDate, parseShamsiDate } from '../utils';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { ClockTimePicker } from './ClockTimePicker';
import { MatrixCellInput } from './MatrixCellInput';
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

const OmegaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 20h4.5a.5.5 0 0 0 .5-.5v-.282a.52.52 0 0 0-.247-.437 8 8 0 1 1 8.494-.001.52.52 0 0 0-.247.438v.282a.5.5 0 0 0 .5.5H21"/>
  </svg>
);

const shouldShowField = (field: CustomBoxField, formValue: Record<string, any>) => {
  const dep = field.validation?.dependsOn;
  if (!dep) return true;
  return String(formValue[dep.field] ?? '') === String(dep.equals ?? '');
};

const getMergedFormValue = (shiftInfo: { name?: string; type?: string; date?: string; shiftDuration?: string; supervisorName?: string }, customBoxValue: Record<string, any>) => ({
  shift_name: shiftInfo.name,
  shift_type: shiftInfo.type,
  report_date: shiftInfo.date,
  shift_duration: shiftInfo.shiftDuration,
  supervisor_name: shiftInfo.supervisorName,
  weekday: '',
  ...customBoxValue,
});

const getDayOfWeek = (dateStr: string) => {
  const date = parseShamsiDate(dateStr);
  if (!date) return '';
  const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  return days[date.getDay()];
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

type MatrixNumericOp = 'sum' | 'avg' | 'min' | 'max' | 'diff';
const MATRIX_OP_LABELS: Record<MatrixNumericOp, string> = { sum: 'جمع', avg: 'میانگین', min: 'حداقل', max: 'حداکثر', diff: 'تفاضل' };
const resolveTotalMustEqualValue = (formVal: Record<string, any>, key: string): number => {
  const raw = formVal[key];
  if (raw == null || String(raw).trim() === '') return 0;
  const str = String(raw);
  if (str.includes(':')) return parseTimeToMinutes(str);
  return toNumber(str);
};

const applyMatrixOp = (op: MatrixNumericOp, nums: number[]): number => {
  const valid = nums.filter(n => !Number.isNaN(n));
  if (valid.length === 0) return 0;
  if (op === 'sum') return valid.reduce((a, b) => a + b, 0);
  if (op === 'avg') return valid.reduce((a, b) => a + b, 0) / valid.length;
  if (op === 'min') return Math.min(...valid);
  if (op === 'max') return Math.max(...valid);
  if (op === 'diff') return Math.max(...valid) - Math.min(...valid);
  return 0;
};

const defaultFeedInfo = () => ({ lineA: {} as Record<string, FeedInput[]>, lineB: {} as Record<string, FeedInput[]> });
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

export interface CustomBoxField {
  id: string;
  key: string;
  label: string;
  type: string;
  tabId?: string;
  sectionId?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: any;
  readOnly?: boolean;
  required?: boolean;
  /** عرض: 1=۱/۴، 2=۱/۲، 3=۳/۴، 4=کامل */
  width?: 1 | 2 | 3 | 4;
  /** رنگ (hex) */
  color?: string;
  helpText?: string;
  validation?: { min?: number; max?: number; dependsOn?: { field: string; equals: any } };
  repeatableListConfig?: { placeholder?: string; minItems?: number; maxItems?: number };
  timePairConfig?: { workLabel?: string; stopLabel?: string; reasonLabel?: string; requireReasonWhenStop?: boolean };
  matrixConfig?: { rows: string[]; columns: string[]; defaultValue?: string; enforceNumeric?: boolean; rowAxisLabel?: string; columnAxisLabel?: string; numericOps?: ('sum' | 'avg' | 'min' | 'max' | 'diff')[]; cellSources?: Record<string, Record<string, { type: 'manual' } | { type: 'query'; table: string; op: 'count' | 'sum'; column?: string } | { type: 'custom_sql'; sql: string }>> };
}

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
  /** ستون‌های پویا در تب خوراک (۱،۲،۳... تا مجموع ۱۰۰٪) - فقط در طراحی فرم */
  dynamicFeedColumns?: boolean;
  /** باکس‌های سفارشی از ویرایشگر فرم (بعد از آخرین باکس، قبل از دکمه‌های مرحله قبل/بعد) */
  customBoxes?: CustomBoxField[];
  customBoxValue?: Record<string, any>;
  onCustomBoxChange?: (key: string, value: any) => void;
  /** همگام‌سازی تب فعال پیش‌نمایش (برای دکمه افزودن باکس) */
  onPreviewTabChange?: (tabIndex: number) => void;
  /** تب فعال از خارج (همگام با بخش تب فعال برای طراحی فیلدها) */
  controlledActiveTab?: number;
  /** نمایش/عدم نمایش ابزارهای تب ۱ (فقط در طراحی فرم) */
  visibleTools?: { shift?: boolean; shiftType?: boolean; shiftDuration?: boolean; date?: boolean; weekday?: boolean; supervisor?: boolean; attendance?: boolean };
  /** تب‌های طراحی (برای نمایش آیکون و رنگ در پیش‌نمایش). اگر بیش از ۹ تب باشد، تب‌های اضافی هم نمایش داده می‌شوند */
  designTabs?: Array<{ id: string; label: string; icon?: string; color?: string }>;
  /** محتوای تب‌های سفارشی (تب ۱۰ به بعد) - وقتی تب فراتر از ۹ انتخاب شود فراخوانی می‌شود */
  renderCustomTabContent?: (tabId: string) => React.ReactNode;
  /** همگام‌سازی کامل state برای ذخیره (استفاده در Runtime) */
  onFullStateChange?: (state: Record<string, any>) => void;
  /** کلیک روی فیلد در پیش‌نمایش (برای انتخاب فیلد در ویرایشگر طراحی فرم) */
  onFieldClick?: (fieldId: string) => void;
}

const DESIGN_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  clipboard: ClipboardList, clipboardcheck: Clipboard, file: FileText, filecheck: FileCheck, folder: FolderOpen,
  book: BookOpen, inbox: Inbox, layers: Layers, layers2: Layers2, tag: Tag, bookmark: Bookmark, users: Users, userplus: UserPlus,
  usercheck: UserCheck, userx: UserX, graduation: GraduationCap, factory: Factory, warehouse: Warehouse,
  construction: Construction, hardhat: HardHat, hammer: Hammer, wrench: Wrench, cog: Cog, gears: Settings, building: Building2,
  home: Home, door: DoorOpen, flame: Flame, thermometer: Thermometer, droplets: Droplets, zap: Zap,
  gauge: Gauge, plug: PlugZap, battery: BatteryCharging, sun: Sun, moon: Moon, cloud: Cloud,
  cloudrain: CloudRain, wind: Wind, umbrella: Umbrella, snowflake: Snowflake, tree: TreePine, leaf: Leaf,
  recycle: Recycle, flask: FlaskConical, pipette: Pipette, testtube: TestTube2, microscope: Microscope,
  stethoscope: Stethoscope, heartpulse: HeartPulse, activity: Activity, database: Database, monitor: Monitor,
  cpu: Cpu, wifi: Wifi, radio: Radio, truck: Truck, car: Car, bike: Bike, ship: Ship, plane: Plane, rocket: Rocket,
  dollar: CircleDollarSign, banknote: Banknote, creditcard: CreditCard, chart: BarChart3, piechart: PieChart,
  trending: TrendingUp, target: Target, phone: Phone, mail: Mail, letter: Mail, send: Send, message: MessageSquare,
  bell: Bell, belldot: BellDot, bellring: BellRing, shield: ShieldCheck, shieldalert: ShieldAlert, lock: Lock, unlock: Unlock, key: Key,
  alert: AlertTriangle, siren: Siren, search: Search, filter: Filter, refresh: RefreshCw, download: Download,
  upload: Upload, printer: Printer, camera: Camera, image: ImageIcon, clock: Clock3, settings: Settings2,
  package: Package, scale: Scale, mappin: MapPin, globe: Globe, star: Star, heart: Heart, flag: Flag,
  award: Award, trophy: Trophy, magnet: Magnet,
  arrowup: ArrowUp, arrowdown: ArrowDown, arrowleft: ArrowLeft, arrowright: ArrowRight, arrowupright: ArrowUpRight, arrowdownleft: ArrowDownLeft,
  chevronright: ChevronRight, chevronleft: ChevronLeft,
  check: Check, checkcircle: CheckCircle, checksquare: CheckSquare, checkcheck: CheckCheck, box: Box,
  fan: Fan, drill: Drill, fuel: Fuel, nut: Nut, bolt: Bolt, cylinder: Cylinder, airvent: AirVent, rotatecw: RotateCw,
  forklift: Forklift, cable: Cable, boxes: Boxes, workflow: Workflow, radius: Radius, pickaxe: Pickaxe,
  newspaper: Newspaper, minimize: Minimize, mailbox: Mailbox,
  galleryverticalend: GalleryVerticalEnd,
  alignverticaldistributestart: AlignVerticalDistributeStart,
  omega: OmegaIcon,
};

export const ShiftReportFormContent: React.FC<ShiftReportFormContentProps> = ({
  embed = false,
  readOnly = false,
  personnel = [],
  showNavButtons = true,
  showSubmitButton = false,
  onSubmit,
  onBack,
  initialValue,
  dynamicFeedColumns = false,
  customBoxes = [],
  customBoxValue = {},
  onCustomBoxChange,
  onPreviewTabChange,
  visibleTools = {},
  controlledActiveTab,
  designTabs,
  renderCustomTabContent,
  onFullStateChange,
  onFieldClick,
}) => {
  const show = (k: 'shift' | 'shiftType' | 'shiftDuration' | 'date' | 'weekday' | 'supervisor' | 'attendance') => visibleTools[k] !== false;
  const personnelNorm = personnel.map(p => ({ id: p.id, full_name: p.full_name ?? p.fullName ?? '' }));

  const [internalTab, setInternalTab] = useState(1);
  const activeTab = controlledActiveTab ?? internalTab;
  /** شناسه تب فعال؛ هنگام جابجایی تب‌ها در طراحی، محتوا بر اساس این شناسه نمایش داده می‌شود */
  const currentTabId = designTabs && designTabs.length >= 9 && designTabs[activeTab - 1]
    ? designTabs[activeTab - 1].id
    : `tab-${activeTab}`;
  const setActiveTab = (v: number) => {
    if (controlledActiveTab == null) setInternalTab(v);
    onPreviewTabChange?.(v);
  };
  useEffect(() => {
    if (controlledActiveTab != null) setInternalTab(controlledActiveTab);
  }, [controlledActiveTab]);
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
  const [attendanceSearch, setAttendanceSearch] = useState<{ present: string; leave: string; absent: string }>({ present: '', leave: '', absent: '' });
  const [customAttendanceSearch, setCustomAttendanceSearch] = useState<Record<string, { present: string; leave: string; absent: string }>>({});
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

  const customBoxValueRef = useRef(customBoxValue);
  customBoxValueRef.current = customBoxValue;
  useEffect(() => {
    if (!onFullStateChange) return;
    const builtin: Record<string, any> = {
      shiftInfo,
      attendanceMap,
      leaveTypes,
      production,
      feedInfo,
      feedLinesActive,
      ballMills,
      hydrocyclones,
      drumMagnets,
      concentrateFilters,
      thickeners,
      recoveryFilters,
      pumps,
      downtime,
      footer,
    };
    onFullStateChange({ ...customBoxValueRef.current, ...builtin });
  }, [onFullStateChange, shiftInfo, attendanceMap, leaveTypes, production, feedInfo, feedLinesActive, ballMills, hydrocyclones, drumMagnets, concentrateFilters, thickeners, recoveryFilters, pumps, downtime, footer]);

  const productionTimes = getProductionTimes(shiftInfo.type);

  const handleTonnageChange = (line: 'lineA' | 'lineB', time: string, val: string) => {
    if (readOnly) return;
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
  const ensureFeedSlots = (arr: FeedInput[] | undefined, minLen: number): FeedInput[] => {
    const out = [...(arr || [{ type: '', percent: 0 }])];
    while (out.length <= minLen) out.push({ type: '', percent: 0 });
    return out;
  };
  const handleFeedTypeChange = (line: 'lineA' | 'lineB', timeIdx: number, feedIdx: number, value: string) => {
    if (readOnly) return;
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
    if (readOnly) return;
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
    if (readOnly) return;
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
    if (readOnly) return;
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

  const checkTabValidity = (tabIdOrKey: number | string): boolean => {
    if (readOnly) return true;
    const isProductionTab = tabIdOrKey === 2 || tabIdOrKey === 'tab-2';
    if (isProductionTab) {
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
    return true;
  };

  return (
    <div className={embed ? '' : 'w-full max-w-full pb-24'}>
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
          {designTabs && designTabs.length >= 9
            ? designTabs.map((tab, idx) => {
                const tabNum = idx + 1;
                const fromMap = DESIGN_ICON_MAP[tab.icon || (tab.id === 'tab-4' ? '' : 'clipboard')];
                const IconComp = fromMap || (tab.id === 'tab-4' ? TABS[3].icon : ClipboardList);
                const isActive = activeTab === tabNum;
                const tabColor = (tab.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(tab.color)) ? tab.color : undefined;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tabNum)}
                    className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 min-w-[100px]
                      ${isActive && tabColor ? '' : isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'}`}
                    style={isActive && tabColor ? { borderBottomColor: tabColor, color: tabColor, backgroundColor: `${tabColor}15` } : undefined}
                  >
                    <IconComp className="w-5 h-5 shrink-0" /> {tab.label}
                  </button>
                );
              })
            : TABS.map(tab => (
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
        {currentTabId === 'tab-1' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                {show('shift') && (
                <div>
                  <label className="block text-xs font-bold mb-1">شیفت</label>
                  <select disabled={readOnly} value={shiftInfo.name} onChange={e => setShiftInfo({ ...shiftInfo, name: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm disabled:opacity-60">
                    {['A', 'B', 'C'].map(s => <option key={s} value={s}>شیفت {s}</option>)}
                  </select>
                </div>
                )}
                {show('shiftType') && (
                <div>
                  <label className="block text-xs font-bold mb-1">نوبت کاری</label>
                  <select disabled={readOnly} value={shiftInfo.type} onChange={e => setShiftInfo({ ...shiftInfo, type: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm disabled:opacity-60">
                    <option value="Day1">روز کار اول</option>
                    <option value="Day2">روز کار دوم</option>
                    <option value="Night1">شب کار اول</option>
                    <option value="Night2">شب کار دوم</option>
                  </select>
                </div>
                )}
                {show('shiftDuration') && (
                <div>
                  <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">مدت شیفت</label>
                  <ClockTimePicker value={shiftInfo.shiftDuration} onChange={t => !readOnly && setShiftInfo({ ...shiftInfo, shiftDuration: t })} />
                </div>
                )}
                {show('weekday') && (
                <div>
                  <label className="block text-xs font-bold mb-1">روز هفته</label>
                  <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm">{getDayOfWeek(shiftInfo.date)}</div>
                </div>
                )}
                {show('date') && (
                <div>
                  <label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">تاریخ</label>
                  <ShamsiDatePicker value={shiftInfo.date} onChange={d => !readOnly && setShiftInfo({ ...shiftInfo, date: d })} />
                </div>
                )}
                {show('supervisor') && (
                <div>
                  <label className="block text-xs font-bold mb-1">ثبت کننده گزارش</label>
                  <div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 truncate text-sm">{shiftInfo.supervisorName || '—'}</div>
                </div>
                )}
              </div>
            </div>

            {show('attendance') && (
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
                            {personnelNorm.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).slice(0, 10).map(p => (
                              <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => { handleAttendanceChange(p.id, 'PRESENT'); setAttendanceSearch(s => ({ ...s, present: '' })); }}>
                                {p.full_name}
                              </button>
                            ))}
                            {personnelNorm.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>
                            )}
                          </div>
                        )}
                      </div>
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
                            {personnelNorm.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).slice(0, 10).map(p => (
                              <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => { handleAttendanceChange(p.id, 'LEAVE'); setAttendanceSearch(s => ({ ...s, leave: '' })); }}>
                                {p.full_name}
                              </button>
                            ))}
                            {personnelNorm.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>
                            )}
                          </div>
                        )}
                      </div>
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
                            {personnelNorm.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).slice(0, 10).map(p => (
                              <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { handleAttendanceChange(p.id, 'ABSENT'); setAttendanceSearch(s => ({ ...s, absent: '' })); }}>
                                {p.full_name}
                              </button>
                            ))}
                            {personnelNorm.filter(p => !attendanceMap[p.id] && String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-400">موردی یافت نشد</div>
                            )}
                          </div>
                        )}
                      </div>
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
            )}
          </div>
        )}

        {currentTabId === 'tab-2' && (
          <TabProduction
            production={production}
            feedInfo={feedInfo}
            isReadOnly={readOnly}
            handleTonnageChange={handleTonnageChange}
            handleFeedTypeChange={handleFeedTypeChange}
            handleCustomFeedType={handleCustomFeedType}
            resetFeedType={resetFeedType}
            handleFeedPercentChange={handleFeedPercentChange}
            feedLinesActive={feedLinesActive}
            setFeedLinesActive={setFeedLinesActive}
            shiftType={shiftInfo.type}
            dynamicFeedColumns={dynamicFeedColumns}
          />
        )}
        {currentTabId === 'tab-3' && <TabMills ballMills={ballMills} setBallMills={setBallMills} isReadOnly={readOnly} handleAddBallCharge={handleAddBallCharge} handleRemoveBallCharge={handleRemoveBallCharge} />}
        {currentTabId === 'tab-4' && <TabHydrocyclones hydrocyclones={hydrocyclones} setHydrocyclones={setHydrocyclones} isReadOnly={readOnly} />}
        {currentTabId === 'tab-5' && <TabDrumMagnets drumMagnets={drumMagnets} setDrumMagnets={setDrumMagnets} isReadOnly={readOnly} handleVoiceInputMultiline={handleVoiceInputMultiline} />}
        {currentTabId === 'tab-6' && <TabConcentrateFilters concentrateFilters={concentrateFilters} setConcentrateFilters={setConcentrateFilters} isReadOnly={readOnly} validateDurationVsShift={validateDurationVsShift} personnel={personnelNorm} attendanceMap={attendanceMap} />}
        {currentTabId === 'tab-7' && <TabThickeners thickeners={thickeners} setThickeners={setThickeners} isReadOnly={readOnly} handleThickenerMetaChange={handleThickenerMetaChange} handleThickenerDataChange={handleThickenerDataChange} />}
        {currentTabId === 'tab-8' && <TabRecoveryFilters recoveryFilters={recoveryFilters} setRecoveryFilters={setRecoveryFilters} isReadOnly={readOnly} validateDurationVsShift={validateDurationVsShift} personnel={personnelNorm} attendanceMap={attendanceMap} />}
        {currentTabId === 'tab-9' && (
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

        {activeTab > 9 && designTabs?.[activeTab - 1] && (() => {
          const tabId = designTabs[activeTab - 1].id;
          const scoped = customBoxes.filter(f => (f.tabId || 'tab-1') === tabId);
          if (scoped.length > 0) return null;
          return (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[200px]" />
            </div>
          );
        })()}

        {customBoxes.length > 0 && (() => {
          const tabId = currentTabId;
          const scoped = customBoxes.filter(f => (f.tabId || 'tab-1') === tabId);
          if (scoped.length === 0) return null;
          const sectionOrder = Array.from(new Set(scoped.map(f => f.sectionId || '__default__')));
          return (
            <div className="space-y-6 mt-6">
              {sectionOrder.map(sectionId => {
                const sectionFields = scoped.filter(f => (f.sectionId || '__default__') === sectionId);
                const boxField = sectionFields.find(f => f.type === 'container');
                const boxColor = boxField?.color || '#6b7280';
                const headerStyle = sectionId !== '__default__' ? { borderColor: boxColor, color: boxColor, backgroundColor: `${boxColor}15` } : undefined;
                return (
                  <div key={sectionId} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    {sectionId !== '__default__' && (
                      <h3 className="font-bold text-lg mb-4 rounded-t-xl border-b-2 p-3" style={headerStyle}>{sectionId}</h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {sectionFields.filter(f => f.type !== 'container').filter(field => {
                        const formVal = getMergedFormValue(shiftInfo, customBoxValue);
                        return shouldShowField(field, formVal);
                      }).map(field => {
                        const storageKey = (field.key && String(field.key).trim()) ? field.key : (field.id || field.key);
                        const current = customBoxValue[storageKey] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
                        const setVal = (vOrFn: any) => onCustomBoxChange?.(storageKey, vOrFn);
                        const commonClass = 'w-full p-2.5 border rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary/20';
                        const disabled = readOnly || field.readOnly;
                        const w = field.width ?? 4;
                        const spanClass = w === 1 ? 'md:col-span-1' : w === 2 ? 'md:col-span-2' : w === 3 ? 'md:col-span-3' : 'md:col-span-4';
                        const inputWrapStyle = field.color ? { borderRight: `4px solid ${field.color}`, paddingRight: '0.5rem' } : undefined;
                        const clampNumber = (val: number | ''): number | '' => {
                          if (val === '') return val;
                          const n = Number(val);
                          if (Number.isNaN(n)) return '';
                          const min = field.validation?.min;
                          const max = field.validation?.max;
                          if (min != null && n < min) return min;
                          if (max != null && n > max) return max;
                          return n;
                        };
                        const fieldId = field.id || field.key;
                        return (
                          <div
                            key={fieldId}
                            className={`${spanClass} ${onFieldClick ? 'cursor-pointer rounded-lg -m-1 p-1 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors' : ''}`}
                            onClick={onFieldClick ? () => onFieldClick(fieldId) : undefined}
                          >
                            {field.label && field.label !== 'باکس جدید' && (
                              <label className="block text-xs font-bold text-gray-500 mb-1">
                                {field.label}{field.required ? <span className="text-red-500"> *</span> : ''}
                              </label>
                            )}
                            <div style={inputWrapStyle}>
                            {field.type === 'date' ? (
                              <ShamsiDatePicker value={String(current || '')} onChange={d => setVal(d)} />
                            ) : field.type === 'time' ? (
                              <ClockTimePicker value={String(current || '')} onChange={t => setVal(t)} />
                            ) : field.type === 'select' ? (
                              <select className={commonClass} value={current} onChange={e => setVal(e.target.value)} disabled={disabled}>
                                <option value="">انتخاب...</option>
                                {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <label className="inline-flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-700/60 border"><input type="checkbox" checked={!!current} onChange={e => setVal(e.target.checked)} disabled={disabled} /><span>فعال</span></label>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                className={`${commonClass} min-h-[90px]`}
                                value={current}
                                onChange={e => setVal(e.target.value)}
                                disabled={disabled}
                                placeholder={field.placeholder}
                              />
                            ) : field.type === 'repeatable_list' ? (
                              <div className="space-y-2 rounded-xl border p-2 bg-gray-50 dark:bg-gray-700/30">
                                {(Array.isArray(current) ? current : ['']).map((item: string, idx: number) => (
                                  <div key={`${field.key}-${idx}`} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                                    <input type="text" className={commonClass} placeholder={field.repeatableListConfig?.placeholder || 'متن آیتم...'} value={item || ''} onChange={e => { const next = [...(Array.isArray(current) ? current : [''])]; next[idx] = e.target.value; setVal(next); }} disabled={disabled} />
                                    {!disabled && <button type="button" className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100" onClick={() => { const base = Array.isArray(current) ? current : ['']; const next = base.filter((_: any, i: number) => i !== idx); setVal(next.length ? next : ['']); }}>حذف</button>}
                                  </div>
                                ))}
                                {!disabled && <button type="button" className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white" onClick={() => { const base = Array.isArray(current) ? current : ['']; const max = field.repeatableListConfig?.maxItems || 200; if (base.length >= max) return; setVal([...base, '']); }}>+ افزودن آیتم</button>}
                              </div>
                            ) : field.type === 'time_pair' ? (
                              <div className="rounded-xl border p-3 bg-gray-50 dark:bg-gray-700/30 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <ClockTimePicker label={field.timePairConfig?.workLabel || 'مدت کارکرد'} value={String((current as any)?.workTime || '')} onChange={workTime => setVal({ ...(current || {}), workTime })} />
                                  <ClockTimePicker label={field.timePairConfig?.stopLabel || 'مدت توقف'} value={String((current as any)?.stopTime || '')} onChange={stopTime => setVal({ ...(current || {}), stopTime })} />
                                </div>
                                {field.timePairConfig?.requireReasonWhenStop && parseTimeToMinutes(String((current as any)?.stopTime || '')) > 0 && (
                                  <textarea className={`${commonClass} min-h-[70px]`} placeholder={field.timePairConfig?.reasonLabel || 'علت توقف...'} value={String((current as any)?.reason || '')} onChange={e => setVal({ ...(current || {}), reason: e.target.value })} disabled={disabled} />
                                )}
                              </div>
                            ) : field.type === 'matrix' ? (
                              (() => {
                                const ops: MatrixNumericOp[] = (field.matrixConfig?.numericOps?.length ? field.matrixConfig.numericOps : (field.matrixConfig?.enforceNumeric ? ['sum'] : [])) as MatrixNumericOp[];
                                const rows = field.matrixConfig?.rows || [];
                                const cols = field.matrixConfig?.columns || [];
                                const cur = current as Record<string, Record<string, string>>;
                                return (
                              <div className="overflow-auto rounded-xl border bg-gray-50 dark:bg-gray-700/30 p-2 space-y-2">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr>
                                      <th className="p-2 text-right">{(field.matrixConfig?.rowAxisLabel || 'ردیف')} / {(field.matrixConfig?.columnAxisLabel || 'ستون')}</th>
                                      {cols.map(col => <th key={col} className="p-2 text-center">{col}</th>)}
                                      {ops.map(op => <th key={op} className="p-2 text-center text-blue-700">{MATRIX_OP_LABELS[op]} ردیف</th>)}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map(row => (
                                      <tr key={row} className="border-t">
                                        <td className="p-2 font-bold">{row}</td>
                                        {cols.map(col => (
                                          <td key={`${field.key || field.id}-${row}-${col}`} className="p-1">
                                            <MatrixCellInput row={row} col={col} field={field} current={cur} updateMatrix={setVal} readOnly={disabled} rows={rows} />
                                          </td>
                                        ))}
                                        {ops.map(op => (
                                          <td key={`${row}-${op}`} className="p-2 text-center font-bold text-blue-700">
                                            {applyMatrixOp(op, cols.map(col => toNumber(cur?.[row]?.[col])))}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                    {ops.map((op, oi) => (
                                      <tr key={`footer-${op}`} className="border-t bg-blue-50/70 dark:bg-blue-900/20">
                                        <td className="p-2 font-bold">{MATRIX_OP_LABELS[op]} ستون</td>
                                        {cols.map(col => (
                                          <td key={`${op}-${col}`} className="p-2 text-center font-bold text-blue-700">
                                            {applyMatrixOp(op, rows.map(row => toNumber(cur?.[row]?.[col])))}
                                          </td>
                                        ))}
                                        {ops.map((o, i) => (
                                          <td key={o} className="p-2 text-center font-extrabold text-blue-800">
                                            {i === oi ? applyMatrixOp(op, rows.flatMap(row => cols.map(col => toNumber(cur?.[row]?.[col])))) : ''}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {field.matrixConfig?.enforceNumeric && field.validation?.totalMustEqualField && (() => {
                                  const formVal = getMergedFormValue(shiftInfo, customBoxValue);
                                  const total = rows.reduce((acc, row) => acc + cols.reduce((rAcc, col) => rAcc + toNumber(cur?.[row]?.[col]), 0), 0);
                                  const expected = resolveTotalMustEqualValue(formVal, field.validation.totalMustEqualField);
                                  if (!expected) return <div className="text-xs text-gray-400 mt-2">برای کنترل مجموع ماتریس، ابتدا فیلد «{field.validation.totalMustEqualField}» را مقداردهی کنید.</div>;
                                  return total === expected ? (
                                    <div className="text-xs text-green-600 mt-2">جمع ماتریس با فیلد هدف برابر است.</div>
                                  ) : (
                                    <div className="text-xs text-red-600 mt-2">جمع ماتریس باید با فیلد هدف برابر باشد.</div>
                                  );
                                })()}
                              </div>
                                );
                              })()
                            ) : field.type === 'attendance' ? (
                              (() => {
                                const att = (current || {}) as { attendanceMap?: Record<string, string>; leaveTypes?: Record<string, string> };
                                const am = att.attendanceMap || {};
                                const lt = att.leaveTypes || {};
                                const fid = field.id || field.key || '';
                                const search = customAttendanceSearch[fid] || { present: '', leave: '', absent: '' };
                                const setSearch = (patch: Partial<{ present: string; leave: string; absent: string }>) =>
                                  setCustomAttendanceSearch(prev => ({ ...prev, [fid]: { ...(prev[fid] || search), ...patch } }));
                                const update = (nextMap: Record<string, string>, nextLeave: Record<string, string>) =>
                                  setVal({ attendanceMap: nextMap, leaveTypes: nextLeave });
                                const personnelNormList = personnelNorm.map(p => ({ id: p.id, full_name: p.full_name ?? p.fullName ?? '' }));
                                const available = personnelNormList.filter((p: { id: string }) => !am[p.id]);
                                const present = personnelNormList.filter((p: { id: string }) => am[p.id] === 'PRESENT');
                                const leave = personnelNormList.filter((p: { id: string }) => am[p.id] === 'LEAVE');
                                const absent = personnelNormList.filter((p: { id: string }) => am[p.id] === 'ABSENT');
                                const addPerson = (pid: string, status: 'PRESENT' | 'LEAVE' | 'ABSENT') => {
                                  const nextMap = { ...am, [pid]: status };
                                  const nextLeave = status === 'LEAVE' ? { ...lt, [pid]: (lt[pid] || 'HOURLY') } : lt;
                                  if (status !== 'LEAVE') { const nl = { ...nextLeave }; delete nl[pid]; update(nextMap, nl); } else update(nextMap, nextLeave);
                                  setSearch({ present: '', leave: '', absent: '' });
                                };
                                const removePerson = (pid: string) => {
                                  const nextMap = { ...am }; delete nextMap[pid];
                                  const nextLeave = { ...lt }; delete nextLeave[pid];
                                  update(nextMap, nextLeave);
                                };
                                const setLeaveType = (pid: string, val: string) => update(am, { ...lt, [pid]: val });
                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-2">
                                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-t-lg border-b-2 border-green-500 text-center text-xs font-bold text-green-700 dark:text-green-400">حاضرین</div>
                                      <div className="bg-green-50/50 dark:bg-green-900/10 p-2 rounded-b-lg border border-green-200 dark:border-green-800 min-h-[100px]">
                                        {!disabled && (
                                          <div className="relative mb-2">
                                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <input type="text" placeholder="" className="w-full pr-7 pl-2 py-1.5 text-xs border rounded bg-white dark:bg-gray-800" value={search.present} onChange={e => setSearch({ present: e.target.value })} />
                                            {search.present && (
                                              <div className="absolute top-full left-0 right-0 mt-1 max-h-28 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow z-10">
                                                {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(search.present.toLowerCase())).slice(0, 6).map((p: any) => (
                                                  <button key={p.id} type="button" className="w-full text-right px-2 py-1.5 text-xs hover:bg-green-50" onClick={() => addPerson(p.id, 'PRESENT')}>{p.full_name}</button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <div className="space-y-1">
                                          {present.map((p: any) => (
                                            <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-1.5 rounded border-r-4 border-green-500">
                                              <span className="text-xs">{p.full_name}</span>
                                              {!disabled && <button type="button" onClick={() => removePerson(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-t-lg border-b-2 border-orange-500 text-center text-xs font-bold text-orange-700 dark:text-orange-400">مرخصی</div>
                                      <div className="bg-orange-50/50 dark:bg-orange-900/10 p-2 rounded-b-lg border border-orange-200 dark:border-orange-800 min-h-[100px]">
                                        {!disabled && (
                                          <div className="relative mb-2">
                                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <input type="text" placeholder="" className="w-full pr-7 pl-2 py-1.5 text-xs border rounded bg-white dark:bg-gray-800" value={search.leave} onChange={e => setSearch({ leave: e.target.value })} />
                                            {search.leave && (
                                              <div className="absolute top-full left-0 right-0 mt-1 max-h-28 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow z-10">
                                                {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(search.leave.toLowerCase())).slice(0, 6).map((p: any) => (
                                                  <button key={p.id} type="button" className="w-full text-right px-2 py-1.5 text-xs hover:bg-orange-50" onClick={() => addPerson(p.id, 'LEAVE')}>{p.full_name}</button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <div className="space-y-1">
                                          {leave.map((p: any) => (
                                            <div key={p.id} className="bg-white dark:bg-gray-800 p-1.5 rounded border-r-4 border-orange-500">
                                              <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs">{p.full_name}</span>
                                                {!disabled && <button type="button" onClick={() => removePerson(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
                                              </div>
                                              {!disabled && (
                                                <div className="flex gap-1 text-[10px]">
                                                  <label className="flex items-center gap-0.5 cursor-pointer"><input type="radio" name={`leave-${fid}-${p.id}`} checked={(lt[p.id] || 'HOURLY') === 'HOURLY'} onChange={() => setLeaveType(p.id, 'HOURLY')} /> ساعتی</label>
                                                  <label className="flex items-center gap-0.5 cursor-pointer"><input type="radio" name={`leave-${fid}-${p.id}`} checked={(lt[p.id] || 'HOURLY') === 'DAILY'} onChange={() => setLeaveType(p.id, 'DAILY')} /> روزانه</label>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-t-lg border-b-2 border-red-500 text-center text-xs font-bold text-red-700 dark:text-red-400">غایبین</div>
                                      <div className="bg-red-50/50 dark:bg-red-900/10 p-2 rounded-b-lg border border-red-200 dark:border-red-800 min-h-[100px]">
                                        {!disabled && (
                                          <div className="relative mb-2">
                                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <input type="text" placeholder="" className="w-full pr-7 pl-2 py-1.5 text-xs border rounded bg-white dark:bg-gray-800" value={search.absent} onChange={e => setSearch({ absent: e.target.value })} />
                                            {search.absent && (
                                              <div className="absolute top-full left-0 right-0 mt-1 max-h-28 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow z-10">
                                                {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(search.absent.toLowerCase())).slice(0, 6).map((p: any) => (
                                                  <button key={p.id} type="button" className="w-full text-right px-2 py-1.5 text-xs hover:bg-red-50" onClick={() => addPerson(p.id, 'ABSENT')}>{p.full_name}</button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <div className="space-y-1">
                                          {absent.map((p: any) => (
                                            <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-1.5 rounded border-r-4 border-red-500">
                                              <span className="text-xs">{p.full_name}</span>
                                              {!disabled && <button type="button" onClick={() => removePerson(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                className={commonClass}
                                value={current}
                                onChange={e => setVal(field.type === 'number' ? clampNumber(e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                                disabled={disabled}
                                placeholder={field.placeholder}
                                min={field.type === 'number' ? field.validation?.min : undefined}
                                max={field.type === 'number' ? field.validation?.max : undefined}
                              />
                            )}
                            </div>
                            {field.helpText ? <p className="text-[11px] text-gray-400 mt-1">{field.helpText}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {showNavButtons && (() => {
          const maxTab = designTabs?.length ?? 9;
          return (
          <div className="flex justify-between pt-6 border-t dark:border-gray-700 pb-20">
            <button
              type="button"
              onClick={() => setActiveTab(prev => Math.max(1, prev - 1))}
              disabled={activeTab === 1}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              <ChevronRight className="w-5 h-5" /> مرحله قبل
            </button>
            {activeTab === maxTab ? (
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
                onClick={() => setActiveTab(prev => Math.min(maxTab, prev + 1))}
                disabled={!checkTabValidity(currentTabId)}
                className={`px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold ${!checkTabValidity(currentTabId) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                مرحله بعد <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>
          );
        })()}
      </form>
    </div>
  );
};
