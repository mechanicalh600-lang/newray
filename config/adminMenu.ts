import { Wrench, Package, Users, Factory, ListChecks, FolderOpen, Database, Timer } from 'lucide-react';
import { TABLE_LABELS, EntityType } from '../pages/admin/adminConfig';

const mk = (key: EntityType, icon: typeof Users) => ({
  id: key,
  title: TABLE_LABELS[key],
  icon,
  path: `/admin/${key}`,
});

const adminSubmenu = [
  {
    id: 'admin-users',
    title: 'مدیریت کاربران',
    icon: FolderOpen,
    path: '#',
    submenu: [mk('user_groups', Users), mk('app_users', Users)],
  },
  {
    id: 'admin-org',
    title: 'مدیریت سازمان',
    icon: FolderOpen,
    path: '#',
    submenu: [
      mk('shifts', Factory),
      mk('shift_types', Factory),
      mk('personnel', Users),
      mk('org_chart', Factory),
      mk('locations', Factory),
      mk('evaluation_periods', Factory),
      mk('evaluation_criteria', Factory),
    ],
  },
  {
    id: 'admin-equipment',
    title: 'مدیریت تجهیزات',
    icon: FolderOpen,
    path: '#',
    submenu: [
      mk('equipment_classes', Wrench),
      mk('equipment_groups', Wrench),
      mk('equipment', Wrench),
      mk('equipment_local_names', Wrench),
      mk('equipment_tree', Wrench),
      mk('equipment_runtime_hours', Timer),
    ],
  },
  {
    id: 'admin-parts',
    title: 'مدیریت قطعات',
    icon: FolderOpen,
    path: '#',
    submenu: [
      mk('part_categories_main', Package),
      mk('part_categories_sub', Package),
      mk('part_categories_sub_sub', Package),
      mk('parts', Package),
      mk('measurement_units', Package),
    ],
  },
  {
    id: 'admin-workorders',
    title: 'مدیریت دستور کارها',
    icon: FolderOpen,
    path: '#',
    submenu: [
      mk('work_activity_types', ListChecks),
      mk('work_types', ListChecks),
      mk('work_order_priorities', ListChecks),
      mk('activity_cards', ListChecks),
      mk('checklist_items', ListChecks),
      mk('work_order_status', ListChecks),
      mk('maintenance_plans', ListChecks),
      mk('production_plans', ListChecks),
    ],
  },
];

export const BASE_INFO_MENU_ITEM = {
  id: 'base-info',
  title: 'مدیریت اطلاعات پایه',
  icon: Database,
  path: '#',
  role: 'ADMIN',
  submenu: adminSubmenu,
};
