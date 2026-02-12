import React from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Award,
  Banknote,
  BarChart3,
  BatteryCharging,
  Bell,
  Bike,
  BookOpen,
  Bookmark,
  Building2,
  Calendar,
  Camera,
  Car,
  CircleDollarSign,
  Clipboard,
  ClipboardList,
  Clock3,
  Cloud,
  CloudRain,
  Cog,
  Construction,
  Cpu,
  CreditCard,
  Database,
  DoorOpen,
  Download,
  Droplets,
  Factory,
  FileCheck,
  FileText,
  Filter,
  Flag,
  Flame,
  FlaskConical,
  FolderOpen,
  Gauge,
  Globe,
  GraduationCap,
  Hammer,
  HardHat,
  Heart,
  HeartPulse,
  Home,
  Image as ImageIcon,
  Inbox,
  Key,
  Layers,
  Leaf,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Microscope,
  Monitor,
  Moon,
  Package,
  Phone,
  PieChart,
  Pipette,
  Plane,
  PlugZap,
  Printer,
  Radio,
  Recycle,
  RefreshCw,
  Rocket,
  Scale,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Siren,
  Snowflake,
  Star,
  Stethoscope,
  Sun,
  Tag,
  Target,
  TestTube2,
  Thermometer,
  TreePine,
  TrendingUp,
  Trophy,
  Trash2,
  Truck,
  Umbrella,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Warehouse,
  Wifi,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { ClockTimePicker } from './ClockTimePicker';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { ReportFieldSchema, ReportTabSchema, ReportFormGroup } from '../services/reportDefinitions';
import { getPersianDayName } from '../utils';

interface Props {
  fields: ReportFieldSchema[];
  tabs?: ReportTabSchema[];
  groups?: ReportFormGroup[];
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  readOnly?: boolean;
  personnel?: any[];
  /** تب فعال در پیش‌نمایش؛ اگر داده شود با این مقدار همگام می‌شود */
  activeTabId?: string;
}

const shouldShowField = (field: ReportFieldSchema, formValue: Record<string, any>) => {
  const dep = field.validation?.dependsOn;
  if (!dep) return true;
  return String(formValue[dep.field] ?? '') === String(dep.equals ?? '');
};

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr || !String(timeStr).includes(':')) return 0;
  const [h, m] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const LEGACY_TAB_COLORS: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  amber: '#d97706',
  purple: '#9333ea',
  gray: '#4b5563',
};

const iconByName: Record<string, React.ComponentType<{ className?: string }>> = {
  /* original */
  clipboard: ClipboardList,
  factory: Factory,
  settings: Settings2,
  clock: Clock3,
  users: Users,
  activity: Activity,
  package: Package,
  database: Database,
  monitor: Monitor,
  flask: FlaskConical,
  warehouse: Warehouse,
  scale: Scale,
  shield: ShieldCheck,
  hardhat: HardHat,
  wrench: Wrench,
  alert: AlertTriangle,
  layers: Layers,
  chart: BarChart3,
  file: FileText,
  /* extended */
  truck: Truck,
  flame: Flame,
  thermometer: Thermometer,
  droplets: Droplets,
  zap: Zap,
  gauge: Gauge,
  mappin: MapPin,
  globe: Globe,
  phone: Phone,
  mail: Mail,
  bell: Bell,
  bookmark: Bookmark,
  star: Star,
  heart: Heart,
  flag: Flag,
  tag: Tag,
  key: Key,
  lock: Lock,
  unlock: Unlock,
  search: Search,
  filter: Filter,
  refresh: RefreshCw,
  download: Download,
  upload: Upload,
  printer: Printer,
  camera: Camera,
  image: ImageIcon,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  cloudrain: CloudRain,
  wind: Wind,
  umbrella: Umbrella,
  building: Building2,
  home: Home,
  door: DoorOpen,
  dollar: CircleDollarSign,
  banknote: Banknote,
  creditcard: CreditCard,
  piechart: PieChart,
  trending: TrendingUp,
  target: Target,
  award: Award,
  trophy: Trophy,
  graduation: GraduationCap,
  book: BookOpen,
  clipboardcheck: Clipboard,
  filecheck: FileCheck,
  folder: FolderOpen,
  inbox: Inbox,
  send: Send,
  message: MessageSquare,
  userplus: UserPlus,
  usercheck: UserCheck,
  userx: UserX,
  shieldalert: ShieldAlert,
  siren: Siren,
  construction: Construction,
  hammer: Hammer,
  cog: Cog,
  cpu: Cpu,
  wifi: Wifi,
  radio: Radio,
  battery: BatteryCharging,
  plug: PlugZap,
  pipette: Pipette,
  testtube: TestTube2,
  microscope: Microscope,
  stethoscope: Stethoscope,
  heartpulse: HeartPulse,
  bike: Bike,
  car: Car,
  ship: Ship,
  plane: Plane,
  rocket: Rocket,
  tree: TreePine,
  leaf: Leaf,
  recycle: Recycle,
  snowflake: Snowflake,
};

