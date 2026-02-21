
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Eye, Edit, Trash2, X, MoreVertical, FilterX, FileText, Columns3, CheckCircle, Circle } from 'lucide-react';
import { fetchUserColumnPreferences, saveUserColumnPreferences } from '../services/userColumnPreferences';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortKey?: keyof T | string; // Key to sort and filter by
}

interface SmartTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title: string;
  subtitle?: string; 
  icon?: React.ElementType;
  onAdd?: () => void;
  searchKeys?: (keyof T | string)[];
  extraActions?: React.ReactNode; 
  selectedIds?: string[]; 
  onSelect?: (ids: string[]) => void; 
  isLoading?: boolean; 
  onEdit?: (item: T) => void | Promise<void>;
  onDelete?: (item: T) => void | Promise<void>;
  onViewDetails?: (item: T) => void | Promise<void>;
  customRowActions?: (item: T) => React.ReactNode;
  filterContent?: React.ReactNode;
  /** کلید ذخیره ستون‌های قابل مشاهده (مثلاً نام صفحه) */
  columnVisibilityKey?: string;
  /** شناسه کاربر برای ذخیره در دیتابیس (اگر موجود باشد، ترجیحات در DB ذخیره می‌شود) */
  userId?: string | null;
  /** عرض پیش‌فرض ستون‌ها (key = sortKey) وقتی مقدار ذخیره‌شده وجود نداشته باشد */
  defaultColumnWidths?: Record<string, number>;
}

