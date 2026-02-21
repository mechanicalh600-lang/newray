-- جدول وضعیت‌های دستور کار
create table if not exists work_order_status (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- داده‌های اولیه
insert into work_order_status (code, name, sort_order)
select 'DRAFT', 'پیش‌نویس', 1
where not exists (select 1 from work_order_status where code = 'DRAFT');

insert into work_order_status (code, name, sort_order)
select 'IN_PROGRESS', 'در حال انجام', 2
where not exists (select 1 from work_order_status where code = 'IN_PROGRESS');

insert into work_order_status (code, name, sort_order)
select 'COMPLETED', 'انجام شده', 3
where not exists (select 1 from work_order_status where code = 'COMPLETED');

insert into work_order_status (code, name, sort_order)
select 'CANCELLED', 'لغو شده', 4
where not exists (select 1 from work_order_status where code = 'CANCELLED');
