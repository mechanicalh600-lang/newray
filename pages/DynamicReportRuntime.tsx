import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import { ShiftReportFormContent } from '../components/ShiftReportFormContent';
import { SHIFT_TABS_PRESET } from './ReportFormDesign';
import { deleteDynamicReportRecords, fetchDynamicReportRecords, saveDynamicReportRecord } from '../services/dynamicReports';
import { getReportDefinitionBySlug, ReportDefinition } from '../services/reportDefinitions';
import { fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { getShamsiDate, parseShamsiDate } from '../utils';
import { User } from '../types';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';

/** ستون‌های مجاز در لیست گزارش اتاق کنترل - بقیه حذف می‌شوند */
const CONTROL_ROOM_LIST_KEYS = new Set(['report_date', 'shift_name', 'shift', 'supervisor_name']);

const parseTimeToMinutes = (value: unknown): number => {
  const raw = String(value || '');
  if (!raw.includes(':')) return 0;
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

/** مقدار عددی فیلد هدف از formValue برای برابری مجموع (از shiftInfo یا مستقیم؛ فرمت زمان یا عدد) */
const resolveTotalMustEqualValue = (formValue: Record<string, any>, key: string): number => {
  const raw = formValue[key] ?? (key === 'shift_duration' ? formValue.shiftInfo?.shiftDuration : undefined);
  if (raw == null || String(raw).trim() === '') return 0;
  const str = String(raw);
  if (str.includes(':')) return parseTimeToMinutes(str);
  const n = Number(str);
  return Number.isNaN(n) ? 0 : n;
};

interface Props {
  user?: User | null;
  slug?: string;
  /** تعریف از پیش بارگذاری‌شده (مثلاً از ReportRouteResolver) - برای حذف درخواست تکراری */
  initialDefinition?: ReportDefinition | null;
}

export const DynamicReportRuntime: React.FC<Props> = ({ user, slug: slugProp, initialDefinition }) => {
  const { slug: slugParam = '' } = useParams();
  const slug = slugProp ?? slugParam;
  const navigate = useNavigate();
  const [definition, setDefinition] = useState<ReportDefinition | null>(initialDefinition ?? null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<Record<string, any>>({});
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');

  const loadAll = async () => {
    setLoading(true);
    try {
      const def = initialDefinition ?? (await getReportDefinitionBySlug(slug));
      setDefinition(def);
      if (def) {
        const rows = await fetchDynamicReportRecords(def.id);
        setRecords(rows);
      } else {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialDefinition) setDefinition(initialDefinition);
  }, [initialDefinition?.id]);

  useEffect(() => {
    loadAll();
  }, [slug]);

  useEffect(() => {
    fetchMasterData('personnel')
      .then(list => setPersonnel(list || []))
      .catch(() => setPersonnel([]));
  }, []);

  // محاسبه خودکار روز هفته بر اساس تاریخ (گزارش شیفت)
  useEffect(() => {
    const dateValue = (formValue.report_date || formValue.date) as string | undefined;
    if (!dateValue) return;
    const date = parseShamsiDate(dateValue);
    if (!date) return;
    const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    const weekday = days[date.getDay()] || '';
    setFormValue(prev =>
      prev.weekday === weekday ? prev : { ...prev, weekday }
    );
  }, [formValue.report_date, formValue.date]);

  // مقداردهی خودکار سرپرست شیفت و تاریخ پیش‌فرض
  const buildInitialFormValue = (): Record<string, any> => {
    const base: Record<string, any> = {};
    if (definition) {
      const fields = definition.form_schema?.fields || [];
      if (user && fields.some(f => f.key === 'supervisor_name')) {
        base.supervisor_name = user.fullName;
      }
      if (fields.some(f => f.key === 'report_date')) {
        base.report_date = getShamsiDate();
      } else if (fields.some(f => f.key === 'date')) {
        base.date = getShamsiDate();
      }
    }
    return base;
  };

  const columns = useMemo(() => {
    if (!definition) return [];
    const isControlRoom = (definition.template_schema as any)?.modulePath === '/control-room';
    const codeCol = {
      header: 'کد گزارش',
      accessor: (row: any) => row.tracking_code ?? row.payload?.tracking_code ?? '-',
      sortKey: 'tracking_code',
    };
    const fromSchema = definition.list_schema?.columns || [];
    const filtered = fromSchema.filter(c => {
      if ((c.key || '').toLowerCase() === 'tracking_code') return false;
      if (isControlRoom && !CONTROL_ROOM_LIST_KEYS.has((c.key || '').trim())) return false;
      return true;
    });
    const schemaCols = filtered.map(c => ({
      header: c.label,
      accessor: (row: any) => row.payload?.[c.key] ?? row[c.key] ?? '-',
      sortKey: `payload.${c.key}`,
    }));
    return [codeCol, ...schemaCols];
  }, [definition]);

  const isControlRoom = (definition?.template_schema as any)?.modulePath === '/control-room';
  const displayTitle = isControlRoom ? 'گزارشات اتاق کنترل' : ((definition?.title || '').replace(/\s*-\s*فرم گزارش\s*$/i, '').trim() || definition?.title || '');

  const filteredRecords = useMemo(() => {
    if (!isControlRoom) return records;
    let res = records;
    const getDate = (r: any) => r.report_date ?? r.payload?.report_date ?? '';
    const getShift = (r: any) => r.payload?.shift_name ?? r.payload?.shift ?? '';
    if (filterFromDate) res = res.filter(r => getDate(r) >= filterFromDate);
    if (filterToDate) res = res.filter(r => getDate(r) <= filterToDate);
    if (filterShift !== 'ALL') res = res.filter(r => getShift(r) === filterShift);
    return res;
  }, [records, isControlRoom, filterFromDate, filterToDate, filterShift]);

  const controlRoomFilterContent = isControlRoom ? (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ShamsiDatePicker label="از تاریخ" value={filterFromDate} onChange={setFilterFromDate} />
      <ShamsiDatePicker label="تا تاریخ" value={filterToDate} onChange={setFilterToDate} />
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">شیفت</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="A">شیفت A</option>
          <option value="B">شیفت B</option>
          <option value="C">شیفت C</option>
        </select>
      </div>
    </div>
  ) : null;
  const formSchema = definition?.form_schema;
  const tabs = formSchema?.tabs || [];
  const fields = formSchema?.fields || [];
  const groups = formSchema?.groups || [];
  const useShiftStyle = definition != null && SHIFT_TABS_PRESET.length > 0 && tabs.length >= 9 && SHIFT_TABS_PRESET.every(pt => tabs.some(t => t.id === pt.id));

  const customBoxesForShift = useMemo(() => {
    if (!useShiftStyle || !fields.length) return [];
    const containerSectionIds = new Set(fields.filter((f: any) => f.type === 'container').map((f: any) => f.sectionId).filter(Boolean));
    return fields
      .filter((f: any) => f.type === 'container' || (f.sectionId && containerSectionIds.has(f.sectionId)))
      .map((f: any) => ({
        id: f.id,
        key: f.key,
        label: f.label,
        type: f.type,
        tabId: f.tabId,
        sectionId: f.sectionId ?? '',
        placeholder: f.placeholder,
        options: f.options,
        defaultValue: f.defaultValue,
        readOnly: f.readOnly,
        required: f.required,
        width: f.width,
        color: f.color,
        helpText: f.helpText,
        validation: f.validation,
        repeatableListConfig: f.repeatableListConfig,
        timePairConfig: f.timePairConfig,
        matrixConfig: f.matrixConfig,
      }));
  }, [useShiftStyle, fields]);

  const validateForm = () => {
    if (!definition) return false;
    const fields = definition.form_schema?.fields || [];
    for (const field of fields) {
      const value = formValue[field.key];
      const isEmptyBasic = value === undefined || value === null || String(value).trim() === '';
      const isEmptyRepeatable =
        field.type === 'repeatable_list' &&
        (!Array.isArray(value) || value.filter(v => String(v || '').trim()).length === 0);
      const isEmptyTimePair =
        field.type === 'time_pair' &&
        (!value || (!String(value.workTime || '').trim() && !String(value.stopTime || '').trim()));
      const isEmptyMatrix =
        field.type === 'matrix' &&
        (!value ||
          !Object.values(value as Record<string, any>).some(row =>
            row && Object.values(row as Record<string, any>).some(cell => String(cell || '').trim() !== '')
          ));
      const isEmptyAttendance =
        field.type === 'attendance' &&
        (!value ||
          !Object.values((value[field.key]?.attendanceMap || {}) as Record<string, any>).some(
            v => v === 'PRESENT' || v === 'LEAVE' || v === 'ABSENT'
          ));
      if (field.required && (isEmptyBasic || isEmptyRepeatable || isEmptyTimePair || isEmptyMatrix || isEmptyAttendance)) {
        alert(`فیلد «${field.label}» الزامی است.`);
        return false;
      }
      if (field.type === 'number' && value !== '' && value !== undefined) {
        const num = Number(value);
        if (Number.isNaN(num)) {
          alert(`فیلد «${field.label}» باید عدد باشد.`);
          return false;
        }
        if (field.validation?.min !== undefined && num < field.validation.min) {
          alert(`حداقل مقدار «${field.label}» برابر ${field.validation.min} است.`);
          return false;
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          alert(`حداکثر مقدار «${field.label}» برابر ${field.validation.max} است.`);
          return false;
        }
      }
      if ((field.type === 'date' || field.type === 'time') && field.validation?.mustBeLessOrEqualField && value) {
        const targetKey = field.validation.mustBeLessOrEqualField;
        const targetValue = formValue[targetKey];
        if (targetValue != null && String(targetValue).trim() !== '') {
          const targetField = fields.find(f => f.key === targetKey);
          const targetLabel = targetField?.label || targetKey;
          if (field.type === 'date') {
            const currentDate = parseShamsiDate(String(value));
            const targetDate = parseShamsiDate(String(targetValue));
            if (currentDate && targetDate && currentDate.getTime() > targetDate.getTime()) {
              alert(`تاریخ «${field.label}» نباید بعد از «${targetLabel}» باشد.`);
              return false;
            }
          } else if (field.type === 'time') {
            const currentMins = parseTimeToMinutes(value);
            const targetMins = parseTimeToMinutes(targetValue);
            if (currentMins > targetMins) {
              alert(`زمان «${field.label}» نباید بعد از «${targetLabel}» باشد.`);
              return false;
            }
          }
        }
      }
      if (field.validation?.regex && value) {
        try {
          const re = new RegExp(field.validation.regex);
          if (!re.test(String(value))) {
            alert(field.validation.regexMessage || `فرمت فیلد «${field.label}» معتبر نیست.`);
            return false;
          }
        } catch {
          alert(`الگوی عبارت منظم فیلد «${field.label}» معتبر نیست. لطفاً در طراحی فرم آن را اصلاح کنید.`);
          return false;
        }
      }
      if (field.type === 'time_pair') {
        const pair = (value || {}) as Record<string, any>;
        const stopMinutes = parseTimeToMinutes(pair.stopTime);
        if (field.timePairConfig?.requireReasonWhenStop && stopMinutes > 0 && !String(pair.reason || '').trim()) {
          alert(`برای «${field.label}» با وجود توقف، درج علت توقف الزامی است.`);
          return false;
        }
        if (field.validation?.totalMustEqualField) {
          const expectedMinutes = parseTimeToMinutes(formValue[field.validation.totalMustEqualField]);
          if (expectedMinutes > 0) {
            const workMinutes = parseTimeToMinutes(pair.workTime);
            const sum = workMinutes + stopMinutes;
            if (sum !== expectedMinutes) {
              alert(`در «${field.label}»، مجموع کارکرد و توقف باید با ${field.validation.totalMustEqualField} برابر باشد.`);
              return false;
            }
          }
        }
      }
      if (field.type === 'repeatable_list') {
        const rows = Array.isArray(value) ? value.map(v => String(v || '').trim()).filter(Boolean) : [];
        const minItems = field.repeatableListConfig?.minItems;
        const maxItems = field.repeatableListConfig?.maxItems;
        if (minItems !== undefined && rows.length < minItems) {
          alert(`تعداد آیتم‌های «${field.label}» باید حداقل ${minItems} باشد.`);
          return false;
        }
        if (maxItems !== undefined && rows.length > maxItems) {
          alert(`تعداد آیتم‌های «${field.label}» نباید بیشتر از ${maxItems} باشد.`);
          return false;
        }
      }
      if (field.type === 'matrix') {
        const matrix = (value || {}) as Record<string, Record<string, any>>;
        if (field.matrixConfig?.enforceNumeric) {
          for (const rowKey of Object.keys(matrix)) {
            for (const colKey of Object.keys(matrix[rowKey] || {})) {
              const cell = String(matrix[rowKey]?.[colKey] ?? '').trim();
              if (!cell) continue;
              if (Number.isNaN(Number(cell))) {
                alert(`در «${field.label}»، مقدار خانه ${rowKey} / ${colKey} باید عددی باشد.`);
                return false;
              }
            }
          }
        }
        if (field.validation?.totalMustEqualField) {
          const expected = resolveTotalMustEqualValue(formValue, field.validation.totalMustEqualField);
          if (expected > 0) {
            const sum = Object.values(matrix).reduce((acc, row) => {
              const rowSum = Object.values(row || {}).reduce((rAcc, cell) => {
                const n = Number(cell);
                return Number.isNaN(n) ? rAcc : rAcc + n;
              }, 0);
              return acc + rowSum;
            }, 0);
            if (sum !== expected) {
              alert(`در «${field.label}»، مجموع ماتریس باید با «${field.validation.totalMustEqualField}» برابر باشد.`);
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!definition) return;
    if (!validateForm()) return;
    const prefix = `${definition.slug.slice(0, 3).toUpperCase()}-`;
    const trackingCode = editingRecordId ? records.find(r => r.id === editingRecordId)?.tracking_code : await fetchNextTrackingCode(prefix);
    await saveDynamicReportRecord({
      id: editingRecordId || undefined,
      definition_id: definition.id,
      tracking_code: trackingCode || null,
      report_date: (formValue.report_date || formValue.date || null) as any,
      payload: formValue,
      payload_version: definition.published_version || definition.version || 1,
    });
    alert('رکورد گزارش ذخیره شد.');
    setMode('LIST');
    setEditingRecordId(null);
    setFormValue({});
    await loadAll();
  };

  const handleEdit = (item: any) => {
    setEditingRecordId(item.id);
    const payload = { ...(item.payload || {}) };
    if (user && definition?.form_schema?.fields?.some(f => f.key === 'supervisor_name')) {
      payload.supervisor_name = user.fullName;
    }
    setFormValue(payload);
    setMode('FORM');
  };

  const handleDelete = async (ids: string[]) => {
    if (!definition) return;
    await deleteDynamicReportRecords(definition.id, ids);
    setSelectedIds([]);
    await loadAll();
  };

  if (!definition) {
    if (loading) {
      return (
        <div className="w-full max-w-full py-16 text-center">
          <div className="animate-pulse text-gray-400">در حال بارگذاری...</div>
        </div>
      );
    }
    return (
      <div className="w-full max-w-full py-16 text-center">
        <h2 className="text-xl font-bold mb-3">فرم گزارش پیدا نشد</h2>
        <p className="text-gray-500 mb-4">ابتدا این گزارش را در «طراحی فرم گزارش» ایجاد/منتشر کنید.</p>
        <button className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200" onClick={() => navigate('/report-form-design')}>
          رفتن به طراحی فرم گزارش
        </button>
      </div>
    );
  }

  if (mode === 'FORM') {
    return (
      <div className={useShiftStyle ? 'w-full max-w-full pb-24' : 'w-full max-w-full pb-20 space-y-4'}>
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">{displayTitle}</h1>
          </div>
          <button className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setMode('LIST')}>
            بازگشت
          </button>
        </div>
        <div className={useShiftStyle ? '' : 'bg-white dark:bg-gray-800 rounded-xl border p-4'}>
          {useShiftStyle ? (
            <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <ShiftReportFormContent
                embed
                readOnly={false}
                personnel={personnel}
                showNavButtons={true}
                showSubmitButton={false}
                initialValue={(() => {
                  const v = formValue;
                  return {
                    ...v,
                    shiftInfo: {
                      name: v.shiftInfo?.name ?? 'A',
                      type: v.shiftInfo?.type ?? 'Day1',
                      date: v.shiftInfo?.date ?? v.report_date ?? getShamsiDate(),
                      shiftDuration: v.shiftInfo?.shiftDuration ?? v.shift_duration ?? '12:00',
                      supervisor: v.shiftInfo?.supervisor ?? '',
                      supervisorName: v.shiftInfo?.supervisorName ?? v.supervisor_name ?? user?.fullName ?? '',
                    },
                  };
                })()}
                dynamicFeedColumns={true}
                customBoxes={customBoxesForShift}
                customBoxValue={formValue}
                onCustomBoxChange={(key, val) => setFormValue(prev => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }))}
                onFullStateChange={setFormValue}
                designTabs={tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon, color: t.color }))}
                visibleTools={{ shift: true, shiftType: true, shiftDuration: true, date: true, weekday: true, supervisor: true, attendance: true }}
              />
            </div>
          ) : (
            <DynamicFormRenderer
              fields={fields}
              tabs={tabs}
              groups={groups}
              value={formValue}
              onChange={setFormValue}
              personnel={personnel}
            />
          )}
          <div className="pt-4 mt-4 border-t flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg bg-primary text-white" onClick={handleSave}>
              ذخیره رکورد
            </button>
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setMode('LIST')}>
              انصراف
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataPage
      title={displayTitle}
      icon={FileText}
      data={filteredRecords}
      columns={columns}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      isLoading={loading}
      onAdd={() => {
        setEditingRecordId(null);
        setFormValue(buildInitialFormValue());
        setMode('FORM');
      }}
      onReload={loadAll}
      onEdit={handleEdit}
      onViewDetails={handleEdit}
      onDelete={handleDelete}
      onPrint={item => openReportTemplatePreview(navigate, (definition.template_schema as any)?.modulePath?.replace(/^\/+/, '') || definition.slug, item)}
      exportName={definition.slug}
      filterContent={controlRoomFilterContent}
    />
  );
};

export default DynamicReportRuntime;
