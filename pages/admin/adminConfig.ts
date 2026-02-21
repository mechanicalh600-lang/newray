
// لیست جداول مطابق با ساختار دیتابیس
export type EntityType = 
  | 'shifts'
  | 'shift_types'
  | 'user_groups' 
  | 'personnel' 
  | 'org_chart'
  | 'app_users' 
  | 'locations' 
  | 'equipment_classes' 
  | 'equipment_groups' 
  | 'equipment' 
  | 'equipment_local_names' 
  | 'evaluation_periods' 
  | 'evaluation_criteria' 
  | 'measurement_units' 
  | 'equipment_tree' 
  | 'part_categories_main'
  | 'part_categories_sub'
  | 'part_categories_sub_sub'
  | 'parts' 
  | 'work_activity_types'
  | 'work_types'
  | 'work_order_priorities'
  | 'activity_cards' 
  | 'checklist_items' 
  | 'maintenance_plans'
  | 'production_plans'
  | 'work_order_status';

// ترتیب نمایش تب‌ها
export const ORDERED_TABS: EntityType[] = [
  'shifts',
  'shift_types',
  'user_groups',
  'personnel',
  'org_chart',
  'app_users',
  'locations',
  'equipment_classes',
  'equipment_groups',
  'equipment',
  'equipment_local_names',
  'production_plans',
  'evaluation_periods',
  'evaluation_criteria',
  'measurement_units',
  'equipment_tree',
  'part_categories_main',
  'part_categories_sub',
  'part_categories_sub_sub',
  'parts',
  'work_activity_types',
  'work_types',
  'work_order_priorities',
  'activity_cards',
  'checklist_items',
  'maintenance_plans',
  'work_order_status'
];

export const TABLE_LABELS: Record<EntityType, string> = {
  shifts: 'شیفت',
  shift_types: 'نوبت کاری',
  user_groups: 'گروه‌های کاربری',
  personnel: 'پرسنل',
  org_chart: 'چارت سازمانی',
  app_users: 'کاربران سیستم',
  locations: 'محل استقرار',
  equipment_classes: 'کلاس تجهیزات',
  equipment_groups: 'گروه تجهیزات',
  equipment: 'تجهیزات',
  equipment_local_names: 'نام محلی تجهیزات',
  evaluation_periods: 'دوره‌های ارزیابی',
  evaluation_criteria: 'شاخص‌های ارزیابی',
  measurement_units: 'واحدهای اندازه‌گیری',
  equipment_tree: 'درخت تجهیزات',
  part_categories_main: 'گروه اصلی قطعات',
  part_categories_sub: 'گروه فرعی قطعات',
  part_categories_sub_sub: 'گروه فرعیِ فرعی قطعات',
  parts: 'قطعات',
  work_activity_types: 'نوع فعالیت',
  work_types: 'نوع کار',
  work_order_priorities: 'اولویت انجام',
  activity_cards: 'کارت فعالیت‌ها',
  checklist_items: 'آیتم‌های چک‌لیست',
  maintenance_plans: 'پلن‌های نت',
  production_plans: 'برنامه و بودجه تولید',
  work_order_status: 'وضعیت دستور کار'
};

// لیست فیلدهای اجباری برای نمایش ستاره قرمز
export const MANDATORY_FIELDS: string[] = [
    'personnel_code', 'full_name', 'username', 'name', 'title', 'code', 
    'local_name', 'class_id', 'group_id', 'org_unit_id', 'max_score', 
    'activity_card_id', 'equipment_id', 'description', 'symbol',
    'year', 'month', 'feed_plan', 'prod_plan'
];

