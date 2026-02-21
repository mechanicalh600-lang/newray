-- مایگریشن: افزودن بودجه و اهداف به جدول projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS objectives jsonb DEFAULT '[]'::jsonb;
