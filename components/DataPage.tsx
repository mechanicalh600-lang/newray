import React, { useState } from 'react';
import { SmartTable } from './SmartTable';
import { useUser } from '../contexts/UserContext';
import { ConfirmModal } from './ConfirmModal';
import { Plus, FileSpreadsheet, RefreshCw, Trash2, Eye, Printer, Edit, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DataPageProps<T> {
  title: string;
  icon?: React.ElementType;
  data: T[];
  columns: any[];
  isLoading?: boolean;
  
  // Actions
  onAdd?: () => void;
  onReload?: () => void;
  onDelete?: (ids: string[]) => Promise<void>;
  onEdit?: (item: T) => void;
  onViewDetails?: (item: T) => void;
  onPrint?: (item: T) => void; // Added specific Print handler
  onExport?: () => void; // Optional override for export

  exportName?: string;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  filterContent?: React.ReactNode;
  extraActions?: React.ReactNode; // For any non-standard actions
  /** دکمه‌هایی که قبل از خط جداکننده (کنار مشاهده/ویرایش/حذف) نمایش داده می‌شوند */
  extraActionsBeforeDivider?: React.ReactNode;
  /** دکمه انتشار (کنار مشاهده) وقتی یک ردیف انتخاب شده باشد */
  publishAction?: { onClick: (item: T) => void; title?: string };
  customRowActions?: (item: T) => React.ReactNode;
  /** کلید ذخیره ستون‌های قابل مشاهده (راست‌کلیک روی هدر جدول) */
  columnVisibilityKey?: string;
  /** شناسه کاربر برای ذخیره ترجیحات در دیتابیس (در لاگین بعدی همین ستون‌ها نمایش داده می‌شود) */
  userId?: string | null;
  
  children?: React.ReactNode;
  containerClassName?: string;
}

export function DataPage<T extends { id: string }>({
  title,
  icon: Icon,
  data,
  columns,
  isLoading,
  onAdd,
  onReload,
  onDelete,
  onEdit,
  onViewDetails,
  onPrint,
  onExport,
  exportName = 'Export',
  selectedIds = [],
  onSelect,
  filterContent,
  extraActions, // Keep for edge cases, but standard ones are handled below
  extraActionsBeforeDivider,
  publishAction,
  customRowActions,
  columnVisibilityKey = exportName,
  userId,
  children,
  containerClassName
}: DataPageProps<T>) {
  const contextUser = useUser();
  const effectiveUserId = userId ?? contextUser?.id ?? null;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sanitize row for XLSX (nested objects cause "Cannot convert object to primitive value")
  const sanitizeForSheet = (obj: any): any => {
    if (obj == null) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeForSheet);
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
        ? JSON.stringify(v) : v;
    }
    return out;
  };

  // Default Export Logic
  const handleDefaultExport = () => {
    if (!data.length) return alert('داده‌ای برای خروجی وجود ندارد');
    const dataToExport = selectedIds.length > 0 
      ? data.filter(i => selectedIds.includes(i.id))
      : data;
    const sanitized = dataToExport.map(sanitizeForSheet);
    const ws = XLSX.utils.json_to_sheet(sanitized);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${exportName}_${Date.now()}.xlsx`);
  };

  const confirmDelete = async () => {
    if (onDelete) {
      await onDelete(selectedIds);
      setIsDeleteModalOpen(false);
      if (onSelect) onSelect([]);
    }
  };

  const selectedItem = selectedIds.length === 1 ? data.find(i => i.id === selectedIds[0]) : null;

  const standardActions = (
    <>
      {/* 1. View (Eye) */}
      {selectedIds.length === 1 && onViewDetails && selectedItem && (
        <button 
          onClick={() => onViewDetails(selectedItem)} 
          className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition" 
          title="مشاهده"
        >
          <Eye className="w-5 h-5" />
        </button>
      )}

      {/* 1b. Publish (UploadCloud) - کنار مشاهده */}
      {selectedIds.length === 1 && publishAction && selectedItem && (
        <button 
          onClick={() => publishAction.onClick(selectedItem)} 
          className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" 
          title={publishAction.title ?? 'انتشار'}
        >
          <UploadCloud className="w-5 h-5" />
        </button>
      )}

      {/* 2. Print (Printer) */}
      {selectedIds.length === 1 && onPrint && selectedItem && (
        <button 
          onClick={() => onPrint(selectedItem)} 
          className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition" 
          title="چاپ"
        >
          <Printer className="w-5 h-5" />
        </button>
      )}

      {/* 3. Edit (Edit) */}
      {selectedIds.length === 1 && onEdit && selectedItem && (
        <button 
          onClick={() => onEdit(selectedItem)} 
          className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition" 
          title="ویرایش"
        >
          <Edit className="w-5 h-5" />
        </button>
      )}

      {/* 4. Delete (Trash) */}
      {selectedIds.length > 0 && onDelete && (
        <button 
          onClick={() => setIsDeleteModalOpen(true)} 
          className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" 
          title="حذف"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      {/* اکشن‌های اضافه قبل از خط جداکننده (کنار مشاهده/ویرایش/حذف) */}
      {extraActionsBeforeDivider}

      {/* Divider if actions exist above and below */}
      {(selectedIds.length > 0) && <div className="w-px h-6 bg-gray-300 mx-1"></div>}

      {/* Custom Extra Actions (کنار دکمه جدید) */}
      {extraActions}

      {/* 5. New (Plus) */}
      {onAdd && (
        <button 
          onClick={onAdd}
          className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition"
          title="جدید"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      {/* 6. Excel (Spreadsheet) */}
      <button 
        onClick={onExport || handleDefaultExport}
        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition"
        title="گزارش اکسل"
      >
        <FileSpreadsheet className="w-5 h-5" />
      </button>

      {/* 7. Reload (Refresh) */}
      {onReload && (
        <button 
          onClick={onReload} 
          className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" 
          title="بروزرسانی"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      )}
      
      {/* 8. Filter is handled by SmartTable via filterContent prop */}
    </>
  );

  return (
    <div className={containerClassName || "w-full max-w-full pb-20 space-y-2"}>
      {onDelete && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title={`حذف ${title}`}
          message={`آیا از حذف ${selectedIds.length} مورد انتخاب شده اطمینان دارید؟`}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
          <p className="text-xs text-gray-500 mt-1">مدیریت و مشاهده لیست {title}</p>
        </div>
      </div>

      {children}

      <SmartTable
        title=""
        data={data}
        isLoading={isLoading}
        columns={columns}
        selectedIds={selectedIds}
        onSelect={onSelect}
        extraActions={standardActions}
        filterContent={filterContent}
        onEdit={onEdit}
        onViewDetails={onViewDetails}
        customRowActions={customRowActions}
        columnVisibilityKey={columnVisibilityKey}
        userId={effectiveUserId}
      />
    </div>
  );
}
