import type { ReportFormSchema, ReportFormRenderer } from '../../../services/reportDefinitions';
import { SHIFT_TABS_PRESET } from '../presets/shift/tabsPreset';

/** * تعیین موتور رندر:
 * - dynamic → DynamicFormRenderer (JSON عمومی، آیندهٔ همه گزارش‌ها)
 * - shift_preset → UI تخصصی شیفت (legacy؛ تا مهاجرت کامل به JSON)
 */
export function resolveFormRenderer(
  formSchema: ReportFormSchema | undefined,
  options?: { preferShiftForControlRoom?: boolean }
): ReportFormRenderer {
  if (formSchema?.renderer === 'dynamic') return 'dynamic';
  if (formSchema?.renderer === 'shift_preset') return 'shift_preset';

  const tabs = formSchema?.tabs ?? [];
  if (options?.preferShiftForControlRoom && tabs.length >= 9) return 'shift_preset';

  if (
    tabs.length >= 9 &&
    SHIFT_TABS_PRESET.length > 0 &&
    SHIFT_TABS_PRESET.every((pt) => tabs.some((t) => t.id === pt.id))
  ) {
    return 'shift_preset';
  }

  return 'dynamic';
}

export function isShiftPresetRenderer(formSchema: ReportFormSchema | undefined): boolean {
  return resolveFormRenderer(formSchema) === 'shift_preset';
}
