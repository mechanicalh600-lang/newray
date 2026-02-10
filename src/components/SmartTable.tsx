import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Eye, Edit, Trash2, X, MoreVertical, FilterX } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortKey?: keyof T | string;
}

interface SmartTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title: string;
  subtitle?: string; 
  icon?: React.ElementType;
  onAdd?: () => void;
  extraActions?: React.ReactNode; 
  selectedIds?: string[]; 
  onSelect?: (ids: string[]) => void; 
  isLoading?: boolean; 
  onEdit?: (item: T) => void | Promise<void>;
  onDelete?: (item: T) => void | Promise<void>;
  onViewDetails?: (item: T) => void | Promise<void>;
  customRowActions?: (item: T) => React.ReactNode;
  filterContent?: React.ReactNode; 
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
  filterContent
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

  // Internal selection state handling
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds || internalSelectedIds;
  const handleSelectionChange = onSelect || setInternalSelectedIds;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Helper to get nested value safely
  const getValue = (obj: any, path: string) => {
      if (!path) return '';
      return path.split('.').reduce((o, i) => (o ? o[i] : null), obj);
  };

  // Improved deep search
  const getDeepValues = (obj: any): string => {
      if (obj === null || obj === undefined) return '';
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'number') return obj.toString();
      if (typeof obj === 'boolean') return obj ? 'بله' : 'خیر'; // Better boolean search
      if (Array.isArray(obj)) return obj.map(getDeepValues).join(' ');
      if (typeof obj === 'object') return Object.values(obj).map(getDeepValues).join(' ');
      return '';
  };

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setActiveMenuColumn(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Unique Values for Checkbox Filters
  const uniqueColumnValues: Record<string, string[]> = useMemo(() => {
      const values: Record<string, string[]> = {};
      columns.forEach(col => {
          if (col.sortKey) {
              const key = col.sortKey as string;
              const unique = new Set(data.map(item => String(getValue(item, key) || '')));
              values[key] = Array.from(unique).filter(v => v !== '').sort();
          }
      });
      return values;
  }, [data, columns]);

  // Main Filtering Logic
  useEffect(() => {
    let res = [...data];

    // 1. Global Search
    if (globalSearch) {
      const lowerTerm = globalSearch.toLowerCase().trim();
      res = res.filter(item => getDeepValues(item).toLowerCase().includes(lowerTerm));
    }

    // 2. Column Text Search
    Object.keys(colSearch).forEach(key => {
        if (colSearch[key]) {
            const term = colSearch[key].toLowerCase();
            res = res.filter(item => String(getValue(item, key) || '').toLowerCase().includes(term));
        }
    });

    // 3. Column Checkbox Filter
    Object.keys(colCheckboxFilters).forEach(key => {
        if (colCheckboxFilters[key] && colCheckboxFilters[key].length > 0) {
            res = res.filter(item => colCheckboxFilters[key].includes(String(getValue(item, key) || '')));
        }
    });

    // 4. Sort (Improved for mixed types)
    if (sortConfig) {
      res.sort((a: any, b: any) => {
        let aVal = getValue(a, sortConfig.key);
        let bVal = getValue(b, sortConfig.key);

        // Handle nulls
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined || aVal === '') return 1;
        if (bVal === null || bVal === undefined || bVal === '') return -1;

        // Check if both are numbers or strings that look like numbers
        const aNum = Number(aVal);
        const bNum = Number(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
             return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison (Persian aware)
        const comparison = String(aVal).localeCompare(String(bVal), 'fa');
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredData(res);
    // Only reset page if current page is out of bounds
    const newTotalPages = Math.ceil(res.length / rowsPerPage) || 1;
    if (currentPage > newTotalPages) setCurrentPage(1);
    
  }, [data, globalSearch, colSearch, colCheckboxFilters, sortConfig, rowsPerPage]);

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
              return { ...prev, [columnKey]: current.filter(v => v !== value) };
          } else {
              return { ...prev, [columnKey]: [...current, value] };
          }
      });
  };

  const selectAllCheckbox = (columnKey: string) => {
      const allValues = uniqueColumnValues[columnKey] || [];
      const currentSelected = colCheckboxFilters[columnKey] || [];
      
      if (currentSelected.length === allValues.length) {
          setColCheckboxFilters(prev => ({ ...prev, [columnKey]: [] })); 
      } else {
          setColCheckboxFilters(prev => ({ ...prev, [columnKey]: allValues }));
      }
  };

  // Pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedData = filteredData.slice(start, end);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

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

  const colSpan = columns.length + 1;
  const hasActiveFilters = globalSearch || Object.values(colSearch).some(Boolean) || Object.values(colCheckboxFilters).some((arr: string[]) => arr.length > 0);

  return (
    <div className="space-y-6">
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
               
               {onAdd && (
                  <button onClick={onAdd} className="p-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition" title="ثبت جدید">
                      <Plus className="w-5 h-5" />
                  </button>
              )}
              
              {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100" title="پاکسازی تمام فیلترها">
                      <FilterX className="w-5 h-5" />
                  </button>
              )}

              {filterContent && (
                  <button onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)} className={`p-2 rounded-lg border transition ${isFilterPanelOpen ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`} title="فیلترهای پیشرفته">
                     <Filter className="w-5 h-5" />
                  </button>
              )}
            </div>
        </div>
        
        {isFilterPanelOpen && filterContent && (
            <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 p-4 animate-fadeIn">
                {filterContent}
            </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 relative">
          <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium border-b dark:border-gray-600">
                      <tr>
                          <th className="p-3 w-10 border-l border-gray-200 dark:border-gray-700/50">
                              <button
                                type="button"
                                onClick={handleSelectAll}
                                className="inline-flex items-center justify-center focus:outline-none rounded-full"
                                aria-pressed={filteredData.length > 0 && selectedIds.length === filteredData.length}
                                title={filteredData.length > 0 && selectedIds.length === filteredData.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                              >
                                {filteredData.length > 0 && selectedIds.length === filteredData.length ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5">
                                    <svg className="w-5 h-5 text-blue-500 overflow-visible translate-x-px -translate-y-px" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
                                      <path d="M12.5 4L14.9 6.2" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                                      <path d="M4.8 9.5L7.6 12.2L17 3.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="w-5 h-5 rounded border border-gray-300 bg-white dark:bg-gray-800" />
                                )}
                              </button>
                          </th>
                          {columns.map((col, idx) => {
                              const isFilterActive = col.sortKey && colCheckboxFilters[col.sortKey as string]?.length > 0;
                              return (
                                <th key={idx} className="p-3 whitespace-nowrap min-w-[150px] border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">
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
                                                    ) : <ArrowUpDown className="w-3 h-3 opacity-30"/>}
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
                                                {activeMenuColumn === col.sortKey && (
                                                    <div ref={menuRef} className="absolute top-6 left-0 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 animate-fadeIn p-2">
                                                        <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2 mb-2">
                                                            <span className="text-xs font-bold text-gray-500">فیلتر مقادیر</span>
                                                            <button onClick={() => selectAllCheckbox(col.sortKey as string)} className="text-[10px] text-blue-500 hover:underline">
                                                                {((colCheckboxFilters[col.sortKey as string] || []).length === (uniqueColumnValues[col.sortKey as string] || []).length) ? 'لغو انتخاب' : 'انتخاب همه'}
                                                            </button>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                                            {uniqueColumnValues[col.sortKey as string]?.map((val) => (
                                                                <label key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-xs">
                                                                    <input type="checkbox" checked={colCheckboxFilters[col.sortKey as string]?.includes(val) || false} onChange={() => toggleCheckboxFilter(col.sortKey as string, val)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                                                                    <span className="truncate" title={val}>{val}</span>
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
                                </th>
                              );
                          })}
                      </tr>
                      {/* Search Row */}
                      <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                          <th className="p-2 border-l border-gray-200 dark:border-gray-700/50"></th>
                          {columns.map((col, idx) => (
                              <th key={`search-${idx}`} className="p-2 border-l border-gray-200 dark:border-gray-700/50 last:border-l-0">
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
                                              <button onClick={() => setColSearch(prev => ({ ...prev, [col.sortKey as string]: '' }))} className="absolute left-1 top-1.5 text-gray-400 hover:text-red-500">
                                                  <X className="w-3 h-3" />
                                              </button>
                                          )}
                                      </div>
                                  )}
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                      {isLoading ? (
                          <tr><td colSpan={colSpan} className="p-12 text-center text-gray-400"><div className="flex flex-col items-center gap-2"><RefreshCw className="w-8 h-8 animate-spin text-primary" /><span>در حال دریافت اطلاعات...</span></div></td></tr>
                      ) : paginatedData.length > 0 ? (
                          paginatedData.map((item, idx) => (
                              <tr key={item.id || idx} onClick={() => handleSelectOne(item.id)} className={`cursor-pointer transition-colors duration-150 border-b border-gray-100 dark:border-gray-800 ${selectedIds.includes(item.id) ? 'bg-blue-50/80 dark:bg-blue-900/30' : (idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50')} hover:bg-blue-50/50 dark:hover:bg-blue-900/20`}>
                                  <td className="p-4 border-l border-gray-100 dark:border-gray-700/50">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleSelectOne(item.id); }}
                                        className="inline-flex items-center justify-center focus:outline-none rounded-full"
                                        aria-pressed={selectedIds.includes(item.id)}
                                        title={selectedIds.includes(item.id) ? 'لغو انتخاب' : 'انتخاب'}
                                      >
                                        {selectedIds.includes(item.id) ? (
                                          <span className="inline-flex items-center justify-center w-4 h-4">
                                            <svg className="w-4 h-4 text-blue-500 overflow-visible translate-x-px -translate-y-px" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
                                              <path d="M12.5 4L14.9 6.2" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                                              <path d="M4.8 9.5L7.6 12.2L17 3.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          </span>
                                        ) : (
                                          <span className="w-4 h-4 rounded border border-gray-300 bg-white dark:bg-gray-800" />
                                        )}
                                      </button>
                                  </td>
                                  {columns.map((col, cIdx) => (
                                      <td key={cIdx} className="p-4 whitespace-nowrap border-l border-gray-100 dark:border-gray-700/50 last:border-l-0">{col.accessor(item)}</td>
                                  ))}
                              </tr>
                          ))
                      ) : (
                          <tr><td colSpan={colSpan} className="p-12 text-center text-gray-400">موردی یافت نشد.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>نمایش</span>
                  <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1 outline-none">
                      <option value={10}>10</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                  </select>
                  <span>ردیف در هر صفحه</span>
                  <span className="mr-2 px-2 border-r border-gray-300 dark:border-gray-600">مجموع: {filteredData.length} رکورد</span>
              </div>
              <div className="flex items-center gap-1">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"><ChevronsRight className="w-4 h-4 rtl:rotate-180"/></button>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"><ChevronRight className="w-4 h-4 rtl:rotate-180"/></button>
                  <div className="flex items-center gap-2 px-2">
                      <span className="text-sm font-medium">صفحه</span>
                      <input type="number" min={1} max={totalPages} value={currentPage} onChange={(e) => {const val = Math.max(1, Math.min(totalPages, Number(e.target.value))); setCurrentPage(val);}} className="w-12 text-center p-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary" />
                      <span className="text-sm font-medium text-gray-500">از {totalPages}</span>
                  </div>
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"><ChevronLeft className="w-4 h-4 rtl:rotate-180"/></button>
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="p-2 border rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition bg-white dark:bg-gray-800 dark:border-gray-600"><ChevronsLeft className="w-4 h-4 rtl:rotate-180"/></button>
              </div>
          </div>
      </div>
    </div>
  );
}