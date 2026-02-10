
// لیست جداول مطابق با ساختار دیتابیس
export type EntityType = 
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
  | 'activity_cards' 
  | 'checklist_items' 
  | 'maintenance_plans'
  | 'production_plans'
  | 'shift_reports'
  | 'scale_reports';

// ترتیب نمایش تب‌ها
export const ORDERED_TABS: EntityType[] = [
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
  'shift_reports',
  'scale_reports',
  'evaluation_periods',
  'evaluation_criteria',
  'measurement_units',
  'equipment_tree',
  'part_categories_main',
  'part_categories_sub',
  'part_categories_sub_sub',
  'parts',
  'activity_cards',
  'checklist_items',
  'maintenance_plans'
];

export const TABLE_LABELS: Record<EntityType, string> = {
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
  activity_cards: 'کارت فعالیت‌ها',
  checklist_items: 'آیتم‌های چک‌لیست',
  maintenance_plans: 'پلن‌های نت',
  production_plans: 'برنامه و بودجه تولید',
  shift_reports: 'گزارشات شیفت',
  scale_reports: 'گزارشات باسکول'
};

// لیست فیلدهای اجباری برای نمایش ستاره قرمز
export const MANDATORY_FIELDS: string[] = [
    'personnel_code', 'full_name', 'username', 'name', 'title', 'code', 
    'local_name', 'class_id', 'group_id', 'org_unit_id', 'max_score', 
    'activity_card_id', 'equipment_id', 'description', 'symbol',
    'year', 'month', 'feed_plan', 'prod_plan',
    'shift_date', 'shift_name', 'report_date', 'truck_no'
];

