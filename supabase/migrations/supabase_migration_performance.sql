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

create index if not exists ix_performance_eval_personnel on performance_evaluations (personnel_id);
create index if not exists ix_performance_eval_period on performance_evaluations (period);
