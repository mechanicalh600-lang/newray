import {
  ColorThemeId,
  DEFAULT_COLOR_THEME_ID,
  getColorTheme,
  colorThemeStorageKey,
} from '../config/colorThemes';
import { getThemePatternUrl, getThemeSwatchBackground as buildSwatchBg } from '../config/themePatterns';

function parseTriplet(rgb: string) {
  const [r, g, b] = rgb.split(/\s+/).map(Number);
  return { r, g, b };
}

function toTriplet(r: number, g: number, b: number) {
  return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
}

function mixTriplet(a: string, b: string, t: number) {
  const A = parseTriplet(a);
  const B = parseTriplet(b);
  return toTriplet(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t
  );
}

function mixWhite(rgb: string, amount: number) {
  return mixTriplet('255 255 255', rgb, amount);
}

function mixBlack(rgb: string, amount: number) {
  return mixTriplet('0 0 0', rgb, amount);
}

export function applyColorTheme(themeId: string) {
  const theme = getColorTheme(themeId);
  const root = document.documentElement;
  root.dataset.colorTheme = theme.id;

  const mid = mixTriplet(theme.primaryRgb, theme.primaryAccentRgb, 0.42);

  root.style.setProperty('--color-primary-rgb', theme.primaryRgb);
  root.style.setProperty('--color-primary-hover-rgb', theme.primaryHoverRgb);
  root.style.setProperty('--color-primary-accent-rgb', theme.primaryAccentRgb);
  root.style.setProperty('--color-primary-mid-rgb', mid);

  /* هدر جداول / گزارشات — روشن */
  root.style.setProperty('--theme-header-l1-rgb', mixWhite(theme.primaryAccentRgb, 0.52));
  root.style.setProperty('--theme-header-l2-rgb', mixWhite(theme.primaryRgb, 0.38));
  root.style.setProperty('--theme-header-l3-rgb', mixWhite(mid, 0.32));

  /* هدر جداول — تاریک */
  root.style.setProperty('--theme-header-d1-rgb', mixBlack(theme.primaryRgb, 0.55));
  root.style.setProperty('--theme-header-d2-rgb', mixBlack(theme.primaryHoverRgb, 0.48));
  root.style.setProperty('--theme-header-d3-rgb', mixBlack(theme.primaryAccentRgb, 0.62));

  const pattern = getThemePatternUrl(theme.id);
  root.style.setProperty('--theme-pattern-header', pattern);
  root.style.setProperty('--theme-pattern-accent', pattern);
  root.style.setProperty('--theme-pattern-soft', pattern);
}

export function loadStoredColorTheme(userId?: string | null): ColorThemeId {
  if (typeof window === 'undefined') return DEFAULT_COLOR_THEME_ID;
  const key = userId ? colorThemeStorageKey(userId) : 'colorTheme';
  const stored = localStorage.getItem(key);
  return (stored as ColorThemeId) || DEFAULT_COLOR_THEME_ID;
}

export function saveColorTheme(userId: string, themeId: ColorThemeId) {
  localStorage.setItem(colorThemeStorageKey(userId), themeId);
  applyColorTheme(themeId);
}

export function preserveColorThemeKeys(): Record<string, string> {
  const saved: Record<string, string> = {};
  if (typeof window === 'undefined') return saved;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('colorTheme_')) {
      const val = localStorage.getItem(key);
      if (val) saved[key] = val;
    }
  }
  return saved;
}

export function restoreColorThemeKeys(saved: Record<string, string>) {
  Object.entries(saved).forEach(([key, val]) => localStorage.setItem(key, val));
}

/** پس‌زمینه دایره انتخاب تم — الگوی اختصاصی + گرادیان */
export function getThemeSwatchBackground(theme: {
  id: ColorThemeId;
  previewFrom: string;
  previewMid: string;
  previewTo: string;
  previewAccent: string;
}) {
  return buildSwatchBg(theme);
}