export const COLUMNS_MAP: Record<EntityType, any[]> = {
    shifts: [
      { key: 'code', header: 'کد شیفت' },
      { key: 'name', header: 'نام شیفت' },
      { key: 'sort_order', header: 'ترتیب' },
    ],
    shift_types: [
      { key: 'code', header: 'کد' },
      { key: 'title', header: 'عنوان' },
      { key: 'value', header: 'مقدار' },
      { key: 'sort_order', header: 'ترتیب' },
    ],
    user_groups: [
      { key: 'code', header: 'کد گروه' },
      { key: 'name', header: 'نام گروه' },
    ],
    personnel: [
      { key: 'personnel_code', header: 'کد پرسنلی' },
      { key: 'full_name', header: 'نام و نام خانوادگی' },
      { key: 'unit', header: 'واحد' },
      { key: 'mobile', header: 'موبایل' },
    ],
    app_users: [
      { key: 'username', header: 'نام کاربری' },
      { key: 'full_name', header: 'نام و نام خانوادگی' },
      { key: 'role', header: 'گروه کاربری' },
    ],
    locations: [
      { key: 'code', header: 'کد' },
      { key: 'name', header: 'نام محل استقرار' },
      { key: 'parent_name', header: 'محل استقرار بالاتر' },
    ],
    org_chart: [
      { key: 'code', header: 'کد واحد' },
      { key: 'name', header: 'واحد سازمانی' },
      { key: 'parent_name', header: 'واحد بالاتر' },
      { key: 'manager_name', header: 'نام مسئول' },
    ],
    measurement_units: [
      { key: 'title', header: 'عنوان واحد' },
      { key: 'symbol', header: 'نماد' }
    ],
    equipment_local_names: [
      { key: 'local_name', header: 'نام محلی/رایج' },
      { key: 'class_name', header: 'کلاس' },
      { key: 'group_name', header: 'گروه' },
    ],
    evaluation_periods: [
      { key: 'code', header: 'کد دوره' },
      { key: 'title', header: 'عنوان دوره' },
    ],
    evaluation_criteria: [
      { key: 'title', header: 'عنوان شاخص' },
      { key: 'max_score', header: 'سقف امتیاز' },
      { key: 'org_unit_name', header: 'واحد سازمانی' },
    ],
    equipment_classes: [
      { key: 'code', header: 'کد کلاس' },
      { key: 'name', header: 'نام کلاس' },
    ],
    equipment_groups: [
      { key: 'code', header: 'کد گروه' },
      { key: 'name', header: 'نام گروه' },
      { key: 'class_name', header: 'کلاس والد' },
    ],
    equipment: [
      { key: 'code', header: 'کد تجهیز' },
      { key: 'name', header: 'نام تجهیز' },
      { key: 'class_name', header: 'کلاس' },
      { key: 'group_name', header: 'گروه' },
    ],
    equipment_tree: [
       { key: 'equipment_name', header: 'تجهیز' },
       { key: 'code', header: 'کد جزء' },
       { key: 'name', header: 'نام جزء' },
       { key: 'parent_name', header: 'والد' },
    ],
    part_categories_main: [
       { key: 'code', header: 'کد گروه' },
       { key: 'name', header: 'نام گروه اصلی' },
    ],
    part_categories_sub: [
       { key: 'parent_name', header: 'گروه اصلی' },
       { key: 'code', header: 'کد گروه' },
       { key: 'name', header: 'نام گروه فرعی' },
    ],
    part_categories_sub_sub: [
       { key: 'grand_parent_name', header: 'گروه اصلی' },
       { key: 'parent_name', header: 'گروه فرعی' },
       { key: 'code', header: 'کد گروه' },
       { key: 'name', header: 'نام گروه فرعی فرعی' },
    ],
    parts: [
       { key: 'code', header: 'کد قطعه' },
       { key: 'name', header: 'نام قطعه' },
       { key: 'current_stock', header: 'موجودی' },
       { key: 'min_stock', header: 'نقطه سفارش' },
       { key: 'reorder_quantity', header: 'تعداد سفارش' },
       { key: 'warehouse_row', header: 'ردیف انبار' },
       { key: 'shelf', header: 'قفسه' },
       { key: 'unit_price', header: 'قیمت (ریال)' },
    ],
    work_activity_types: [
      { key: 'code', header: 'کد' },
      { key: 'name', header: 'نام نوع فعالیت' },
      { key: 'sort_order', header: 'ترتیب' },
    ],
    work_types: [
      { key: 'code', header: 'کد' },
      { key: 'name', header: 'نام نوع کار' },
      { key: 'sort_order', header: 'ترتیب' },
    ],
    work_order_priorities: [
      { key: 'code', header: 'کد' },
      { key: 'name', header: 'نام اولویت' },
      { key: 'sort_order', header: 'ترتیب' },
    ],
    activity_cards: [
        { key: 'code', header: 'کد کارت' },
        { key: 'name', header: 'نام فعالیت' },
    ],
    checklist_items: [
        { key: 'activity_card_id', header: 'کارت فعالیت (ID)' },
        { key: 'sort_order', header: 'ترتیب' },
        { key: 'description', header: 'شرح' },
    ],
    maintenance_plans: [
        { key: 'code', header: 'کد پلن' },
        { key: 'name', header: 'نام پلن' },
        { key: 'equipment_id', header: 'تجهیز (ID)' },
    ],
    work_order_status: [
      { key: 'code', header: 'کد' },
      { key: 'name', header: 'نام' },
    ],
    production_plans: [
        { key: 'year', header: 'سال' },
        { key: 'month', header: 'ماه' },
        { key: 'total_days', header: 'روز کل' },
        { key: 'active_days', header: 'روز فعال' },
        { key: 'feed_plan', header: 'برنامه خوراک' },
        { key: 'feed_usage', header: 'خوراک مصرفی' },
        { key: 'prod_plan', header: 'برنامه تولید' },
        { key: 'prod_usage', header: 'محصول تولیدی' }
    ]
};
