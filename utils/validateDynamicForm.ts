import { parseShamsiDate } from './index';
import type { ReportFieldSchema } from '../services/reportDefinitions';

export const parseTimeToMinutes = (value: unknown): number => {
  const raw = String(value || '');
  if (!raw.includes(':')) return 0;
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const resolveTotalMustEqualValue = (formValue: Record<string, unknown>, key: string): number => {
  const raw = formValue[key] ?? (key === 'shift_duration' ? (formValue.shiftInfo as { shiftDuration?: string })?.shiftDuration : undefined);
  if (raw == null || String(raw).trim() === '') return 0;
  const str = String(raw);
  if (str.includes(':')) return parseTimeToMinutes(str);
  const n = Number(str);
  return Number.isNaN(n) ? 0 : n;
};

export function validateDynamicForm(fields: ReportFieldSchema[], formValue: Record<string, unknown>): boolean {
  for (const field of fields) {
    const value = formValue[field.key];
    const isEmptyBasic = value === undefined || value === null || String(value).trim() === '';
    const isEmptyRepeatable =
      field.type === 'repeatable_list' &&
      (!Array.isArray(value) || value.filter(v => String(v || '').trim()).length === 0);
    const isEmptyTimePair =
      field.type === 'time_pair' &&
      (!value || (!String((value as Record<string, unknown>).workTime || '').trim() && !String((value as Record<string, unknown>).stopTime || '').trim()));
    const isEmptyMatrix =
      field.type === 'matrix' &&
      (!value ||
        !Object.values(value as Record<string, unknown>).some(row =>
          row && Object.values(row as Record<string, unknown>).some(cell => String(cell || '').trim() !== '')
        ));
    const isEmptyAttendance =
      field.type === 'attendance' &&
      (!value ||
        !Object.values((value as { attendanceMap?: Record<string, unknown> }).attendanceMap || {}).some(
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
        alert(`الگوی عبارت منظم فیلد «${field.label}» معتبر نیست.`);
        return false;
      }
    }
    if (field.type === 'time_pair') {
      const pair = (value || {}) as Record<string, unknown>;
      const stopMinutes = parseTimeToMinutes(pair.stopTime);
      if (field.timePairConfig?.requireReasonWhenStop && stopMinutes > 0 && !String(pair.reason || '').trim()) {
        alert(`برای «${field.label}» با وجود توقف، درج علت توقف الزامی است.`);
        return false;
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
    if (field.type === 'matrix' && field.validation?.totalMustEqualField) {
      const matrix = (value || {}) as Record<string, Record<string, unknown>>;
      const expected = resolveTotalMustEqualValue(formValue, field.validation.totalMustEqualField);
      if (expected > 0) {
        const sum = Object.values(matrix).reduce<number>((acc, row) => {
          const rowSum = Object.values(row || {}).reduce<number>((rAcc, cell) => {
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
  return true;
}
