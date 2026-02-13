import{c as W,r,s as y,U as se,j as e,L as ne,H as ie,C as de,S as oe,a as N,b as z,X as B,d as X,e as le,E as ue,A as ce,f as me,D as xe,g as _e}from"./index-Ba5jVD6p.js";import{A as fe}from"./alert-circle-Bv2-lKAE.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe=W("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ge=W("LogIn",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]),$=`-- کدهای زیر را در بخش SQL Editor در Supabase اجرا کنید

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

-- طراحی فرم‌های گزارش (داینامیک)
create table if not exists report_definitions (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  category text default 'گزارشات',
  is_active boolean default true,
  form_schema jsonb default '{"fields":[]}'::jsonb,
  list_schema jsonb default '{"columns":[]}'::jsonb,
  template_schema jsonb default '{}'::jsonb,
  data_source jsonb default '{"mode":"generic","table":"report_records"}'::jsonb,
  version int default 1,
  published_version int default 0,
  created_by text,
  updated_by text,
  created_at timestamptz default now()
);

-- رکوردهای گزارشات داینامیک
create table if not exists report_records (
  id uuid default gen_random_uuid() primary key,
  definition_id uuid references report_definitions(id) on delete cascade,
  tracking_code text,
  report_date text,
  payload jsonb default '{}'::jsonb,
  payload_version int default 1,
  created_by text,
  updated_by text,
  created_at timestamptz default now()
);

-- جدول گزارشات تولید روزانه
create table if not exists production_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  report_date text,
  total_production numeric default 0,
  status text default 'DRAFT',
  full_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- جدول گزارشات اتاق کنترل
create table if not exists control_room_reports (
  id uuid default gen_random_uuid() primary key,
  tracking_code text unique,
  report_date text,
  shift text,
  operator_name text,
  status text default 'DRAFT',
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
  reminder_dismissed boolean default false,
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
  location text,
  priority text,
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

-- جدول ماتریس مهارت پرسنل
create table if not exists personnel_skills (
  id uuid default gen_random_uuid() primary key,
  personnel_id uuid references personnel(id) on delete cascade,
  skill_name text not null,
  level text,
  certificate_date text,
  expiry_date text,
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

-- جدول دوره‌های ارزیابی
create table if not exists evaluation_periods (
  id uuid default gen_random_uuid() primary key,
  code text,
  title text not null,
  created_at timestamptz default now()
);

-- جدول شاخص‌های ارزیابی
create table if not exists evaluation_criteria (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  max_score numeric not null default 10,
  org_unit_id uuid references org_chart(id) on delete set null,
  created_at timestamptz default now()
);

-- جدول ارزیابی عملکرد
create table if not exists performance_evaluations (
  id uuid default gen_random_uuid() primary key,
  tracking_code text,
  personnel_id uuid references personnel(id) on delete set null,
  personnel_name text,
  unit text,
  period text,
  total_score numeric,
  max_possible_score numeric,
  criteria_scores jsonb default '[]'::jsonb,
  status text default 'DRAFT',
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

-- جدول پیشنهادات فنی
create table if not exists technical_suggestions (
  id uuid default gen_random_uuid() primary key,
  tracking_code text,
  user_id uuid references app_users(id),
  user_name text not null,
  description text not null,
  status text default 'PENDING',
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- جدول صورتجلسات
create table if not exists meeting_minutes (
  id uuid default gen_random_uuid() primary key,
  tracking_code text,
  subject text not null,
  location text,
  meeting_date text,
  start_time text,
  end_time text,
  attendees jsonb default '[]'::jsonb,
  status text default 'DRAFT',
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
ALTER TABLE parts ADD COLUMN IF NOT EXISTS warehouse_row text;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS shelf text;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS reorder_quantity numeric DEFAULT 0;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS stock_unit_id uuid REFERENCES measurement_units(id);
ALTER TABLE parts ADD COLUMN IF NOT EXISTS consumption_unit_id uuid REFERENCES measurement_units(id);

CREATE INDEX IF NOT EXISTS ix_parts_name ON parts (name);

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_category text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_type text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS priority text;

ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS objectives jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wbs jsonb DEFAULT '[]'::jsonb;

ALTER TABLE personal_notes ADD COLUMN IF NOT EXISTS reminder_dismissed boolean DEFAULT false;

-- اعلان سراسری: نسخه اعلان برای نمایش مجدد به کاربرانی که قبلاً متوجه شدم زده‌اند
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS announcement_version integer DEFAULT 1;

-- جدول ثبت اعلام «متوجه شدم» برای اعلان سراسری
create table if not exists announcement_acknowledgments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  app_settings_id uuid not null references app_settings(id) on delete cascade,
  acknowledged_version integer not null default 1,
  acknowledged_at timestamptz default now(),
  constraint uq_announcement_ack_user_settings unique (user_id, app_settings_id)
);

-- افزایش نسخه اعلان هنگام تغییر متن یا فعال/غیرفعال شدن
create or replace function bump_announcement_version()
returns trigger language plpgsql as $$
begin
  if (OLD.announcement_message is distinct from NEW.announcement_message)
     or (OLD.announcement_active is distinct from NEW.announcement_active) then
    NEW.announcement_version := coalesce(OLD.announcement_version, 0) + 1;
  else
    NEW.announcement_version := OLD.announcement_version;
  end if;
  return NEW;
end;
$$;

drop trigger if exists tr_app_settings_announcement_version on app_settings;
create trigger tr_app_settings_announcement_version
  before update on app_settings
  for each row
  execute function bump_announcement_version();

-- جدول فرمت‌های کدگذاری (پیشوند + اتصال به گزارش/منو)
create table if not exists coding_formats (
  id uuid default gen_random_uuid() primary key,
  prefix_value text not null,
  label text not null,
  linked_to text,
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index if not exists ix_coding_formats_linked_to on coding_formats (linked_to);
create index if not exists ix_coding_formats_sort on coding_formats (sort_order);

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
`,ye=({onLogin:O})=>{const[E,H]=r.useState(""),[c,w]=r.useState(""),[x,d]=r.useState(""),[_,i]=r.useState(!1),[f,G]=r.useState(!1),[Y,p]=r.useState(!1),[m,I]=r.useState(null),[C,j]=r.useState(""),[o,T]=r.useState(""),[l,k]=r.useState(""),[Q,g]=r.useState(!1),[L,v]=r.useState("checking"),[A,R]=r.useState(""),[V,U]=r.useState(!1),[q,F]=r.useState(!1),[M,P]=r.useState(""),[J,K]=r.useState("نرم افزار هوشمند رای‌نو");r.useEffect(()=>{ee(),Z()},[]);const Z=async()=>{var t;try{const{data:a,error:u}=await y.from("app_settings").select("org_name, org_logo").order("created_at",{ascending:!0}).limit(1);if(u)throw u;const n=Array.isArray(a)?a[0]:null;K(((t=n==null?void 0:n.org_name)==null?void 0:t.trim())||"نرم افزار هوشمند رای‌نو"),P((n==null?void 0:n.org_logo)||"")}catch{P("")}},ee=async()=>{v("checking");try{const{data:t,error:a}=await y.from("app_users").select("count",{count:"exact",head:!0});if(a)throw a;v("connected"),R("ارتباط با سرور برقرار است")}catch(t){console.error("Supabase Connection Error:",t),v("error");let a="خطای ناشناخته در اتصال";if(typeof t=="string")a=t;else if((t==null?void 0:t.code)==="42P01")a="جداول دیتابیس ساخته نشده‌اند";else if(t!=null&&t.message)a=t.message;else try{a=JSON.stringify(t)}catch{a="Unknown Error Object"}R(a)}},te=()=>{navigator.clipboard.writeText($),F(!0),setTimeout(()=>F(!1),2e3)},S={id:"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",username:"admin",fullName:"مدیر سیستم",role:se.ADMIN,passwordHash:"12381",isDefaultPassword:!1,avatar:M||void 0},ae=async t=>{var a,u,n;if(t.preventDefault(),d(""),i(!0),E.toLowerCase()==="admin"&&c==="12381"){if(S.isDefaultPassword){p(!0),I(S),i(!1);return}O(S),i(!1);return}try{const{data:s,error:h}=await y.from("app_users").select(`
                *,
                personnel (
                    full_name,
                    personnel_code,
                    profile_picture,
                    unit
                )
            `).eq("username",E).single();if(h||!s)throw h&&h.code!=="PGRST116"&&console.error("Auth DB Error:",h),new Error("نام کاربری یا رمز عبور اشتباه است");if(s.password!==c)throw new Error("نام کاربری یا رمز عبور اشتباه است");const D={id:s.id,username:s.username,fullName:((a=s.personnel)==null?void 0:a.full_name)||s.username,role:s.role,passwordHash:"***",isDefaultPassword:s.is_default_password,personnelCode:(u=s.personnel)==null?void 0:u.personnel_code,avatar:s.avatar||((n=s.personnel)==null?void 0:n.profile_picture)||String(s.username||"").toLowerCase()==="admin"&&M||void 0};if(D.isDefaultPassword){p(!0),I(D),i(!1);return}O(D)}catch(s){console.warn("Login Failed:",s.message),d("نام کاربری یا رمز عبور اشتباه است")}finally{i(!1)}},re=async t=>{if(t.preventDefault(),o!==l){d("تکرار رمز عبور مطابقت ندارد");return}if(C!==c){d("رمز عبور فعلی اشتباه است");return}if(o===c){d("رمز عبور جدید نمی‌تواند مشابه رمز فعلی (پیش‌فرض) باشد");return}if(i(!0),d(""),(m==null?void 0:m.username)==="admin")g(!0),setTimeout(()=>{p(!1),g(!1),j(""),T(""),k(""),w("")},2e3),i(!1);else if(m)try{const{error:a}=await y.from("app_users").update({password:o,is_default_password:!1}).eq("id",m.id);if(a)throw a;g(!0),setTimeout(()=>{p(!1),g(!1),j(""),T(""),k(""),w("")},2e3)}catch(a){d("خطا در تغییر رمز عبور: "+a.message)}finally{i(!1)}},b=o&&l&&o===l;return e.jsxs("div",{className:"min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 relative overflow-hidden font-sans",children:[e.jsxs("div",{className:"absolute inset-0 overflow-hidden pointer-events-none",children:[e.jsx("div",{className:"absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-[#800020]/5 blur-3xl"}),e.jsx("div",{className:"absolute top-[40%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-3xl"})]}),e.jsxs("div",{className:"w-full max-w-sm z-10",children:[e.jsxs("div",{className:"text-center mb-6 space-y-2 animate-fadeIn",children:[e.jsx("h1",{className:"text-xl font-black text-[#800020] dark:text-red-400 tracking-tight drop-shadow-sm leading-tight",children:J}),e.jsx("p",{className:"text-base font-bold text-gray-600 dark:text-gray-300 tracking-wide",children:"سامانه هوشمند نگهداری و تعمیرات"})]}),e.jsx("div",{className:"flex justify-center items-center mb-6 relative z-20 animate-fadeIn delay-100",children:e.jsx("div",{className:"w-40 h-40 flex items-center justify-center transform hover:scale-105 transition duration-700",children:e.jsx(ne,{className:"w-full h-full drop-shadow-2xl"})})}),e.jsxs("div",{className:"bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl relative animate-slideUp",children:[e.jsxs("div",{className:"absolute top-4 right-4",children:[L==="checking"&&e.jsx("div",{className:"w-2 h-2 bg-yellow-400 rounded-full animate-pulse",title:"در حال بررسی اتصال"}),L==="connected"&&e.jsx("div",{className:"w-2 h-2 bg-green-500 rounded-full",title:"اتصال برقرار است"}),L==="error"&&e.jsx("button",{onClick:()=>U(!0),className:"text-red-500 hover:text-red-700 transition",title:A||"خطا در اتصال",children:e.jsx(ie,{className:"w-5 h-5"})})]}),Y?e.jsx("form",{onSubmit:re,className:"space-y-4",children:Q?e.jsxs("div",{className:"flex flex-col items-center justify-center py-8 space-y-4 animate-fadeIn",children:[e.jsx("div",{className:"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2",children:e.jsx(de,{className:"w-10 h-10 text-green-600"})}),e.jsx("h3",{className:"text-lg font-bold text-green-700",children:"تغییر رمز موفقیت‌آمیز بود"}),e.jsx("p",{className:"text-xs text-gray-500",children:"در حال انتقال به صفحه ورود..."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"text-center mb-2",children:[e.jsx("div",{className:"mx-auto w-10 h-10 bg-red-100 text-[#800020] rounded-full flex items-center justify-center mb-2",children:e.jsx(oe,{className:"w-5 h-5"})}),e.jsx("h2",{className:"text-base font-bold text-gray-800 dark:text-white",children:"تغییر اجباری رمز عبور"})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] font-bold text-gray-500 mr-1",children:"رمز عبور فعلی"}),e.jsxs("div",{className:"relative",children:[e.jsx(N,{className:"absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"}),e.jsx("input",{type:"text",placeholder:"رمز فعلی...",value:C,onChange:t=>j(t.target.value),className:"w-full pr-9 pl-4 h-10 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none text-sm transition-all",required:!0})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] font-bold text-gray-500 mr-1",children:"رمز عبور جدید"}),e.jsxs("div",{className:"relative",children:[e.jsx(N,{className:"absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"}),e.jsx("input",{type:"password",placeholder:"رمز جدید...",value:o,onChange:t=>T(t.target.value),className:"w-full pr-9 pl-4 h-10 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none text-sm transition-all",required:!0})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] font-bold text-gray-500 mr-1",children:"تکرار رمز عبور جدید"}),e.jsxs("div",{className:"relative",children:[e.jsx(N,{className:"absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"}),e.jsx("input",{type:"password",placeholder:"تکرار رمز جدید...",value:l,onChange:t=>k(t.target.value),className:`w-full pr-9 pl-4 h-10 bg-gray-50 dark:bg-gray-900/50 border rounded-2xl focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none text-sm transition-all ${l&&!b?"border-red-500":"border-gray-200 dark:border-gray-600"}`,required:!0}),l&&e.jsx("div",{className:"absolute left-3 top-1/2 -translate-y-1/2",children:b?e.jsx(z,{className:"w-4 h-4 text-green-500"}):e.jsx(B,{className:"w-4 h-4 text-red-500"})})]}),l&&!b&&e.jsx("p",{className:"text-[10px] text-red-500 mr-1 animate-pulse",children:"تکرار رمز عبور مطابقت ندارد"})]})]}),x&&e.jsxs("div",{className:"text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 flex items-center justify-center gap-1",children:[e.jsx(fe,{className:"w-3 h-3"})," ",x]}),e.jsx("button",{type:"submit",disabled:_||!b||!o,className:"w-full bg-[#b91c1c] hover:bg-[#991b1b] text-white h-10 rounded-2xl font-bold text-sm transition-all transform active:scale-95 shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",children:_?e.jsx(X,{className:"w-4 h-4 animate-spin"}):"ذخیره و ورود"})]})}):e.jsxs("form",{onSubmit:ae,className:"space-y-4",children:[e.jsxs("div",{className:"text-center mb-6",children:[e.jsx("h2",{className:"text-xl font-black text-gray-800 dark:text-white mb-2",children:"ورود به حساب کاربری"}),e.jsx("p",{className:"text-xs text-gray-500 dark:text-gray-400",children:"لطفا نام کاربری و رمز عبور خود را وارد کنید"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-xs font-bold text-gray-500 dark:text-gray-300 mr-1",children:"نام کاربری"}),e.jsxs("div",{className:"relative group",children:[e.jsx(le,{className:"absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#800020] transition-colors"}),e.jsx("input",{type:"text",placeholder:"نام کاربری خود را وارد کنید",value:E,onChange:t=>H(t.target.value),className:"w-full pr-10 pl-4 h-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none transition-all text-gray-800 dark:text-gray-100 text-sm",required:!0,autoComplete:"username"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-xs font-bold text-gray-500 dark:text-gray-300 mr-1",children:"رمز عبور"}),e.jsxs("div",{className:"relative group",children:[e.jsx(N,{className:"absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#800020] transition-colors"}),e.jsx("input",{type:f?"text":"password",placeholder:"●●●●●",value:c,onChange:t=>w(t.target.value),className:"w-full pr-10 pl-10 h-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none transition-all text-gray-800 dark:text-gray-100 tracking-wider text-sm",style:{fontFamily:f?"inherit":"Verdana, sans-serif"},required:!0,autoComplete:"current-password"}),e.jsx("button",{type:"button",onClick:()=>G(!f),className:"absolute left-0 top-0 bottom-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center",children:f?e.jsx(pe,{className:"w-5 h-5"}):e.jsx(ue,{className:"w-5 h-5"})})]})]})]}),x&&e.jsxs("div",{className:"text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center justify-center gap-2 animate-shake font-bold",children:[e.jsx(ce,{className:"w-4 h-4"}),x]}),e.jsx("button",{type:"submit",disabled:_,className:"w-full bg-[#b91c1c] hover:bg-[#991b1b] text-white h-12 rounded-2xl font-bold text-sm transition-all transform active:scale-[0.98] shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-wait",children:_?e.jsx(X,{className:"w-5 h-5 animate-spin"}):e.jsxs(e.Fragment,{children:[e.jsx("span",{children:"ورود به سیستم"}),e.jsx(ge,{className:"w-5 h-5"})]})})]})]}),e.jsxs("div",{className:"text-center space-y-1 pb-4 mt-6",children:[e.jsx("div",{className:"flex items-center justify-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-light opacity-80",children:e.jsxs("span",{children:["نسخه ",me]})}),e.jsx("p",{className:"text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-widest uppercase opacity-80",children:"DESIGNED & DEVELOPED BY H.PARSA"})]}),V&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm",children:e.jsxs("div",{className:"bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]",children:[e.jsxs("div",{className:"p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800",children:[e.jsxs("h3",{className:"font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200",children:[e.jsx(xe,{className:"w-5 h-5 text-blue-600"}),"اسکریپت ساخت دیتابیس"]}),e.jsx("button",{onClick:()=>U(!1),className:"p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition",children:e.jsx(B,{className:"w-5 h-5"})})]}),e.jsxs("div",{className:"p-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/30 text-sm text-yellow-800 dark:text-yellow-200",children:[A&&e.jsx("div",{className:"mb-2 font-bold text-red-600",children:A}),"این کد را کپی کرده و در پنل ",e.jsx("b",{children:"Supabase"})," بخش ",e.jsx("b",{children:"SQL Editor"})," اجرا کنید تا جداول مورد نیاز ساخته شوند."]}),e.jsxs("div",{className:"flex-1 overflow-auto p-4 bg-gray-900 text-gray-300 font-mono text-xs relative",children:[e.jsx("pre",{children:$}),e.jsxs("button",{onClick:te,className:"absolute top-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition",children:[q?e.jsx(z,{className:"w-4 h-4"}):e.jsx(_e,{className:"w-4 h-4"}),q?"کپی شد":"کپی کد"]})]})]})})]})]})};export{ye as Login,ye as default};
