
import React, { useEffect } from 'react';
import { SmartTable } from '../components/SmartTable';
import { Download, Upload, Plus, RefreshCw, WifiOff, Users, User as UserIcon, Trash2, Loader2 } from 'lucide-react';
import { useAdminLogic } from './admin/useAdminLogic';
import { AdminForms } from './admin/AdminForms';
import { ORDERED_TABS, TABLE_LABELS, COLUMNS_MAP } from './admin/adminConfig';

export const AdminPanel: React.FC = () => {
  const {
      activeTab, setActiveTab,
      data, loading, errorMsg, isOfflineMode,
      isModalOpen, setIsModalOpen,
      editingItem, setEditingItem,
      selectedIds, setSelectedIds,
      dropdowns,
      fileInputRef,
      fetchData, handleSave, handleDelete, handleBulkDelete, handleResetPassword, handleFileUpload, handleDownloadSample
  } = useAdminLogic();

  const handleAddNew = () => {
    setEditingItem({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    // Logic for pre-populating specific fields can remain here or move to hook
    // Kept here for UI specific logic, but logic hook is also fine.
    // To keep this file clean, simple set is best, logic hook handles complexity in state init if needed.
    // For now, let's just pass the item. The AdminForms component logic handles display.
    
    // Quick Fix for app_users display in modal (needs full name)
    if (activeTab === 'app_users' && item.personnel_id) {
        const person = dropdowns.personnel.find((p:any) => p.id === item.personnel_id);
        setEditingItem({
            ...item,
            full_name: person?.full_name,
            unit: person?.unit,
            personnel_profile: person?.profile_picture 
        });
    } else if (activeTab === 'parts') {
        // Resolve categories for parts editing
        const cat = dropdowns.allCategories.find((c:any) => c.id === item.category_id);
        const parent = dropdowns.allCategories.find((c:any) => c.id === cat?.parent_id);
        const grandParent = dropdowns.allCategories.find((c:any) => c.id === parent?.parent_id);
        
        setEditingItem({
            ...item,
            temp_main_cat_id: grandParent?.id || '',
            temp_sub_cat_id: parent?.id || ''
        });
    } else {
        setEditingItem({ ...item });
    }
    setIsModalOpen(true);
  };

  // Prepare Columns for SmartTable
  const smartTableColumns = (COLUMNS_MAP[activeTab] || []).map(col => ({
      header: col.header,
      accessor: (item: any) => {
          if (col.key === 'avatar' || col.key === 'profile_picture') {
              return (
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                      {item[col.key] ? (
                          <img src={item[col.key]} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                  </div>
              );
          }
          if (typeof item[col.key] === 'boolean') {
              return item[col.key] ? <span className="text-green-600">بله</span> : <span className="text-gray-400">خیر</span>;
          }
          return item[col.key] || '-';
      },
      sortKey: col.key 
  }));

  const adminActions = (
      <>
          {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition animate-fadeIn">
                  <Trash2 className="w-4 h-4" /> حذف {selectedIds.length} مورد
              </button>
          )}
          <button onClick={handleDownloadSample} className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-green-100 transition">
              <Download className="w-4 h-4" /> خروجی / نمونه
          </button>
          <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-100 transition">
              <Upload className="w-4 h-4" /> ورود از فایل (CSV)
          </button>
      </>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-primary"/> مدیریت اطلاعات پایه</h1>
            {isOfflineMode && (
                <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    <WifiOff className="w-4 h-4" /> حالت آفلاین
                </div>
            )}
        </div>
        <div className="flex gap-2">
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm text-sm font-bold text-gray-700 dark:text-gray-200" title="بروزرسانی">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>بروزرسانی</span>
            </button>
        </div>
      </div>

      {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{errorMsg}</div>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 overflow-x-auto flex gap-2 pb-3 mb-2">
         {ORDERED_TABS.map(key => (
             <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-medium
                    ${activeTab === key 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
             >
                 {TABLE_LABELS[key]}
             </button>
         ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm min-h-[400px]">
          {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
                  <p>در حال دریافت اطلاعات...</p>
              </div>
          ) : (
              <SmartTable
                title={TABLE_LABELS[activeTab]}
                data={data}
                columns={smartTableColumns}
                onAdd={handleAddNew}
                onEdit={handleEdit}
                onDelete={handleDelete}
                extraActions={adminActions}
                selectedIds={selectedIds}
                onSelect={setSelectedIds}
                customRowActions={(item) => {
                    if (activeTab === 'app_users') {
                        return (
                            <button 
                                onClick={() => handleResetPassword(item)} 
                                className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" 
                                title="بازنشانی رمز عبور"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key-round" aria-hidden="true"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle></svg>
                            </button>
                        )
                    }
                    return null;
                }}
              />
          )}
      </div>

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
            checkFormValidity={() => {
                // Validation logic (simplified for UI)
                return true; 
            }}
          />
      )}
    </div>
  );
};
