-- جدول ماتریس مهارت و آموزش پرسنل
create table if not exists personnel_skills (
  id uuid default gen_random_uuid() primary key,
  personnel_id uuid references personnel(id) on delete cascade,
  skill_name text not null,
  level text,
  certificate_date text,
  expiry_date text,
  created_at timestamptz default now()
);

create index if not exists ix_personnel_skills_personnel on personnel_skills (personnel_id);
create index if not exists ix_personnel_skills_skill on personnel_skills (skill_name);
create index if not exists ix_personnel_skills_level on personnel_skills (level);

-- در صورت وجود جدول قبلی بدون expiry_date
ALTER TABLE personnel_skills ADD COLUMN IF NOT EXISTS expiry_date text;