export function SmartTable<T extends { id: string }>({ 
  data, 
  columns, 
  title, 
  subtitle,
  icon: Icon, 
  onAdd, 
  extraActions,
  selectedIds: controlledSelectedIds,
  onSelect,
  isLoading = false,
  onEdit,
  onDelete,
  onViewDetails,
  customRowActions,
  filterContent,
  columnVisibilityKey,
  userId,
  defaultColumnWidths = {}
}: SmartTableProps<T>) {
  
  const [filteredData, setFilteredData] = useState<T[]>(data);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Column Filters State
  const [colSearch, setColSearch] = useState<Record<string, string>>({});
  const [colCheckboxFilters, setColCheckboxFilters] = useState<Record<string, string[]>>({});
  const [activeMenuColumn, setActiveMenuColumn] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Column Visibility - راست‌کلیک روی هدر برای انتخاب ستون‌های قابل نمایش
  const getColKey = (col: Column<T>, idx: number) => col.sortKey as string || col.header || `col_${idx}`;
  const allColumnKeys = useMemo(() => new Set(columns.map((c, i) => getColKey(c, i))), [columns]);

  const loadFromLocalStorage = (): Set<string> => {
    const allKeys = new Set(allColumnKeys);
    if (!columnVisibilityKey || typeof localStorage === 'undefined') return allKeys;
    try {
      const saved = localStorage.getItem(`columnVisibility_${columnVisibilityKey}`);
      if (saved) {
        const arr = JSON.parse(saved) as string[];
        const savedSet = new Set(arr.filter(k => allKeys.has(k)));
        allKeys.forEach(k => { if (!arr.includes(k)) savedSet.add(k); });
        return savedSet;
      }
    } catch { /* ignore */ }
    return allKeys;
  };

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(loadFromLocalStorage);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [columnMenuPos, setColumnMenuPos] = useState({ x: 0, y: 0 });
  const columnMenuRef = useRef<HTMLDivElement>(null);

  const DEFAULT_COL_WIDTH = 150;
  const MIN_COL_WIDTH = 80;
  const MAX_COL_WIDTH = 400;
  const loadColumnWidths = (): Record<string, number> => {
    const merged = { ...defaultColumnWidths };
    if (!columnVisibilityKey || typeof localStorage === 'undefined') return merged;
    try {
      const saved = localStorage.getItem(`columnWidths_${columnVisibilityKey}`);
      if (saved) Object.assign(merged, JSON.parse(saved));
    } catch { /* ignore */ }
    return merged;
  };
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(loadColumnWidths);
  const [resizeState, setResizeState] = useState<{ key: string; colIndex: number; startX: number; startW: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;
  useEffect(() => {
    if (!resizeState) return;
    const cols = tableRef.current?.querySelectorAll('colgroup col');
    const colEl = cols && cols[resizeState.colIndex] ? cols[resizeState.colIndex] : null;

    const onMove = (e: MouseEvent) => {
      const delta = resizeState.startX - e.clientX;
      const newW = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, resizeState.startW + delta));
      if (colEl instanceof HTMLTableColElement) colEl.style.width = `${newW}px`;
      columnWidthsRef.current = { ...columnWidthsRef.current, [resizeState.key]: newW };
    };
    const onUp = () => {
      const finalW = columnWidthsRef.current[resizeState.key] ?? resizeState.startW;
      setColumnWidths(prev => ({ ...prev, [resizeState.key]: finalW }));
      setResizeState(null);
      if (columnVisibilityKey && typeof localStorage !== 'undefined') {
        try {
          const merged = { ...loadColumnWidths(), ...columnWidthsRef.current };
          localStorage.setItem(`columnWidths_${columnVisibilityKey}`, JSON.stringify(merged));
        } catch { /* ignore */ }
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [resizeState, columnVisibilityKey]);

  const getColWidth = (col: Column<T>, idx: number) => {
    const key = getColKey(col, idx);
    return columnWidths[key] ?? defaultColumnWidths[key] ?? DEFAULT_COL_WIDTH;
  };

  // بارگذاری از دیتابیس وقتی userId موجود است
  useEffect(() => {
    if (!userId || !columnVisibilityKey) {
      setVisibleColumnKeys(loadFromLocalStorage);
      return;
    }
    let cancelled = false;
    fetchUserColumnPreferences(userId, columnVisibilityKey).then(arr => {
      if (cancelled) return;
      const allKeys = new Set(columns.map((c, i) => getColKey(c, i)));
      const savedSet = new Set(arr.filter(k => allKeys.has(k)));
      allKeys.forEach(k => { if (!arr.includes(k)) savedSet.add(k); });
      setVisibleColumnKeys(savedSet);
    }).catch(() => { if (!cancelled) setVisibleColumnKeys(loadFromLocalStorage); });
    return () => { cancelled = true; };
  }, [userId, columnVisibilityKey, columns.length]);

  const persistVisibility = (keys: string[]) => {
    if (userId && columnVisibilityKey) {
      saveUserColumnPreferences(userId, columnVisibilityKey, keys).catch(() => {});
    }
    if (columnVisibilityKey && typeof localStorage !== 'undefined') {
      try { localStorage.setItem(`columnVisibility_${columnVisibilityKey}`, JSON.stringify(keys)); } catch { /* ignore */ }
    }
  };

  const toggleColumnVisibility = (key: string) => {
    setVisibleColumnKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else next.add(key);
      persistVisibility([...next]);
      return next;
    });
  };

  const selectAllColumns = () => {
    const all = [...allColumnKeys];
    setVisibleColumnKeys(new Set(all));
    persistVisibility(all);
  };

  const displayColumns = useMemo(() => columns.filter((col, idx) => visibleColumnKeys.has(getColKey(col, idx))), [columns, visibleColumnKeys]);

  // Internal selection state
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds || internalSelectedIds;
  const handleSelectionChange = onSelect || setInternalSelectedIds;

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(() => {
      const firstSortable = columns.find(c => c.sortKey);
      return firstSortable ? { key: firstSortable.sortKey as string, direction: 'desc' } : null;
  });

  // Helper to get nested value safely
  const getValue = (obj: any, path: string) => {
      if (!path) return '';
      return path.split('.').reduce((o, i) => (o ? o[i] : null), obj);
  };

  // Safe string conversion to avoid "Cannot convert object to primitive value"
  const toSafeString = (val: any): string => {
      try {
          if (val == null) return '';
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
          if (typeof val === 'object') return ''; // Skip objects for primitive contexts
          return String(val);
      } catch (e) {
          // #region agent log
          try { fetch('http://127.0.0.1:7242/ingest/097c7630-12f5-40fb-a619-4417ec1884fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmartTable.toSafeString', message: 'toSafeString threw', data: { err: String(e) }, timestamp: Date.now(), hypothesisId: 'H6-smarttable' }) }).catch(() => {}); } catch (_) {}
          // #endregion
          return '';
      }
  };

  // Helper for deep recursive search
  const getDeepValues = (obj: any, _seen?: WeakSet<object>): string => {
      try {
          if (obj === null || obj === undefined) return '';
          if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
          if (Array.isArray(obj)) return obj.map(v => getDeepValues(v, _seen)).join(' ');
          if (typeof obj === 'object') {
              const seen = _seen || new WeakSet();
              if (seen.has(obj)) return '';
              seen.add(obj);
              try {
                  return Object.values(obj).map(v => getDeepValues(v, seen)).join(' ');
              } catch (e) {
                  // #region agent log
                  try { fetch('http://127.0.0.1:7242/ingest/097c7630-12f5-40fb-a619-4417ec1884fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmartTable.getDeepValues', message: 'getDeepValues threw', data: { err: String(e) }, timestamp: Date.now(), hypothesisId: 'H6-smarttable' }) }).catch(() => {}); } catch (_) {}
                  // #endregion
                  return '';
              }
          }
          return '';
      } catch (e) {
          // #region agent log
          try { fetch('http://127.0.0.1:7242/ingest/097c7630-12f5-40fb-a619-4417ec1884fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmartTable.getDeepValues.outer', message: 'getDeepValues outer threw', data: { err: String(e) }, timestamp: Date.now(), hypothesisId: 'H6-smarttable' }) }).catch(() => {}); } catch (_) {}
          // #endregion
          return '';
      }
  };

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) setActiveMenuColumn(null);
          if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) setColumnMenuOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Unique Values for Checkbox Filters (Memoized)
  const uniqueColumnValues = useMemo(() => {
      const values: Record<string, string[]> = {};
      columns.forEach(col => {
          if (col.sortKey) {
              const key = col.sortKey as string;
              const unique = new Set(data.map(item => toSafeString(getValue(item, key))));
              values[key] = Array.from(unique).filter(Boolean).sort();
          }
      });
      return values;
  }, [data, columns]);

  // Main Filtering Logic
  useEffect(() => {
    let res = [...data];

    // 1. Global Search (Deep Search)
    if (globalSearch) {
      const lowerTerm = globalSearch.toLowerCase();
      res = res.filter(item => {
        const allValues = getDeepValues(item).toLowerCase();
        return allValues.includes(lowerTerm);
      });
    }

    // 2. Column Text Search
    Object.keys(colSearch).forEach(key => {
        if (colSearch[key]) {
            const term = colSearch[key].toLowerCase();
            res = res.filter(item => toSafeString(getValue(item, key)).toLowerCase().includes(term));
        }
    });

    // 3. Column Checkbox Filter
    Object.keys(colCheckboxFilters).forEach(key => {
        if (colCheckboxFilters[key] && colCheckboxFilters[key].length > 0) {
            res = res.filter(item => colCheckboxFilters[key].includes(toSafeString(getValue(item, key))));
        }
    });

    // 4. Sort
    if (sortConfig) {
      res.sort((a: any, b: any) => {
        const aVal = getValue(a, sortConfig.key);
        const bVal = getValue(b, sortConfig.key);

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum) && typeof aVal !== 'boolean' && typeof bVal !== 'boolean') {
             return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const comparison = toSafeString(aVal).localeCompare(toSafeString(bVal));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredData(res);
    if (currentPage !== 1) setCurrentPage(1);
  }, [data, globalSearch, colSearch, colCheckboxFilters, sortConfig]);

  // Handlers
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const clearAllFilters = () => {
      setGlobalSearch('');
      setColSearch({});
      setColCheckboxFilters({});
  };

  const toggleCheckboxFilter = (columnKey: string, value: string) => {
      setColCheckboxFilters(prev => {
          const current = prev[columnKey] || [];
          if (current.includes(value)) {
              const filtered = current.filter(v => v !== value);
              return filtered.length > 0 ? { ...prev, [columnKey]: filtered } : { ...prev, [columnKey]: [] };
          } else {
              return { ...prev, [columnKey]: [...current, value] };
          }
      });
  };

  const selectAllCheckbox = (columnKey: string) => {
      const allValues = uniqueColumnValues[columnKey] || [];
      const currentSelected = colCheckboxFilters[columnKey] || [];
      
      if (currentSelected.length === allValues.length) {
          setColCheckboxFilters(prev => ({ ...prev, [columnKey]: [] })); // Deselect All
      } else {
          setColCheckboxFilters(prev => ({ ...prev, [columnKey]: allValues })); // Select All
      }
  };

  // Pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedData = filteredData.slice(start, end);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      let page = parseInt(e.target.value);
      if (isNaN(page) || page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      setCurrentPage(page);
  };

  // Selection Logic
  const handleSelectAll = () => {
    if (filteredData.length > 0 && selectedIds.length === filteredData.length) {
      handleSelectionChange([]);
    } else {
      handleSelectionChange(filteredData.map(i => i.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
        handleSelectionChange(selectedIds.filter(i => i !== id));
    } else {
        handleSelectionChange([...selectedIds, id]);
    }
  };

  const colSpan = displayColumns.length + 1 + (customRowActions ? 1 : 0); // +1 Checkbox, +1 Actions

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setColumnMenuPos({ x: e.clientX, y: e.clientY });
    setColumnMenuOpen(true);
  };
  const hasActiveFilters = globalSearch || Object.keys(colSearch).some(k => colSearch[k]) || Object.keys(colCheckboxFilters).some(k => colCheckboxFilters[k]?.length > 0);

  return (
    <div className="space-y-2">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          {Icon && <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm"><Icon className="w-6 h-6 text-primary" /></div>}
          <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
              {subtitle ? (
                  <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              ) : (
                  title && <p className="text-xs text-gray-500 mt-1">مدیریت لیست {title}</p>
              )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجو در کل جدول..." 
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all"
                />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
               {extraActions}

              {/* Filter - بلافاصله بعد از بروزرسانی (مطابق سایر صفحات) */}
              {filterContent && (
                  <button 
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className={`p-2 rounded-lg border transition ${isFilterPanelOpen ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`} 
                    title="فیلترهای پیشرفته"
                  >
                     <Filter className="w-5 h-5" />
                  </button>
              )}
               
               {onAdd && (
                  <button 
                  onClick={onAdd}
                  className="p-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition"
                  title="ثبت جدید"
                  >
                      <Plus className="w-5 h-5" />
                  </button>
              )}
              
              {/* Clear Filters Button */}
              {hasActiveFilters && (
                  <button 
                    onClick={clearAllFilters}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100"
                    title="پاکسازی تمام فیلترها"
                  >
                      <FilterX className="w-5 h-5" />
                  </button>
              )}
              <button
                onClick={(e) => { setColumnMenuPos({ x: e.clientX, y: e.clientY }); setColumnMenuOpen(true); }}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                title="ستون‌های قابل نمایش"
              >
                <Columns3 className="w-5 h-5" />
              </button>
            </div>
        </div>
        
        {/* Advanced Filter Panel */}
        {isFilterPanelOpen && filterContent && (
            <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 p-4 animate-fadeIn">
                {filterContent}
            </div>
        )}
      </div>

      {/* Column Visibility Menu - راست‌کلیک روی هدر */}
      {columnMenuOpen && (
        <div
          ref={columnMenuRef}
          className="fixed z-[100] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 py-2 min-w-[200px] animate-fadeIn"
          style={{ left: columnMenuPos.x, top: columnMenuPos.y }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Columns3 className="w-4 h-4" />
              ستون‌های قابل نمایش
            </span>
            <button
              type="button"
              onClick={selectAllColumns}
              className="text-[10px] text-blue-500 hover:underline"
            >
              همه
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
            {columns.map((col, idx) => {
              const key = getColKey(col, idx);
              const isVisible = visibleColumnKeys.has(key);
              return (
                <label
                  key={key}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumnVisibility(key)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>{col.header}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 relative">
          <div className={`overflow-x-auto min-h-[520px] ${resizeState ? 'select-none' : ''}`} style={resizeState ? { cursor: 'col-resize' } : undefined}>
              <table ref={tableRef} className="w-full text-right text-sm" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                      <col style={{ width: 40 }} />
                      {displayColumns.map((col, idx) => (
                          <col key={idx} style={{ width: getColWidth(col, idx) }} />
                      ))}
                  </colgroup>
                  <thead className="reports-table-header text-gray-800 dark:text-gray-200 font-medium border-b-2 border-orange-300/60 dark:border-orange-600/50 shadow-sm" onContextMenu={handleHeaderContextMenu}>
                      {/* Header Row 1: Titles & Controls */}
                      <tr className="cursor-context-menu" title="راست‌کلیک برای انتخاب ستون‌های قابل نمایش">
                          <th className="px-3 pt-3 pb-0.5 w-10 border-l border-gray-200 dark:border-gray-700/50 text-center">
                              <button
                                type="button"
                                onClick={handleSelectAll}
                                className={`inline-flex items-center justify-center focus:outline-none rounded-full translate-y-5 p-1 ${filteredData.length > 0 && selectedIds.length === filteredData.length ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-green-600'}`}
                                aria-pressed={filteredData.length > 0 && selectedIds.length === filteredData.length}
                                title={filteredData.length > 0 && selectedIds.length === filteredData.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                              >
                                {filteredData.length > 0 && selectedIds.length === filteredData.length ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>
                          </th>
                          {displayColumns.map((col, idx) => {
                              const isFilterActive = col.sortKey && colCheckboxFilters[col.sortKey as string]?.length > 0;
                              const colKey = getColKey(col, idx);
                              const w = getColWidth(col, idx);
                              return (
                                <th key={idx} className="px-3 pt-3 pb-0.5 whitespace-nowrap border-l border-gray-200 dark:border-gray-700/50 last:border-l-0 relative group" style={{ width: w, minWidth: MIN_COL_WIDTH, maxWidth: MAX_COL_WIDTH }}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div 
                                            className={`flex items-center gap-1 cursor-pointer select-none ${col.sortKey ? 'hover:text-primary' : ''}`}
                                            onClick={() => col.sortKey && handleSort(col.sortKey as string)}
                                        >
                                            {col.header}
                                            {col.sortKey && (
                                                <span className="text-gray-400">
                                                    {sortConfig?.key === col.sortKey ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 opacity-30"/>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {col.sortKey && (
                                            <div className="relative">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuColumn(activeMenuColumn === col.sortKey ? null : col.sortKey as string); }}
                                                    className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition ${isFilterActive ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isFilterActive ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                                                </button>
                                                
                                                {/* Checkbox Menu Dropdown */}
                                                {activeMenuColumn === col.sortKey && (
                                                    <div ref={menuRef} className="absolute top-6 left-0 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 animate-fadeIn p-2">
                                                        <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2 mb-2">
                                                            <span className="text-xs font-bold text-gray-500">فیلتر مقادیر</span>
                                                            <button 
                                                                onClick={() => selectAllCheckbox(col.sortKey as string)}
                                                                className="text-[10px] text-blue-500 hover:underline"
                                                            >
                                                                {(colCheckboxFilters[col.sortKey as string]?.length === uniqueColumnValues[col.sortKey as string]?.length) ? 'لغو انتخاب' : 'انتخاب همه'}
                                                            </button>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                                            {uniqueColumnValues[col.sortKey as string]?.map((val, vi) => (
                                                                <label key={`${col.sortKey}-${vi}-${toSafeString(val)}`} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-xs">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={colCheckboxFilters[col.sortKey as string]?.includes(toSafeString(val)) || false}
                                                                        onChange={() => toggleCheckboxFilter(col.sortKey as string, toSafeString(val))}
                                                                        className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                                                                    />
                                                                    <span className="truncate" title={toSafeString(val)}>{toSafeString(val)}</span>
                                                                </label>
                                                            ))}
                                                            {(!uniqueColumnValues[col.sortKey as string] || uniqueColumnValues[col.sortKey as string].length === 0) && (
                                                                <div className="text-center text-gray-400 text-xs py-2">موردی یافت نشد</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className="absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
                                        style={document.documentElement.dir === 'rtl' ? { left: 0, right: 'auto' } : { right: 0, left: 'auto' }}
                                        title="کشیدن برای تغییر عرض ستون"
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setResizeState({ key: colKey, colIndex: idx + 1, startX: e.clientX, startW: w }); }}
                                    />
                                        </th>
                                          );
                                      })}
                                      {customRowActions && (
                                        <th className="px-3 pt-3 pb-0.5 w-24 text-center border-l border-gray-200 dark:border-gray-700/50">اکشن</th>
                                      )}
                                      </tr>
                      {/* Header Row 2: Column Search Inputs */}
                      <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                          <th className="pt-0.5 pb-2 px-2 border-l border-gray-200 dark:border-gray-700/50 text-center"></th>
                          {displayColumns.map((col, idx) => (
                              <th key={`search-${idx}`} className="pt-0.5 pb-2 px-2 border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">
                                  {col.sortKey && (
                                      <div className="relative">
                                          <input 
                                              type="text" 
                                              className="w-full text-xs p-1.5 pr-7 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 outline-none focus:border-primary"
                                              value={colSearch[col.sortKey as string] || ''}
                                              onChange={(e) => setColSearch(prev => ({ ...prev, [col.sortKey as string]: e.target.value }))}
                                          />
                                          <Search className="w-3 h-3 text-gray-400 absolute right-2 top-2" />
                                          {colSearch[col.sortKey as string] && (
                                              <button 
                                                onClick={() => setColSearch(prev => ({ ...prev, [col.sortKey as string]: '' }))}
                                                className="absolute left-1 top-1.5 text-gray-400 hover:text-red-500"
                                              >
                                                  <X className="w-3 h-3" />
                                              </button>
                                          )}
                                      </div>
                                  )}
                              </th>
                          ))}
                          {customRowActions && <th className="pt-0.5 pb-2 px-2 border-l border-gray-200 dark:border-gray-700/50" />}
                      </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                      {isLoading ? (
                          <tr>
                              <td colSpan={colSpan} className="p-12 text-center text-gray-400">
                                  <div className="flex flex-col items-center gap-2">
                                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                      <span>در حال دریافت اطلاعات...</span>
                                  </div>
                              </td>
                          </tr>
                      ) : paginatedData.length > 0 ? (
                          paginatedData.map((item, idx) => (
                              <tr 
                                key={item.id || idx} 
                                onClick={() => handleSelectOne(item.id)}
                                className={`
                                    cursor-pointer transition-colors duration-150 border-b border-gray-100 dark:border-gray-800
                                    ${selectedIds.includes(item.id) 
                                        ? 'bg-blue-50/80 dark:bg-blue-900/30' 
                                        : (idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50')
                                    }
                                    hover:bg-blue-50/50 dark:hover:bg-blue-900/20
                                `}
                              >
                                  <td className="p-4 border-l border-gray-100 dark:border-gray-700/50 text-center">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleSelectOne(item.id); }}
                                        className={`inline-flex items-center justify-center p-1.5 rounded-full ${selectedIds.includes(item.id) ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-green-600'}`}
                                        aria-pressed={selectedIds.includes(item.id)}
                                        title={selectedIds.includes(item.id) ? 'لغو انتخاب' : 'انتخاب'}
                                      >
                                        {selectedIds.includes(item.id) ? (
                                          <CheckCircle className="w-5 h-5" />
                                        ) : (
                                          <Circle className="w-5 h-5" />
                                        )}
                                      </button>
                                  </td>
                                  {displayColumns.map((col, cIdx) => {
                                      const val = col.accessor(item);
                                      const titleStr = (val != null && typeof val !== 'object') ? String(val) : undefined;
                                      return (
                                      <td key={cIdx} className="p-4 border-l border-gray-100 dark:border-gray-700/50 overflow-hidden max-w-0">
                                          <div className="truncate" title={titleStr}>
                                              {val}
                                          </div>
                                      </td>
                                  );})}
                                  {customRowActions && (
                                    <td className="p-2 border-l border-gray-100 dark:border-gray-700/50 text-center last:border-l-0" onClick={e => e.stopPropagation()}>
                                      {customRowActions(item)}
                                    </td>
                                  )}
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={colSpan} className="p-12 text-center text-gray-400">
                                  موردی یافت نشد.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>نمایش</span>
                  <select 
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1 outline-none"
                  >
                      <option value={10}>10</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                  </select>
                  <span>ردیف در هر صفحه</span>
                  <span className="mr-2 px-2 border-r border-gray-300 dark:border-gray-600 font-bold">
                      مجموع: {filteredData.length} رکورد
                  </span>
              </div>
              
              <div className="flex items-center gap-1">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(1)} 
                    className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                    title="اولین صفحه"
                  >
                      <ChevronsRight className="w-4 h-4 rtl:rotate-180"/>
                  </button>
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)} 
                    className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                    title="صفحه قبل"
                  >
                      <ChevronRight className="w-4 h-4 rtl:rotate-180"/>
                  </button>
                  
                  <div className="flex items-center gap-2 px-2">
                      <span className="text-sm font-medium">صفحه</span>
                      <input 
                        type="number" 
                        min={1} 
                        max={totalPages} 
                        value={currentPage} 
                        onChange={handlePageInput}
                        className="w-12 text-center p-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-500">از {totalPages}</span>
                  </div>

                  <button 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)} 
                    className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                    title="صفحه بعد"
                  >
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180"/>
                  </button>
                  <button 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(totalPages)} 
                    className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"
                    title="آخرین صفحه"
                  >
                      <ChevronsLeft className="w-4 h-4 rtl:rotate-180"/>
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}
