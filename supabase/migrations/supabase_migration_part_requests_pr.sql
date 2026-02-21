-- افزودن PR به تابع get_next_tracking_code برای درخواست قطعه
create or replace function get_next_tracking_code(prefix_input text)
returns text language plpgsql as $$
declare last_code text; next_num integer;
begin
  select tracking_code into last_code from cartable_items where tracking_code like prefix_input || '%' order by tracking_code desc limit 1;
  if last_code is null and prefix_input = 'PTW' then select tracking_code into last_code from work_permits order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'HSE' then select tracking_code into last_code from hse_reports order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'SUG' then select tracking_code into last_code from technical_suggestions order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'MT' then select tracking_code into last_code from meeting_minutes order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'PR' then select tracking_code into last_code from part_requests order by tracking_code desc limit 1; end if;
  if last_code is null then next_num := 1; else begin next_num := to_number(right(last_code, 4), '9999') + 1; exception when others then next_num := 1; end; end if;
  return prefix_input || lpad(next_num::text, 4, '0');
end;
$$;
