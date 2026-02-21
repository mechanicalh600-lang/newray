-- مایگریشن: تفکیک محل انبار به ردیف انبار و قفسه
ALTER TABLE parts ADD COLUMN IF NOT EXISTS warehouse_row text;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS shelf text;
