
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { fetchMasterData } from '../../workflowStore';
import { EntityType, COLUMNS_MAP, MANDATORY_FIELDS } from './adminConfig';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export const useAdminLogic = (activeTab: EntityType) => {
  // activeTab is now passed in, not managed internally
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  // Dropdown Lists State
  const [dropdowns, setDropdowns] = useState({
      personnel: [] as any[],
      userGroups: [] as any[],
      orgUnits: [] as any[],
      activityCards: [] as any[],
      equipmentClasses: [] as any[],
      equipmentGroups: [] as any[],
      equipment: [] as any[],
      measurementUnits: [] as any[],
      allCategories: [] as any[],
      locations: [] as any[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [stagedImportRows, setStagedImportRows] = useState<any[]>([]);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);
  const [importValidationErrors, setImportValidationErrors] = useState<{ rowNumber: number; message: string }[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [importResultMsg, setImportResultMsg] = useState('');

  const LOCAL_PROFILE_KEY = 'import_tool_profiles_v1';

  const safeParse = <T,>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const normalizeText = (value: any) => String(value ?? '').trim();

  const toDbValue = (value: any) => {
    if (value === 'بله') return true;
    if (value === 'خیر') return false;
    return value;
  };

  const normalizeTableName = () => {
    if (activeTab.startsWith('part_categories_')) return 'part_categories';
    return activeTab as string;
  };

  const isFetchError = (err: any) => {
    const msg = String(err?.message || '');
    return /Failed to fetch|NetworkError|Load failed/i.test(msg);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const withRetry = async <T,>(action: () => Promise<T>, retries = 2): Promise<T> => {
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await action();
      } catch (err: any) {
        lastError = err;
        if (attempt >= retries || !isFetchError(err)) throw err;
        await sleep(500 * (attempt + 1));
      }
    }
    throw lastError;
  };

  const getRequiredDropdownKeys = (tab: EntityType) => {
    switch (tab) {
      case 'app_users':
        return ['personnel', 'userGroups'];
      case 'personnel':
      case 'org_chart':
      case 'evaluation_criteria':
        return ['orgUnits'];
      case 'locations':
        return ['locations'];
      case 'checklist_items':
        return ['activityCards'];
      case 'equipment_groups':
        return ['equipmentClasses'];
      case 'equipment':
      case 'equipment_local_names':
        return ['equipmentClasses', 'equipmentGroups'];
      case 'maintenance_plans':
      case 'equipment_tree':
        return ['equipment'];
      case 'parts':
        return ['allCategories', 'measurementUnits'];
      case 'part_categories_sub':
      case 'part_categories_sub_sub':
        return ['allCategories'];
      default:
        return [];
    }
  };

  const dropdownKeyToTable: Record<string, string> = {
    personnel: 'personnel',
    userGroups: 'user_groups',
    orgUnits: 'org_chart',
    activityCards: 'activity_cards',
    equipmentClasses: 'equipment_classes',
    equipmentGroups: 'equipment_groups',
    equipment: 'equipment',
    measurementUnits: 'measurement_units',
    allCategories: 'part_categories',
    locations: 'locations',
  };

  const getDropdownSnapshotWithRequiredData = async () => {
    const requiredKeys = getRequiredDropdownKeys(activeTab);
    if (!requiredKeys.length) return dropdowns;

    const missingKeys = requiredKeys.filter((k) => {
      const list = (dropdowns as any)[k];
      return !Array.isArray(list) || list.length === 0;
    });
    if (!missingKeys.length) return dropdowns;

    const loadedEntries = await Promise.all(
      missingKeys.map(async (k) => {
        const table = dropdownKeyToTable[k];
        if (!table) return [k, []] as const;
        try {
          const rows = await withRetry(() => fetchMasterData(table), 1);
          return [k, Array.isArray(rows) ? rows : []] as const;
        } catch {
          return [k, []] as const;
        }
      })
    );

    const merged: any = { ...dropdowns };
    loadedEntries.forEach(([k, rows]) => {
      merged[k] = rows;
    });
    setDropdowns((prev) => ({ ...prev, ...Object.fromEntries(loadedEntries) }));
    return merged;
  };

  const getHeaderMapFromConfig = (config: any) => {
    const defaultMap = (COLUMNS_MAP[activeTab] || []).map((col: any) => ({ header: col.header, key: col.key }));
    if (!config?.headerMap || !Array.isArray(config.headerMap) || config.headerMap.length === 0) return defaultMap;
    const filtered = config.headerMap
      .map((item: any) => ({ header: normalizeText(item.header), key: normalizeText(item.key) }))
      .filter((item: any) => item.header && item.key);
    return filtered.length ? filtered : defaultMap;
  };

  const resolveHeaderKey = (header: string, headerMap: any[]) => {
    const normalized = normalizeText(header).toLowerCase();
    const canonical = (val: string) => normalizeText(val).toLowerCase().replace(/[\s_\-]/g, '');
    const mapped = headerMap.find((c: any) => canonical(c.header) === canonical(normalized));
    if (mapped?.key) return mapped.key;

    const alias: Record<string, string> = {
      operation: 'operation',
      'وضعیت عملیات': 'operation',
      عملیات: 'operation',
      'row status ({0:no change},{1: new},{2: update})': 'operation',
      'row status': 'operation',
      status: 'operation',
      id: 'id',
      شناسه: 'id',
      code: 'code',
      name: 'name',
      department: 'org_unit_name',
      department_id: 'org_unit_id',
      dept: 'org_unit_name',
      unit: 'org_unit_name',
      mobile: 'mobile',
      pic: 'profile_picture',
      photo: 'profile_picture',
      تصویر: 'profile_picture',
      personnel: 'full_name',
      personnel_id: 'personnel_id',
      activity: 'activity_name',
      activity_id: 'activity_card_id',
      equipment: 'equipment_name',
      equipment_id: 'equipment_id',
      category: 'category_name',
      category_id: 'category_id',
      stockunit: 'stock_unit_name',
      stockunit_id: 'stock_unit_id',
      consumptionunit: 'consumption_unit_name',
      consumptionunit_id: 'consumption_unit_id',
      parentunit: 'parent_name',
      parent_id: 'parent_id',
      class: 'class_name',
      class_id: 'class_id',
      group: 'group_name',
      group_id: 'group_id',
      activity_name: 'activity_name',
      equipment_name: 'equipment_name',
      category_name: 'category_name',
      parent_unit: 'parent_name',
      parent_name: 'parent_name',
      کد: 'code',
      نام: 'name',
      org_unit_id: 'org_unit_id',
      activity_card_id: 'activity_card_id',
      stock_unit_id: 'stock_unit_id',
      consumption_unit_id: 'consumption_unit_id',
      class_name: 'class_name',
      group_name: 'group_name',
      org_unit_name: 'org_unit_name',
      stock_unit_name: 'stock_unit_name',
      consumption_unit_name: 'consumption_unit_name',
      full_category_path: 'full_category_path',
    };
    if (alias[normalized]) return alias[normalized];
    const canonicalAlias = Object.entries(alias).find(([k]) => canonical(k) === canonical(normalized));
    return canonicalAlias ? canonicalAlias[1] : null;
  };

  const sanitizeImportRow = (row: any) => {
    const out: any = {};
    Object.keys(row || {}).forEach((k) => {
      if (!k) return;
      if (k.startsWith('__')) return;
      if (k === 'operation') return;
      if (k.endsWith('_helper')) return;
      out[k] = row[k];
    });
    return out;
  };

  const isLookupErrorValue = (value: any) => {
    const text = normalizeText(value).toUpperCase();
    return text === '#N/A' || text === '#VALUE!' || text === '#REF!';
  };

  const triggerWorkbookDownload = async (workbook: ExcelJS.Workbook, fileName: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob(
      [buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const styleSheetCore = (ws: ExcelJS.Worksheet) => {
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });
    const header = ws.getRow(1);
    header.font = { bold: true, size: 13 };
    header.alignment = { horizontal: 'center', vertical: 'middle' };
    header.height = 24;
  };

  const getDefaultReferenceSheets = () => {
    if (!['equipment_groups', 'equipment', 'equipment_local_names'].includes(activeTab)) return [];
    return [
      {
        sheetName: 'equipment_classes_ref',
        table: 'equipment_classes',
        orderBy: 'name',
        columns: [
          { key: 'name', header: 'class_name' },
          { key: 'code', header: 'class_code' },
          { key: 'id', header: 'class_id' }
        ]
      },
      {
        sheetName: 'equipment_groups_ref',
        table: 'equipment_groups',
        orderBy: 'name',
        columns: [
          { key: 'name', header: 'group_name' },
          { key: 'code', header: 'group_code' },
          { key: 'class_name', header: 'class_name' },
          { key: 'class_id', header: 'class_id' },
          { key: 'id', header: 'group_id' }
        ]
      }
    ];
  };

  const getLocalProfiles = () => safeParse<any[]>(localStorage.getItem(LOCAL_PROFILE_KEY), []);

  const getActiveImportProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('import_tool_profiles')
        .select('*')
        .eq('module_key', activeTab)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) return data[0];
    } catch {
      const local = getLocalProfiles().filter((p: any) => p.module_key === activeTab && p.is_active !== false);
      if (local.length > 0) return local[0];
    }
    return null;
  };

  const getEffectiveImportConfig = async () => {
    const profile = await getActiveImportProfile();
    const cfg = profile?.config_json || {};
    const referenceSheets =
      Array.isArray(cfg.referenceSheets) && cfg.referenceSheets.length ? cfg.referenceSheets : getDefaultReferenceSheets();
    return {
      ...cfg,
      referenceSheets,
      batchSize: Number(cfg.batchSize) > 0 ? Number(cfg.batchSize) : 200,
    };
  };

  const resetImportState = () => {
    setStagedImportRows([]);
    setImportPreviewRows([]);
    setImportValidationErrors([]);
    setImportStats({ total: 0, valid: 0, invalid: 0 });
    setImportProgress({ processed: 0, total: 0 });
    setImportResultMsg('');
    setImportFileName('');
  };

  const PAGE_SIZE = 1000;
  const fetchAllPages = async <T,>(buildQuery: (from: number, to: number) => any): Promise<T[]> => {
    const all: T[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const chunk = data || [];
      all.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return all;
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    let tableName = activeTab as string;
    if (activeTab.startsWith('part_categories_')) {
        tableName = 'part_categories';
    }

    try {
      let tableData: any[];

      switch (activeTab) {
          case 'app_users':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('app_users')
                      .select('id, username, role, personnel_id, is_default_password, personnel(full_name, unit, personnel_code)')
                      .order('created_at', { ascending: false })
                      .range(from, to)
              );
              break;
          
          case 'personnel':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('personnel')
                      .select('id, personnel_code, full_name, unit, mobile, email, profile_picture, org_unit_id')
                      .order('personnel_code', { ascending: true })
                      .range(from, to)
              );
              break;

          case 'equipment':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('equipment').select('*').order('created_at', { ascending: false }).range(from, to)
              );
              break;

          case 'evaluation_criteria':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('evaluation_criteria')
                      .select('*, org_chart(name)')
                      .order('created_at', { ascending: false })
                      .range(from, to)
              );
              break;

          case 'shifts':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('shifts').select('*').order('sort_order', { ascending: true }).range(from, to)
              );
              break;

          case 'work_order_status':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('work_order_status').select('*').order('sort_order', { ascending: true }).range(from, to)
              );
              break;

          case 'work_activity_types':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('work_activity_types').select('*').order('sort_order', { ascending: true }).range(from, to)
              );
              break;

          case 'work_types':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('work_types').select('*').order('sort_order', { ascending: true }).range(from, to)
              );
              break;

          case 'work_order_priorities':
              tableData = await fetchAllPages((from, to) =>
                  supabase.from('work_order_priorities').select('*').order('sort_order', { ascending: true }).range(from, to)
              );
              break;

          default:
              tableData = await fetchAllPages((from, to) =>
                  supabase.from(tableName).select('*').order('created_at', { ascending: false }).range(from, to)
              );
      }

      let processedData = tableData;
      
      if (activeTab === 'app_users') {
          processedData = processedData.map((u: any) => ({
              ...u,
              full_name: u.personnel?.full_name || u.username,
              unit: u.personnel?.unit || '---',
              personnel_code: u.personnel?.personnel_code || '---',
          }));
      }

      if (activeTab === 'evaluation_criteria') {
          processedData = processedData.map((item: any) => ({
              ...item,
              org_unit_name: item.org_chart?.name || '---'
          }));
      }

      if (activeTab === 'personnel') {
        const orgUnits = dropdowns.orgUnits && dropdowns.orgUnits.length > 0
          ? dropdowns.orgUnits
          : await fetchMasterData('org_chart');
        const orgById = new Map((orgUnits || []).map((o: any) => [o.id, o]));
        processedData = processedData.map((item: any) => ({
          ...item,
          org_unit_name: orgById.get(item.org_unit_id)?.name || item.unit || '---'
        }));
      }

      if (activeTab.startsWith('part_categories_')) {
          const allCats = tableData || [];
          setDropdowns(prev => ({ ...prev, allCategories: allCats }));
          
          processedData = allCats.map((cat: any) => {
              const parent = allCats.find((c: any) => c.id === cat.parent_id);
              const grandParent = parent ? allCats.find((c: any) => c.id === parent.parent_id) : null;
              return {
                  ...cat,
                  parent_name: parent?.name,
                  grand_parent_name: grandParent?.name
              };
          });

          if (activeTab === 'part_categories_main') processedData = processedData.filter((i: any) => i.level_type === 'MAIN');
          else if (activeTab === 'part_categories_sub') processedData = processedData.filter((i: any) => i.level_type === 'SUB');
          else if (activeTab === 'part_categories_sub_sub') processedData = processedData.filter((i: any) => i.level_type === 'SUB_SUB');
      }

      if (activeTab === 'parts') {
          const cats = await fetchMasterData('part_categories');
          const units = await fetchMasterData('measurement_units');
          setDropdowns(prev => ({ ...prev, allCategories: cats, measurementUnits: units }));
          
          // Enrich parts data with Unit Names for Display
          processedData = processedData.map((p: any) => ({
              ...p,
              stock_unit_name: units.find((u:any) => u.id === p.stock_unit_id)?.title || '-',
              consumption_unit_name: units.find((u:any) => u.id === p.consumption_unit_id)?.title || '-',
              // Helper to display category path if needed
              full_category_path: cats.find((c:any) => c.id === p.category_id)?.name || '-' 
          }));
      }
      
      if (activeTab === 'equipment') {
          const classes = await fetchMasterData('equipment_classes');
          const groups = await fetchMasterData('equipment_groups');
          setDropdowns(prev => ({ ...prev, equipmentClasses: classes, equipmentGroups: groups }));
      }

      if (activeTab === 'production_plans') {
          const SHAMSI_MONTHS = [
            "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
            "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
          ];
          processedData.sort((a: any, b: any) => {
              if (a.year !== b.year) return a.year - b.year; // Sort by Year Ascending
              return SHAMSI_MONTHS.indexOf(a.month) - SHAMSI_MONTHS.indexOf(b.month); // Sort by Month Index
          });
      }

      setIsOfflineMode(false);
      setData(processedData);

    } catch (err: any) {
      console.warn('Fetch failed:', err);
      setIsOfflineMode(isFetchError(err));
      setErrorMsg('خطا در دریافت اطلاعات: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedIds([]);
    
    const loadAux = async () => {
        await getDropdownSnapshotWithRequiredData();
    };
    loadAux();
  }, [activeTab]);

  const setEditingItemWrapper = (item: any) => {
      let enriched = { ...item };
      if (activeTab === 'parts' && item?.category_id && dropdowns.allCategories?.length) {
          const cats = dropdowns.allCategories;
          const cat = cats.find((c: any) => c.id === item.category_id);
          if (cat) {
              if (cat.level_type === 'SUB_SUB') {
                  enriched.temp_sub_cat_id = cat.parent_id || '';
                  const subCat = cats.find((c: any) => c.id === enriched.temp_sub_cat_id);
                  enriched.temp_main_cat_id = subCat?.parent_id || '';
              } else if (cat.level_type === 'SUB') {
                  enriched.temp_main_cat_id = cat.parent_id || '';
                  enriched.temp_sub_cat_id = cat.id;
              } else if (cat.level_type === 'MAIN') {
                  enriched.temp_main_cat_id = cat.id;
              }
          }
      }
      setEditingItem(enriched);
      setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let payload = { ...editingItem };
    let tableName = activeTab as string;

    const checkFormValidity = () => {
        if (!editingItem) return false;
        const cols = COLUMNS_MAP[activeTab];
        if (cols) {
            for (const col of cols) {
                let keyToCheck = col.key as string;
                if (keyToCheck === 'class_name') keyToCheck = 'class_id';
                if (keyToCheck === 'group_name') keyToCheck = 'group_id';
                if (keyToCheck === 'org_unit_name') keyToCheck = 'org_unit_id';

                if (MANDATORY_FIELDS.includes(keyToCheck)) {
                    if (!editingItem[keyToCheck] && editingItem[keyToCheck] !== 0) return false;
                }
            }
        }
        return true;
    };

    if (!checkFormValidity()) {
        setLoading(false);
        alert('لطفا فیلدهای اجباری را پر کنید.');
        return;
    }

    if (activeTab.startsWith('part_categories_')) {
        tableName = 'part_categories';
        if (activeTab === 'part_categories_main') payload.level_type = 'MAIN';
        if (activeTab === 'part_categories_sub') payload.level_type = 'SUB';
        if (activeTab === 'part_categories_sub_sub') payload.level_type = 'SUB_SUB';
        
        delete payload.temp_main_cat_id;
        delete payload.temp_sub_cat_id;
        delete payload.parent_name;
        delete payload.grand_parent_name;
    }

    // STRICT CLEANUP FOR PARTS
    if (activeTab === 'parts') {
        const validCols = ['id', 'code', 'name', 'category_id', 'stock_unit_id', 'consumption_unit_id', 'current_stock', 'min_stock', 'reorder_quantity', 'warehouse_row', 'shelf', 'unit_price', 'created_at'];
        const cleanPayload: any = {};
        validCols.forEach(col => {
            if (payload[col] !== undefined) cleanPayload[col] = payload[col];
        });
        payload = cleanPayload;
    }
    
    // Cleanup for other tables
    delete payload.full_name; delete payload.unit; delete payload.personnel_code; 
    delete payload.org_unit_name; 
    delete payload.org_chart; 
    
    if (activeTab === 'app_users') {
        delete payload.personnel;
        delete payload.personnel_profile;
        if (!payload.id && !payload.password) {
            const p = payload.personnel_id ? dropdowns.personnel?.find((x: any) => x.id === payload.personnel_id) : null;
            payload.password = p?.personnel_code || '123456';
            payload.is_default_password = true;
        }
        const appUserCols = ['id', 'username', 'role', 'personnel_id', 'password', 'is_default_password', 'avatar'];
        const clean: any = {};
        appUserCols.forEach(col => { if (payload[col] !== undefined) clean[col] = payload[col]; });
        payload = clean;
    }

    try {
        if (payload.id) {
            const { error } = await supabase.from(tableName).update(payload).eq('id', payload.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from(tableName).insert([payload]);
            if (error) throw error;
        }
        await fetchData(); 
        setIsModalOpen(false);
    } catch (err: any) {
        alert('خطا در ذخیره: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = (item: any) => {
      setItemToDelete(item);
      setIsBulkDelete(false);
      setIsDeleteModalOpen(true);
  };

  const handleBulkDelete = () => {
      if (selectedIds.length === 0) return;
      setIsBulkDelete(true);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    let tableName = activeTab as string;
    if (activeTab.startsWith('part_categories_')) tableName = 'part_categories';

    try {
        if (isBulkDelete) {
            await supabase.from(tableName).delete().in('id', selectedIds);
            setData(prev => prev.filter(i => !selectedIds.includes(i.id)));
            setSelectedIds([]);
        } else if (itemToDelete) {
            await supabase.from(tableName).delete().eq('id', itemToDelete.id);
            setData(prev => prev.filter(i => i.id !== itemToDelete.id));
        }
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    } catch (err) {
        alert('خطا در حذف');
    }
  };

  const handleResetPassword = async (item: any) => {
      if (!window.confirm(`آیا از بازنشانی رمز عبور کاربر ${item.username || item.full_name} اطمینان دارید؟`)) return;
      
      try {
          let defaultPass = '123456';
          if (item.personnel_code && item.personnel_code !== '---') {
              defaultPass = item.personnel_code;
          }
          
          const { error } = await supabase
              .from('app_users')
              .update({ password: defaultPass, is_default_password: true })
              .eq('id', item.id);
              
          if (error) throw error;
              
          alert(`رمز عبور با موفقیت به "${defaultPass}" بازنشانی شد.`);
      } catch (err: any) {
          alert('خطا در بازنشانی رمز عبور: ' + err.message);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLoading(true);
      setImportResultMsg('');
      setImportFileName(file.name);

      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const config = await getEffectiveImportConfig();
              const lookupData = await getDropdownSnapshotWithRequiredData();
              const data = new Uint8Array(evt.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array', dense: true });
              const sheetName = workbook.SheetNames.includes('data_input') ? 'data_input' : workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              
              // Convert to JSON with headers
              const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

              if (jsonData.length === 0) throw new Error("فایل خالی یا نامعتبر است");

              const headerMap = getHeaderMapFromConfig(config);
              const rows: any[] = [];
              const errors: { rowNumber: number; message: string }[] = [];
              const classesByName = new Map(
                (lookupData.equipmentClasses || []).map((c: any) => [normalizeText(c.name), c])
              );
              const groupsByName = new Map<string, any[]>();
              for (const g of lookupData.equipmentGroups || []) {
                const key = normalizeText(g.name);
                if (!groupsByName.has(key)) groupsByName.set(key, []);
                groupsByName.get(key)!.push(g);
              }
              const orgByName = new Map((lookupData.orgUnits || []).map((o: any) => [normalizeText(o.name), o]));
              const unitByName = new Map((lookupData.measurementUnits || []).map((u: any) => [normalizeText(u.title), u]));
              const categoryByName = new Map((lookupData.allCategories || []).map((c: any) => [normalizeText(c.name), c]));
              const locationByName = new Map((lookupData.locations || []).map((l: any) => [normalizeText(l.name), l]));
              const equipmentByName = new Map((lookupData.equipment || []).map((eq: any) => [normalizeText(eq.name), eq]));
              const activityByName = new Map((lookupData.activityCards || []).map((a: any) => [normalizeText(a.name), a]));
              const personnelByName = new Map((lookupData.personnel || []).map((p: any) => [normalizeText(p.full_name), p]));

              for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex += 1) {
                  const rowItem = jsonData[rowIndex];
                  const rowObj: any = {};
                  const rowErrors: string[] = [];
                  
                  // Map Excel Columns (by Header Name) to DB Keys
                  Object.keys(rowItem).forEach(header => {
                      const key = resolveHeaderKey(header, headerMap);
                      if (key) {
                          rowObj[key] = toDbValue(rowItem[header]);
                      }
                  });

                  const opRaw = rowObj.operation;
                  const opNum = Number(opRaw);
                  const operation = Number.isFinite(opNum) ? opNum : (rowObj.id ? 0 : 1);
                  rowObj.__operation = operation;
                  delete rowObj.operation;

                  // --- Intelligent Lookup for IDs ---
                  if (rowObj.org_unit_name) {
                      const found = orgByName.get(normalizeText(rowObj.org_unit_name));
                      if (found) rowObj.org_unit_id = found.id;
                      else rowErrors.push(`واحد سازمانی '${rowObj.org_unit_name}' یافت نشد.`);
                      delete rowObj.org_unit_name;
                  }
                  if (rowObj.department) {
                      const found = orgByName.get(normalizeText(rowObj.department));
                      if (found) rowObj.org_unit_id = found.id;
                      else rowErrors.push(`واحد سازمانی '${rowObj.department}' یافت نشد.`);
                      delete rowObj.department;
                  }
                  if (rowObj.parent_name) {
                      let found: any = null;
                      if (activeTab === 'locations') found = locationByName.get(normalizeText(rowObj.parent_name));
                      else if (activeTab === 'org_chart') found = orgByName.get(normalizeText(rowObj.parent_name));
                      else if (activeTab === 'part_categories_sub' || activeTab === 'part_categories_sub_sub') {
                        found = (lookupData.allCategories || []).find((c: any) => normalizeText(c.name) === normalizeText(rowObj.parent_name));
                      }
                      if (activeTab === 'equipment_tree') {
                        found = (data || []).find((d: any) => normalizeText(d.name) === normalizeText(rowObj.parent_name));
                      }
                      if (found) rowObj.parent_id = found.id;
                      else rowErrors.push(`رکورد والد '${rowObj.parent_name}' یافت نشد.`);
                      delete rowObj.parent_name;
                  }
                  if (rowObj.equipment_name) {
                      const found = equipmentByName.get(normalizeText(rowObj.equipment_name));
                      if (found) rowObj.equipment_id = found.id;
                      else rowErrors.push(`تجهیز '${rowObj.equipment_name}' یافت نشد.`);
                      delete rowObj.equipment_name;
                  }
                  if (rowObj.activity_name) {
                      const found = activityByName.get(normalizeText(rowObj.activity_name));
                      if (found) rowObj.activity_card_id = found.id;
                      else rowErrors.push(`کارت فعالیت '${rowObj.activity_name}' یافت نشد.`);
                      delete rowObj.activity_name;
                  }
                  if (rowObj.category_name) {
                      const found = categoryByName.get(normalizeText(rowObj.category_name));
                      if (found) rowObj.category_id = found.id;
                      else rowErrors.push(`دسته‌بندی '${rowObj.category_name}' یافت نشد.`);
                      delete rowObj.category_name;
                  }
                  if (rowObj.full_name && rowObj.personnel_id === undefined && activeTab === 'app_users') {
                    const found = personnelByName.get(normalizeText(rowObj.full_name));
                    if (found) rowObj.personnel_id = found.id;
                  }
                  if (isLookupErrorValue(rowObj.org_unit_id)) {
                      rowErrors.push('مقدار Department_ID معتبر نیست (#N/A).');
                  }
                  Object.keys(rowObj).forEach((k) => {
                    if (k.endsWith('_id') && isLookupErrorValue(rowObj[k])) {
                      rowErrors.push(`مقدار '${k}' معتبر نیست (#N/A).`);
                    }
                  });
                  
                  if (rowObj.class_name) {
                      const found = classesByName.get(normalizeText(rowObj.class_name));
                      if (found) rowObj.class_id = found.id;
                      else rowErrors.push(`کلاس تجهیز '${rowObj.class_name}' یافت نشد.`);
                      delete rowObj.class_name;
                  }
                  if (rowObj.group_name) {
                      const candidates = groupsByName.get(normalizeText(rowObj.group_name)) || [];
                      let found = null;
                      if (rowObj.class_id) {
                        found = candidates.find((g: any) => g.class_id === rowObj.class_id) || null;
                        if (!found && candidates.length > 0) {
                          rowErrors.push(`گروه '${rowObj.group_name}' با کلاس انتخاب‌شده همخوان نیست.`);
                        }
                      } else if (candidates.length === 1) {
                        found = candidates[0];
                      } else if (candidates.length > 1) {
                        rowErrors.push(`برای گروه '${rowObj.group_name}' چند کلاس ممکن است. کلاس را هم مشخص کنید.`);
                      }
                      if (found) {
                        rowObj.group_id = found.id;
                        if (!rowObj.class_id) rowObj.class_id = found.class_id;
                      } else if (candidates.length === 0) {
                        rowErrors.push(`گروه تجهیز '${rowObj.group_name}' یافت نشد.`);
                      }
                      delete rowObj.group_name;
                  }

                  // Handle Parts Import Logic
                  if (activeTab === 'parts') {
                      if (rowObj.full_category_path) {
                          const pathStr = rowObj.full_category_path;
                          let cat = (lookupData.allCategories || []).find((c: any) => c.name === pathStr && c.level_type === 'SUB_SUB');
                          if (!cat) {
                              const parts = pathStr.split(' > ');
                              const leafName = parts[parts.length - 1].trim();
                              cat = categoryByName.get(leafName);
                          }
                          if (cat) rowObj.category_id = cat.id;
                          else rowErrors.push(`دسته‌بندی قطعه '${pathStr}' یافت نشد.`);
                      }

                      if (rowObj.stock_unit_name) {
                          const u = unitByName.get(normalizeText(rowObj.stock_unit_name));
                          if (u) rowObj.stock_unit_id = u.id;
                          else rowErrors.push(`واحد '${rowObj.stock_unit_name}' یافت نشد.`);
                      }
                      if (rowObj.consumption_unit_name) {
                          const u = unitByName.get(normalizeText(rowObj.consumption_unit_name));
                          if (u) rowObj.consumption_unit_id = u.id;
                          else rowErrors.push(`واحد '${rowObj.consumption_unit_name}' یافت نشد.`);
                      }

                      delete rowObj.full_category_path;
                      delete rowObj.stock_unit_name;
                      delete rowObj.consumption_unit_name;
                  }

                  if (activeTab === 'part_categories_main') rowObj.level_type = 'MAIN';
                  else if (activeTab === 'part_categories_sub') rowObj.level_type = 'SUB';
                  else if (activeTab === 'part_categories_sub_sub') rowObj.level_type = 'SUB_SUB';

                  const mappedKeys = Object.keys(rowObj);
                  if (mappedKeys.filter((k) => !k.startsWith('__')).length === 0) {
                    rowErrors.push('هیچ ستونی از فایل با نگاشت فعلی قابل تشخیص نبود.');
                  }

                  if (![0, 1, 2].includes(operation)) {
                    rowErrors.push('مقدار ستون operation باید یکی از 0، 1 یا 2 باشد.');
                  }

                  if (operation === 2 && !rowObj.id) {
                    rowErrors.push('برای عملیات 2 (ویرایش)، مقدار id الزامی است.');
                  }

                  if (operation !== 0) {
                    for (const m of MANDATORY_FIELDS) {
                      if (mappedKeys.includes(m) && (rowObj[m] === undefined || rowObj[m] === null || rowObj[m] === '')) {
                        rowErrors.push(`فیلد اجباری '${m}' خالی است.`);
                      }
                    }
                  }

                  if (rowErrors.length > 0) {
                    errors.push({ rowNumber: rowIndex + 2, message: rowErrors.join(' | ') });
                  } else {
                    rows.push(rowObj);
                  }
              }

              setStagedImportRows(rows);
              setImportPreviewRows(rows.slice(0, 20));
              setImportValidationErrors(errors);
              setImportStats({ total: jsonData.length, valid: rows.length, invalid: errors.length });
              if (rows.length === 0) {
                setImportResultMsg('هیچ ردیف معتبری برای ورود وجود ندارد. خطاها را بررسی کنید.');
              } else {
                setImportResultMsg(
                  `فایل آماده ورود شد. ${rows.length} ردیف معتبر و ${errors.length} ردیف نامعتبر شناسایی شد.`
                );
              }
              setIsImportModalOpen(true);
              
          } catch (err: any) {
              console.error(err);
              setImportResultMsg('خطا در بارگذاری فایل: ' + err.message);
              setIsImportModalOpen(true);
          } finally {
              setLoading(false);
              if (e.target) e.target.value = ''; 
          }
      };
      reader.readAsArrayBuffer(file);
  };

  const toSheetData = (rows: any[], cols: any[]) => rows.map(item => {
    const row: any = {};
    cols.forEach(col => {
      row[col.key] = item[col.key] !== null && item[col.key] !== undefined ? item[col.key] : '';
    });
    return row;
  });

  const getColumnLetter = (index: number) => {
    let result = '';
    let current = index;
    while (current > 0) {
      const mod = (current - 1) % 26;
      result = String.fromCharCode(65 + mod) + result;
      current = Math.floor((current - mod) / 26);
    }
    return result;
  };

  const handleDownloadSample = async () => {
      const dataToExport = selectedIds.length > 0 
          ? data.filter(i => selectedIds.includes(i.id))
          : data;

      if (activeTab === 'user_groups') {
        const workbook = new ExcelJS.Workbook();
        const dataSheet = workbook.addWorksheet('data_input', { properties: { tabColor: { argb: 'FF1E40AF' } } });
        const guideSheet = workbook.addWorksheet('guide', { properties: { tabColor: { argb: 'FF16A34A' } } });

        dataSheet.columns = [
          { header: 'Row Status ({0:No Change},{1: New},{2: Update})', key: 'operation', width: 28 },
          { header: 'Code', key: 'code', width: 20 },
          { header: 'Name', key: 'name', width: 34 },
          { header: '', key: '__empty_col', width: 8 },
          { header: 'ID', key: 'id', width: 42 },
        ];

        const rows = (dataToExport.length > 0 ? dataToExport : [{ code: '', name: '', id: '' }]).map((item: any) => ({
          operation: 0,
          code: item.code ?? '',
          name: item.name ?? '',
          __empty_col: '',
          id: item.id ?? '',
        }));
        rows.forEach((r) => dataSheet.addRow(r));
        dataSheet.getColumn('id').hidden = true;

        dataSheet.autoFilter = { from: 'A1', to: 'E1' };
        styleSheetCore(dataSheet);

        guideSheet.columns = [{ header: 'Guide', key: 'guide', width: 92 }];
        [
          'راهنمای فایل گروه‌های کاربری',
          'ستون 1: Row Status ({0:No Change},{1: New},{2: Update})',
          '0 = بدون تغییر (ردیف نادیده گرفته می‌شود)',
          '1 = رکورد جدید (نیازی به ID نیست)',
          '2 = ویرایش رکورد موجود (ID الزامی است)',
          'ستون 2: Code',
          'ستون 3: Name',
          'ستون 5: ID',
        ].forEach((line) => guideSheet.addRow({ guide: line }));
        styleSheetCore(guideSheet);

        const dateStr = new Date().toISOString().slice(0, 10);
        await triggerWorkbookDownload(workbook, `export_${activeTab}_${dateStr}.xlsx`);
        return;
      }

      if (activeTab === 'personnel') {
        const workbook = new ExcelJS.Workbook();
        const dataSheet = workbook.addWorksheet('data_input', { properties: { tabColor: { argb: 'FF1E40AF' } } });
        const refSheet = workbook.addWorksheet('org_chart_ref', { properties: { tabColor: { argb: 'FF6B7280' } } });
        const guideSheet = workbook.addWorksheet('guide', { properties: { tabColor: { argb: 'FF16A34A' } } });

        dataSheet.columns = [
          { header: 'Row Status ({0:No Change},{1: New},{2: Update})', key: 'operation', width: 28 },
          { header: 'Code', key: 'personnel_code', width: 20 },
          { header: 'Name', key: 'full_name', width: 34 },
          { header: 'Department', key: 'org_unit_name', width: 28 },
          { header: 'Department_ID', key: 'org_unit_id', width: 42 },
          { header: 'Mobile', key: 'mobile', width: 20 },
          { header: 'Pic', key: 'profile_picture', width: 44 },
          { header: '', key: '__empty_col', width: 8 },
          { header: 'ID', key: 'id', width: 42 },
        ];

        const rows = (dataToExport.length > 0 ? dataToExport : [{ personnel_code: '', full_name: '', org_unit_name: '', mobile: '', profile_picture: '', id: '' }]).map((item: any) => ({
          operation: 0,
          personnel_code: item.personnel_code ?? '',
          full_name: item.full_name ?? '',
          org_unit_name: item.org_unit_name ?? item.unit ?? '',
          org_unit_id: '',
          mobile: item.mobile ?? '',
          profile_picture: item.profile_picture ?? '',
          __empty_col: '',
          id: item.id ?? '',
        }));
        rows.forEach((r) => dataSheet.addRow(r));
        dataSheet.getColumn('id').hidden = true;

        const firstFormulaCell = dataSheet.getCell('E2');
        firstFormulaCell.value = { formula: `VLOOKUP(D2,org_chart_ref!C:G,5,FALSE)` };

        const orgUnits = dropdowns.orgUnits || [];
        const orgById = new Map(orgUnits.map((o: any) => [o.id, o]));
        const orgRows = orgUnits.map((o: any) => ({
          operation: 0,
          code: o.code ?? '',
          name: o.name ?? '',
          parent_name: o.parent_id ? (orgById.get(o.parent_id)?.name ?? '') : '',
          manager_name: o.manager_name ?? '',
          __empty_col: '',
          id: o.id ?? '',
        }));
        refSheet.columns = [
          { header: 'Row Status ({0:No Change},{1: New},{2: Update})', key: 'operation', width: 28 },
          { header: 'Code', key: 'code', width: 20 },
          { header: 'Name', key: 'name', width: 34 },
          { header: 'Parent Unit', key: 'parent_name', width: 28 },
          { header: 'Manager', key: 'manager_name', width: 26 },
          { header: '', key: '__empty_col', width: 8 },
          { header: 'ID', key: 'id', width: 42 },
        ];
        (orgRows.length
          ? orgRows
          : [{ operation: 0, code: '', name: '', parent_name: '', manager_name: '', __empty_col: '', id: '' }]
        ).forEach((r: any) => refSheet.addRow(r));
        refSheet.getColumn('id').hidden = true;
        refSheet.autoFilter = { from: 'A1', to: 'G1' };

        dataSheet.autoFilter = { from: 'A1', to: 'I1' };
        styleSheetCore(dataSheet);
        styleSheetCore(refSheet);

        guideSheet.columns = [{ header: 'Guide', key: 'guide', width: 96 }];
        [
          'راهنمای فایل پرسنل',
          'این فایل شامل یک شیت هدف و شیت‌های کمکی است.',
          'ستون 1: Row Status ({0:No Change},{1: New},{2: Update})',
          '0 = بدون تغییر (ردیف نادیده گرفته می‌شود)',
          '1 = رکورد جدید (نیازی به ID نیست)',
          '2 = ویرایش رکورد موجود (ID الزامی است)',
          'ستون 4 (Department) را متن وارد کنید.',
          'ستون 5 (Department_ID) با VLOOKUP خودکار مقدار می‌گیرد.',
          'اگر متن Department اشتباه باشد، در Department_ID خطای #N/A نمایش داده می‌شود.',
          'ستون Mobile اختیاری است.',
          'ستون Pic می‌تواند URL یا Base64 باشد.',
        ].forEach((line) => guideSheet.addRow({ guide: line }));
        styleSheetCore(guideSheet);

        const dateStr = new Date().toISOString().slice(0, 10);
        await triggerWorkbookDownload(workbook, `export_${activeTab}_${dateStr}.xlsx`);
        return;
      }

      // Generic export for remaining base-info tabs with FK-aware helper sheets
      {
        type LookupRule = {
          textKey: string;
          textHeader: string;
          idKey: string;
          idHeader: string;
          sheetName: string;
          sourceTable: string;
          sourceNameKey: string;
          sourceCodeKey?: string;
          sourceFilter?: (row: any) => boolean;
        };

        const lookupRulesByTab: Partial<Record<EntityType, LookupRule[]>> = {
          app_users: [
            { textKey: 'full_name', textHeader: 'Personnel', idKey: 'personnel_id', idHeader: 'Personnel_ID', sheetName: 'personnel_ref', sourceTable: 'personnel', sourceNameKey: 'full_name', sourceCodeKey: 'personnel_code' },
          ],
          locations: [
            { textKey: 'parent_name', textHeader: 'Parent Unit', idKey: 'parent_id', idHeader: 'Parent_ID', sheetName: 'locations_ref', sourceTable: 'locations', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          org_chart: [
            { textKey: 'parent_name', textHeader: 'Parent Unit', idKey: 'parent_id', idHeader: 'Parent_ID', sheetName: 'org_chart_ref', sourceTable: 'org_chart', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          equipment_groups: [
            { textKey: 'class_name', textHeader: 'Class', idKey: 'class_id', idHeader: 'Class_ID', sheetName: 'equipment_classes_ref', sourceTable: 'equipment_classes', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          equipment: [
            { textKey: 'class_name', textHeader: 'Class', idKey: 'class_id', idHeader: 'Class_ID', sheetName: 'equipment_classes_ref', sourceTable: 'equipment_classes', sourceNameKey: 'name', sourceCodeKey: 'code' },
            { textKey: 'group_name', textHeader: 'Group', idKey: 'group_id', idHeader: 'Group_ID', sheetName: 'equipment_groups_ref', sourceTable: 'equipment_groups', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          equipment_local_names: [
            { textKey: 'class_name', textHeader: 'Class', idKey: 'class_id', idHeader: 'Class_ID', sheetName: 'equipment_classes_ref', sourceTable: 'equipment_classes', sourceNameKey: 'name', sourceCodeKey: 'code' },
            { textKey: 'group_name', textHeader: 'Group', idKey: 'group_id', idHeader: 'Group_ID', sheetName: 'equipment_groups_ref', sourceTable: 'equipment_groups', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          evaluation_criteria: [
            { textKey: 'org_unit_name', textHeader: 'Department', idKey: 'org_unit_id', idHeader: 'Department_ID', sheetName: 'org_chart_ref', sourceTable: 'org_chart', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          checklist_items: [
            { textKey: 'activity_name', textHeader: 'Activity', idKey: 'activity_card_id', idHeader: 'Activity_ID', sheetName: 'activity_cards_ref', sourceTable: 'activity_cards', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          maintenance_plans: [
            { textKey: 'equipment_name', textHeader: 'Equipment', idKey: 'equipment_id', idHeader: 'Equipment_ID', sheetName: 'equipment_ref', sourceTable: 'equipment', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          equipment_tree: [
            { textKey: 'equipment_name', textHeader: 'Equipment', idKey: 'equipment_id', idHeader: 'Equipment_ID', sheetName: 'equipment_ref', sourceTable: 'equipment', sourceNameKey: 'name', sourceCodeKey: 'code' },
          ],
          part_categories_sub: [
            { textKey: 'parent_name', textHeader: 'Main Category', idKey: 'parent_id', idHeader: 'Parent_ID', sheetName: 'part_categories_main_ref', sourceTable: 'part_categories', sourceNameKey: 'name', sourceCodeKey: 'code', sourceFilter: (r: any) => r.level_type === 'MAIN' },
          ],
          part_categories_sub_sub: [
            { textKey: 'parent_name', textHeader: 'Sub Category', idKey: 'parent_id', idHeader: 'Parent_ID', sheetName: 'part_categories_sub_ref', sourceTable: 'part_categories', sourceNameKey: 'name', sourceCodeKey: 'code', sourceFilter: (r: any) => r.level_type === 'SUB' },
          ],
          parts: [
            { textKey: 'category_name', textHeader: 'Category', idKey: 'category_id', idHeader: 'Category_ID', sheetName: 'part_categories_ref', sourceTable: 'part_categories', sourceNameKey: 'name', sourceCodeKey: 'code' },
            { textKey: 'stock_unit_name', textHeader: 'Stock Unit', idKey: 'stock_unit_id', idHeader: 'StockUnit_ID', sheetName: 'measurement_units_ref', sourceTable: 'measurement_units', sourceNameKey: 'title', sourceCodeKey: 'symbol' },
            { textKey: 'consumption_unit_name', textHeader: 'Consumption Unit', idKey: 'consumption_unit_id', idHeader: 'ConsumptionUnit_ID', sheetName: 'measurement_units_ref', sourceTable: 'measurement_units', sourceNameKey: 'title', sourceCodeKey: 'symbol' },
          ],
        };

        const cols = COLUMNS_MAP[activeTab] || [];
        if (cols.length === 0) {
          alert('ستونی برای خروجی تعریف نشده است.');
          return;
        }

        const rules = lookupRulesByTab[activeTab] || [];
        const workbook = new ExcelJS.Workbook();
        const dataSheet = workbook.addWorksheet('data_input', { properties: { tabColor: { argb: 'FF1E40AF' } } });
        const guideSheet = workbook.addWorksheet('guide', { properties: { tabColor: { argb: 'FF16A34A' } } });

        const targetColumns: { key: string; header: string; width: number }[] = [
          { key: 'operation', header: 'Row Status ({0:No Change},{1: New},{2: Update})', width: 28 },
        ];

        const ensureCol = (key: string, header: string, width = 26) => {
          if (!targetColumns.some((c) => c.key === key)) targetColumns.push({ key, header, width });
        };

        cols.forEach((c: any) => {
          const rule = rules.find((r) => r.idKey === c.key);
          if (rule) ensureCol(rule.textKey, rule.textHeader, 28);
          ensureCol(c.key, c.header, c.key.endsWith('_id') ? 40 : 24);
        });
        rules.forEach((r) => {
          ensureCol(r.textKey, r.textHeader, 28);
          ensureCol(r.idKey, r.idHeader, 40);
        });
        ensureCol('__empty_col', '', 8);
        ensureCol('id', 'ID', 42);

        dataSheet.columns = targetColumns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
        const rows = (dataToExport.length > 0 ? dataToExport : [{}]).map((item: any) => {
          const row: any = { operation: 0 };
          targetColumns.forEach((c) => {
            if (c.key === 'operation' || c.key === '__empty_col') return;
            row[c.key] = item[c.key] ?? '';
          });
          return row;
        });
        rows.forEach((r) => dataSheet.addRow(r));
        dataSheet.getColumn('id').hidden = true;
        const lastCol = getColumnLetter(targetColumns.length);
        dataSheet.autoFilter = { from: 'A1', to: `${lastCol}1` };
        styleSheetCore(dataSheet);

        const getLookupData = async (rule: LookupRule) => {
          let sourceRows: any[] = [];
          if (rule.sourceTable === 'personnel') sourceRows = dropdowns.personnel || [];
          else if (rule.sourceTable === 'org_chart') sourceRows = dropdowns.orgUnits || [];
          else if (rule.sourceTable === 'equipment_classes') sourceRows = dropdowns.equipmentClasses || [];
          else if (rule.sourceTable === 'equipment_groups') sourceRows = dropdowns.equipmentGroups || [];
          else if (rule.sourceTable === 'equipment') sourceRows = dropdowns.equipment || [];
          else if (rule.sourceTable === 'measurement_units') sourceRows = dropdowns.measurementUnits || [];
          else if (rule.sourceTable === 'part_categories') sourceRows = dropdowns.allCategories || [];
          else if (rule.sourceTable === 'locations') sourceRows = dropdowns.locations || [];
          else if (rule.sourceTable === 'activity_cards') sourceRows = dropdowns.activityCards || [];
          else sourceRows = await fetchMasterData(rule.sourceTable);
          return rule.sourceFilter ? sourceRows.filter(rule.sourceFilter) : sourceRows;
        };

        for (const rule of rules) {
          if (workbook.getWorksheet(rule.sheetName)) continue;
          const refSheet = workbook.addWorksheet(rule.sheetName, { properties: { tabColor: { argb: 'FF6B7280' } } });
          refSheet.columns = [
            { header: 'Row Status ({0:No Change},{1: New},{2: Update})', key: 'operation', width: 28 },
            { header: 'Code', key: 'code', width: 20 },
            { header: 'Name', key: 'name', width: 34 },
            { header: 'Context', key: 'context', width: 26 },
            { header: '', key: '__empty_col', width: 8 },
            { header: 'ID', key: 'id', width: 42 },
          ];
          const sourceRows = await getLookupData(rule);
          (sourceRows.length ? sourceRows : [{}]).forEach((src: any) => {
            refSheet.addRow({
              operation: 0,
              code: src[rule.sourceCodeKey || 'code'] ?? '',
              name: src[rule.sourceNameKey] ?? '',
              context: src.class_name || src.unit || src.level_type || '',
              __empty_col: '',
              id: src.id ?? '',
            });
          });
          refSheet.getColumn('id').hidden = true;
          refSheet.autoFilter = { from: 'A1', to: 'F1' };
          styleSheetCore(refSheet);
        }

        for (const rule of rules) {
          const textColIndex = targetColumns.findIndex((c) => c.key === rule.textKey);
          const idColIndex = targetColumns.findIndex((c) => c.key === rule.idKey);
          if (textColIndex < 0 || idColIndex < 0) continue;
          const textCol = getColumnLetter(textColIndex + 1);
          const idCol = getColumnLetter(idColIndex + 1);
          dataSheet.getCell(`${idCol}2`).value = { formula: `VLOOKUP(${textCol}2,${rule.sheetName}!C:F,4,FALSE)` };
        }

        guideSheet.columns = [{ header: 'Guide', key: 'guide', width: 96 }];
        [
          `راهنمای فایل ${TABLE_LABELS[activeTab] || activeTab}`,
          'ستون Row Status:',
          '0 = بدون تغییر',
          '1 = رکورد جدید',
          '2 = ویرایش رکورد موجود (ID الزامی)',
          'برای ستون‌های متنی وابسته، مقدار متنی وارد کنید تا ID با VLOOKUP محاسبه شود.',
          'در صورت اشتباه بودن مقدار متنی، خطای #N/A نمایش داده می‌شود.',
        ].forEach((line) => guideSheet.addRow({ guide: line }));
        styleSheetCore(guideSheet);

        const dateStr = new Date().toISOString().slice(0, 10);
        await triggerWorkbookDownload(workbook, `export_${activeTab}_${dateStr}.xlsx`);
        return;
      }

      const cols = COLUMNS_MAP[activeTab] || [];
      if (cols.length === 0) {
          alert('ستونی برای خروجی تعریف نشده است.');
          return;
      }
      
      const targetColumns: { key: string; header: string }[] = [];
      targetColumns.push({ key: 'operation', header: 'operation' });
      targetColumns.push({ key: 'id', header: 'id' });
      cols.forEach((c: any) => {
        if (!targetColumns.some(tc => tc.key === c.key)) targetColumns.push({ key: c.key, header: c.header });
      });
      if (['equipment_groups', 'equipment', 'equipment_local_names'].includes(activeTab)) {
        if (!targetColumns.some(tc => tc.key === 'class_name')) targetColumns.push({ key: 'class_name', header: 'class_name' });
        if (!targetColumns.some(tc => tc.key === 'class_id')) targetColumns.push({ key: 'class_id', header: 'class_id' });
        if (!targetColumns.some(tc => tc.key === 'group_name')) targetColumns.push({ key: 'group_name', header: 'group_name' });
        if (!targetColumns.some(tc => tc.key === 'group_id')) targetColumns.push({ key: 'group_id', header: 'group_id' });
      }

      const exportData = toSheetData(dataToExport, targetColumns);
      exportData.forEach((r) => {
        r.operation = 0;
        r.id = r.id || '';
      });

      // If no data, create a template with headers
      if (exportData.length === 0) {
          const emptyRow: any = {};
          targetColumns.forEach(col => { emptyRow[col.key] = ''; });
          emptyRow.operation = 1;
          exportData.push(emptyRow);
      }

      const wb = XLSX.utils.book_new();
      const headerRow = targetColumns.map(c => c.header);
      const bodyRows = exportData.map((item) => targetColumns.map(c => item[c.key] ?? ''));
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
      XLSX.utils.book_append_sheet(wb, ws, "data_input");
      (ws as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: Math.max(0, headerRow.length - 1), r: Math.max(1, bodyRows.length) } }) };
      (ws as any)['!cols'] = targetColumns.map((c) => ({ wch: c.key === 'operation' ? 14 : c.key === 'id' ? 40 : 22 }));

      const config = await getEffectiveImportConfig();
      const referenceSheets = Array.isArray(config.referenceSheets) ? config.referenceSheets : [];

      for (const ref of referenceSheets) {
        const sheetName = normalizeText(ref.sheetName || 'reference').slice(0, 31) || 'reference';
        const table = normalizeText(ref.table);
        const columns = Array.isArray(ref.columns) ? ref.columns : [];
        if (!table || columns.length === 0) continue;
        try {
          const keys = columns.map((c: any) => c.key).filter(Boolean);
          if (!keys.length) continue;
          const orderBy = normalizeText(ref.orderBy || keys[0]);
          const refChunks: any[] = [];
          let refFrom = 0;
          while (true) {
              const { data: chunk, error } = await supabase.from(table).select(keys.join(',')).order(orderBy, { ascending: true }).range(refFrom, refFrom + PAGE_SIZE - 1);
              if (error) throw error;
              refChunks.push(...(chunk || []));
              if (!chunk || chunk.length < PAGE_SIZE) break;
              refFrom += PAGE_SIZE;
          }
          const formatted = refChunks.map((item: any) => {
            const row: any = {};
            columns.forEach((c: any) => {
              row[c.header || c.key] = item[c.key] ?? '';
            });
            return row;
          });
          const refSheet = XLSX.utils.json_to_sheet(formatted.length > 0 ? formatted : [{ [columns[0].header || columns[0].key]: '' }]);
          XLSX.utils.book_append_sheet(wb, refSheet, sheetName);
        } catch (err) {
          console.warn(`Reference sheet '${sheetName}' failed:`, err);
        }
      }

      if (['equipment_groups', 'equipment', 'equipment_local_names'].includes(activeTab)) {
        const headers = targetColumns.map(c => c.header);
        const helperHeaders: string[] = [];
        const classHeaderIndex = targetColumns.findIndex(c => c.key === 'class_name');
        const groupHeaderIndex = targetColumns.findIndex(c => c.key === 'group_name');
        const classIdHeaderIndex = targetColumns.findIndex(c => c.key === 'class_id');
        const groupIdHeaderIndex = targetColumns.findIndex(c => c.key === 'group_id');

        if (classHeaderIndex >= 0) helperHeaders.push('class_id_helper (VLOOKUP)');
        if (groupHeaderIndex >= 0) helperHeaders.push('group_id_helper (VLOOKUP)');

        if (helperHeaders.length > 0) {
          const startCol = headers.length + 1;
          helperHeaders.forEach((h, idx) => {
            const cell = XLSX.utils.encode_cell({ c: startCol - 1 + idx, r: 0 });
            (ws as any)[cell] = { t: 's', v: h };
          });

          const maxRows = Math.max(exportData.length + 1, 300);
          for (let r = 2; r <= maxRows; r += 1) {
            let helperOffset = 0;
            if (classHeaderIndex >= 0) {
              const classCol = getColumnLetter(classHeaderIndex + 1);
              const targetCol = XLSX.utils.encode_cell({ c: startCol - 1 + helperOffset, r: r - 1 });
              (ws as any)[targetCol] = { f: `VLOOKUP(${classCol}${r},equipment_classes_ref!A:C,3,FALSE)` };
              if (classIdHeaderIndex >= 0) {
                const classIdCol = XLSX.utils.encode_cell({ c: classIdHeaderIndex, r: r - 1 });
                (ws as any)[classIdCol] = { f: `VLOOKUP(${classCol}${r},equipment_classes_ref!A:C,3,FALSE)` };
              }
              helperOffset += 1;
            }
            if (groupHeaderIndex >= 0) {
              const groupCol = getColumnLetter(groupHeaderIndex + 1);
              const targetCol = XLSX.utils.encode_cell({ c: startCol - 1 + helperOffset, r: r - 1 });
              (ws as any)[targetCol] = { f: `VLOOKUP(${groupCol}${r},equipment_groups_ref!A:E,5,FALSE)` };
              if (groupIdHeaderIndex >= 0) {
                const groupIdCol = XLSX.utils.encode_cell({ c: groupIdHeaderIndex, r: r - 1 });
                (ws as any)[groupIdCol] = { f: `VLOOKUP(${groupCol}${r},equipment_groups_ref!A:E,5,FALSE)` };
              }
            }
          }

          const ref = (ws as any)['!ref'] || XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: exportData.length } });
          const decoded = XLSX.utils.decode_range(ref);
          decoded.e.c = startCol - 1 + helperHeaders.length;
          decoded.e.r = Math.max(decoded.e.r, Math.max(exportData.length, 300));
          (ws as any)['!ref'] = XLSX.utils.encode_range(decoded);
        }
      }

      const guideRows = [
        ['راهنمای تکمیل فایل'],
        ['ستون operation:'],
        ['0 = بارگذاری بدون تغییر (ردیف نادیده گرفته می‌شود)'],
        ['1 = رکورد جدید (insert)'],
        ['2 = ویرایش رکورد موجود (update با id)'],
        ['1) هر فایل یک شیت هدف data_input دارد و بقیه شیت‌ها کمکی هستند.'],
        ['2) برای جداول وابسته، از شیت‌های *_ref استفاده کنید.'],
        ['3) ردیف اول داده، فرمول VLOOKUP آماده دارد.'],
        ['4) برای operation=2 مقدار id الزامی است.'],
      ];
      const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
      (guideSheet as any)['!cols'] = [{ wch: 90 }];
      XLSX.utils.book_append_sheet(wb, guideSheet, 'guide');

      const sheetMeta = wb.SheetNames.map((name) => {
        if (name === 'data_input') return { name, TabColor: { rgb: '1E40AF' } };
        if (name === 'guide') return { name, TabColor: { rgb: '16A34A' } };
        return { name, TabColor: { rgb: '6B7280' } };
      });
      (wb as any).Workbook = { Sheets: sheetMeta };
      
      const dateStr = new Date().toISOString().slice(0,10);
      XLSX.writeFile(wb, `export_${activeTab}_${dateStr}.xlsx`);
  };

  const executeStagedImport = async () => {
    if (stagedImportRows.length === 0) return;
    const config = await getEffectiveImportConfig();
    const tableName = normalizeText(config.target_table || normalizeTableName());
    const batchSize = Number(config.batchSize) > 0 ? Number(config.batchSize) : 200;
    const actionableRows = stagedImportRows.filter((r: any) => Number(r.__operation ?? 1) !== 0);

    setIsImporting(true);
    setImportProgress({ processed: 0, total: actionableRows.length });
    setImportResultMsg('');

    try {
      let inserted = 0;
      let updated = 0;
      let skipped = stagedImportRows.length - actionableRows.length;
      if (actionableRows.length === 0) {
        setImportResultMsg('همه ردیف‌ها روی حالت 0 (بدون تغییر) هستند؛ ورودی انجام نشد.');
        return;
      }

      const insertRows = actionableRows
        .filter((r: any) => Number(r.__operation ?? 1) === 1)
        .map((r: any) => {
          const payload = sanitizeImportRow(r);
          delete payload.id;
          return payload;
        });

      for (let i = 0; i < insertRows.length; i += batchSize) {
        const batch = insertRows.slice(i, i + batchSize);
        const { error } = await withRetry(() => supabase.from(tableName).insert(batch), 2);
        if (error) throw error;
        inserted += batch.length;
        setImportProgress({ processed: inserted + updated, total: actionableRows.length });
      }

      const updateRows = actionableRows
        .filter((r: any) => Number(r.__operation ?? 1) === 2)
        .map((raw: any) => {
          const payload = sanitizeImportRow(raw);
          const id = raw.id;
          delete payload.id;
          return { id, payload };
        });

      const updateBatchSize = Math.min(batchSize, 50);
      for (let i = 0; i < updateRows.length; i += updateBatchSize) {
        const batch = updateRows.slice(i, i + updateBatchSize);
        const results = await Promise.all(
          batch.map((item) =>
            withRetry(() => supabase.from(tableName).update(item.payload).eq('id', item.id), 2)
          )
        );
        const firstError = results.find((r: any) => r?.error)?.error;
        if (firstError) throw firstError;
        updated += batch.length;
        setImportProgress({ processed: inserted + updated, total: actionableRows.length });
      }
      setImportResultMsg(`عملیات با موفقیت انجام شد. ${inserted} رکورد جدید، ${updated} رکورد ویرایش، ${skipped} ردیف بدون تغییر.`);
      await fetchData();
      setStagedImportRows([]);
    } catch (err: any) {
      if (isFetchError(err)) {
        setImportResultMsg('خطا در ورود نهایی: ارتباط با سرور ناپایدار است (Failed to fetch). لطفا چند لحظه بعد دوباره ثبت نهایی را بزنید.');
      } else {
        setImportResultMsg(`خطا در ورود نهایی: ${err?.message || 'unknown error'}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  return {
      // activeTab is NOT returned anymore as it's prop-driven
      data, loading, errorMsg, isOfflineMode,
      isModalOpen, setIsModalOpen,
      editingItem, setEditingItem: setEditingItemWrapper,
      selectedIds, setSelectedIds,
      dropdowns,
      fileInputRef,
      fetchData, handleSave, handleDelete, handleBulkDelete, 
      handleResetPassword, handleFileUpload, handleDownloadSample,
      isDeleteModalOpen, setIsDeleteModalOpen, confirmDelete,
      isImportModalOpen, setIsImportModalOpen,
      importPreviewRows,
      importValidationErrors,
      importFileName,
      importStats,
      importProgress,
      isImporting,
      importResultMsg,
      resetImportState,
      executeStagedImport,
  };
};