const normalizeTabColor = (raw?: string) => {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return '#800020';
  if (LEGACY_TAB_COLORS[value]) return LEGACY_TAB_COLORS[value];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  return '#800020';
};

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveSectionTone = (name: string) => {
  const raw = String(name || '').toLowerCase();
  if (raw.includes('تولید') || raw.includes('عملکرد')) return 'border-blue-200 bg-blue-50/40 text-blue-800';
  if (raw.includes('توقف') || raw.includes('علت')) return 'border-amber-200 bg-amber-50/40 text-amber-800';
  if (raw.includes('اقدام') || raw.includes('تحویل')) return 'border-purple-200 bg-purple-50/40 text-purple-800';
  if (raw.includes('حضور') || raw.includes('پرسنل')) return 'border-green-200 bg-green-50/40 text-green-800';
  return 'border-gray-200 bg-gray-50/40 text-gray-700';
};

export const DynamicFormRenderer: React.FC<Props> = ({ fields, tabs = [], groups = [], value, onChange, readOnly = false, personnel = [], activeTabId: externalActiveTabId }) => {
  const setField = (key: string, val: any) => onChange({ ...value, [key]: val });
  const effectiveTabs = tabs.length
    ? tabs
    : [{ id: '__main__', label: 'عمومی', color: 'gray', icon: 'clipboard' as const }];
  const [activeTabId, setActiveTabId] = React.useState<string>(effectiveTabs[0]?.id || '__main__');
  const [attendanceSearch, setAttendanceSearch] = React.useState<{ present: string; leave: string; absent: string }>({ present: '', leave: '', absent: '' });
  React.useEffect(() => {
    if (!effectiveTabs.some(t => t.id === activeTabId)) {
      setActiveTabId(effectiveTabs[0]?.id || '__main__');
    }
  }, [activeTabId, effectiveTabs]);
  React.useEffect(() => {
    if (externalActiveTabId != null && effectiveTabs.some(t => t.id === externalActiveTabId)) {
      setActiveTabId(externalActiveTabId);
    }
  }, [externalActiveTabId, effectiveTabs]);

  const scopedFields = fields.filter(f => {
    const fTab = f.tabId || effectiveTabs[0]?.id || '__main__';
    return fTab === activeTabId;
  });
  const sectionOrder = Array.from(new Set(scopedFields.map(f => f.sectionId || '__default__')));
  const activeTab = effectiveTabs.find(t => t.id === activeTabId) || effectiveTabs[0];
  const activeColor = normalizeTabColor(activeTab?.color);
  const activeIndex = effectiveTabs.findIndex(t => t.id === activeTabId);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < effectiveTabs.length - 1;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto sticky top-0 z-10">
        <div className="flex min-w-max">
          {effectiveTabs.map(tab => {
            const active = tab.id === activeTabId;
            const Icon = iconByName[tab.icon || 'clipboard'] || ClipboardList;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 min-w-[120px]
                  ${active ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'}`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {sectionOrder.map(sectionId => {
        const sectionFields = scopedFields.filter(f => (f.sectionId || '__default__') === sectionId);
        const sectionTone = resolveSectionTone(sectionId === '__default__' ? 'عمومی' : sectionId);
        const hasGroups = sectionFields.some(f => f.groupId);
        const groupIdsInSection = Array.from(new Set(sectionFields.map(f => f.groupId).filter(Boolean))) as string[];
        const fieldsWithoutGroup = sectionFields.filter(f => !f.groupId);

        return (
          <div
            key={sectionId}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            {sectionId !== '__default__' && (
              <h3 className="font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">{sectionId}</h3>
            )}
            {hasGroups && groupIdsInSection.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {groupIdsInSection.map(gid => {
                    const group = groups.find(g => g.id === gid);
                    const span = group?.width === 3 ? 'md:col-span-3' : group?.width === 2 ? 'md:col-span-2' : 'md:col-span-1';
                    const groupFields = sectionFields.filter(f => f.groupId === gid);
                    const groupColor = group?.color || '#6b7280';
                    const colorLower = String(groupColor).toLowerCase();
                    const isGreen = colorLower.includes('green') || colorLower === '#22c55e' || colorLower === '#16a34a';
                    const isOrange = colorLower.includes('orange') || colorLower === '#f97316' || colorLower === '#d97706';
                    const isRed = colorLower.includes('red') || colorLower === '#ef4444' || colorLower === '#dc2626';
                    const headerCls = isGreen ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400' : isOrange ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-400' : isRed ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-500 text-gray-700 dark:text-gray-400';
                    const bodyCls = isGreen ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : isOrange ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : isRed ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700';
                    return (
                      <div key={gid} className={`flex flex-col gap-3 ${span}`}>
                        <div className={`p-3 rounded-t-xl border-b-2 flex items-center justify-center gap-2 ${headerCls}`}>
                          <h4 className="font-bold text-sm text-center">
                            {group?.title || gid}
                          </h4>
                        </div>
                        <div className={`flex-1 p-4 rounded-b-xl border min-h-[120px] ${bodyCls}`}>
                          <div className="grid grid-cols-1 gap-3">
                            {groupFields.map(field => {
                              if (!shouldShowField(field, value)) return null;
                              const current = value[field.key] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
                              const commonClass = 'w-full p-2.5 border rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition';
                              return (
                                <div key={field.id || field.key}>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">{field.label}{field.required ? <span className="text-red-500"> *</span> : ''}</label>
                                  {field.type === 'text' || field.type === 'number' ? (
                                    <input type={field.type} className={commonClass} value={current} onChange={e => setField(field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} disabled={readOnly || field.readOnly} placeholder={field.placeholder} />
                                  ) : field.type === 'select' ? (
                                    <select className={commonClass} value={current} onChange={e => setField(field.key, e.target.value)} disabled={readOnly || field.readOnly}>
                                      <option value="">انتخاب...</option>
                                      {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                  ) : field.type === 'date' ? (
                                    <ShamsiDatePicker value={String(current || '')} onChange={d => setField(field.key, d)} />
                                  ) : field.type === 'time' ? (
                                    <ClockTimePicker value={String(current || '')} onChange={t => setField(field.key, t)} />
                                  ) : field.type === 'textarea' ? (
                                    <textarea className={`${commonClass} min-h-[90px]`} value={current} onChange={e => setField(field.key, e.target.value)} disabled={readOnly || field.readOnly} placeholder={field.placeholder} />
                                  ) : field.type === 'checkbox' ? (
                                    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!current} onChange={e => setField(field.key, e.target.checked)} disabled={readOnly || field.readOnly} /><span>فعال</span></label>
                                  ) : (
                                    <input type="text" className={commonClass} value={current} onChange={e => setField(field.key, e.target.value)} disabled={readOnly || field.readOnly} placeholder={field.placeholder} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {fieldsWithoutGroup.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {fieldsWithoutGroup.map(field => {
                      if (!shouldShowField(field, value)) return null;
                      const current = value[field.key] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
                      const commonClass = 'w-full p-2.5 border rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition';
                      return (
                        <div key={field.id || field.key} className={field.width === 2 || field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">{field.label}{field.required ? <span className="text-red-500"> *</span> : ''}</label>
                          {field.type === 'textarea' ? (
                            <textarea className={`${commonClass} min-h-[90px]`} value={current} onChange={e => setField(field.key, e.target.value)} disabled={readOnly || field.readOnly} placeholder={field.placeholder} />
                          ) : field.type === 'select' ? (
                            <select className={commonClass} value={current} onChange={e => setField(field.key, e.target.value)} disabled={readOnly || field.readOnly}>
                              <option value="">انتخاب...</option>
                              {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          ) : field.type === 'date' ? (
                            <ShamsiDatePicker value={String(current || '')} onChange={d => setField(field.key, d)} />
                          ) : field.type === 'time' ? (
                            <ClockTimePicker value={String(current || '')} onChange={t => setField(field.key, t)} />
                          ) : field.type === 'checkbox' ? (
                            <label className="inline-flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-700/60 border"><input type="checkbox" checked={!!current} onChange={e => setField(field.key, e.target.checked)} disabled={readOnly || field.readOnly} /><span>فعال</span></label>
                          ) : (
                            <input type={field.type || 'text'} className={commonClass} value={current} onChange={e => setField(field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} disabled={readOnly || field.readOnly} placeholder={field.placeholder} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
            (() => {
              const isBasicInfoShift = sectionId === 'اطلاعات پایه' && activeTabId === 'tab-1';
              const orderedFields = isBasicInfoShift
                ? [...sectionFields].sort((a, b) => {
                    const order = ['shift_name', 'shift_type', 'shift_duration', 'weekday', 'report_date', 'supervisor_name'];
                    const ai = order.indexOf(a.key);
                    const bi = order.indexOf(b.key);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                  })
                : sectionFields;
              const gridCls = isBasicInfoShift
                ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end'
                : 'grid grid-cols-1 md:grid-cols-2 gap-4';
              const commonClass = 'w-full p-2.5 border rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition';
              const inputClass = isBasicInfoShift ? `${commonClass} h-11` : commonClass;
              return (
            <div className={gridCls}>
              {orderedFields.map(field => {
                if (!shouldShowField(field, value)) return null;
                const current = value[field.key] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
                const fieldClass = (field.type === 'select' || field.type === 'text') && isBasicInfoShift ? inputClass : commonClass;
                return (
                  <div key={field.id || field.key} className={field.width === 2 || field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    {field.type !== 'attendance' && (
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        {field.label}
                        {field.required ? <span className="text-red-500"> *</span> : ''}
                      </label>
                    )}
                    {field.type === 'textarea' ? (
                      <textarea
                        className={`${commonClass} min-h-[90px]`}
                        placeholder={field.placeholder || ''}
                        value={current}
                        onChange={e => setField(field.key, e.target.value)}
                        disabled={readOnly || field.readOnly}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        className={fieldClass}
                        value={current}
                        onChange={e => setField(field.key, e.target.value)}
                        disabled={readOnly || field.readOnly}
                      >
                        <option value="">انتخاب کنید...</option>
                        {(field.options || []).map(opt => (
                          <option key={`${field.key}-${opt.value}`} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="inline-flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600">
                        <input
                          type="checkbox"
                          checked={!!current}
                          onChange={e => setField(field.key, e.target.checked)}
                          disabled={readOnly || field.readOnly}
                        />
                        <span>فعال</span>
                      </label>
                    ) : field.type === 'date' ? (
                      <ShamsiDatePicker
                        value={String(current || '')}
                        onChange={date => {
                          const next = { ...value, [field.key]: date };
                          if ((field.key === 'report_date' || field.key === 'date') && date) {
                            const wn = getPersianDayName(String(date));
                            if (wn) next.weekday = wn;
                          }
                          onChange(next);
                        }}
                      />
                    ) : field.type === 'time' ? (
                      <ClockTimePicker
                        value={String(current || '')}
                        onChange={time => setField(field.key, time)}
                      />
                    ) : field.type === 'repeatable_list' ? (
                      <div className="space-y-2 rounded-xl border p-2 bg-gray-50 dark:bg-gray-700/30">
                        {(Array.isArray(current) ? current : ['']).map((item: string, idx: number) => (
                          <div key={`${field.key}-${idx}`} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                            <input
                              type="text"
                              className={commonClass}
                              placeholder={field.repeatableListConfig?.placeholder || 'متن آیتم...'}
                              value={item || ''}
                              onChange={e => {
                                const next = [...(Array.isArray(current) ? current : [''])];
                                next[idx] = e.target.value;
                                setField(field.key, next);
                              }}
                              disabled={readOnly}
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                                onClick={() => {
                                  const base = Array.isArray(current) ? current : [''];
                                  const next = base.filter((_: any, i: number) => i !== idx);
                                  setField(field.key, next.length ? next : ['']);
                                }}
                              >
                                حذف
                              </button>
                            )}
                          </div>
                        ))}
                        {!readOnly && (
                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white"
                            onClick={() => {
                              const base = Array.isArray(current) ? current : [''];
                              const max = field.repeatableListConfig?.maxItems || 200;
                              if (base.length >= max) return;
                              setField(field.key, [...base, '']);
                            }}
                          >
                            + افزودن آیتم
                          </button>
                        )}
                      </div>
                    ) : field.type === 'time_pair' ? (
                      <div className="rounded-xl border p-3 bg-gray-50 dark:bg-gray-700/30 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <ClockTimePicker
                            label={field.timePairConfig?.workLabel || 'مدت کارکرد'}
                            value={String(current?.workTime || '')}
                            onChange={workTime => setField(field.key, { ...(current || {}), workTime })}
                          />
                          <ClockTimePicker
                            label={field.timePairConfig?.stopLabel || 'مدت توقف'}
                            value={String(current?.stopTime || '')}
                            onChange={stopTime => setField(field.key, { ...(current || {}), stopTime })}
                          />
                        </div>
                        {field.timePairConfig?.requireReasonWhenStop && parseTimeToMinutes(String(current?.stopTime || '')) > 0 && (
                          <textarea
                            className={`${commonClass} min-h-[70px]`}
                            placeholder={field.timePairConfig?.reasonLabel || 'علت توقف...'}
                            value={String(current?.reason || '')}
                            onChange={e => setField(field.key, { ...(current || {}), reason: e.target.value })}
                            disabled={readOnly}
                          />
                        )}
                        {field.validation?.totalMustEqualField && (
                          <div className="text-xs">
                            {(() => {
                              const expected = parseTimeToMinutes(String(value[field.validation!.totalMustEqualField!] || ''));
                              const total =
                                parseTimeToMinutes(String(current?.workTime || '')) +
                                parseTimeToMinutes(String(current?.stopTime || ''));
                              if (!expected) return <span className="text-gray-400">برای کنترل مجموع، ابتدا فیلد مدت شیفت را مقداردهی کنید.</span>;
                              return total === expected ? (
                                <span className="text-green-600">مجموع کارکرد/توقف با مدت شیفت برابر است.</span>
                              ) : (
                                <span className="text-red-600">مجموع کارکرد/توقف باید با مدت شیفت برابر باشد.</span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : field.type === 'matrix' ? (
                      <div className="overflow-auto rounded-xl border bg-gray-50 dark:bg-gray-700/30 p-2 space-y-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="p-2 text-right">ردیف / ستون</th>
                              {(field.matrixConfig?.columns || []).map(col => (
                                <th key={`${field.key}-col-${col}`} className="p-2 text-center">
                                  {col}
                                </th>
                              ))}
                              {field.matrixConfig?.enforceNumeric && <th className="p-2 text-center">جمع ردیف</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {(field.matrixConfig?.rows || []).map(row => (
                              <tr key={`${field.key}-row-${row}`} className="border-t">
                                <td className="p-2 font-bold">{row}</td>
                                {(field.matrixConfig?.columns || []).map(col => (
                                  <td key={`${field.key}-${row}-${col}`} className="p-1">
                                    <input
                                      type="text"
                                      className="w-full p-1.5 border rounded bg-white dark:bg-gray-700"
                                      value={String(current?.[row]?.[col] ?? field.matrixConfig?.defaultValue ?? '')}
                                      onChange={e => {
                                        const matrix = { ...(current || {}) };
                                        matrix[row] = { ...(matrix[row] || {}), [col]: e.target.value };
                                        setField(field.key, matrix);
                                      }}
                                      disabled={readOnly}
                                    />
                                  </td>
                                ))}
                                {field.matrixConfig?.enforceNumeric && (
                                  <td className="p-2 text-center font-bold text-blue-700">
                                    {(field.matrixConfig?.columns || []).reduce((acc, col) => acc + toNumber(current?.[row]?.[col]), 0)}
                                  </td>
                                )}
                              </tr>
                            ))}
                            {field.matrixConfig?.enforceNumeric && (
                              <tr className="border-t bg-blue-50/70 dark:bg-blue-900/20">
                                <td className="p-2 font-bold">جمع ستون</td>
                                {(field.matrixConfig?.columns || []).map(col => (
                                  <td key={`${field.key}-sum-${col}`} className="p-2 text-center font-bold text-blue-700">
                                    {(field.matrixConfig?.rows || []).reduce((acc, row) => acc + toNumber(current?.[row]?.[col]), 0)}
                                  </td>
                                ))}
                                <td className="p-2 text-center font-extrabold text-blue-800">
                                  {(field.matrixConfig?.rows || []).reduce(
                                    (acc, row) =>
                                      acc +
                                      (field.matrixConfig?.columns || []).reduce(
                                        (rAcc, col) => rAcc + toNumber(current?.[row]?.[col]),
                                        0
                                      ),
                                    0
                                  )}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {field.matrixConfig?.enforceNumeric && field.validation?.totalMustEqualField && (
                          <div className="text-xs">
                            {(() => {
                              const total = (field.matrixConfig?.rows || []).reduce(
                                (acc, row) =>
                                  acc +
                                  (field.matrixConfig?.columns || []).reduce(
                                    (rAcc, col) => rAcc + toNumber(current?.[row]?.[col]),
                                    0
                                  ),
                                0
                              );
                              const expected = toNumber(value[field.validation!.totalMustEqualField!]);
                              if (!expected) {
                                return (
                                  <span className="text-gray-400">
                                    برای کنترل مجموع ماتریس، ابتدا فیلد «{field.validation!.totalMustEqualField}» را مقداردهی کنید.
                                  </span>
                                );
                              }
                              return total === expected ? (
                                <span className="text-green-600">جمع ماتریس با فیلد هدف برابر است.</span>
                              ) : (
                                <span className="text-red-600">جمع ماتریس باید با فیلد هدف برابر باشد.</span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : field.type === 'attendance' ? (
                      <>
                        {(!personnel || personnel.length === 0) ? (
                          <p className="text-[11px] text-gray-400">لیست پرسنل در دسترس نیست؛ این ابزار در Runtime گزارش شیفت فعال‌تر خواهد بود.</p>
                        ) : (
                          (() => {
                            const att = (current || {}) as { attendanceMap?: Record<string, string>; leaveTypes?: Record<string, string> };
                            const attendanceMap = att.attendanceMap || {};
                            const leaveTypes = att.leaveTypes || {};
                            const update = (nextMap: Record<string, string>, nextLeave: Record<string, string>) =>
                              setField(field.key, { attendanceMap: nextMap, leaveTypes: nextLeave });
                            const available = personnel.filter((p: any) => !attendanceMap[p.id]);
                            const present = personnel.filter((p: any) => attendanceMap[p.id] === 'PRESENT');
                            const leave = personnel.filter((p: any) => attendanceMap[p.id] === 'LEAVE');
                            const absent = personnel.filter((p: any) => attendanceMap[p.id] === 'ABSENT');
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* حاضرین */}
                                <div className="flex flex-col gap-3">
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-t-xl border-b-2 border-green-500 flex items-center justify-center gap-2">
                                    <Users className="w-4 h-4 text-green-700 dark:text-green-400" />
                                    <h4 className="font-bold text-green-700 dark:text-green-400 text-center text-xs">حاضرین</h4>
                                  </div>
                                  <div className="bg-green-50/50 dark:bg-green-900/10 p-3 rounded-b-xl border border-green-200 dark:border-green-800 min-h-[140px]">
                                    {!readOnly && (
                                      <div className="relative mb-3">
                                        <div className="relative">
                                          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                          <input
                                            type="text"
                                            placeholder=""
                                            className="w-full pr-8 pl-2 py-2 text-xs border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-green-500"
                                            value={attendanceSearch.present}
                                            onChange={e => setAttendanceSearch(s => ({ ...s, present: e.target.value }))}
                                          />
                                        </div>
                                        {attendanceSearch.present && (
                                          <div className="absolute top-full left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                                            {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).slice(0, 8).map((p: any) => (
                                              <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => { const nextLeave = { ...leaveTypes }; delete nextLeave[p.id]; update({ ...attendanceMap, [p.id]: 'PRESENT' }, nextLeave); setAttendanceSearch(s => ({ ...s, present: '' })); }}>
                                                {p.full_name}
                                              </button>
                                            ))}
                                            {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(attendanceSearch.present.toLowerCase())).length === 0 && (
                                              <div className="px-3 py-2 text-xs text-gray-400">موردی یافت نشد</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      {present.map((p: any) => (
                                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-green-500">
                                          <span className="text-xs font-medium">{p.full_name}</span>
                                          {!readOnly && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextMap = { ...attendanceMap };
                                                delete nextMap[p.id];
                                                const nextLeave = { ...leaveTypes };
                                                delete nextLeave[p.id];
                                                update(nextMap, nextLeave);
                                              }}
                                              className="text-gray-400 hover:text-red-500"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                {/* مرخصی */}
                                <div className="flex flex-col gap-3">
                                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-t-xl border-b-2 border-orange-500 flex items-center justify-center gap-2">
                                    <Calendar className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                                    <h4 className="font-bold text-orange-700 dark:text-orange-400 text-center text-xs">مرخصی</h4>
                                  </div>
                                  <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-b-xl border border-orange-200 dark:border-orange-800 min-h-[140px]">
                                    {!readOnly && (
                                      <div className="relative mb-3">
                                        <div className="relative">
                                          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                          <input
                                            type="text"
                                            placeholder=""
                                            className="w-full pr-8 pl-2 py-2 text-xs border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-orange-500"
                                            value={attendanceSearch.leave}
                                            onChange={e => setAttendanceSearch(s => ({ ...s, leave: e.target.value }))}
                                          />
                                        </div>
                                        {attendanceSearch.leave && (
                                          <div className="absolute top-full left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                                            {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).slice(0, 8).map((p: any) => (
                                              <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => { update({ ...attendanceMap, [p.id]: 'LEAVE' }, leaveTypes); setAttendanceSearch(s => ({ ...s, leave: '' })); }}>
                                                {p.full_name}
                                              </button>
                                            ))}
                                            {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(attendanceSearch.leave.toLowerCase())).length === 0 && (
                                              <div className="px-3 py-2 text-xs text-gray-400">موردی یافت نشد</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      {leave.map((p: any) => (
                                        <div key={p.id} className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-orange-500">
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">{p.full_name}</span>
                                            {!readOnly && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextMap = { ...attendanceMap };
                                                  delete nextMap[p.id];
                                                  const nextLeave = { ...leaveTypes };
                                                  delete nextLeave[p.id];
                                                  update(nextMap, nextLeave);
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                          {!readOnly && (
                                            <div className="flex gap-2 text-[10px] bg-orange-50 dark:bg-orange-900/10 p-1.5 rounded">
                                              <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                  type="radio"
                                                  name={`leave-${p.id}`}
                                                  checked={leaveTypes[p.id] === 'HOURLY'}
                                                  onChange={() => update(attendanceMap, { ...leaveTypes, [p.id]: 'HOURLY' })}
                                                />
                                                ساعتی
                                              </label>
                                              <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                  type="radio"
                                                  name={`leave-${p.id}`}
                                                  checked={leaveTypes[p.id] === 'DAILY'}
                                                  onChange={() => update(attendanceMap, { ...leaveTypes, [p.id]: 'DAILY' })}
                                                />
                                                روزانه
                                              </label>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                {/* غایبین */}
                                <div className="flex flex-col gap-3">
                                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-t-xl border-b-2 border-red-500 flex items-center justify-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
                                    <h4 className="font-bold text-red-700 dark:text-red-400 text-center text-xs">غایبین</h4>
                                  </div>
                                  <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-b-xl border border-red-200 dark:border-red-800 min-h-[140px]">
                                    {!readOnly && (
                                      <div className="relative mb-3">
                                        <div className="relative">
                                          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                          <input
                                            type="text"
                                            placeholder=""
                                            className="w-full pr-8 pl-2 py-2 text-xs border rounded bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-red-500"
                                            value={attendanceSearch.absent}
                                            onChange={e => setAttendanceSearch(s => ({ ...s, absent: e.target.value }))}
                                          />
                                        </div>
                                        {attendanceSearch.absent && (
                                          <div className="absolute top-full left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg z-10">
                                            {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).slice(0, 8).map((p: any) => (
                                              <button key={p.id} type="button" className="w-full text-right px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { const nextLeave = { ...leaveTypes }; delete nextLeave[p.id]; update({ ...attendanceMap, [p.id]: 'ABSENT' }, nextLeave); setAttendanceSearch(s => ({ ...s, absent: '' })); }}>
                                                {p.full_name}
                                              </button>
                                            ))}
                                            {available.filter((p: any) => String(p.full_name || '').toLowerCase().includes(attendanceSearch.absent.toLowerCase())).length === 0 && (
                                              <div className="px-3 py-2 text-xs text-gray-400">موردی یافت نشد</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      {absent.map((p: any) => (
                                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm border-r-4 border-red-500">
                                          <span className="text-xs font-medium">{p.full_name}</span>
                                          {!readOnly && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextMap = { ...attendanceMap };
                                                delete nextMap[p.id];
                                                update(nextMap, leaveTypes);
                                              }}
                                              className="text-gray-400 hover:text-red-500"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </>
                    ) : field.key === 'weekday' && field.readOnly ? (
                      <div className="w-full h-11 flex items-center justify-center px-4 py-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm">
                        {getPersianDayName(String(value.report_date || value.date || '')) || current || '-'}
                      </div>
                    ) : field.key === 'supervisor_name' && field.readOnly ? (
                      <div className="w-full h-11 flex items-center px-4 py-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 text-sm truncate">
                        {current || '-'}
                      </div>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        className={fieldClass}
                        placeholder={field.placeholder || ''}
                        value={current}
                        onChange={e => setField(field.key, field.type === 'number' ? e.target.value : e.target.value)}
                        disabled={readOnly || field.readOnly}
                      />
                    )}
                    {field.helpText ? <p className="text-[11px] text-gray-400 mt-1">{field.helpText}</p> : null}
                  </div>
                );
              })}
            </div>
            );
          })() )}
          </div>
        );
      })}

      {effectiveTabs.length > 1 && (
        <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700 pb-4">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => hasPrev && setActiveTabId(effectiveTabs[activeIndex - 1].id)}
            className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2 text-sm font-bold"
          >
            <ChevronRight className="w-5 h-5" /> مرحله قبل
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => hasNext && setActiveTabId(effectiveTabs[activeIndex + 1].id)}
            className={`px-8 py-3 rounded-xl shadow transition flex items-center gap-2 text-sm font-bold ${
              !hasNext ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            مرحله بعد <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DynamicFormRenderer;
