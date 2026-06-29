/**
 * عرض فیلد در طراحی فرم گزارش.
 * گرید ۲۴ ستونه؛ کوچکترین عرض = ۱/۸ (۳ ستون)، بزرگترین = ۱ (۲۴ ستون).
 * valueها برای سازگاری با دادهٔ قبلی حفظ شده‌اند.
 */
const WIDTH_TO_SPAN: Record<number, number> = {
  1: 6,   // 1/4
  2: 12,  // 1/2
  3: 18,  // 3/4
  4: 24,  // 1 (کامل) - بزرگترین
  5: 3,   // 1/8  - کوچکترین
  6: 4,   // 1/6
  7: 9,   // 3/8
  8: 15,  // 5/8
};

/** تعداد ستون (از ۲۴) که فیلد باید بگیرد. با استایل خطی استفاده شود تا همهٔ اندازه‌ها درست کار کنند. */
export function getFieldSpan(width: number | undefined, defaultWidth: number = 2): number {
  const w = width ?? defaultWidth;
  return WIDTH_TO_SPAN[w] ?? WIDTH_TO_SPAN[2];
}

/** استایل برای عرض فیلد در گرید ۲۴ ستونه (بدون وابستگی به کلاس تیلویند). */
export function getFieldSpanStyle(width: number | undefined, defaultWidth: number = 2): { gridColumn: string } {
  const span = getFieldSpan(width, defaultWidth);
  return { gridColumn: `span ${span} / span ${span}` };
}

/** ترتیب از کوچکترین (۱/۸) به بزرگترین (۱) */
export const FIELD_WIDTH_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '۱/۸' },
  { value: 6, label: '۱/۶' },
  { value: 1, label: '۱/۴' },
  { value: 7, label: '۳/۸' },
  { value: 2, label: '۱/۲' },
  { value: 8, label: '۵/۸' },
  { value: 3, label: '۳/۴' },
  { value: 4, label: '۱ (کامل)' },
];
