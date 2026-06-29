import type { LucideIcon } from 'lucide-react';
import { MENU_ITEMS_CORE } from './menuItemsCore';

export interface QuickAccessItem {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  group?: string;
  adminOnly?: boolean;
}

export const DASHBOARD_QUICK_ACCESS_PAGE_KEY = 'dashboard_quick_links';

export const DEFAULT_QUICK_ACCESS_IDS = [
  'inbox',
  'messages',
  'workorders',
  'partrequest',
  'work-calendar',
  'pm-scheduler',
  'purchases',
  'shiftreport',
];

/** Flatten main menu into selectable quick-access links. */
export function flattenMenuForQuickAccess(isAdmin: boolean): QuickAccessItem[] {
  const items: QuickAccessItem[] = [];
  for (const m of MENU_ITEMS_CORE) {
    const menuAdminOnly = (m as { role?: string }).role === 'ADMIN';
    if (menuAdminOnly && !isAdmin) continue;

    if (m.submenu) {
      for (const s of m.submenu) {
        if (s.path && s.path !== '#') {
          items.push({
            id: s.id,
            title: s.title,
            path: s.path,
            icon: s.icon,
            group: m.title,
            adminOnly: menuAdminOnly,
          });
        }
      }
    } else if (m.path && m.path !== '/' && m.path !== '#') {
      items.push({
        id: m.id,
        title: m.title,
        path: m.path,
        icon: m.icon,
        adminOnly: menuAdminOnly,
      });
    }
  }
  return items;
}

export function resolveQuickAccessItems(
  ids: string[],
  isAdmin: boolean
): QuickAccessItem[] {
  const catalog = flattenMenuForQuickAccess(isAdmin);
  const byId = new Map(catalog.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as QuickAccessItem[];
}
