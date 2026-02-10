
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminLogic } from './admin/useAdminLogic';
import { SmartTable } from '../components/SmartTable';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdminForms } from './admin/AdminForms';
import { ORDERED_TABS, TABLE_LABELS, COLUMNS_MAP, EntityType } from './admin/adminConfig';
import { Plus, Trash2, Edit, RefreshCw, Upload, Download, Key, Users, FolderOpen, Database } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  // Determine active tab from URL or default
  const activeTab = (tab && ORDERED_TABS.includes(tab as EntityType)) ? (tab as EntityType) : ORDERED_TABS[0];

  // Redirect if tab is invalid (optional, helps keep URL clean)
  useEffect(() => {
    if (tab && !ORDERED_TABS.includes(tab as EntityType)) {
      navigate(`/admin/${ORDERED_TABS[0]}`, { replace: true });
    }
  }, [tab, navigate]);

  const {
    data, loading, errorMsg, isOfflineMode,
    isModalOpen, setIsModalOpen,
    editingItem, setEditingItem,
    selectedIds, setSelectedIds,
    dropdowns,
    fileInputRef,
    fetchData, handleSave, handleDelete, handleBulkDelete,
    handleResetPassword, handleFileUpload, handleDownloadSample,
    isDeleteModalOpen, setIsDeleteModalOpen, confirmDelete
  } = useAdminLogic(activeTab);

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

      <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="ورود از اکسل">
        <Upload className="w-5 h-5" />
      </button>

      <button onClick={handleDownloadSample} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition" title="دانلود نمونه اکسل / خروجی">
        <Download className="w-5 h-5" />
      </button>

      <button onClick={fetchData} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 p-4">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="تایید حذف"
        message={`آیا از حذف موارد انتخاب شده اطمینان دارید؟`}
      />

      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-120px)]">
          <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <Database className="w-5 h-5 text-primary" /> مدیریت اطلاعات پایه
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {ORDERED_TABS.map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => navigate(`/admin/${tabKey}`)}
                className={`w-full text-right px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  activeTab === tabKey 
                    ? 'bg-primary text-white font-bold shadow-md' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <FolderOpen className={`w-4 h-4 ${activeTab === tabKey ? 'text-white' : 'text-gray-400'}`} />
                {TABLE_LABELS[tabKey]}
              </button>
            ))}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-full overflow-hidden">
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

          <div className="flex-1 overflow-hidden">
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
              onEdit={(item) => setEditingItem(item)}
              onDelete={(item) => handleDelete(item)}
            />
          </div>
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
          checkFormValidity={() => true} 
        />
      )}
    </div>
  );
};

export default AdminPanel;
