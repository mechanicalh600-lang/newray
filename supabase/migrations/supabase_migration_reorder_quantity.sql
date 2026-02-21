-- مایگریشن: افزودن ستون تعداد سفارش به جدول parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS reorder_quantity numeric DEFAULT 0;
