
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { fetchMasterData } from '../../workflowStore';
import { EntityType, COLUMNS_MAP, MANDATORY_FIELDS } from './adminConfig';

const parseCSVLine = (text: string) => {
    const ret = [];
    let start = 0;
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"') inQuote = !inQuote;
        else if (text[i] === ',' && !inQuote) {
            let val = text.substring(start, i).trim();
            if(val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1).replace(/""/g, '"');
            ret.push(val);
            start = i + 1;
        }
    }
    let lastVal = text.substring(start).trim();
    if(lastVal.startsWith('"') && lastVal.endsWith('"')) lastVal = lastVal.slice(1,-1).replace(/""/g, '"');
    ret.push(lastVal);
    return ret;
};

export const useAdminLogic = () => {
  const [activeTab, setActiveTab] = useState<EntityType>('user_groups');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Dropdown Lists State
  const [dropdowns, setDropdowns] = useState({
      personnel: [] as any[],
      userGroups: [] as any[],
      orgUnits: [] as any[],
      equipmentClasses: [] as any[],
      equipmentGroups: [] as any[],
      equipment: [] as any[],
      measurementUnits: [] as any[],
      allCategories: [] as any[],
      locations: [] as any[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    let tableName = activeTab as string;
    if (activeTab.startsWith('part_categories_')) {
        tableName = 'part_categories';
    }

    try {
      let query;

      switch (activeTab) {
          case 'app_users':
              query = supabase
                  .from('app_users')
                  .select('id, username, role, personnel_id, is_default_password, personnel(full_name, unit, personnel_code)')
                  .order('created_at', { ascending: false });
              break;
          
          case 'personnel':
              query = supabase
                  .from('personnel')
                  .select('id, personnel_code, full_name, unit, mobile, email, org_unit_id') 
                  .order('created_at', { ascending: false });
              break;

          case 'equipment':
              query = supabase
                  .from('equipment')
                  .select('*') 
                  .order('created_at', { ascending: false });
              break;

          case 'evaluation_criteria':
              query = supabase
                  .from('evaluation_criteria')
                  .select('*, org_chart(name)') 
                  .order('created_at', { ascending: false });
              break;

          default:
              query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
      }

      const { data: tableData, error } = await query;

      if (error) throw error;

      let processedData = tableData || [];
      
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
      setIsOfflineMode(true);
      setErrorMsg('خطا در دریافت اطلاعات: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedIds([]);
    
    const loadAux = async () => {
        const p = await fetchMasterData('personnel'); 
        const g = await fetchMasterData('user_groups');
        const o = await fetchMasterData('org_chart');
        setDropdowns(d => ({ ...d, personnel: p, userGroups: g, orgUnits: o }));
    };
    loadAux();
  }, [activeTab]);

  const setEditingItemWrapper = (item: any) => {
      // Use the item passed from the table which already contains joined data (e.g. full_name, unit, personnel_code)
      // Do NOT re-fetch using select('*') as it strips joined fields.
      setEditingItem(item); 
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
        const validCols = ['id', 'code', 'name', 'category_id', 'stock_unit_id', 'consumption_unit_id', 'created_at'];
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
    
    if (activeTab === 'app_users' && payload.personnel) delete payload.personnel; 

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

  const handleDelete = async (item: any) => {
    if (!window.confirm('آیا مطمئن هستید؟')) return;
    let tableName = activeTab as string;
    if (activeTab.startsWith('part_categories_')) tableName = 'part_categories';

    try {
        await supabase.from(tableName).delete().eq('id', item.id);
        setData(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
        alert('خطا در حذف');
    }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.length === 0) return;
      if (!window.confirm(`حذف ${selectedIds.length} مورد؟`)) return;
      let tableName = activeTab as string;
      if (activeTab.startsWith('part_categories_')) tableName = 'part_categories';
      try {
          await supabase.from(tableName).delete().in('id', selectedIds);
          setData(prev => prev.filter(i => !selectedIds.includes(i.id)));
          setSelectedIds([]);
      } catch (err) { alert('خطا'); }
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

      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const text = evt.target?.result as string;
              if (!text) return;

              const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
              if (lines.length < 2) throw new Error("فایل خالی یا نامعتبر است");

              const headers = parseCSVLine(lines[0]);
              const rows = [];

              const colDefs = COLUMNS_MAP[activeTab] || [];
              
              const getKeyByHeader = (header: string) => {
                  const def = colDefs.find(c => c.header === header.trim());
                  return def ? def.key : null;
              };

              for (let i = 1; i < lines.length; i++) {
                  const values = parseCSVLine(lines[i]);
                  if (values.length !== headers.length) continue;

                  const rowObj: any = {};
                  
                  headers.forEach((header, idx) => {
                      const key = getKeyByHeader(header);
                      if (key) {
                          let val = values[idx];
                          if (val === 'بله') val = true;
                          if (val === 'خیر') val = false;
                          rowObj[key] = val;
                      }
                  });

                  // --- Intelligent Lookup for IDs ---
                  if (rowObj.org_unit_name) {
                      const found = dropdowns.orgUnits.find(o => o.name === rowObj.org_unit_name);
                      if (found) rowObj.org_unit_id = found.id;
                      delete rowObj.org_unit_name;
                  }
                  
                  if (rowObj.class_name) {
                      const found = dropdowns.equipmentClasses.find(c => c.name === rowObj.class_name);
                      if (found) rowObj.class_id = found.id;
                      delete rowObj.class_name;
                  }
                  if (rowObj.group_name) {
                      const found = dropdowns.equipmentGroups.find(g => g.name === rowObj.group_name);
                      if (found) rowObj.group_id = found.id;
                      delete rowObj.group_name;
                  }

                  if (rowObj.parent_name) {
                      let collection: any[] = [];
                      if (activeTab === 'locations') collection = data; 
                      else if (activeTab === 'org_chart') collection = data; 
                      else if (activeTab.startsWith('part_categories')) {
                          const targetLevel = activeTab === 'part_categories_sub' ? 'MAIN' : 'SUB';
                          collection = dropdowns.allCategories.filter(c => c.level_type === targetLevel);
                      }
                      
                      const found = collection.find((item: any) => item.name === rowObj.parent_name);
                      if (found) rowObj.parent_id = found.id;
                      delete rowObj.parent_name;
                  }

                  // --- FIX: Logic for Parts Import (Resolve IDs from Text) ---
                  if (activeTab === 'parts') {
                      // 1. Resolve Category ID from 'full_category_path' or Name
                      // Assumes format "Parent > Child > Leaf" OR just Leaf Name
                      if (rowObj.full_category_path) {
                          const pathStr = rowObj.full_category_path;
                          // Try exact name match first (e.g. leaf category)
                          let cat = dropdowns.allCategories.find(c => c.name === pathStr && c.level_type === 'SUB_SUB');
                          if (!cat) {
                              // Try to split
                              const parts = pathStr.split(' > ');
                              const leafName = parts[parts.length - 1].trim();
                              cat = dropdowns.allCategories.find(c => c.name === leafName && c.level_type === 'SUB_SUB');
                          }
                          if (cat) rowObj.category_id = cat.id;
                      }

                      // 2. Resolve Unit IDs
                      if (rowObj.stock_unit_name) {
                          const u = dropdowns.measurementUnits.find(m => m.title === rowObj.stock_unit_name);
                          if (u) rowObj.stock_unit_id = u.id;
                      }
                      if (rowObj.consumption_unit_name) {
                          const u = dropdowns.measurementUnits.find(m => m.title === rowObj.consumption_unit_name);
                          if (u) rowObj.consumption_unit_id = u.id;
                      }

                      // 3. Clean up
                      delete rowObj.full_category_path;
                      delete rowObj.stock_unit_name;
                      delete rowObj.consumption_unit_name;
                      delete rowObj.temp_main_cat_id;
                      delete rowObj.temp_sub_cat_id;
                  }

                  delete rowObj.grand_parent_name;
                  delete rowObj.full_category_path;
                  delete rowObj.stock_unit_name;
                  delete rowObj.consumption_unit_name;

                  if (activeTab === 'part_categories_main') rowObj.level_type = 'MAIN';
                  else if (activeTab === 'part_categories_sub') rowObj.level_type = 'SUB';
                  else if (activeTab === 'part_categories_sub_sub') rowObj.level_type = 'SUB_SUB';

                  rows.push(rowObj);
              }

              if (rows.length === 0) throw new Error("هیچ ردیف معتبری یافت نشد");

              let tableName = activeTab as string;
              if (activeTab.startsWith('part_categories')) tableName = 'part_categories';

              setLoading(true);
              const { error } = await supabase.from(tableName).insert(rows);
              if (error) throw error;

              alert(`${rows.length} رکورد با موفقیت وارد شد.`);
              await fetchData();
              
          } catch (err: any) {
              console.error(err);
              alert('خطا در بارگذاری فایل: ' + err.message);
          } finally {
              setLoading(false);
              if (e.target) e.target.value = ''; 
          }
      };
      reader.readAsText(file);
  };

  const handleDownloadSample = () => {
      const dataToExport = selectedIds.length > 0 
          ? data.filter(i => selectedIds.includes(i.id))
          : data;

      const cols = COLUMNS_MAP[activeTab] || [];
      if (cols.length === 0) {
          alert('ستونی برای خروجی تعریف نشده است.');
          return;
      }
      
      const headers = cols.map(c => c.header);
      
      const rows = dataToExport.map(item => {
          return cols.map(c => {
              const val = item[c.key];
              return val ? String(val).replace(/,/g, ' ') : '';
          });
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const dateStr = new Date().toISOString().slice(0,10);
      link.setAttribute("download", `export_${activeTab}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return {
      activeTab, setActiveTab,
      data, loading, errorMsg, isOfflineMode,
      isModalOpen, setIsModalOpen,
      editingItem, setEditingItem: setEditingItemWrapper,
      selectedIds, setSelectedIds,
      dropdowns,
      fileInputRef,
      fetchData, handleSave, handleDelete, handleBulkDelete, 
      handleResetPassword, handleFileUpload, handleDownloadSample
  };
};
