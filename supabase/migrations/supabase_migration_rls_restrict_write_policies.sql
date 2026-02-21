-- رفع هشدار RLS Policy Always True: محدود کردن نوشتن به authenticated و service_role
--
-- هشدار: اگر لاگین اپ با app_users است و از Supabase Auth (signInWithPassword و JWT)
-- استفاده نمی‌کنید، این فایل را اجرا نکنید؛ در آن حالت auth.role() معمولاً anon است
-- و همهٔ INSERT/UPDATE/DELETE مسدود می‌شوند. در آن صورت هشدار Linter را نادیده بگیرید.
--
-- فقط وقتی اجرا کنید که درخواست‌های اپ با توکن authenticated (یا service_role) ارسال می‌شوند.

-- ========== جداول با policyهای جدا (مثلاً *_insert_open و *_update_open) ==========
-- حذف policyهای باز و ایجاد policy با شرط نقش برای INSERT و UPDATE

do $$
declare
  r record;
  policies_to_drop text[] := array[
    'activity_cards_insert_open','activity_cards_update_open',
    'app_settings_insert_open','app_settings_update_open',
    'app_users_insert_open','app_users_update_open',
    'cartable_items_insert_open','cartable_items_update_open',
    'checklist_items_insert_open','checklist_items_update_open',
    'data_change_audit_insert_open',
    'equipment_insert_open','equipment_update_open',
    'equipment_classes_insert_open','equipment_classes_update_open',
    'equipment_groups_insert_open','equipment_groups_update_open',
    'equipment_local_names_insert_open','equipment_local_names_update_open',
    'equipment_tree_insert_open','equipment_tree_update_open',
    'evaluation_criteria_insert_open','evaluation_criteria_update_open',
    'evaluation_periods_insert_open','evaluation_periods_update_open',
    'lab_reports_insert_open','lab_reports_update_open',
    'locations_insert_open','locations_update_open',
    'maintenance_plans_insert_open','maintenance_plans_update_open',
    'measurement_units_insert_open','measurement_units_update_open',
    'org_chart_insert_open','org_chart_update_open',
    'part_categories_insert_open','part_categories_update_open',
    'part_requests_insert_open','part_requests_update_open',
    'parts_insert_open','parts_update_open',
    'personnel_insert_open','personnel_update_open',
    'production_plans_insert_open','production_plans_update_open',
    'report_definitions_insert_open','report_definitions_update_open',
    'report_records_delete_open','report_records_insert_open','report_records_update_open',
    'shift_reports_insert_open','shift_reports_update_open',
    'system_logs_insert_open','system_logs_update_open',
    'user_groups_insert_open','user_groups_update_open',
    'warehouse_reports_insert_open','warehouse_reports_update_open',
    'work_orders_insert_open','work_orders_update_open'
  ];
  pol text;
  tbl text;
  policy_table_map jsonb := '{
    "activity_cards_insert_open":"activity_cards","activity_cards_update_open":"activity_cards",
    "app_settings_insert_open":"app_settings","app_settings_update_open":"app_settings",
    "app_users_insert_open":"app_users","app_users_update_open":"app_users",
    "cartable_items_insert_open":"cartable_items","cartable_items_update_open":"cartable_items",
    "checklist_items_insert_open":"checklist_items","checklist_items_update_open":"checklist_items",
    "data_change_audit_insert_open":"data_change_audit",
    "equipment_insert_open":"equipment","equipment_update_open":"equipment",
    "equipment_classes_insert_open":"equipment_classes","equipment_classes_update_open":"equipment_classes",
    "equipment_groups_insert_open":"equipment_groups","equipment_groups_update_open":"equipment_groups",
    "equipment_local_names_insert_open":"equipment_local_names","equipment_local_names_update_open":"equipment_local_names",
    "equipment_tree_insert_open":"equipment_tree","equipment_tree_update_open":"equipment_tree",
    "evaluation_criteria_insert_open":"evaluation_criteria","evaluation_criteria_update_open":"evaluation_criteria",
    "evaluation_periods_insert_open":"evaluation_periods","evaluation_periods_update_open":"evaluation_periods",
    "lab_reports_insert_open":"lab_reports","lab_reports_update_open":"lab_reports",
    "locations_insert_open":"locations","locations_update_open":"locations",
    "maintenance_plans_insert_open":"maintenance_plans","maintenance_plans_update_open":"maintenance_plans",
    "measurement_units_insert_open":"measurement_units","measurement_units_update_open":"measurement_units",
    "org_chart_insert_open":"org_chart","org_chart_update_open":"org_chart",
    "part_categories_insert_open":"part_categories","part_categories_update_open":"part_categories",
    "part_requests_insert_open":"part_requests","part_requests_update_open":"part_requests",
    "parts_insert_open":"parts","parts_update_open":"parts",
    "personnel_insert_open":"personnel","personnel_update_open":"personnel",
    "production_plans_insert_open":"production_plans","production_plans_update_open":"production_plans",
    "report_definitions_insert_open":"report_definitions","report_definitions_update_open":"report_definitions",
    "report_records_delete_open":"report_records","report_records_insert_open":"report_records","report_records_update_open":"report_records",
    "shift_reports_insert_open":"shift_reports","shift_reports_update_open":"shift_reports",
    "system_logs_insert_open":"system_logs","system_logs_update_open":"system_logs",
    "user_groups_insert_open":"user_groups","user_groups_update_open":"user_groups",
    "warehouse_reports_insert_open":"warehouse_reports","warehouse_reports_update_open":"warehouse_reports",
    "work_orders_insert_open":"work_orders","work_orders_update_open":"work_orders"
  }'::jsonb;
