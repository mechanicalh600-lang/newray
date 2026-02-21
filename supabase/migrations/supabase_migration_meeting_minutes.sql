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

create index if not exists ix_meeting_minutes_date on meeting_minutes (meeting_date);
create index if not exists ix_meeting_minutes_created on meeting_minutes (created_at desc);

-- افزودن MT به تابع get_next_tracking_code
create or replace function get_next_tracking_code(prefix_input text)
returns text language plpgsql as $$
declare last_code text; next_num integer;
begin
  select tracking_code into last_code from cartable_items where tracking_code like prefix_input || '%' order by tracking_code desc limit 1;
  if last_code is null and prefix_input = 'PTW' then select tracking_code into last_code from work_permits order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'HSE' then select tracking_code into last_code from hse_reports order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'SUG' then select tracking_code into last_code from technical_suggestions order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'MT' then select tracking_code into last_code from meeting_minutes order by tracking_code desc limit 1; end if;
  if last_code is null then next_num := 1; else begin next_num := to_number(right(last_code, 4), '9999') + 1; exception when others then next_num := 1; end; end if;
  return prefix_input || lpad(next_num::text, 4, '0');
end;
$$;
