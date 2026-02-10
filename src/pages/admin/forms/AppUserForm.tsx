
import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface AppUserFormProps {
    editingItem: any;
    setEditingItem: (item: any) => void;
    dropdowns: any;
    fileInputRef?: React.RefObject<HTMLInputElement>;
}

export const AppUserForm: React.FC<AppUserFormProps> = ({ editingItem, setEditingItem, dropdowns }) => {
    
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

    return (
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
};
