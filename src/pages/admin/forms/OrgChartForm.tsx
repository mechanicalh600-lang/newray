
import React from 'react';

interface OrgChartFormProps {
    editingItem: any;
    setEditingItem: (item: any) => void;
    dropdowns: any;
}

export const OrgChartForm: React.FC<OrgChartFormProps> = ({ editingItem, setEditingItem, dropdowns }) => {
    return (
        <div className="space-y-4 animate-fadeIn">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-2">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">تعریف واحد سازمانی</h4>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">کد واحد</label>
                <input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">نام واحد سازمانی <span className="text-red-500">*</span></label>
                <input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">واحد سازمانی بالاتر</label>
                    <select value={editingItem.parent_id || ''} onChange={(e) => setEditingItem({...editingItem, parent_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary">
                        <option value="">بدون والد (ریشه)</option>
                        {dropdowns.orgUnits.filter((i:any) => i.id !== editingItem.id).map((org:any) => <option key={org.id} value={org.id}>{org.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">مسئول واحد</label>
                    <select value={editingItem.manager_id || ''} onChange={(e) => setEditingItem({...editingItem, manager_id: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary">
                        <option value="">انتخاب مسئول...</option>
                        {dropdowns.personnel.map((p:any) => <option key={p.id} value={p.id}>{p.full_name} ({p.unit})</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};
