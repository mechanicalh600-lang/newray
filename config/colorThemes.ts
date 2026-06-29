export type ColorThemeId =
  | 'organizational'
  | 'ocean'
  | 'emerald'
  | 'sunset'
  | 'violet'
  | 'midnight'
  | 'rose'
  | 'teal';

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
  /** RGB triplet for Tailwind rgb(var / alpha) */
  primaryRgb: string;
  primaryHoverRgb: string;
  /** Lighter accent for dark mode text/highlights */
  primaryAccentRgb: string;
  /** Sidebar / header gradient stops */
  previewFrom: string;
  previewMid: string;
  previewTo: string;
  previewAccent: string;
}

export const DEFAULT_COLOR_THEME_ID: ColorThemeId = 'organizational';

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'organizational',
    name: 'سازمانی',
    description: 'رنگ رسمی سازمان — شرابی',
    primaryRgb: '128 0 32',
    primaryHoverRgb: '153 27 27',
    primaryAccentRgb: '251 113 133',
    previewFrom: '#800020',
    previewMid: '#c41e3a',
    previewTo: '#be123c',
    previewAccent: '#fecdd3',
  },
  {
    id: 'ocean',
    name: 'اقیانوس',
    description: 'آبی عمیق و آرام',
    primaryRgb: '3 105 161',
    primaryHoverRgb: '2 84 133',
    primaryAccentRgb: '56 189 248',
    previewFrom: '#0369a1',
    previewMid: '#0ea5e9',
    previewTo: '#0284c7',
    previewAccent: '#bae6fd',
  },
  {
    id: 'emerald',
    name: 'زمرد',
    description: 'سبز تازه و پرانرژی',
    primaryRgb: '5 150 105',
    primaryHoverRgb: '4 120 87',
    primaryAccentRgb: '52 211 153',
    previewFrom: '#059669',
    previewMid: '#34d399',
    previewTo: '#10b981',
    previewAccent: '#a7f3d0',
  },
  {
    id: 'sunset',
    name: 'غروب',
    description: 'نارنجی گرم و دوستانه',
    primaryRgb: '234 88 12',
    primaryHoverRgb: '194 65 12',
    primaryAccentRgb: '251 146 60',
    previewFrom: '#ea580c',
    previewMid: '#fb923c',
    previewTo: '#f97316',
    previewAccent: '#fed7aa',
  },
  {
    id: 'violet',
    name: 'بنفش',
    description: 'بنفش مدرن و خلاق',
    primaryRgb: '124 58 237',
    primaryHoverRgb: '109 40 217',
    primaryAccentRgb: '167 139 250',
    previewFrom: '#7c3aed',
    previewMid: '#a78bfa',
    previewTo: '#8b5cf6',
    previewAccent: '#ddd6fe',
  },
  {
    id: 'midnight',
    name: 'نیمه‌شب',
    description: 'سرمه‌ای با آبی درخشان',
    primaryRgb: '30 58 95',
    primaryHoverRgb: '23 45 74',
    primaryAccentRgb: '96 165 250',
    previewFrom: '#1e3a5f',
    previewMid: '#3b82f6',
    previewTo: '#2563eb',
    previewAccent: '#bfdbfe',
  },
  {
    id: 'rose',
    name: 'گل‌سرخ',
    description: 'صورتی جسور و زنده',
    primaryRgb: '225 29 72',
    primaryHoverRgb: '190 18 60',
    primaryAccentRgb: '251 113 133',
    previewFrom: '#e11d48',
    previewMid: '#fb7185',
    previewTo: '#f43f5e',
    previewAccent: '#fecdd3',
  },
  {
    id: 'teal',
    name: 'فیروزه‌ای',
    description: 'فیروزه‌ای شاد و متعادل',
    primaryRgb: '13 148 136',
    primaryHoverRgb: '15 118 110',
    primaryAccentRgb: '45 212 191',
    previewFrom: '#0d9488',
    previewMid: '#2dd4bf',
    previewTo: '#14b8a6',
    previewAccent: '#99f6e4',
  },
];

export function getColorTheme(id: string | null | undefined): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

export function colorThemeStorageKey(userId: string) {
  return `colorTheme_${userId}`;
}
