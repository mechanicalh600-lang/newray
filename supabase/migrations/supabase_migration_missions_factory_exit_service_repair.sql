-- مأموریت پرسنلی، خروج کالا از کارخانه، فرم خدمات/تعمیرات

create table if not exists public.personnel_missions (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique,
  personnel_id uuid references public.personnel(id),
  personnel_name text not null,
  personnel_code text,
  unit text,
  mission_date text,
  start_date text,
  end_date text,
  destination text not null,
  purpose text,
  transport_type text default 'شرکت',
  status text not null default 'PENDING',
  requester_id uuid,
  requester_name text,
  approver_name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_personnel_missions_tracking on public.personnel_missions(tracking_code);
create index if not exists ix_personnel_missions_status on public.personnel_missions(status);

create table if not exists public.factory_goods_exits (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique,
  exit_date text not null,
  exit_time text,
  destination text,
  recipient_name text,
  recipient_org text,
  vehicle_plate text,
  driver_name text,
  gate_pass_no text,
  line_items jsonb not null default '[]'::jsonb,
  description text,
  status text not null default 'PENDING',
  requester_id uuid,
  requester_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_factory_goods_exits_tracking on public.factory_goods_exits(tracking_code);
create index if not exists ix_factory_goods_exits_date on public.factory_goods_exits(exit_date);

create table if not exists public.service_repair_requests (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique,
  request_date text not null,
  equipment_id uuid references public.equipment(id),
  equipment_name text,
  equipment_code text,
  service_type text not null default 'REPAIR',
  vendor_name text,
  description text not null,
  urgency text default 'NORMAL',
  estimated_cost numeric default 0,
  completion_date text,
  status text not null default 'PENDING',
  requester_id uuid,
  requester_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_service_repair_requests_tracking on public.service_repair_requests(tracking_code);
create index if not exists ix_service_repair_requests_status on public.service_repair_requests(status);

alter table public.app_settings add column if not exists mission_prefix text default 'MIS';
alter table public.app_settings add column if not exists factory_exit_prefix text default 'FEX';
alter table public.app_settings add column if not exists service_repair_prefix text default 'SRV';

-- به‌روزرسانی تابع کد رهگیری
create or replace function public.get_next_tracking_code(prefix_input text)
returns text language plpgsql as $$
declare last_code text; next_num integer;
begin
  select tracking_code into last_code from cartable_items where tracking_code like prefix_input || '%' order by tracking_code desc limit 1;
  if last_code is null and prefix_input = 'PTW' then select tracking_code into last_code from work_permits order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'HSE' then select tracking_code into last_code from hse_reports order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'SUG' then select tracking_code into last_code from technical_suggestions order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'MT' then select tracking_code into last_code from meeting_minutes order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'PR' then select tracking_code into last_code from part_requests order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'MIS' then select tracking_code into last_code from personnel_missions order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'FEX' then select tracking_code into last_code from factory_goods_exits order by tracking_code desc limit 1; end if;
  if last_code is null and prefix_input = 'SRV' then select tracking_code into last_code from service_repair_requests order by tracking_code desc limit 1; end if;
  if last_code is null then next_num := 1; else begin next_num := to_number(right(last_code, 4), '9999') + 1; exception when others then next_num := 1; end; end if;
  return prefix_input || lpad(next_num::text, 4, '0');
end;
$$;

alter table public.personnel_missions enable row level security;
alter table public.factory_goods_exits enable row level security;
alter table public.service_repair_requests enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'personnel_missions' and policyname = 'personnel_missions_all') then
    create policy personnel_missions_all on public.personnel_missions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'factory_goods_exits' and policyname = 'factory_goods_exits_all') then
    create policy factory_goods_exits_all on public.factory_goods_exits for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'service_repair_requests' and policyname = 'service_repair_requests_all') then
    create policy service_repair_requests_all on public.service_repair_requests for all using (true) with check (true);
  end if;
end $$;
