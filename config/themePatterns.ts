import type { ColorThemeId } from './colorThemes';

function svgDataUrl(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.trim())}")`;
}

/** هر تم — یک هندسه متمایز */
const PATTERN_BUILDERS: Record<ColorThemeId, () => string> = {
  /** شبکه لوزی با گل چهاربرگ */
  organizational: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <pattern id="a" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="none" stroke="#fff" stroke-width="0.65" opacity="0.22"/>
      <path d="M20 8 L32 20 L20 32 L8 20 Z" fill="none" stroke="#fff" stroke-width="0.45" opacity="0.14"/>
      <circle cx="20" cy="20" r="1.8" fill="#fff" opacity="0.18"/>
      <path d="M20 0 L20 40 M0 20 L40 20" stroke="#fff" stroke-width="0.35" opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="160" height="160" fill="url(#a)"/>
</svg>`,

  /** موج‌های Bézier */
  ocean: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
  <defs>
    <pattern id="b" width="200" height="50" patternUnits="userSpaceOnUse">
      <path d="M0 25 C40 8 60 42 100 25 S160 8 200 25" fill="none" stroke="#fff" stroke-width="1.1" opacity="0.28"/>
      <path d="M0 38 C35 52 65 22 100 38 S165 52 200 38" fill="none" stroke="#fff" stroke-width="0.85" opacity="0.16"/>
      <circle cx="45" cy="18" r="2.5" fill="#fff" opacity="0.12"/>
      <circle cx="130" cy="32" r="1.8" fill="#fff" opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="200" height="100" fill="url(#b)"/>
</svg>`,

  /** کندوی شش‌ضلعی */
  emerald: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="168" height="146" viewBox="0 0 168 146">
  <defs>
    <pattern id="c" width="56" height="97" patternUnits="userSpaceOnUse">
      <path d="M28 1 L52 14.5 L52 41.5 L28 55 L4 41.5 L4 14.5 Z" fill="none" stroke="#fff" stroke-width="0.7" opacity="0.2"/>
      <path d="M28 55 L52 68.5 L52 95.5 L28 109 L4 95.5 L4 68.5 Z" fill="none" stroke="#fff" stroke-width="0.55" opacity="0.14"/>
      <path d="M56 28 L80 41.5 L80 68.5 L56 82 L32 68.5 L32 41.5 Z" fill="none" stroke="#fff" stroke-width="0.55" opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="168" height="146" fill="url(#c)"/>
</svg>`,

  /** پرتوهای خورشید */
  sunset: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <pattern id="d" width="200" height="200" patternUnits="userSpaceOnUse">
      <g opacity="0.22" stroke="#fff" stroke-width="0.8" fill="none">
        <line x1="0" y1="200" x2="200" y2="0"/><line x1="0" y1="200" x2="160" y2="0"/>
        <line x1="0" y1="200" x2="120" y2="0"/><line x1="0" y1="200" x2="80" y2="0"/>
        <line x1="0" y1="200" x2="40" y2="0"/><line x1="0" y1="200" x2="0" y2="0"/>
        <line x1="0" y1="200" x2="200" y2="40"/><line x1="0" y1="200" x2="200" y2="80"/>
        <line x1="0" y1="200" x2="200" y2="120"/><line x1="0" y1="200" x2="200" y2="160"/>
      </g>
      <circle cx="0" cy="200" r="28" fill="#fff" opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="200" height="200" fill="url(#d)"/>
</svg>`,

  /** tessellation مثلثی */
  violet: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="104" viewBox="0 0 120 104">
  <defs>
    <pattern id="e" width="60" height="52" patternUnits="userSpaceOnUse">
      <path d="M0 52 L30 0 L60 52 Z" fill="none" stroke="#fff" stroke-width="0.65" opacity="0.2"/>
      <path d="M0 52 L30 104 L60 52 Z" fill="none" stroke="#fff" stroke-width="0.65" opacity="0.16"/>
      <path d="M30 0 L30 104" stroke="#fff" stroke-width="0.35" opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="120" height="104" fill="url(#e)"/>
</svg>`,

  /** صورت فلکی */
  midnight: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120" viewBox="0 0 180 120">
  <defs>
    <pattern id="f" width="180" height="120" patternUnits="userSpaceOnUse">
      <g stroke="#fff" stroke-width="0.55" opacity="0.2" fill="#fff">
        <line x1="22" y1="18" x2="48" y2="32"/><line x1="48" y1="32" x2="72" y2="14"/>
        <line x1="48" y1="32" x2="38" y2="58"/><line x1="72" y1="14" x2="98" y2="28"/>
        <line x1="98" y1="28" x2="128" y2="12"/><line x1="98" y1="28" x2="88" y2="52"/>
        <line x1="38" y1="58" x2="62" y2="78"/><line x1="88" y1="52" x2="62" y2="78"/>
        <line x1="88" y1="52" x2="118" y2="68"/><line x1="118" y1="68" x2="148" y2="48"/>
        <circle cx="22" cy="18" r="1.6" opacity="0.35"/><circle cx="48" cy="32" r="2" opacity="0.45"/>
        <circle cx="72" cy="14" r="1.4" opacity="0.3"/><circle cx="98" cy="28" r="1.8" opacity="0.4"/>
        <circle cx="128" cy="12" r="1.3" opacity="0.28"/><circle cx="38" cy="58" r="1.5" opacity="0.32"/>
        <circle cx="62" cy="78" r="2.2" opacity="0.42"/><circle cx="88" cy="52" r="1.6" opacity="0.35"/>
        <circle cx="118" cy="68" r="1.7" opacity="0.38"/><circle cx="148" cy="48" r="1.4" opacity="0.3"/>
      </g>
    </pattern>
  </defs>
  <rect width="180" height="120" fill="url(#f)"/>
</svg>`,

  /** دایره‌های هم‌مرکز */
  rose: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
  <defs>
    <pattern id="g" width="70" height="70" patternUnits="userSpaceOnUse">
      <circle cx="35" cy="35" r="28" fill="none" stroke="#fff" stroke-width="0.7" opacity="0.18"/>
      <circle cx="35" cy="35" r="18" fill="none" stroke="#fff" stroke-width="0.55" opacity="0.14"/>
      <circle cx="35" cy="35" r="8" fill="none" stroke="#fff" stroke-width="0.45" opacity="0.12"/>
      <circle cx="70" cy="35" r="28" fill="none" stroke="#fff" stroke-width="0.55" opacity="0.12"/>
      <circle cx="35" cy="70" r="28" fill="none" stroke="#fff" stroke-width="0.55" opacity="0.12"/>
    </pattern>
  </defs>
  <rect width="140" height="140" fill="url(#g)"/>
</svg>`,

  /** شبکه ایزومتریک */
  teal: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140">
  <defs>
    <pattern id="h" width="60" height="70" patternUnits="userSpaceOnUse">
      <path d="M30 0 L60 17.5 L60 52.5 L30 70 L0 52.5 L0 17.5 Z" fill="none" stroke="#fff" stroke-width="0.6" opacity="0.18"/>
      <path d="M30 70 L30 105 M0 52.5 L30 70 L60 52.5" fill="none" stroke="#fff" stroke-width="0.5" opacity="0.14"/>
      <path d="M60 17.5 L60 52.5 M30 0 L60 17.5" fill="none" stroke="#fff" stroke-width="0.45" opacity="0.12"/>
    </pattern>
  </defs>
  <rect width="120" height="140" fill="url(#h)"/>
</svg>`,
};

export function getThemePatternUrl(themeId: ColorThemeId): string {
  const build = PATTERN_BUILDERS[themeId] ?? PATTERN_BUILDERS.organizational;
  return svgDataUrl(build());
}

export function getThemeSwatchBackground(theme: {
  id: ColorThemeId;
  previewFrom: string;
  previewMid: string;
  previewTo: string;
  previewAccent: string;
}): string {
  const pattern = getThemePatternUrl(theme.id);
  return [
    pattern,
    `linear-gradient(145deg, ${theme.previewFrom} 0%, ${theme.previewMid} 45%, ${theme.previewTo} 80%, ${theme.previewAccent} 100%)`,
  ].join(', ');
}
