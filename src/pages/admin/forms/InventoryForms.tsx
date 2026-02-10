
import React from 'react';
import { Package } from 'lucide-react';

interface Props {
    editingItem: any;
    setEditingItem: (item: any) => void;
    dropdowns: any;
}

export const PartCategorySubForm: React.FC<Props> = ({ editingItem, setEditingItem, dropdowns }) => {
    const mainCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'MAIN');
    return (
        <div className="space-y-4 animate-fadeIn">
             <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-2">
                <h4 className="text-sm font-bold">تعریف گروه فرعی قطعات</h4>
            </div>
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

export const PartCategorySubSubForm: React.FC<Props> = ({ editingItem, setEditingItem, dropdowns }) => {
    const mainCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'MAIN');
    const subCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'SUB' && (!editingItem.temp_main_cat_id || c.parent_id === editingItem.temp_main_cat_id));
    return (
        <div className="space-y-4 animate-fadeIn">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-2">
                <h4 className="text-sm font-bold">تعریف گروه نهایی (Level 3)</h4>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">گروه اصلی (فیلتر)</label>
                <select value={editingItem.temp_main_cat_id || ''} onChange={(e) => setEditingItem({...editingItem, temp_main_cat_id: e.target.value, parent_id: ''})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none">
                    <option value="">انتخاب کنید...</option>
                    {mainCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">گروه فرعی (والد) <span className="text-red-500">*</span></label>
                <select value={editingItem.parent_id || ''} onChange={(e) => setEditingItem({...editingItem, parent_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none" disabled={!editingItem.temp_main_cat_id}>
                    <option value="">انتخاب کنید...</option>
                    {subCategories.map((c:any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">کد گروه نهایی <span className="text-red-500">*</span></label>
                    <input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">نام گروه نهایی <span className="text-red-500">*</span></label>
                    <input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" />
                </div>
            </div>
        </div>
    );
};

export const PartsForm: React.FC<Props> = ({ editingItem, setEditingItem, dropdowns }) => {
    const mainCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'MAIN');
    const subCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'SUB' && (!editingItem.temp_main_cat_id || c.parent_id === editingItem.temp_main_cat_id));
    const subSubCategories = dropdowns.allCategories.filter((c:any) => c.level_type === 'SUB_SUB' && (!editingItem.temp_sub_cat_id || c.parent_id === editingItem.temp_sub_cat_id));

    return (
        <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg"><Package className="w-5 h-5 text-green-600"/></div>
                <h4 className="font-bold">تعریف و ویرایش قطعه (Kala)</h4>
            </div>

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
            
            <div className="grid grid-cols-2 gap-4 border-t border-dashed pt-4 mt-2">
                <div>
                    <label className="block text-sm font-medium mb-1">موجودی فعلی</label>
                    <input type="number" min="0" value={editingItem.current_stock || 0} onChange={(e) => setEditingItem({...editingItem, current_stock: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg outline-none text-center font-bold" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">نقطه سفارش (حداقل)</label>
                    <input type="number" min="0" value={editingItem.min_stock || 0} onChange={(e) => setEditingItem({...editingItem, min_stock: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg outline-none text-center border-red-200 focus:ring-red-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">محل انبار</label>
                    <input type="text" value={editingItem.location_in_warehouse || ''} onChange={(e) => setEditingItem({...editingItem, location_in_warehouse: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" placeholder="مثال: ردیف 3 - قفسه A"/>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">قیمت واحد (ریال)</label>
                    <input type="number" min="0" value={editingItem.unit_price || 0} onChange={(e) => setEditingItem({...editingItem, unit_price: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg outline-none text-left" />
                </div>
            </div>
        </div>
    );
};
