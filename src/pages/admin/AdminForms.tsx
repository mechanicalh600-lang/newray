
import React from 'react';
import { Save, RefreshCw, X } from 'lucide-react';
import { EntityType } from './adminConfig';
import { ProductionPlanForm } from './forms/ProductionPlanForm';
import { AppUserForm } from './forms/AppUserForm';
import { OrgChartForm } from './forms/OrgChartForm';
import { LocationForm } from './forms/LocationForm';
import { PartsForm, PartCategorySubForm, PartCategorySubSubForm } from './forms/InventoryForms';
import { GenericEntityForm } from './forms/GenericEntityForm';

interface AdminFormProps {
    activeTab: EntityType;
    editingItem: any;
    setEditingItem: (item: any) => void;
    dropdowns: any;
    onSave: (e: React.FormEvent) => void;
    onCancel: () => void;
    loading: boolean;
    fileInputRef?: React.RefObject<HTMLInputElement>;
    checkFormValidity: () => boolean;
}

export const AdminForms: React.FC<AdminFormProps> = ({ 
    activeTab, editingItem, setEditingItem, dropdowns, onSave, onCancel, loading, fileInputRef, checkFormValidity 
}) => {

    const renderContent = () => {
        switch (activeTab) {
            case 'production_plans':
                return <ProductionPlanForm editingItem={editingItem} setEditingItem={setEditingItem} />;
            case 'app_users':
                return <AppUserForm editingItem={editingItem} setEditingItem={setEditingItem} dropdowns={dropdowns} fileInputRef={fileInputRef} />;
            case 'org_chart':
                return <OrgChartForm editingItem={editingItem} setEditingItem={setEditingItem} dropdowns={dropdowns} />;
            case 'locations':
                return <LocationForm editingItem={editingItem} setEditingItem={setEditingItem} dropdowns={dropdowns} />;
            case 'parts':
                return <PartsForm editingItem={editingItem} setEditingItem={setEditingItem} dropdowns={dropdowns} />;
            case 'part_categories_sub':
                return <PartCategorySubForm editingItem={editingItem} setEditingItem={setEditingItem} dropdowns={dropdowns} />;
            case 'part_categories_sub_sub':
                return <PartCategorySubSubForm editingItem={editingItem} setEditingItem={setEditingItem} dropdowns={dropdowns} />;
            default:
                // Fallback for Personnel, Equipment, Groups, Classes, etc.
                return <GenericEntityForm activeTab={activeTab} editingItem={editingItem} setEditingItem={setEditingItem} dropdowns={dropdowns} fileInputRef={fileInputRef} />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
                    <h3 className="font-bold text-gray-800 dark:text-white">{editingItem?.id ? 'ویرایش آیتم' : 'افزودن آیتم جدید'}</h3>
                    <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="admin-form" onSubmit={onSave} className="space-y-4">
                        {renderContent()}
                    </form>
                </div>

                <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 flex gap-3">
                    <button type="button" onClick={onCancel} className="flex-1 py-2.5 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-gray-600 dark:text-gray-300">انصراف</button>
                    <button 
                        type="submit" 
                        form="admin-form"
                        disabled={loading || !checkFormValidity()} 
                        className={`flex-1 py-2.5 rounded-lg flex justify-center gap-2 items-center transition shadow-lg font-bold ${loading || !checkFormValidity() ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-70' : 'bg-primary text-white hover:bg-red-800'}`}
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} ذخیره
                    </button>
                </div>
            </div>
        </div>
    );
};
