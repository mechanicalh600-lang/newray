
import React, { useEffect } from 'react';
import { Camera, User as UserIcon, Upload, Save, RefreshCw, X, Target } from 'lucide-react';
import { EntityType, COLUMNS_MAP, MANDATORY_FIELDS } from './adminConfig';

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

const SHAMSI_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

export const AdminForms: React.FC<AdminFormProps> = ({ 
    activeTab, editingItem, setEditingItem, dropdowns, onSave, onCancel, loading, fileInputRef, checkFormValidity 
}) => {

    // --- Helper Logic for Production Plan ---
    // Auto-calculate Total Days based on Month
    useEffect(() => {
        if (activeTab === 'production_plans') {
            if (!editingItem.year) setEditingItem((prev: any) => ({ ...prev, year: 1403 }));
            
            const monthIdx = SHAMSI_MONTHS.indexOf(editingItem.month);
            if (monthIdx !== -1) {
                let days = 30;
                if (monthIdx < 6) days = 31; // First 6 months
                else if (monthIdx === 11) days = 29; // Esfand (Simple assumption, user can edit)
                else days = 30;
                
                // Only set if total_days is not already set or we want to force update on month change
                setEditingItem((prev: any) => ({ ...prev, total_days: days }));
            }
        }
    }, [editingItem.month, activeTab]);

    // Auto-calculate Downtime Days when Active Days change
    useEffect(() => {
        if (activeTab === 'production_plans' && editingItem.total_days > 0 && editingItem.active_days !== undefined) {
            const down = editingItem.total_days - editingItem.active_days;
            if (down >= 0) {
                setEditingItem((prev: any) => ({ ...prev, downtime_days: down }));
            }
        }
    }, [editingItem.active_days, editingItem.total_days, activeTab]);

    // Auto-calculate Final Plans based on Consumption/Production & Deviation
    // Logic: Final = Usage * (Deviation% / 100)
    useEffect(() => {
        if (activeTab === 'production_plans') {
            // Feed Calculation
            const usage = Number(editingItem.feed_usage) || 0;
            const devPercent = Number(editingItem.feed_dev_percent) !== undefined ? Number(editingItem.feed_dev_percent) : 100;
            // Ensure devPercent is non-negative
            const safeDevPercent = Math.max(0, devPercent);
            
            const finalFeed = usage * (safeDevPercent / 100);
            
            // Production Calculation
            const prodUsage = Number(editingItem.prod_usage) || 0;
            const prodDevPercent = Number(editingItem.prod_dev_percent) !== undefined ? Number(editingItem.prod_dev_percent) : 100;
            const safeProdDevPercent = Math.max(0, prodDevPercent);

            const finalProd = prodUsage * (safeProdDevPercent / 100);

            // Update state only if values differ to avoid loop
            if (editingItem.final_feed !== finalFeed || editingItem.final_prod !== finalProd) {
                 setEditingItem((prev: any) => ({ 
                     ...prev, 
                     final_feed: parseFloat(finalFeed.toFixed(2)),
                     final_prod: parseFloat(finalProd.toFixed(2))
                 }));
            }
        }
    }, [editingItem.feed_usage, editingItem.feed_dev_percent, editingItem.prod_usage, editingItem.prod_dev_percent, activeTab]);


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

    const handlePersonnelChange = (id: string) => {
        const p = dropdowns.personnel.find((x: any) => x.id === id);
        if (p) {
            setEditingItem({ 
                ...editingItem, 
                personnel_id: p.id, 
                full_name: p.full_name,
                personnel_code: p.personnel_code,
                unit: p.unit, 
                personnel_profile: p.profile_picture,
                password: p.personnel_code,
                is_default_password: true
            });
        }
    };

    // --- Sub-Components ---

    const renderProductionPlanForm = () => (
        <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-4 flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-600" />
                <div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-300">تعریف برنامه تولید ماهانه</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400">مقادیر روزها و تناژ را با دقت وارد کنید. مقادیر نهایی محاسبه می‌شوند.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">سال <span className="text-red-500">*</span></label>
                    <input 
                        type="number" 
                        min="1300"
                        value={editingItem.year || ''} 
                        onChange={(e) => setEditingItem({...editingItem, year: Number(e.target.value)})} 
                        className="w-full p-2.5 border rounded-lg outline-none text-center font-bold" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ماه <span className="text-red-500">*</span></label>
                    <select 
                        value={editingItem.month || ''} 
                        onChange={(e) => setEditingItem({...editingItem, month: e.target.value})} 
                        className="w-full p-2.5 border rounded-lg outline-none bg-white dark:bg-gray-700"
                    >
                        <option value="">انتخاب...</option>
                        {SHAMSI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-dashed border-gray-300">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500">روز کل</label>
                    <input type="number" min="0" value={editingItem.total_days || ''} onChange={(e) => setEditingItem({...editingItem, total_days: Number(e.target.value)})} className="w-full p-2 border rounded text-center bg-white dark:bg-gray-600" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-green-600">روز فعال <span className="text-red-500">*</span></label>
                    <input type="number" min="0" value={editingItem.active_days || ''} onChange={(e) => setEditingItem({...editingItem, active_days: Number(e.target.value)})} className="w-full p-2 border rounded text-center font-bold border-green-200 focus:ring-green-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-red-600">روز توقف</label>
                    <input type="number" min="0" value={editingItem.downtime_days || 0} onChange={(e) => setEditingItem({...editingItem, downtime_days: Number(e.target.value)})} className="w-full p-2 border rounded text-center font-bold bg-red-50 dark:bg-red-900/20 text-red-700" />
                </div>
            </div>

            <div className="border-t border-dashed my-4"></div>
            
            <div className="space-y-4">
                <h5 className="font-bold text-sm text-gray-600 dark:text-gray-300 border-r-4 border-blue-500 pr-2">اطلاعات خوراک</h5>
                <div className="grid grid-cols-2 gap-4 mb-2">
                     <div>
                        <label className="block text-xs font-bold mb-1">برنامه مصرف (تن)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={editingItem.feed_plan || ''} 
                            onChange={(e) => setEditingItem({...editingItem, feed_plan: Math.max(0, Number(e.target.value))})} 
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono" 
                            placeholder="0"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold mb-1">خوراک مصرفی (تن)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={editingItem.feed_usage || ''} 
                            onChange={(e) => setEditingItem({...editingItem, feed_usage: Math.max(0, Number(e.target.value))})} 
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono" 
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">درصد انحراف (%)</label>
                        <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={editingItem.feed_dev_percent !== undefined ? editingItem.feed_dev_percent : 100} 
                            onChange={(e) => setEditingItem({...editingItem, feed_dev_percent: Math.max(0, Number(e.target.value))})} 
                            className="w-full p-2.5 border rounded-lg outline-none text-center font-bold" 
                            placeholder="100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-blue-600">خوراک نهایی (محاسباتی)</label>
                        <input 
                            type="number" 
                            readOnly
                            value={editingItem.final_feed || 0} 
                            className="w-full p-2.5 border rounded-lg bg-blue-50 text-blue-800 font-bold text-center" 
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4 mt-6">
                <h5 className="font-bold text-sm text-gray-600 dark:text-gray-300 border-r-4 border-green-500 pr-2">اطلاعات تولید</h5>
                <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                        <label className="block text-xs font-bold mb-1">برنامه تولید (تن)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={editingItem.prod_plan || ''} 
                            onChange={(e) => setEditingItem({...editingItem, prod_plan: Math.max(0, Number(e.target.value))})} 
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono" 
                            placeholder="0"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold mb-1">محصول تولیدی (تن)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={editingItem.prod_usage || ''} 
                            onChange={(e) => setEditingItem({...editingItem, prod_usage: Math.max(0, Number(e.target.value))})} 
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono" 
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">درصد انحراف (%)</label>
                        <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={editingItem.prod_dev_percent !== undefined ? editingItem.prod_dev_percent : 100} 
                            onChange={(e) => setEditingItem({...editingItem, prod_dev_percent: Math.max(0, Number(e.target.value))})} 
                            className="w-full p-2.5 border rounded-lg outline-none text-center font-bold" 
                            placeholder="100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-green-600">تولید نهایی (محاسباتی)</label>
                        <input 
                            type="number" 
                            readOnly
                            value={editingItem.final_prod || 0} 
                            className="w-full p-2.5 border rounded-lg bg-green-50 text-green-800 font-bold text-center" 
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAppUserForm = () => (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-600 shadow-lg overflow-hidden flex items-center justify-center">
                    {editingItem.personnel_profile ? (
                        <img src={editingItem.personnel_profile} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-10 h-10 text-gray-400" />
                    )}
                </div>
                <div className="text-center">
                    <h4 className="font-bold text-lg">{editingItem.full_name || 'کاربر جدید'}</h4>
                    <p className="text-sm text-gray-500">{editingItem.unit || 'واحد سازمانی نامشخص'}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        انتخاب پرسنل <span className="text-red-500">*</span>
                    </label>
                    <select 
                        value={editingItem.personnel_id || ''}
                        onChange={(e) => handlePersonnelChange(e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">لطفا انتخاب کنید...</option>
                        {dropdowns.personnel.map((p:any) => p && (
                            <option key={p.id} value={p.id}>{p.full_name} ({p.personnel_code})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        نام کاربری (انگلیسی) <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" dir="ltr" value={editingItem.username || ''}
                        onChange={(e) => setEditingItem({...editingItem, username: e.target.value})}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                        placeholder="user123"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        گروه کاربری <span className="text-red-500">*</span>
                    </label>
                    <select 
                        value={editingItem.role || ''}
                        onChange={(e) => setEditingItem({...editingItem, role: e.target.value})}
                        className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">لطفا انتخاب کنید...</option>
                        {dropdowns.userGroups.map((g:any) => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                    </select>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    رمز عبور پیش‌فرض برابر با کد پرسنلی شخص تنظیم می‌شود.
                </div>
            </div>
        </div>
    );

    const renderOrgChartForm = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">کد واحد</label>
                <input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">واحد سازمانی <span className="text-red-500">*</span></label>
                <input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none" required />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">واحد سازمانی بالاتر</label>
                <select value={editingItem.parent_id || ''} onChange={(e) => setEditingItem({...editingItem, parent_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none">
                    <option value="">بدون والد (ریشه)</option>
                    {dropdowns.orgUnits.filter((i:any) => i.id !== editingItem.id).map((org:any) => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">مسئول واحد</label>
                <select value={editingItem.manager_id || ''} onChange={(e) => setEditingItem({...editingItem, manager_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none">
                    <option value="">انتخاب مسئول...</option>
                    {dropdowns.personnel.map((p:any) => <option key={p.id} value={p.id}>{p.full_name} ({p.unit})</option>)}
                </select>
            </div>
        </div>
    );

    const renderLocationForm = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">کد</label>
                <input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">نام محل استقرار <span className="text-red-500">*</span></label>
                <input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none" required />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">محل استقرار بالاتر</label>
                <select 
                    value={editingItem.parent_id || ''} 
                    onChange={(e) => setEditingItem({...editingItem, parent_id: e.target.value})} 
                    className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none"
                >
                    <option value="">بدون والد (ریشه)</option>
                    {dropdowns.locations && dropdowns.locations.filter((l:any) => l.id !== editingItem.id).map((loc:any) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );

    const renderPartCategorySubForm = () => {
        const mainCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'MAIN');
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">گروه اصلی <span className="text-red-500">*</span></label>
                    <select value={editingItem.parent_id || ''} onChange={(e) => setEditingItem({...editingItem, parent_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none">
                        <option value="">انتخاب کنید...</option>
                        {mainCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">کد گروه فرعی <span className="text-red-500">*</span></label>
                        <input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">نام گروه فرعی <span className="text-red-500">*</span></label>
                        <input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" />
                    </div>
                </div>
            </div>
        );
    };

    const renderPartCategorySubSubForm = () => {
        const mainCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'MAIN');
        const subCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'SUB' && (!editingItem.temp_main_cat_id || c.parent_id === editingItem.temp_main_cat_id));
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">گروه اصلی (فیلتر)</label>
                    <select value={editingItem.temp_main_cat_id || ''} onChange={(e) => setEditingItem({...editingItem, temp_main_cat_id: e.target.value, parent_id: ''})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none">
                        <option value="">انتخاب کنید...</option>
                        {mainCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">گروه فرعی <span className="text-red-500">*</span></label>
                    <select value={editingItem.parent_id || ''} onChange={(e) => setEditingItem({...editingItem, parent_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none" disabled={!editingItem.temp_main_cat_id}>
                        <option value="">انتخاب کنید...</option>
                        {subCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">کد گروه فرعیِ فرعی <span className="text-red-500">*</span></label>
                        <input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">نام گروه فرعیِ فرعی <span className="text-red-500">*</span></label>
                        <input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" />
                    </div>
                </div>
            </div>
        );
    };

    const renderPartsForm = () => {
        const mainCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'MAIN');
        const subCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'SUB' && (!editingItem.temp_main_cat_id || c.parent_id === editingItem.temp_main_cat_id));
        const subSubCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'SUB_SUB' && (!editingItem.temp_sub_cat_id || c.parent_id === editingItem.temp_sub_cat_id));

        return (
            <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="text-xs font-bold text-gray-500 mb-2">دسته‌بندی قطعه</h4>
                    <div className="space-y-2">
                        <select value={editingItem.temp_main_cat_id || ''} onChange={(e) => setEditingItem({...editingItem, temp_main_cat_id: e.target.value, temp_sub_cat_id: '', category_id: ''})} className="w-full p-2 text-sm border rounded bg-white dark:bg-gray-800"><option value="">۱. گروه اصلی...</option>{mainCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <select value={editingItem.temp_sub_cat_id || ''} onChange={(e) => setEditingItem({...editingItem, temp_sub_cat_id: e.target.value, category_id: ''})} className="w-full p-2 text-sm border rounded bg-white dark:bg-gray-800" disabled={!editingItem.temp_main_cat_id}><option value="">۲. گروه فرعی...</option>{subCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <select value={editingItem.category_id || ''} onChange={(e) => setEditingItem({...editingItem, category_id: e.target.value})} className="w-full p-2 text-sm border rounded bg-white dark:bg-gray-800 border-primary" disabled={!editingItem.temp_sub_cat_id}><option value="">۳. گروه فرعیِ فرعی (نهایی)...</option>{subSubCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">کد قطعه</label><input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
                    <div><label className="block text-sm font-medium mb-1">نام قطعه <span className="text-red-500">*</span></label><input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">واحد انبارش</label><select value={editingItem.stock_unit_id || ''} onChange={(e) => setEditingItem({...editingItem, stock_unit_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-800 outline-none"><option value="">انتخاب...</option>{dropdowns.measurementUnits.map((u:any) => <option key={u.id} value={u.id}>{u.title}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">واحد مصرف</label><select value={editingItem.consumption_unit_id || ''} onChange={(e) => setEditingItem({...editingItem, consumption_unit_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-800 outline-none"><option value="">انتخاب...</option>{dropdowns.measurementUnits.map((u:any) => <option key={u.id} value={u.id}>{u.title}</option>)}</select></div>
                </div>
            </div>
        );
    };

    const renderGenericForm = () => (
        <>
            {COLUMNS_MAP[activeTab].map(col => {
                const isRequired = MANDATORY_FIELDS.includes(col.key);
                
                // Allow 'local_name' to pass through the filter, but skip other _name columns that will be handled by custom blocks
                if (col.key.endsWith('_name') && !['name', 'username', 'full_name', 'local_name'].includes(col.key)) {
                    // Do nothing here, we handle class_name/group_name via explicit checks below
                } else if (col.key === 'parent_name') {
                    return null;
                } else if (activeTab === 'part_categories_main' && col.key === 'level_type') {
                    return null;
                }

                // If it is a standard input field
                const isStandardInput = (!col.key.endsWith('_name') || ['local_name', 'full_name'].includes(col.key as string)) && !['class_id', 'group_id', 'equipment_id', 'org_unit_id'].includes(col.key as string);

                if (isStandardInput) {
                    return (
                        <div key={String(col.key)}>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                {col.header} {isRequired && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                                type={col.key === 'email' ? 'email' : 'text'}
                                value={editingItem[col.key] || ''}
                                onChange={(e) => setEditingItem({...editingItem, [col.key]: e.target.value})}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                                placeholder={col.key === 'mobile' ? 'مثال: 09123456789' : ''}
                            />
                        </div>
                    );
                }

                // --- Relations Handlers ---

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

                // Equipment Class Selector (Handle both ID direct map or Name column map)
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
                    // Filter groups based on selected class
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
                            {!editingItem.class_id && <span className="text-xs text-orange-500 mt-1 block">ابتدا کلاس تجهیزات را انتخاب کنید.</span>}
                        </div>
                    );
                }

                // Equipment Selector (for Tree, Plans, etc)
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
            
            {activeTab === 'personnel' && (
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">تصویر پروفایل</label>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                        <div 
                            onClick={() => fileInputRef?.current?.click()}
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
                            <button type="button" onClick={() => fileInputRef?.current?.click()} className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 flex items-center gap-2 mb-1 w-full justify-center">
                                <Camera className="w-4 h-4" /> انتخاب تصویر
                            </button>
                            <p className="text-[10px] text-gray-400 text-center">فرمت‌های مجاز: JPG, PNG</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    const renderContent = () => {
        if (activeTab === 'production_plans') return renderProductionPlanForm();
        if (activeTab === 'app_users') return renderAppUserForm();
        if (activeTab === 'org_chart') return renderOrgChartForm();
        if (activeTab === 'locations') return renderLocationForm();
        if (activeTab === 'part_categories_sub') return renderPartCategorySubForm();
        if (activeTab === 'part_categories_sub_sub') return renderPartCategorySubSubForm();
        if (activeTab === 'parts') return renderPartsForm();
        return renderGenericForm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-bold">{editingItem?.id ? 'ویرایش آیتم' : 'افزودن آیتم جدید'}</h3>
                    <button onClick={onCancel} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={onSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {renderContent()}
                    <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800 pb-2 border-t dark:border-gray-700 mt-2">
                        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border rounded-lg hover:bg-gray-50 transition">انصراف</button>
                        <button 
                            type="submit" 
                            disabled={loading || !checkFormValidity()} 
                            className={`flex-1 py-2.5 rounded-lg flex justify-center gap-2 items-center transition shadow-lg ${loading || !checkFormValidity() ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-70' : 'bg-primary text-white hover:bg-red-800'}`}
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} ذخیره
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