begin
  for pol in select unnest(policies_to_drop)
  loop
    tbl := policy_table_map ->> pol;
    if tbl is not null then
      execute format('drop policy if exists %I on public.%I', pol, tbl);
    end if;
  end loop;
end $$;

-- ایجاد policyهای جدید برای INSERT و UPDATE (با شرط نقش)
do $$
declare
  t text;
  tables1 text[] := array[
    'activity_cards','app_settings','app_users','cartable_items','checklist_items','data_change_audit',
    'equipment','equipment_classes','equipment_groups','equipment_local_names','equipment_tree',
    'evaluation_criteria','evaluation_periods','lab_reports','locations','maintenance_plans','measurement_units',
    'org_chart','part_categories','part_requests','parts','personnel','production_plans',
    'report_definitions','report_records','shift_reports','system_logs','user_groups','warehouse_reports','work_orders'
  ];
begin
  foreach t in array tables1
  loop
    execute format(
      'create policy "allow_insert_authenticated" on public.%I for insert with check (auth.role() in (''authenticated'',''service_role''))',
      t
    );
    execute format(
      'create policy "allow_update_authenticated" on public.%I for update using (auth.role() in (''authenticated'',''service_role'')) with check (auth.role() in (''authenticated'',''service_role''))',
      t
    );
  end loop;
  -- report_records: حذف با همان شرط
  execute format('create policy "allow_delete_authenticated" on public.report_records for delete using (auth.role() in (''authenticated'',''service_role''))');
end $$;

-- جداول با policy "Enable all access" (FOR ALL): جایگزینی با SELECT باز + INSERT/UPDATE/DELETE محدود
do $$
declare
  t text;
  tables2 text[] := array[
    'announcement_acknowledgments','coding_formats','import_tool_profiles','personnel_skills',
    'report_control_room','shift_types','shifts','user_column_preferences',
    'work_activity_types','work_order_priorities','work_order_status','work_types'
  ];
begin
  foreach t in array tables2
  loop
    if t = 'import_tool_profiles' then
      execute format('drop policy if exists "import_tool_profiles_write_anon" on public.%I', t);
    else
      execute format('drop policy if exists "Enable all access" on public.%I', t);
    end if;
    execute format('create policy "allow_select_all" on public.%I for select using (true)', t);
    execute format('create policy "allow_insert_authenticated" on public.%I for insert with check (auth.role() in (''authenticated'',''service_role''))', t);
    execute format('create policy "allow_update_authenticated" on public.%I for update using (auth.role() in (''authenticated'',''service_role'')) with check (auth.role() in (''authenticated'',''service_role''))', t);
    execute format('create policy "allow_delete_authenticated" on public.%I for delete using (auth.role() in (''authenticated'',''service_role''))', t);
  end loop;
end $$;
