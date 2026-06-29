-- Add full_data to lab_reports for structured quality data (feed/product1/product2/waste × line × magnet/flotation × time × params)
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS full_data jsonb DEFAULT '{}'::jsonb;
