
import React, { useEffect } from 'react';
import { Target } from 'lucide-react';

const SHAMSI_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

interface ProductionPlanFormProps {
    editingItem: any;
    setEditingItem: (item: any) => void;
}

export const ProductionPlanForm: React.FC<ProductionPlanFormProps> = ({ editingItem, setEditingItem }) => {

    // Auto-calculate Total Days based on Month
    useEffect(() => {
        if (!editingItem.year) setEditingItem((prev: any) => ({ ...prev, year: 1403 }));
        
        const monthIdx = SHAMSI_MONTHS.indexOf(editingItem.month);
        if (monthIdx !== -1) {
            let days = 30;
            if (monthIdx < 6) days = 31; 
            else if (monthIdx === 11) days = 29; 
            else days = 30;
            
            setEditingItem((prev: any) => ({ ...prev, total_days: days }));
        }
    }, [editingItem.month]);

    // Auto-calculate Downtime Days
    useEffect(() => {
        if (editingItem.total_days > 0 && editingItem.active_days !== undefined) {
            const down = editingItem.total_days - editingItem.active_days;
            if (down >= 0) {
                setEditingItem((prev: any) => ({ ...prev, downtime_days: down }));
            }
        }
    }, [editingItem.active_days, editingItem.total_days]);

    // Auto-calculate Final Plans
    useEffect(() => {
        // Feed Calculation
        const usage = Number(editingItem.feed_usage) || 0;
        const devPercent = Number(editingItem.feed_dev_percent) !== undefined ? Number(editingItem.feed_dev_percent) : 100;
        const safeDevPercent = Math.max(0, devPercent);
        const finalFeed = usage * (safeDevPercent / 100);
        
        // Production Calculation
        const prodUsage = Number(editingItem.prod_usage) || 0;
        const prodDevPercent = Number(editingItem.prod_dev_percent) !== undefined ? Number(editingItem.prod_dev_percent) : 100;
        const safeProdDevPercent = Math.max(0, prodDevPercent);
        const finalProd = prodUsage * (safeProdDevPercent / 100);

        if (editingItem.final_feed !== finalFeed || editingItem.final_prod !== finalProd) {
                setEditingItem((prev: any) => ({ 
                    ...prev, 
                    final_feed: parseFloat(finalFeed.toFixed(2)),
                    final_prod: parseFloat(finalProd.toFixed(2))
                }));
        }
    }, [editingItem.feed_usage, editingItem.feed_dev_percent, editingItem.prod_usage, editingItem.prod_dev_percent]);

    return (
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
                        className="w-full p-2.5 border rounded-lg outline-none text-center font-bold dark:bg-gray-700 dark:border-gray-600" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ماه <span className="text-red-500">*</span></label>
                    <select 
                        value={editingItem.month || ''} 
                        onChange={(e) => setEditingItem({...editingItem, month: e.target.value})} 
                        className="w-full p-2.5 border rounded-lg outline-none bg-white dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">انتخاب...</option>
                        {SHAMSI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500">روز کل</label>
                    <input type="number" min="0" value={editingItem.total_days || ''} onChange={(e) => setEditingItem({...editingItem, total_days: Number(e.target.value)})} className="w-full p-2 border rounded text-center bg-white dark:bg-gray-600" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-green-600">روز فعال <span className="text-red-500">*</span></label>
                    <input type="number" min="0" value={editingItem.active_days || ''} onChange={(e) => setEditingItem({...editingItem, active_days: Number(e.target.value)})} className="w-full p-2 border rounded text-center font-bold border-green-200 focus:ring-green-500 outline-none dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-red-600">روز توقف</label>
                    <input type="number" min="0" value={editingItem.downtime_days || 0} onChange={(e) => setEditingItem({...editingItem, downtime_days: Number(e.target.value)})} className="w-full p-2 border rounded text-center font-bold bg-red-50 dark:bg-red-900/20 text-red-700 dark:border-red-900" />
                </div>
            </div>

            <div className="border-t border-dashed my-4 dark:border-gray-600"></div>
            
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
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono dark:bg-gray-700 dark:border-gray-600" 
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
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono dark:bg-gray-700 dark:border-gray-600" 
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
                            className="w-full p-2.5 border rounded-lg outline-none text-center font-bold dark:bg-gray-700 dark:border-gray-600" 
                            placeholder="100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-blue-600">خوراک نهایی (محاسباتی)</label>
                        <input 
                            type="number" 
                            readOnly
                            value={editingItem.final_feed || 0} 
                            className="w-full p-2.5 border rounded-lg bg-blue-50 text-blue-800 font-bold text-center dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" 
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
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono dark:bg-gray-700 dark:border-gray-600" 
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
                            className="w-full p-2.5 border rounded-lg outline-none text-left font-mono dark:bg-gray-700 dark:border-gray-600" 
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
                            className="w-full p-2.5 border rounded-lg outline-none text-center font-bold dark:bg-gray-700 dark:border-gray-600" 
                            placeholder="100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-green-600">تولید نهایی (محاسباتی)</label>
                        <input 
                            type="number" 
                            readOnly
                            value={editingItem.final_prod || 0} 
                            className="w-full p-2.5 border rounded-lg bg-green-50 text-green-800 font-bold text-center dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
