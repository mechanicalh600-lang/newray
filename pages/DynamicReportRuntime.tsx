import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import { deleteDynamicReportRecords, fetchDynamicReportRecords, saveDynamicReportRecord } from '../services/dynamicReports';
import { getReportDefinitionBySlug, ReportDefinition } from '../services/reportDefinitions';
import { fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { getShamsiDate, parseShamsiDate } from '../utils';
import { User } from '../types';

const parseTimeToMinutes = (value: unknown): number => {
  const raw = String(value || '');
  if (!raw.includes(':')) return 0;
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

interface Props {
  user?: User | null;
}

export const DynamicReportRuntime: React.FC<Props> = ({ user }) => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [definition, setDefinition] = useState<ReportDefinition | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<Record<string, any>>({});
  const [personnel, setPersonnel] = useState<any[]>([]);

  const loadAll = async () => {
    setLoading(true);
    const def = await getReportDefinitionBySlug(slug);
    setDefinition(def);
    if (def) {
      const rows = await fetchDynamicReportRecords(def.id);
      setRecords(rows);
    } else {
      setRecords([]);
    }
    setLoading(false);
  };

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
    const fromSchema = definition.list_schema?.columns || [];
    return fromSchema.map(c => ({
      header: c.label,
      accessor: (row: any) => row.payload?.[c.key] ?? row[c.key] ?? '-',
      sortKey: `payload.${c.key}`,
    }));
  }, [definition]);

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
        if (field.validation?.mustBeLessOrEqualField) {
          const target = Number(formValue[field.validation.mustBeLessOrEqualField]);
          if (!Number.isNaN(target) && num > target) {
            alert(`مقدار «${field.label}» نباید از «${field.validation.mustBeLessOrEqualField}» بیشتر باشد.`);
            return false;
          }
        }
      }
      if (field.validation?.regex && value) {
        const re = new RegExp(field.validation.regex);
        if (!re.test(String(value))) {
          alert(field.validation.regexMessage || `فرمت فیلد «${field.label}» معتبر نیست.`);
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
          const expected = Number(formValue[field.validation.totalMustEqualField]);
          if (!Number.isNaN(expected) && expected > 0) {
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
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
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
      <div className="max-w-5xl mx-auto pb-20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">{definition.title}</h1>
          </div>
          <button className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setMode('LIST')}>
            بازگشت
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <DynamicFormRenderer
            fields={definition.form_schema?.fields || []}
            tabs={definition.form_schema?.tabs || []}
            groups={definition.form_schema?.groups || []}
            value={formValue}
            onChange={setFormValue}
            personnel={personnel}
          />
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
      title={definition.title}
      icon={FileText}
      data={records}
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
      onPrint={item => openReportTemplatePreview(navigate, definition.slug, item)}
      exportName={definition.slug}
    />
  );
};

export default DynamicReportRuntime;
