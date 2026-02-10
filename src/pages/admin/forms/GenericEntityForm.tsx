
import React from 'react';
import { Camera, Upload } from 'lucide-react';
import { EntityType, COLUMNS_MAP, MANDATORY_FIELDS } from '../adminConfig';

interface GenericEntityFormProps {
    activeTab: EntityType;
    editingItem: any;
    setEditingItem: (item: any) => void;
    dropdowns: any;
    fileInputRef?: React.RefObject<HTMLInputElement>;
}

export const GenericEntityForm: React.FC<GenericEntityFormProps> = ({ 
    activeTab, editingItem, setEditingItem, dropdowns, fileInputRef 
}) => {
    
    const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingItem({ ...editingItem, profile_picture: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-4 animate-fadeIn">
            {COLUMNS_MAP[activeTab]?.map(col => {
                const isRequired = MANDATORY_FIELDS.includes(col.key);
                
                // Allow 'local_name' to pass through the filter, but skip other _name columns that will be handled by custom blocks or relations
                if (col.key.endsWith('_name') && !['name', 'username', 'full_name', 'local_name'].includes(col.key)) {
                    // Do nothing here, we handle class_name/group_name via explicit checks below if they are selects
                } else if (col.key === 'parent_name') {
                    return null;
                } else if (activeTab === 'part_categories_main' && col.key === 'level_type') {
                    return null;
                }

                // If it is a standard input field
                const isStandardInput = (!col.key.endsWith('_name') || ['local_name', 'full_name'].includes(col.key as string)) && !['class_id', 'group_id', 'equipment_id', 'org_unit_id'].includes(col.key as string);

                if (isStandardInput) {
                    const isNumeric = col.key === 'hourly_rate' || col.key === 'max_score' || col.key === 'sort_order';
                    return (
                        <div key={String(col.key)}>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                {col.header} {isRequired && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                                type={col.key === 'email' ? 'email' : (isNumeric ? 'number' : 'text')}
                                value={editingItem[col.key] || ''}
                                onChange={(e) => setEditingItem({...editingItem, [col.key]: e.target.value})}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                                placeholder={col.key === 'mobile' ? 'مثال: 09123456789' : ''}
                            />
                        </div>
                    );
                }

                // --- Relations Handlers (Embedded here for now for simplicity, can be extracted further) ---

                // Unit Selector for Personnel OR Generic Org Unit Link
                if ((activeTab === 'personnel' && col.key === 'unit') || col.key === 'org_unit_name') {
                    const isOrgRequired = MANDATORY_FIELDS.includes('org_unit_id');
                    return (
                        <div key="org_unit_select">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                {activeTab === 'personnel' ? 'واحد سازمانی' : 'واحد سازمانی مرتبط'} {isOrgRequired && <span className="text-red-500">*</span>}
                            </label>
                            <select 
                                value={editingItem.org_unit_id || ''}
                                onChange={(e) => setEditingItem({...editingItem, org_unit_id: e.target.value})}
                                className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">انتخاب کنید...</option>
                                {dropdowns.orgUnits.map((org:any) => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </div>
                    );
                }

                // Equipment Class Selector
                if (col.key === 'class_id' || col.key === 'class_name') {
                    const isClassRequired = MANDATORY_FIELDS.includes('class_id');
                    return (
                        <div key="class_select">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                کلاس تجهیزات {isClassRequired && <span className="text-red-500">*</span>}
                            </label>
                            <select 
                                value={editingItem.class_id || ''}
                                onChange={(e) => setEditingItem({...editingItem, class_id: e.target.value, group_id: ''})} // Reset group on class change
                                className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">انتخاب کنید...</option>
                                {dropdowns.equipmentClasses.map((cls:any) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                            </select>
                        </div>
                    );
                }

                // Equipment Group Selector
                if (col.key === 'group_id' || col.key === 'group_name') {
                    const isGroupRequired = MANDATORY_FIELDS.includes('group_id');
                    const filteredGroups = editingItem.class_id 
                        ? dropdowns.equipmentGroups.filter((g:any) => g.class_id === editingItem.class_id)
                        : dropdowns.equipmentGroups;

                    return (
                        <div key="group_select">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                گروه تجهیزات {isGroupRequired && <span className="text-red-500">*</span>}
                            </label>
                            <select 
                                value={editingItem.group_id || ''}
                                onChange={(e) => setEditingItem({...editingItem, group_id: e.target.value})}
                                disabled={!editingItem.class_id}
                                className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100 disabled:dark:bg-gray-800"
                            >
                                <option value="">انتخاب کنید...</option>
                                {filteredGroups.map((grp:any) => <option key={grp.id} value={grp.id}>{grp.name}</option>)}
                            </select>
                        </div>
                    );
                }

                // Equipment Selector
                if (col.key === 'equipment_id' || col.key === 'equipment_name') {
                    const isEqRequired = MANDATORY_FIELDS.includes('equipment_id');
                    return (
                        <div key="equipment_select">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                نام تجهیز {isEqRequired && <span className="text-red-500">*</span>}
                            </label>
                            <select 
                                value={editingItem.equipment_id || ''}
                                onChange={(e) => setEditingItem({...editingItem, equipment_id: e.target.value})}
                                className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">انتخاب کنید...</option>
                                {dropdowns.equipment.map((eq:any) => <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>)}
                            </select>
                        </div>
                    );
                }

                return null;
            })}
            
            {activeTab === 'personnel' && fileInputRef && (
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">تصویر پروفایل</label>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:opacity-80 transition relative group"
                        >
                            {editingItem.profile_picture ? (
                                <img src={editingItem.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Camera className="w-8 h-8" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 flex items-center gap-2 mb-1 w-full justify-center">
                                <Camera className="w-4 h-4" /> انتخاب تصویر
                            </button>
                            <p className="text-[10px] text-gray-400 text-center">فرمت‌های مجاز: JPG, PNG</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
