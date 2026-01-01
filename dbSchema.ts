
export const DB_SETUP_SQL = `-- کدهای زیر را در بخش SQL Editor در Supabase اجرا کنید

-- 1. جداول اصلی
create table if not exists personnel (
  id uuid default gen_random_uuid() primary key,
  personnel_code text unique not null,
  full_name text,
  unit text,
  mobile text,
  email text,
  profile_picture text,
  created_at timestamptz default now()
);

create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text,
  role text not null,
  personnel_id uuid references personnel(id),
  is_default_password boolean default true,
  avatar text,
  created_at timestamptz default now()
);

-- جدول لاگ‌های سیستم
create table if not exists system_logs (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  user_name text,
  personnel_code text,
  action text,
  ip_address text,
  details text,
  created_at timestamptz default now()
);

-- جدول پیام ها
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  sender_id text,
  sender_name text,
  receiver_id text,
  receiver_type text,
  subject text,
  body text,
  read_by jsonb default '[]'::jsonb,
  created_at text,
  attachments jsonb default '[]'::jsonb
);

-- 2. جداول اطلاعات پایه
create table if not exists locations ( id uuid default gen_random_uuid() primary key, code text unique, name text not null, parent_id uuid references locations(id), created_at timestamptz default now() );

-- جدول واحدها (با نماد)
create table if not exists measurement_units ( 
  id uuid default gen_random_uuid() primary key, 
  title text not null, 
  symbol text, 
  created_at timestamptz default now() 
);

create table if not exists equipment_classes ( id uuid default gen_random_uuid() primary key, name text not null, created_at timestamptz default now() );
create table if not exists equipment_groups ( id uuid default gen_random_uuid() primary key, name text not null, class_id uuid references equipment_classes(id), created_at timestamptz default now() );

-- جدول دسته‌بندی قطعات (اصلی، فرعی، فرعیِ فرعی)
create table if not exists part_categories ( 
  id uuid default gen_random_uuid() primary key, 
  code text unique not null, 
  name text unique not null, 
  parent_id uuid references part_categories(id), 
  level_type text not null, -- MAIN, SUB, SUB_SUB
  created_at timestamptz default now() 
);

create table if not exists equipment (
  id uuid default gen_random_uuid() primary key,
  code text unique,
  name text not null,
  class_id uuid references equipment_classes(id),
  group_id uuid references equipment_groups(id),
  location_id uuid references locations(id),
  description text,
  created_at timestamptz default now()
);

create table if not exists equipment_local_names (
  id uuid default gen_random_uuid() primary key,
  local_name text not null,
  class_id uuid references equipment_classes(id),
  group_id uuid references equipment_groups(id),
  created_at timestamptz default now()
);

-- 3. جدول اصلی گردش کار (Cartable)
create table if not exists cartable_items (
  id uuid default gen_random_uuid() primary key,
  workflow_id text,
  tracking_code text unique,
  module text not null,
  title text,
  description text,
  current_step_id text,
  initiator_id uuid references app_users(id),
  assignee_role text,
  assignee_id uuid references app_users(id),
  status text,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. جداول مدیریت پروژه
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
  title text not null,
  manager_id uuid references personnel(id),
  manager_name text,
  budget numeric default 0,
  start_date text,
  end_date text,
  status text default 'PLANNED',
  progress integer default 0,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_objectives (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  objective_text text not null,
  created_at timestamptz default now()
);

create table if not exists project_milestones (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  weight_percent integer not null,
  progress_percent integer default 0,
  created_at timestamptz default now()
);

create table if not exists project_attachments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  file_name text not null,
  file_path text,
  file_size integer,
  file_type text,
  uploaded_at timestamptz default now()
);

-- جدول گزارشات شیفت
create table if not exists shift_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
  shift_date text,
  shift_name text,
  shift_type text,
  shift_duration text,
  supervisor_id uuid,
  supervisor_name text,
  total_production_a numeric default 0,
  total_production_b numeric default 0,
  full_data jsonb,
  created_at timestamptz default now()
);

-- 5. جدول ارزیابی عملکرد
create table if not exists performance_evaluations (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
  personnel_id uuid references personnel(id),
  personnel_name text,
  unit text,
  period text,
  total_score numeric,
  criteria_data jsonb,
  evaluator_id uuid references app_users(id),
  status text default 'PENDING',
  description text,
  created_at timestamptz default now()
);

-- 6. جدول برنامه و بودجه تولید (ویرایش شده طبق درخواست)
create table if not exists production_plans (
  id uuid default gen_random_uuid() primary key,
  year int not null,
  month text not null,
  total_days int default 30 check (total_days >= 0),
  active_days int default 30 check (active_days >= 0),
  downtime_days int default 0 check (downtime_days >= 0),
  
  feed_plan numeric default 0 check (feed_plan >= 0),
  feed_usage numeric default 0 check (feed_usage >= 0),
  feed_dev_percent numeric default 100 check (feed_dev_percent >= 0),
  final_feed numeric default 0 check (final_feed >= 0),
  
  prod_plan numeric default 0 check (prod_plan >= 0),
  prod_usage numeric default 0 check (prod_usage >= 0),
  prod_dev_percent numeric default 100 check (prod_dev_percent >= 0),
  final_prod numeric default 0 check (final_prod >= 0),
  
  created_at timestamptz default now()
);

-- سایر جداول کمکی
create table if not exists user_groups ( id uuid default gen_random_uuid() primary key, code text, name text, created_at timestamptz default now() );
create table if not exists org_chart ( id uuid default gen_random_uuid() primary key, code text, name text, manager_name text, created_at timestamptz default now() );
create table if not exists evaluation_periods ( id uuid default gen_random_uuid() primary key, code text, title text, created_at timestamptz default now() );
create table if not exists evaluation_criteria ( id uuid default gen_random_uuid() primary key, title text, max_score numeric, created_at timestamptz default now() );
create table if not exists equipment_tree ( id uuid default gen_random_uuid() primary key, equipment_id uuid references equipment(id), code text, name text, parent_id uuid references equipment_tree(id), created_at timestamptz default now() );
create table if not exists activity_cards ( id uuid default gen_random_uuid() primary key, code text, name text, created_at timestamptz default now() );
create table if not exists checklist_items ( id uuid default gen_random_uuid() primary key, activity_card_id uuid references activity_cards(id), sort_order int, description text, created_at timestamptz default now() );
create table if not exists maintenance_plans ( id uuid default gen_random_uuid() primary key, code text, name text, equipment_id uuid references equipment(id), created_at timestamptz default now() );

-- جدول قطعات (متصل به دسته‌بندی و واحدها)
create table if not exists parts ( 
  id uuid default gen_random_uuid() primary key, 
  code text, 
  name text not null, 
  category_id uuid references part_categories(id), 
  stock_unit_id uuid references measurement_units(id), 
  consumption_unit_id uuid references measurement_units(id), 
  created_at timestamptz default now() 
);

-- 7. جدول درخواست قطعه (هدر و اقلام)
create table if not exists part_requests (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
  requester_id uuid references app_users(id),
  requester_name text,
  work_order_id uuid references cartable_items(id), -- اتصال به دستور کار
  work_order_code text,
  request_date text,
  status text default 'PENDING',
  description text,
  created_at timestamptz default now()
);

create table if not exists part_request_items (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references part_requests(id) on delete cascade,
  part_id uuid references parts(id),
  part_name text,
  qty numeric,
  unit text,
  note text,
  created_at timestamptz default now()
);

-- 8. جدول اسناد فنی
create table if not exists technical_documents (
  id uuid default gen_random_uuid() primary key,
  code text not null,
  title text not null,
  type text,
  file_name text,
  created_at timestamptz default now()
);

-- 9. جدول صورتجلسات
create table if not exists meeting_minutes (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
  subject text not null,
  location text,
  meeting_date text,
  start_time text,
  end_time text,
  attendees jsonb default '[]'::jsonb,
  decisions jsonb default '[]'::jsonb,
  attached_files jsonb default '[]'::jsonb,
  creator_id uuid references app_users(id),
  status text default 'PENDING',
  created_at timestamptz default now()
);

-- 10. جدول پیشنهادات فنی
create table if not exists technical_suggestions (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
  user_id uuid references app_users(id),
  user_name text,
  description text not null,
  attached_files jsonb default '[]'::jsonb,
  status text default 'PENDING',
  created_at timestamptz default now()
);

-- 11. جدول درخواست خرید (بروزرسانی شده با پیوست)
create table if not exists purchase_requests (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
  request_number text not null,
  requester_id uuid references app_users(id),
  requester_name text,
  request_date text,
  description text not null,
  qty numeric default 1,
  unit text,
  location text,
  priority text,
  status text default 'PENDING',
  attachments jsonb default '[]'::jsonb, -- New Column for attachments
  created_at timestamptz default now()
);

-- 12. جدول یادداشت‌های شخصی
create table if not exists personal_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references app_users(id),
  title text not null,
  content text,
  tags jsonb default '[]'::jsonb,
  reminder_date text,
  reminder_time text,
  is_completed boolean default false,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 13. جدول دستور کارها
create table if not exists work_orders (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique not null,
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
  downtime integer default 0,
  repair_time integer default 0,
  labor_details jsonb default '[]'::jsonb,
  used_parts jsonb default '[]'::jsonb,
  attachments jsonb default '[]'::jsonb,
  status text default 'REQUEST',
  created_at timestamptz default now()
);

-- بروزرسانی‌ها و روابط
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS personnel_id uuid REFERENCES personnel(id);
ALTER TABLE org_chart ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES org_chart(id);
ALTER TABLE org_chart ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES personnel(id);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS org_unit_id uuid REFERENCES org_chart(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES locations(id);
ALTER TABLE equipment_classes ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE equipment_groups ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE evaluation_criteria ADD COLUMN IF NOT EXISTS org_unit_id uuid REFERENCES org_chart(id);
ALTER TABLE measurement_units ADD COLUMN IF NOT EXISTS symbol text;

-- دستور مهم برای اضافه کردن ستون پیوست به جدول درخواست خرید در صورت وجود
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Constraints
ALTER TABLE equipment_classes DROP CONSTRAINT IF EXISTS equipment_classes_code_key;
ALTER TABLE equipment_classes ADD CONSTRAINT equipment_classes_code_key UNIQUE (code);
ALTER TABLE equipment_classes DROP CONSTRAINT IF EXISTS equipment_classes_name_key;
ALTER TABLE equipment_classes ADD CONSTRAINT equipment_classes_name_key UNIQUE (name);
ALTER TABLE equipment_groups DROP CONSTRAINT IF EXISTS equipment_groups_code_key;
ALTER TABLE equipment_groups ADD CONSTRAINT equipment_groups_code_key UNIQUE (code);
ALTER TABLE equipment ALTER COLUMN code SET NOT NULL;

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

-- تابع پیشرفته تولید کد رهگیری منحصر به فرد
create or replace function get_next_tracking_code(prefix_input text)
returns text
language plpgsql
as $$
declare
  last_code text;
  next_num integer;
  new_code text;
begin
  select tracking_code into last_code
  from cartable_items
  where tracking_code like prefix_input || '%'
  order by tracking_code desc
  limit 1;

  if last_code is null then
    next_num := 1;
  else
    begin
        next_num := to_number(right(last_code, 4), '9999') + 1;
    exception when others then
        next_num := 1;
    end;
  end if;

  new_code := prefix_input || lpad(next_num::text, 4, '0');
  
  return new_code;
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

NOTIFY pgrst, 'reload config';
`;