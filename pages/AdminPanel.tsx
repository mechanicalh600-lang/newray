
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAdminLogic } from './admin/useAdminLogic';
import { SmartTable } from '../components/SmartTable';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdminForms } from './admin/AdminForms';
import { TABLE_LABELS, COLUMNS_MAP, EntityType, ORDERED_TABS } from './admin/adminConfig';
import { Plus, Trash2, Edit, RefreshCw, Upload, Download, Key, Users, X, FileSpreadsheet, AlertTriangle } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  
  // If no tab is provided or invalid, redirect to the first tab (default)
  if (!tab || !ORDERED_TABS.includes(tab as EntityType)) {
      return <Navigate to={`/admin/${ORDERED_TABS[0]}`} replace />;
  }

  const activeTab = tab as EntityType;

  const {
    data, loading, errorMsg, isOfflineMode,
    isModalOpen, setIsModalOpen,
    editingItem, setEditingItem,
    selectedIds, setSelectedIds,
    dropdowns,
    fileInputRef,
    fetchData, handleSave, handleDelete, handleBulkDelete,
    handleResetPassword, handleFileUpload, handleDownloadSample,
    isDeleteModalOpen, setIsDeleteModalOpen, confirmDelete,
    isImportModalOpen, setIsImportModalOpen,
    importPreviewRows, importValidationErrors, importFileName, importStats, importProgress,
    isImporting, importResultMsg, resetImportState, executeStagedImport
  } = useAdminLogic(activeTab); // Pass activeTab to hook

  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filterCode, setFilterCode] = useState('');

  useEffect(() => {
    let res = data;
    if (filterCode) {
      res = res.filter(item => 
        (item.code && item.code.toLowerCase().includes(filterCode.toLowerCase())) ||
        (item.personnel_code && item.personnel_code.toLowerCase().includes(filterCode.toLowerCase()))
      );
    }
    setFilteredData(res);
  }, [data, filterCode]);

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">فیلتر بر اساس کد</label>
        <input 
          type="text" 
          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none" 
          value={filterCode} 
          onChange={e => setFilterCode(e.target.value)} 
          placeholder="کد..." 
        />
      </div>
    </div>
  );

  const smartTableColumns = COLUMNS_MAP[activeTab].map(col => ({
    header: col.header,
    accessor: (item: any) => item[col.key],
    sortKey: col.key
  }));

  const adminActions = (
    <>
      <input type="file" ref={fileInputRef} accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
      
      {activeTab === 'app_users' && selectedIds.length === 1 && (
        <button 
          onClick={() => {
             const item = data.find(i => i.id === selectedIds[0]);
             if(item) handleResetPassword(item);
          }}
          className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition"
          title="بازنشانی رمز عبور"
        >
          <Key className="w-5 h-5" />
        </button>
      )}

      {selectedIds.length === 1 && (
        <button 
          onClick={() => {
             const item = data.find(i => i.id === selectedIds[0]);
             if(item) setEditingItem(item);
          }}
          className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition"
          title="ویرایش"
        >
          <Edit className="w-5 h-5" />
        </button>
      )}

      {selectedIds.length > 0 && (
        <button onClick={handleBulkDelete} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="افزودن">
        <Plus className="w-5 h-5" />
      </button>

      <button
        onClick={() => {
          setIsImportModalOpen(true);
          resetImportState();
        }}
        className="p-2.5 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition"
        title="ورود از اکسل"
      >
        <Download className="w-5 h-5" />
      </button>

      <button onClick={handleDownloadSample} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition" title="دانلود نمونه اکسل / خروجی">
        <Upload className="w-5 h-5" />
      </button>

      <button onClick={fetchData} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  return (
    <div className="space-y-6 pb-20 w-full max-w-full">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="تایید حذف"
        message={`آیا از حذف موارد انتخاب شده اطمینان دارید؟`}
      />

      {isOfflineMode && (
        <div className="bg-orange-50 text-orange-700 p-3 rounded-lg mb-4 text-sm">
          حالت آفلاین: ارتباط با سرور برقرار نیست.
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {errorMsg}
        </div>
      )}

      <SmartTable
        title={TABLE_LABELS[activeTab]}
        icon={Users}
        data={filteredData}
        columns={smartTableColumns}
        extraActions={adminActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        isLoading={loading}
        columnVisibilityKey={activeTab}
        defaultColumnWidths={activeTab === 'evaluation_criteria' ? { title: 320, max_score: 100, org_unit_name: 180 } : undefined}
      />

      {isModalOpen && (
        <AdminForms 
          activeTab={activeTab}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          dropdowns={dropdowns}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
          loading={loading}
          fileInputRef={fileInputRef}
          checkFormValidity={() => true} 
        />
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl border shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black">ورود اطلاعات از اکسل</h3>
                  <p className="text-xs text-gray-500">انتخاب فایل، پيش‌نمايش، اعتبارسنجي، ورود نهايي</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-auto">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-bold inline-flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  انتخاب فایل اکسل
                </button>
                <button
                  onClick={handleDownloadSample}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-4 h-4" />
                  دانلود نمونه (به‌همراه شیت مرجع)
                </button>
                {importFileName && <span className="text-xs text-gray-500">فایل: {importFileName}</span>}
              </div>

              {!!importResultMsg && (
                <div className="text-sm rounded-xl border border-gray-200 bg-gray-50 p-3">{importResultMsg}</div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-gray-50 p-3 text-center">
                  <div className="text-xs text-gray-500">کل ردیف‌ها</div>
                  <div className="text-xl font-black">{importStats.total}</div>
                </div>
                <div className="rounded-xl border bg-green-50 p-3 text-center">
                  <div className="text-xs text-green-700">معتبر</div>
                  <div className="text-xl font-black text-green-800">{importStats.valid}</div>
                </div>
                <div className="rounded-xl border bg-red-50 p-3 text-center">
                  <div className="text-xs text-red-700">نامعتبر</div>
                  <div className="text-xl font-black text-red-800">{importStats.invalid}</div>
                </div>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width:
                          importProgress.total > 0
                            ? `${Math.round((importProgress.processed / importProgress.total) * 100)}%`
                            : '0%',
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-600">
                    {importProgress.processed} / {importProgress.total} رکورد وارد شده
                  </div>
                </div>
              )}

              {importValidationErrors.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-1 text-amber-800 font-bold text-sm mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    خطاهای اعتبارسنجی (نمایش 20 مورد اول)
                  </div>
                  <div className="space-y-1 max-h-40 overflow-auto text-xs">
                    {importValidationErrors.slice(0, 20).map((err, idx) => (
                      <div key={idx} className="bg-white border rounded px-2 py-1">
                        ردیف {err.rowNumber}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border p-3">
                <h4 className="font-bold text-sm mb-2">پیش‌نمایش ردیف‌های معتبر (حداکثر 20)</h4>
                {importPreviewRows.length === 0 ? (
                  <p className="text-xs text-gray-400">بعد از انتخاب فایل، پیش‌نمایش اینجا نمایش داده می‌شود.</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {Object.keys(importPreviewRows[0] || {}).map((k) => (
                            <th key={k} className="border p-2 whitespace-nowrap text-right">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewRows.map((row, idx) => (
                          <tr key={idx}>
                            {Object.keys(importPreviewRows[0] || {}).map((k) => (
                              <td key={`${idx}-${k}`} className="border p-2 whitespace-nowrap">
                                {String(row[k] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm font-bold"
              >
                بستن
              </button>
              <button
                onClick={executeStagedImport}
                disabled={isImporting || importStats.valid === 0}
                className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-red-900 disabled:opacity-50 text-sm font-bold"
              >
                {isImporting ? 'در حال ورود...' : 'ثبت نهایی رکوردهای معتبر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
