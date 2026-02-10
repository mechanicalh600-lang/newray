
export const DB_SETUP_SQL = `-- کدهای زیر را در بخش SQL Editor در Supabase اجرا کنید

-- ==========================================
-- 1. جداول پایه و تنظیمات
-- ==========================================

create table if not exists app_settings (
  id uuid default gen_random_uuid() primary key,
  org_name text default 'شرکت توسعه معدنی و صنعتی صبانور',
  org_logo text,
  session_timeout_minutes integer default 5,
  maintenance_mode boolean default false,
  announcement_message text,
  announcement_active boolean default false,
  max_upload_size_mb integer default 5,
  shift_a_start text default '07:00',
  shift_b_start text default '15:00',
  shift_c_start text default '23:00',
  work_order_prefix text default 'WO',
  pm_plan_prefix text default 'PM',
  request_part_prefix text default 'PR',
  purchase_request_prefix text default 'PUR',
  meeting_prefix text default 'MT',
  suggestion_prefix text default 'SUG',
  incident_prefix text default 'HSE',
  lab_report_prefix text default 'LAB',
  warehouse_entry_prefix text default 'W-IN',
  warehouse_exit_prefix text default 'W-OUT',
  scale_report_prefix text default 'SCL',
  document_prefix text default 'DOC',
  project_prefix text default 'PROJ',
  training_course_prefix text default 'TRN',
  ptw_prefix text default 'PTW',
  created_at timestamptz default now()
);

INSERT INTO app_settings (org_name)
SELECT 'شرکت توسعه معدنی و صنعتی صبانور'
WHERE NOT EXISTS (SELECT 1 FROM app_settings);

-- ==========================================
-- 2. جداول عملیاتی اصلی (نت و تولید)
-- ==========================================

-- جدول دستور کارها
create table if not exists work_orders (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  requester_id uuid references app_users(id),
  requester_name text,
  request_date text,
  request_time text,
  shift text,
  equipment_id uuid references equipment(id),
  equipment_code text,
  equipment_name text,
  local_name text,
  location_id uuid references locations(id),
  location_details text,
  production_line text,
  work_category text,
  work_type text,
  priority text,
  failure_description text,
  action_taken text,
  downtime int default 0,
  repair_time int default 0,
  labor_details jsonb default '[]'::jsonb,
  used_parts jsonb default '[]'::jsonb,
  attachments jsonb default '[]'::jsonb,
  status text default 'REQUEST',
  total_cost numeric default 0,
  created_at timestamptz default now()
);

-- جدول برنامه‌ریزی نت (PM Plans)
create table if not exists pm_plans (
  id uuid default gen_random_uuid() primary key,
  title text,
  equipment_id uuid references equipment(id),
  frequency_type text, -- WEEKLY, MONTHLY, HOURS
  frequency_value int,
  next_run_date text,
  description text,
  is_active boolean default true,
  last_run_date text,
  created_at timestamptz default now()
);

-- جدول گزارشات شیفت
create table if not exists shift_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text,
  shift_date text,
  shift_name text,
  shift_type text,
  shift_duration text,
  supervisor_id uuid references app_users(id),
  supervisor_name text,
  total_production_a numeric,
  total_production_b numeric,
  full_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- جدول برنامه و بودجه تولید
create table if not exists production_plans (
  id uuid default gen_random_uuid() primary key,
  year int not null,
  month text not null,
  total_days int default 30,
  active_days int default 30,
  downtime_days int default 0,
  feed_plan numeric default 0,
  feed_usage numeric default 0,
  feed_dev_percent numeric default 100,
  final_feed numeric default 0,
  prod_plan numeric default 0,
  prod_usage numeric default 0,
  prod_dev_percent numeric default 100,
  final_prod numeric default 0,
  created_at timestamptz default now()
);

-- ==========================================
-- 3. سایر جداول ماژول‌ها
-- ==========================================

create table if not exists personal_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references app_users(id),
  title text,
  content text,
  tags text[],
  reminder_date text,
  reminder_time text,
  is_completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  tracking_code text,
  title text,
  manager_id uuid references personnel(id),
  manager_name text,
  start_date text,
  end_date text,
  progress numeric default 0,
  status text default 'PLANNED',
  description text,
  created_at timestamptz default now()
);

create table if not exists part_requests (
  id uuid default gen_random_uuid() primary key,
  tracking_code text,
  requester_id uuid references app_users(id),
  requester_name text,
  request_date text,
  description text,
  work_order_code text,
  status text default 'PENDING',
  items jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists purchase_requests (
  id uuid default gen_random_uuid() primary key,
  request_number text,
  requester_id uuid references app_users(id),
  requester_name text,
  request_date text,
  description text,
  qty numeric,
  unit text,
  status text default 'PENDING',
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- جدول BOM تجهیزات
create table if not exists equipment_boms (
  id uuid default gen_random_uuid() primary key,
  equipment_id uuid references equipment(id) on delete cascade,
  part_id uuid references parts(id) on delete cascade,
  quantity numeric default 1,
  note text,
  created_at timestamptz default now()
);

-- جدول اسناد فنی
create table if not exists technical_documents (
  id uuid default gen_random_uuid() primary key,
  code text,
  title text not null,
  type text,
  file_url text,
  description text,
  created_at timestamptz default now()
);

-- جدول گزارشات آزمایشگاه
create table if not exists lab_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  report_date text,
  shift text,
  sample_code text,
  sample_location text,
  fe_percent numeric,
  feo_percent numeric,
  s_percent numeric,
  moisture_percent numeric,
  blaine numeric,
  mesh_size numeric,
  operator_id uuid references app_users(id),
  created_at timestamptz default now()
);

-- جدول گزارشات انبار
create table if not exists warehouse_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  report_date text,
  type text not null, 
  part_id uuid references parts(id),
  qty numeric,
  unit text,
  receiver_name text,
  doc_ref text,
  operator_id uuid references app_users(id),
  created_at timestamptz default now()
);

-- جدول گزارشات باسکول
create table if not exists scale_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  report_date text,
  truck_no text,
  driver_name text,
  material text,
  gross_weight numeric,
  tare_weight numeric,
  net_weight numeric,
  origin text,
  destination text,
  operator_id uuid references app_users(id),
  created_at timestamptz default now()
);

-- جدول دوره‌های آموزشی
create table if not exists training_courses (
  id uuid default gen_random_uuid() primary key,
  code text,
  title text not null,
  duration_hours numeric,
  provider text,
  created_at timestamptz default now()
);

-- جدول گزارشات HSE
create table if not exists hse_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  type text,
  date text,
  time text,
  location text,
  description text,
  involved_persons text,
  corrective_action text,
  status text default 'OPEN',
  created_at timestamptz default now()
);

-- جدول مجوز کار
create table if not exists work_permits (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  permit_type text not null,
  requester_id uuid references app_users(id),
  equipment_id uuid references equipment(id),
  start_time text,
  end_time text,
  hazards jsonb default '[]'::jsonb,
  precautions jsonb default '[]'::jsonb,
  status text default 'PENDING',
  approver_id uuid references app_users(id),
  created_at timestamptz default now()
);

-- ==========================================
-- 4. بروزرسانی جداول قدیمی (ALTER)
-- ==========================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_type text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by jsonb DEFAULT '[]'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

ALTER TABLE personnel ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS org_unit_id uuid REFERENCES org_chart(id);

ALTER TABLE parts ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS current_stock numeric DEFAULT 0;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS min_stock numeric DEFAULT 0;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS location_in_warehouse text;

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_category text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_type text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS priority text;

ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- ==========================================
-- 5. توابع تولید کد خودکار
-- ==========================================

create or replace function get_next_tracking_code(prefix_input text)
returns text
language plpgsql
as $$
declare
  last_code text;
  next_num integer;
begin
  select tracking_code into last_code
  from cartable_items
  where tracking_code like prefix_input || '%'
  order by tracking_code desc
  limit 1;

  if last_code is null and prefix_input = 'PTW' then
      select tracking_code into last_code from work_permits order by tracking_code desc limit 1;
  end if;
  
  if last_code is null and prefix_input = 'HSE' then
      select tracking_code into last_code from hse_reports order by tracking_code desc limit 1;
  end if;

  if last_code is null then
    next_num := 1;
  else
    begin
        next_num := to_number(right(last_code, 4), '9999') + 1;
    exception when others then
        next_num := 1;
    end;
  end if;

  return prefix_input || lpad(next_num::text, 4, '0');
end;
$$;

create or replace function get_next_shift_code_from_prefix(prefix_input text)
returns text
language plpgsql
as $$
declare
  last_code text;
  next_num integer;
begin
  select tracking_code into last_code
  from shift_reports
  where tracking_code like prefix_input || '%'
  order by tracking_code desc
  limit 1;

  if last_code is null then
    next_num := 1;
  else
    next_num := to_number(right(last_code, 4), '9999') + 1;
  end if;

  return prefix_input || lpad(next_num::text, 4, '0');
end;
$$;

DO $$ 
DECLARE 
    t text; 
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
    LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t); 
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access" ON %I;', t); 
        EXECUTE format('CREATE POLICY "Enable all access" ON %I FOR ALL USING (true) WITH CHECK (true);', t); 
    END LOOP; 
END $$;

NOTIFY pgrst, 'reload config';
