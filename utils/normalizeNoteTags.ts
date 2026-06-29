/** tags یادداشت ممکن است jsonb باشد: []، {}، یا رشته */
export function normalizeNoteTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        return normalizeNoteTags(JSON.parse(s));
      } catch {
        return [s];
      }
    }
    return [s];
  }
  if (value && typeof value === 'object') {
    const vals = Object.values(value as Record<string, unknown>);
    if (vals.length === 0) return [];
    if (vals.every((v) => typeof v === 'string')) {
      return (vals as string[]).filter((t) => t.trim().length > 0);
    }
  }
  return [];
}
