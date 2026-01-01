import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
}

interface GenericTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  isLoading?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
}

export function GenericTable<T extends { id: string }>({ 
  data, 
  columns, 
  onEdit, 
  onDelete, 
  isLoading,
  selectable,
  selectedIds = [],
  onSelect
}: GenericTableProps<T>) {
  if (isLoading) return <div className="p-4 text-center">در حال بارگذاری...</div>;

  const handleSelectAll = () => {
    if (!onSelect) return;
    if (selectedIds.length === data.length) {
      onSelect([]);
    } else {
      onSelect(data.map(d => d.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (!onSelect) return;
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter(sid => sid !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
      <table className="w-full text-sm text-right">
        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
          <tr>
            {selectable && (
              <th className="px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-3 font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-3">عملیات</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
          {data.map((item) => (
            <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedIds.includes(item.id) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
              {selectable && (
                <td className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </td>
              )}
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                  {col.render ? col.render(item[col.key], item) : String(item[col.key])}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(item)} className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors" title="ویرایش">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(item)} className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + (selectable ? 2 : 1)} className="px-4 py-8 text-center text-gray-500">
                داده‌ای یافت نشد
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}