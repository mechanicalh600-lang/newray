
import React from 'react';
import { MapPin } from 'lucide-react';

interface LocationFormProps {
    editingItem: any;
    setEditingItem: (item: any) => void;
    dropdowns: any;
}

export const LocationForm: React.FC<LocationFormProps> = ({ editingItem, setEditingItem, dropdowns }) => {
    return (
        <div className="space-y-4 animate-fadeIn">
            <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800 mb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300">تعریف محل استقرار (Location)</h4>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">کد مکان</label>
                <input type="text" value={editingItem.code || ''} onChange={(e) => setEditingItem({...editingItem, code: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">نام محل استقرار <span className="text-red-500">*</span></label>
                <input type="text" value={editingItem.name || ''} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">محل استقرار بالاتر (والد)</label>
                <select 
                    value={editingItem.parent_id || ''} 
                    onChange={(e) => setEditingItem({...editingItem, parent_id: e.target.value})} 
                    className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="">بدون والد (ریشه)</option>
                    {dropdowns.locations && dropdowns.locations.filter((l:any) => l.id !== editingItem.id).map((loc:any) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};
