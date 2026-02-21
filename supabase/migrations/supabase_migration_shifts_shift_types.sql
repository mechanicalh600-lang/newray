-- جدول شیفت‌ها
create table if not exists shifts (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- جدول نوبت‌های کاری
create table if not exists shift_types (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  title text not null,
  value text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- داده اولیه شیفت‌ها
insert into shifts (code, name, sort_order)
select 'A', 'شیفت A', 1
where not exists (select 1 from shifts where code = 'A');

insert into shifts (code, name, sort_order)
select 'B', 'شیفت B', 2
where not exists (select 1 from shifts where code = 'B');

insert into shifts (code, name, sort_order)
select 'C', 'شیفت C', 3
where not exists (select 1 from shifts where code = 'C');

-- داده اولیه نوبت‌های کاری
insert into shift_types (code, title, value, sort_order)
select 'Day1', 'روزکار اول', 'Day1', 1
where not exists (select 1 from shift_types where code = 'Day1');

insert into shift_types (code, title, value, sort_order)
select 'Day2', 'روزکار دوم', 'Day2', 2
where not exists (select 1 from shift_types where code = 'Day2');

insert into shift_types (code, title, value, sort_order)
select 'Night1', 'شب‌کار اول', 'Night1', 3
where not exists (select 1 from shift_types where code = 'Night1');

insert into shift_types (code, title, value, sort_order)
select 'Night2', 'شب‌کار دوم', 'Night2', 4
where not exists (select 1 from shift_types where code = 'Night2');
