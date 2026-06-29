/**
 * تعطیلات رسمی شمسی (ایران) — لیست ثابت بدون وابستگی به پکیج Node-only.
 * فرمت تاریخ: YYYY/MM/DD (مثلاً 1403/01/01)
 */

/** تعطیلات ثابت رسمی ایران (ماه/روز + عنوان مناسبت) */
const FIXED_HOLIDAYS: { m: number; d: number; title: string }[] = [
  { m: 1, d: 1, title: 'نوروز' },
  { m: 1, d: 2, title: 'نوروز' },
  { m: 1, d: 3, title: 'نوروز' },
  { m: 1, d: 4, title: 'نوروز' },
  { m: 1, d: 12, title: 'روز جمهوری اسلامی' },
  { m: 1, d: 13, title: 'روز طبیعت' },
  { m: 3, d: 14, title: 'رحلت امام خمینی' },
  { m: 3, d: 15, title: 'قیام ۱۵ خرداد' },
  { m: 11, d: 22, title: 'پیروزی انقلاب اسلامی' },
  { m: 12, d: 29, title: 'ملی شدن صنعت نفت' },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** برای سال داده‌شده نقشه تاریخ → عنوان مناسبت (تعطیلات ثابت) */
function getFixedHolidaysMap(year: number): Map<string, string> {
  const map = new Map<string, string>();
  for (const { m, d, title } of FIXED_HOLIDAYS) {
    map.set(`${year}/${pad2(m)}/${pad2(d)}`, title);
  }
  return map;
}

export type HolidaysMap = Map<string, string>;

/**
 * نقشه تعطیلات رسمی برای یک سال شمسی: تاریخ (YYYY/MM/DD) → عنوان مناسبت.
 */
export async function getHolidaysMapForYear(year: number): Promise<Map<string, string>> {
  return getFixedHolidaysMap(year);
}

/**
 * @deprecated استفاده از getHolidaysMapForYear کنید.
 * مجموعه تاریخ‌های تعطیل برای یک سال (بدون عنوان).
 */
export async function getHolidaysSetForYear(year: number): Promise<Set<string>> {
  const map = await getHolidaysMapForYear(year);
  return new Set(map.keys());
}