export const COLUMNS_MAP: Record<EntityType, any[]> = {
    user_groups: [
      { key: 'code', header: 'کد گروه', sortKey: 'code' },
      { key: 'name', header: 'نام گروه', sortKey: 'name' },
    ],
    personnel: [
      { key: 'personnel_code', header: 'کد پرسنلی', sortKey: 'personnel_code' },
      { key: 'full_name', header: 'نام و نام خانوادگی', sortKey: 'full_name' },
      { key: 'unit', header: 'واحد', sortKey: 'unit' },
      { key: 'mobile', header: 'موبایل', sortKey: 'mobile' },
      { key: 'hourly_rate', header: 'نرخ ساعتی (ریال)', sortKey: 'hourly_rate' },
    ],
    app_users: [
      { key: 'username', header: 'نام کاربری', sortKey: 'username' },
      { key: 'full_name', header: 'نام و نام خانوادگی', sortKey: 'full_name' },
      { key: 'role', header: 'گروه کاربری', sortKey: 'role' },
    ],
    locations: [
      { key: 'code', header: 'کد', sortKey: 'code' },
      { key: 'name', header: 'نام محل استقرار', sortKey: 'name' },
      { key: 'parent_name', header: 'محل استقرار بالاتر', sortKey: 'parent_name' },
    ],
    org_chart: [
      { key: 'code', header: 'کد واحد', sortKey: 'code' },
      { key: 'name', header: 'واحد سازمانی', sortKey: 'name' },
      { key: 'parent_name', header: 'واحد بالاتر', sortKey: 'parent_name' },
      { key: 'manager_name', header: 'نام مسئول', sortKey: 'manager_name' },
    ],
    measurement_units: [
      { key: 'title', header: 'عنوان واحد', sortKey: 'title' },
      { key: 'symbol', header: 'نماد', sortKey: 'symbol' }
    ],
    equipment_local_names: [
      { key: 'local_name', header: 'نام محلی/رایج', sortKey: 'local_name' },
      { key: 'class_name', header: 'کلاس', sortKey: 'class_name' },
      { key: 'group_name', header: 'گروه', sortKey: 'group_name' },
    ],
    evaluation_periods: [
      { key: 'code', header: 'کد دوره', sortKey: 'code' },
      { key: 'title', header: 'عنوان دوره', sortKey: 'title' },
    ],
    evaluation_criteria: [
      { key: 'title', header: 'عنوان شاخص', sortKey: 'title' },
      { key: 'max_score', header: 'سقف امتیاز', sortKey: 'max_score' },
      { key: 'org_unit_name', header: 'واحد سازمانی', sortKey: 'org_unit_name' },
    ],
    equipment_classes: [
      { key: 'code', header: 'کد کلاس', sortKey: 'code' },
      { key: 'name', header: 'نام کلاس', sortKey: 'name' },
    ],
    equipment_groups: [
      { key: 'code', header: 'کد گروه', sortKey: 'code' },
      { key: 'name', header: 'نام گروه', sortKey: 'name' },
      { key: 'class_name', header: 'کلاس والد', sortKey: 'class_name' },
    ],
    equipment: [
      { key: 'code', header: 'کد تجهیز', sortKey: 'code' },
      { key: 'name', header: 'نام تجهیز', sortKey: 'name' },
      { key: 'class_name', header: 'کلاس', sortKey: 'class_name' },
      { key: 'group_name', header: 'گروه', sortKey: 'group_name' },
    ],
    equipment_tree: [
       { key: 'equipment_name', header: 'تجهیز', sortKey: 'equipment_name' },
       { key: 'code', header: 'کد جزء', sortKey: 'code' },
       { key: 'name', header: 'نام جزء', sortKey: 'name' },
       { key: 'parent_name', header: 'والد', sortKey: 'parent_name' },
    ],
    part_categories_main: [
       { key: 'code', header: 'کد گروه', sortKey: 'code' },
       { key: 'name', header: 'نام گروه اصلی', sortKey: 'name' },
    ],
    part_categories_sub: [
       { key: 'parent_name', header: 'گروه اصلی', sortKey: 'parent_name' },
       { key: 'code', header: 'کد گروه', sortKey: 'code' },
       { key: 'name', header: 'نام گروه فرعی', sortKey: 'name' },
    ],
    part_categories_sub_sub: [
       { key: 'grand_parent_name', header: 'گروه اصلی', sortKey: 'grand_parent_name' },
       { key: 'parent_name', header: 'گروه فرعی', sortKey: 'parent_name' },
       { key: 'code', header: 'کد گروه', sortKey: 'code' },
       { key: 'name', header: 'نام گروه فرعی فرعی', sortKey: 'name' },
    ],
    parts: [
       { key: 'code', header: 'کد قطعه', sortKey: 'code' },
       { key: 'name', header: 'نام قطعه', sortKey: 'name' },
       { key: 'current_stock', header: 'موجودی', sortKey: 'current_stock' },
       { key: 'min_stock', header: 'نقطه سفارش', sortKey: 'min_stock' },
       { key: 'location_in_warehouse', header: 'محل انبار', sortKey: 'location_in_warehouse' },
       { key: 'unit_price', header: 'قیمت (ریال)', sortKey: 'unit_price' },
    ],
    activity_cards: [
        { key: 'code', header: 'کد کارت', sortKey: 'code' },
        { key: 'name', header: 'نام فعالیت', sortKey: 'name' },
    ],
    checklist_items: [
        { key: 'activity_card_id', header: 'کارت فعالیت (ID)', sortKey: 'activity_card_id' },
        { key: 'sort_order', header: 'ترتیب', sortKey: 'sort_order' },
        { key: 'description', header: 'شرح', sortKey: 'description' },
    ],
    maintenance_plans: [
        { key: 'code', header: 'کد پلن', sortKey: 'code' },
        { key: 'name', header: 'نام پلن', sortKey: 'name' },
        { key: 'equipment_id', header: 'تجهیز (ID)', sortKey: 'equipment_id' },
    ],
    production_plans: [
        { key: 'year', header: 'سال', sortKey: 'year' },
        { key: 'month', header: 'ماه', sortKey: 'month' },
        { key: 'total_days', header: 'روز کل', sortKey: 'total_days' },
        { key: 'active_days', header: 'روز فعال', sortKey: 'active_days' },
        { key: 'feed_plan', header: 'برنامه خوراک', sortKey: 'feed_plan' },
        { key: 'feed_usage', header: 'خوراک مصرفی', sortKey: 'feed_usage' },
        { key: 'prod_plan', header: 'برنامه تولید', sortKey: 'prod_plan' },
        { key: 'prod_usage', header: 'محصول تولیدی', sortKey: 'prod_usage' }
    ],
    shift_reports: [
        { key: 'tracking_code', header: 'کد پیگیری', sortKey: 'tracking_code' },
        { key: 'shift_date', header: 'تاریخ', sortKey: 'shift_date' },
        { key: 'shift_name', header: 'شیفت', sortKey: 'shift_name' },
        { key: 'supervisor_name', header: 'سرپرست', sortKey: 'supervisor_name' },
        { key: 'total_production_a', header: 'تولید A', sortKey: 'total_production_a' },
        { key: 'total_production_b', header: 'تولید B', sortKey: 'total_production_b' },
    ],
    scale_reports: [
        { key: 'tracking_code', header: 'کد پیگیری', sortKey: 'tracking_code' },
        { key: 'report_date', header: 'تاریخ', sortKey: 'report_date' },
        { key: 'truck_no', header: 'پلاک خودرو', sortKey: 'truck_no' },
        { key: 'material', header: 'محموله', sortKey: 'material' },
        { key: 'net_weight', header: 'وزن خالص', sortKey: 'net_weight' },
        { key: 'origin', header: 'مبدا', sortKey: 'origin' },
        { key: 'destination', header: 'مقصد', sortKey: 'destination' },
    ]
};
