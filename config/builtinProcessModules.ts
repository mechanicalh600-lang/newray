/** فرآیندهای پیش‌فرض — منبع seed برای process_modules */

export interface BuiltinProcessModuleSeed {

  slug: string;

  module_key: string;

  title: string;

  icon: string;

  entity_table: string;

  entity_status_field: string;

  form_route: string;

  sort_order: number;

  /** فیلدهای قابل استفاده در شرط‌های گردش کار */

  condition_fields?: { key: string; label: string }[];

}



export const BUILTIN_PROCESS_MODULES: BuiltinProcessModuleSeed[] = [

  {

    slug: 'work-order',

    module_key: 'WORK_ORDER',

    title: 'دستور کار',

    icon: 'wrench',

    entity_table: 'work_orders',

    entity_status_field: 'status',

    form_route: '/work-orders',

    sort_order: 1,

    condition_fields: [

      { key: 'work_type', label: 'نوع کار' },

      { key: 'priority', label: 'اولویت' },

      { key: 'equipment_name', label: 'نام تجهیز' },

    ],

  },

  {

    slug: 'part-request',

    module_key: 'PART_REQUEST',

    title: 'درخواست قطعه',

    icon: 'package',

    entity_table: 'part_requests',

    entity_status_field: 'status',

    form_route: '/part-requests',

    sort_order: 2,

    condition_fields: [

      { key: 'status', label: 'وضعیت' },

      { key: 'urgency', label: 'فوریت' },

    ],

  },

  {

    slug: 'purchase',

    module_key: 'PURCHASE',

    title: 'درخواست خرید',

    icon: 'shoppingcart',

    entity_table: 'purchase_requests',

    entity_status_field: 'status',

    form_route: '/purchases',

    sort_order: 3,

  },

  {

    slug: 'project',

    module_key: 'PROJECT',

    title: 'پروژه‌ها',

    icon: 'briefcase',

    entity_table: 'projects',

    entity_status_field: 'status',

    form_route: '/projects',

    sort_order: 4,

  },

  {

    slug: 'suggestion',

    module_key: 'SUGGESTION',

    title: 'پیشنهادات فنی',

    icon: 'lightbulb',

    entity_table: 'technical_suggestions',

    entity_status_field: 'status',

    form_route: '/suggestions',

    sort_order: 5,

    condition_fields: [{ key: 'category', label: 'دسته پیشنهاد' }],

  },

  {

    slug: 'meeting',

    module_key: 'MEETING',

    title: 'صورتجلسات',

    icon: 'filesignature',

    entity_table: 'meeting_minutes',

    entity_status_field: 'status',

    form_route: '/meetings',

    sort_order: 6,

  },

  {

    slug: 'tech-doc',

    module_key: 'TECH_DOC',

    title: 'اسناد فنی',

    icon: 'filetext',

    entity_table: 'technical_documents',

    entity_status_field: 'status',

    form_route: '/documents',

    sort_order: 7,

    condition_fields: [{ key: 'type', label: 'نوع سند' }],

  },

  {

    slug: 'performance',

    module_key: 'PERFORMANCE',

    title: 'امتیاز عملکرد',

    icon: 'award',

    entity_table: 'performance_evaluations',

    entity_status_field: 'status',

    form_route: '/performance',

    sort_order: 8,

  },

  {

    slug: 'mission',

    module_key: 'MISSION',

    title: 'مأموریت',

    icon: 'map-pin',

    entity_table: 'personnel_missions',

    entity_status_field: 'status',

    form_route: '/missions',

    sort_order: 9,

  },

  {

    slug: 'factory-exit',

    module_key: 'FACTORY_EXIT',

    title: 'خروج کالا از کارخانه',

    icon: 'truck',

    entity_table: 'factory_goods_exits',

    entity_status_field: 'status',

    form_route: '/factory-exit',

    sort_order: 10,

  },

  {

    slug: 'pm-plan',

    module_key: 'PM_PLAN',

    title: 'برنامه PM',

    icon: 'timer',

    entity_table: 'pm_plans',

    entity_status_field: 'is_active',

    form_route: '/pm-scheduler',

    sort_order: 11,

  },

  {

    slug: 'service-repair',

    module_key: 'SERVICE_REPAIR',

    title: 'خدمات / تعمیرات',

    icon: 'wrench',

    entity_table: 'service_repair_requests',

    entity_status_field: 'status',

    form_route: '/service-repair',

    sort_order: 12,

  },

  {

    slug: 'permit',

    module_key: 'PERMIT',

    title: 'مجوز کار (PTW)',

    icon: 'hardhat',

    entity_table: 'work_permits',

    entity_status_field: 'status',

    form_route: '/permits',

    sort_order: 13,

  },

  {

    slug: 'training-course',

    module_key: 'TRAINING_COURSE',

    title: 'دوره آموزشی',

    icon: 'bookopen',

    entity_table: 'training_courses',

    entity_status_field: 'title',

    form_route: '/training-courses',

    sort_order: 14,

  },

  {

    slug: 'personnel-skill',

    module_key: 'PERSONNEL_SKILL',

    title: 'مهارت پرسنل',

    icon: 'graduationcap',

    entity_table: 'personnel_skills',

    entity_status_field: 'level',

    form_route: '/training',

    sort_order: 15,

  },

];



export const getBuiltinProcessByModuleKey = (moduleKey: string) =>

  BUILTIN_PROCESS_MODULES.find(p => p.module_key === moduleKey);



export const getBuiltinProcessBySlug = (slug: string) =>

  BUILTIN_PROCESS_MODULES.find(p => p.slug === slug);


