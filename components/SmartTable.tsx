
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Eye, Trash2, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, Edit, RefreshCw } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortKey?: keyof T | string; // Key to sort by
}

interface SmartTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title: string;
  icon?: React.ElementType;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onViewDetails?: (item: T) => void;
  customRowActions?: (item: T) => React.ReactNode; // New Prop for custom buttons
  searchKeys?: (keyof T | string)[];
  extraActions?: React.ReactNode; // Custom buttons in header
  selectedIds?: string[]; // Controlled selection
  onSelect?: (ids: string[]) => void; // Selection callback
  isLoading?: boolean; // New Prop for loading state
}

export function SmartTable<T extends { id: string }>({ 
  data, 
  columns, 
  title, 
  icon: Icon, 
  onAdd, 
  onEdit,
  onDelete,
  onViewDetails,
  customRowActions,
  extraActions,
  selectedIds: controlledSelectedIds,
  onSelect,
  isLoading = false
}: SmartTableProps<T>) {
  
  const [filteredData, setFilteredData] = useState<T[]>(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Internal selection state if not controlled
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds || internalSelectedIds;
  const handleSelectionChange = onSelect || setInternalSelectedIds;

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    let res = [...data];

    // 1. Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      res = res.filter(item => {
        const values = Object.values(item as any).join(' ').toLowerCase();
        return values.includes(lowerTerm);
      });
    }

    // 2. Sort
    if (sortConfig) {
      res.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === bVal) return 0;
        
        // Handle nulls
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredData(res);
    // Reset to page 1 only if search changes, not sort
    if (searchTerm && currentPage !== 1) setCurrentPage(1); 
  }, [data, searchTerm, sortConfig]);

  // Handle Sort Click
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedData = filteredData.slice(start, end);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

  // Selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        handleSelectionChange(filteredData.map(i => i.id));
    } else {
        handleSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
        handleSelectionChange(selectedIds.filter(i => i !== id));
    } else {
        handleSelectionChange([...selectedIds, id]);
    }
  };

  const hasActions = onViewDetails || onEdit || onDelete || customRowActions;

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          {Icon && <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm"><Icon className="w-6 h-6 text-primary" /></div>}
          <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
              <p className="text-xs text-gray-500 mt-1">مدیریت لیست {title}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {selectedIds.length > 0 && (
                 <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium animate-fadeIn">
                     {selectedIds.length} انتخاب شده
                 </div>
            )}
            
            {/* Inject Extra Actions (Import/Export/Refresh/etc) */}
            {extraActions}

            {onAdd && (
                <button 
                onClick={onAdd}
                className="bg-primary text-white px-4 py-2.5 rounded-xl shadow-lg shadow-red-900/20 flex items-center gap-2 hover:bg-red-800 transition transform active:scale-95 font-medium text-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden md:inline">ثبت جدید</span>
                </button>
            )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex gap-4">
          <div className="relative flex-1">
              <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="جستجو در لیست..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
              />
          </div>
          <button className="bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500">
             <Filter className="w-5 h-5" />
          </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
                      <tr>
                          <th className="p-4 w-10">
                              <input 
                                type="checkbox" 
                                onChange={handleSelectAll}
                                checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                              />
                          </th>
                          {columns.map((col, idx) => (
                              <th 
                                key={idx} 
                                className={`p-4 whitespace-nowrap ${col.sortKey ? 'cursor-pointer hover:text-primary transition-colors select-none' : ''}`}
                                onClick={() => col.sortKey && handleSort(col.sortKey as string)}
                              >
                                  <div className="flex items-center gap-1">
                                      {col.header}
                                      {col.sortKey && (
                                          <span className="text-gray-400">
                                              {sortConfig?.key === col.sortKey ? (
                                                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>
                                              ) : (
                                                  <ArrowUpDown className="w-3 h-3 opacity-50"/>
                                              )}
                                          </span>
                                      )}
                                  </div>
                              </th>
                          ))}
                          {hasActions && <th className="p-4">عملیات</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                      {isLoading ? (
                          <tr>
                              <td colSpan={columns.length + 2} className="p-12 text-center text-gray-400">
                                  <div className="flex flex-col items-center gap-2">
                                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                      <span>در حال دریافت اطلاعات...</span>
                                  </div>
                              </td>
                          </tr>
                      ) : paginatedData.length > 0 ? (
                          paginatedData.map((item, idx) => (
                              <tr key={item.id || idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${selectedIds.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                  <td className="p-4">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(item.id)}
                                        onChange={() => handleSelectOne(item.id)}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                      />
                                  </td>
                                  {columns.map((col, cIdx) => (
                                      <td key={cIdx} className="p-4 whitespace-nowrap">{col.accessor(item)}</td>
                                  ))}
                                  {hasActions && (
                                      <td className="p-4 flex gap-1.5 items-center">
                                          {customRowActions && customRowActions(item)}
                                          
                                          {onViewDetails && (
                                              <button onClick={() => onViewDetails(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="مشاهده">
                                                  <Eye width={18} height={18} />
                                              </button>
                                          )}
                                          {onEdit && (
                                              <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="ویرایش">
                                                  <Edit width={18} height={18} />
                                              </button>
                                          )}
                                          {onDelete && (
                                              <button onClick={() => onDelete(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="حذف">
                                                  <Trash2 width={18} height={18} />
                                              </button>
                                          )}
                                      </td>
                                  )}
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={columns.length + 2} className="p-12 text-center text-gray-400">
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
                  <span className="mr-2 px-2 border-r border-gray-300 dark:border-gray-600">
                      مجموع: {filteredData.length} رکورد
                  </span>
              </div>
              <div className="flex items-center gap-1">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-50"><ChevronRight className="w-4 h-4"/></button>
                  <span className="px-4 text-sm font-bold">صفحه {currentPage} از {totalPages}</span>
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-50"><ChevronLeft className="w-4 h-4"/></button>
              </div>
          </div>
      </div>
    </div>
  );
}
