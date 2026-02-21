-- جدول report_control_room (اختیاری)
-- این جدول توسط ابزار «SQL ساخت جدول» در طراحی فرم پیشنهاد می‌شود.
-- توجه: در نسخه فعلی اپ، ذخیره فرم داینامیک «گزارش اتاق کنترل» در جدول report_records انجام می‌شود، نه این جدول.
-- اگر بخواهید در آینده ذخیره را به این جدول منتقل کنید، این اسکریپت را در Supabase SQL Editor اجرا کنید.

create extension if not exists pgcrypto;

create table if not exists public.report_control_room (
  id uuid primary key default gen_random_uuid(),
  definition_slug text not null default 'control_room',
  tracking_code text,
  report_date text,
  shift_name text,
  shift_type text,
  shift_duration text,
  weekday text,
  supervisor_name text,
  personnel_attendance jsonb not null default '{}'::jsonb,
  feed_production_line_a jsonb not null default '{}'::jsonb,
  feed_production_line_b jsonb not null default '{}'::jsonb,
  feed_summary text,
  total_production_a numeric,
  total_production_b numeric,
  ball_mills_data jsonb not null default '{}'::jsonb,
  ball_mills_summary text,
  hydrocyclones_data jsonb not null default '{}'::jsonb,
  hydrocyclone_summary text,
  drum_magnet_line_a_single boolean default false,
  drum_magnet_line_a_upper boolean default false,
  drum_magnet_line_a_middle boolean default false,
  drum_magnet_line_a_lower boolean default false,
  drum_magnet_line_a_desc text,
  drum_magnet_line_b_single boolean default false,
  drum_magnet_line_b_upper boolean default false,
  drum_magnet_line_b_middle boolean default false,
  drum_magnet_line_b_lower boolean default false,
  drum_magnet_line_b_desc text,
  conc_filter_a_operator text,
  conc_filter_a_hours text,
  conc_filter_a_cloths text,
  conc_filter_b_operator text,
  conc_filter_b_hours text,
  conc_filter_b_cloths text,
  conc_filter_reserve_operator text,
  conc_filter_reserve_hours text,
  conc_filter_reserve_cloths text,
  concentrate_filter_summary text,
  thickener_data jsonb not null default '{}'::jsonb,
  thickener_summary text,
  rec_filter_a1_operator text,
  rec_filter_a1_hours text,
  rec_filter_a1_cloths text,
  rec_filter_a2_operator text,
  rec_filter_a2_hours text,
  rec_filter_a2_cloths text,
  rec_filter_b1_operator text,
  rec_filter_b1_hours text,
  rec_filter_b1_cloths text,
  rec_filter_b2_operator text,
  rec_filter_b2_hours text,
  rec_filter_b2_cloths text,
  recovery_filter_summary text,
  line_a_time_pair jsonb not null default '{}'::jsonb,
  line_b_time_pair jsonb not null default '{}'::jsonb,
  downtime_matrix jsonb not null default '{}'::jsonb,
  pump_process_active text,
  pump_clean_water_active text,
  pumps_summary text,
  shift_descriptions numeric,
  next_actions numeric,
  general_notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_report_control_room_report_date on public.report_control_room(report_date);
create index if not exists ix_report_control_room_created_at on public.report_control_room(created_at desc);

alter table public.report_control_room enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='report_control_room' and policyname='report_control_room_select_open'
  ) then
    create policy report_control_room_select_open on public.report_control_room
      for select to anon, authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='report_control_room' and policyname='report_control_room_insert_open'
  ) then
    create policy report_control_room_insert_open on public.report_control_room
      for insert to anon, authenticated with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='report_control_room' and policyname='report_control_room_update_open'
  ) then
    create policy report_control_room_update_open on public.report_control_room
      for update to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update on public.report_control_room to anon, authenticated;
