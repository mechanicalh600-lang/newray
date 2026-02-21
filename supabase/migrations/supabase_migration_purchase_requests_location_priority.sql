-- افزودن ستون‌های محل خرید و اولویت به درخواست خرید
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority text;
