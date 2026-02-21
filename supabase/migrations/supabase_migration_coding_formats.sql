-- مایگریشن: جدول فرمت‌های کدگذاری با اتصال به گزارش/منو
CREATE TABLE IF NOT EXISTS coding_formats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix_value text NOT NULL,
  label text NOT NULL,
  linked_to text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_coding_formats_linked_to ON coding_formats (linked_to);
CREATE INDEX IF NOT EXISTS ix_coding_formats_sort ON coding_formats (sort_order);

-- داده‌های اولیه از تنظیمات فعلی (در صورت وجود app_settings)
INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'WO', 'دستور کار', '/work-orders', 1
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/work-orders');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'PM', 'برنامه PM', '/pm-scheduler', 2
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/pm-scheduler');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'PR', 'درخواست قطعه', '/part-requests', 3
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/part-requests');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'PUR', 'درخواست خرید', '/purchases', 4
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/purchases');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'MT', 'صورتجلسه', '/meetings', 5
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/meetings');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'SUG', 'پیشنهاد', '/suggestions', 6
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/suggestions');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'HSE', 'گزارش HSE', '/hse-report', 7
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/hse-report');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'LAB', 'گزارش آزمایشگاه', '/lab-report', 8
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/lab-report');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'W-IN', 'ورود انبار', '/warehouse-report', 9
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE prefix_value = 'W-IN');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'W-OUT', 'خروج انبار', '/warehouse-report', 10
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE prefix_value = 'W-OUT');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'SCL', 'باسکول', '/scale-report', 11
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/scale-report');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'DOC', 'سند فنی', '/documents', 12
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/documents');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'PROJ', 'پروژه', '/projects', 13
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/projects');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'TRN', 'دوره آموزشی', '/training-courses', 14
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE linked_to = '/training-courses');

INSERT INTO coding_formats (prefix_value, label, linked_to, sort_order)
SELECT 'PTW', 'مجوز کار', '/permits', 15
WHERE NOT EXISTS (SELECT 1 FROM coding_formats WHERE prefix_value = 'PTW');
