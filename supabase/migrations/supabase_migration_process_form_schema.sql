-- طراحی داینامیک فرم‌های عملیاتی (فرآیندها)
-- Safe and idempotent

alter table public.process_modules
  add column if not exists form_schema jsonb not null default '{"tabs":[],"fields":[],"groups":[]}'::jsonb,
  add column if not exists list_schema jsonb not null default '{"columns":[]}'::jsonb,
  add column if not exists use_dynamic_form boolean not null default false,
  add column if not exists form_version int not null default 1,
  add column if not exists published_form_version int not null default 0;

-- ماژول‌های تکمیلی (در صورت نبود)
insert into public.process_modules (slug, module_key, title, icon, entity_table, entity_status_field, form_route, sort_order, is_builtin, is_active, condition_fields)
values
  ('pm-plan', 'PM_PLAN', 'برنامه PM', 'timer', 'pm_plans', 'is_active', '/pm-scheduler', 11, true, true, '[]'::jsonb),
  ('service-repair', 'SERVICE_REPAIR', 'خدمات / تعمیرات', 'wrench', 'service_repair_requests', 'status', '/service-repair', 12, true, true, '[]'::jsonb),
  ('permit', 'PERMIT', 'مجوز کار (PTW)', 'hardhat', 'work_permits', 'status', '/permits', 13, true, true, '[]'::jsonb),
  ('training-course', 'TRAINING_COURSE', 'دوره آموزشی', 'bookopen', 'training_courses', 'title', '/training-courses', 14, true, true, '[]'::jsonb),
  ('personnel-skill', 'PERSONNEL_SKILL', 'مهارت پرسنل', 'graduationcap', 'personnel_skills', 'level', '/training', 15, true, true, '[]'::jsonb)
on conflict (slug) do nothing;
