-- نوع فعالیت (Activity Type)
create table if not exists work_activity_types (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

insert into work_activity_types (code, name, sort_order)
select 'REPAIR', 'تعمیرات اضطراری (EM)', 1
where not exists (select 1 from work_activity_types where code = 'REPAIR');

insert into work_activity_types (code, name, sort_order)
select 'PM', 'نت پیشگیرانه (PM)', 2
where not exists (select 1 from work_activity_types where code = 'PM');

insert into work_activity_types (code, name, sort_order)
select 'PROJECT', 'پروژه / اصلاح', 3
where not exists (select 1 from work_activity_types where code = 'PROJECT');

insert into work_activity_types (code, name, sort_order)
select 'INSPECTION', 'بازرسی فنی', 4
where not exists (select 1 from work_activity_types where code = 'INSPECTION');

insert into work_activity_types (code, name, sort_order)
select 'SERVICE', 'سرویس عمومی', 5
where not exists (select 1 from work_activity_types where code = 'SERVICE');


-- نوع کار (Work Type / Discipline)
create table if not exists work_types (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

insert into work_types (code, name, sort_order)
select 'MECHANICAL', 'مکانیک', 1
where not exists (select 1 from work_types where code = 'MECHANICAL');

insert into work_types (code, name, sort_order)
select 'ELECTRICAL', 'برق', 2
where not exists (select 1 from work_types where code = 'ELECTRICAL');

insert into work_types (code, name, sort_order)
select 'INSTRUMENTATION', 'ابزار دقیق', 3
where not exists (select 1 from work_types where code = 'INSTRUMENTATION');

insert into work_types (code, name, sort_order)
select 'FACILITIES', 'تأسیسات صنعتی', 4
where not exists (select 1 from work_types where code = 'FACILITIES');


-- اولویت انجام (Priority)
create table if not exists work_order_priorities (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

insert into work_order_priorities (code, name, sort_order)
select 'NORMAL', 'عادی', 1
where not exists (select 1 from work_order_priorities where code = 'NORMAL');

insert into work_order_priorities (code, name, sort_order)
select 'URGENT', 'فوری', 2
where not exists (select 1 from work_order_priorities where code = 'URGENT');

insert into work_order_priorities (code, name, sort_order)
select 'CRITICAL', 'بحرانی (توقف تولید)', 3
where not exists (select 1 from work_order_priorities where code = 'CRITICAL');
