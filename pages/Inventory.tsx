
import React, { useState, useEffect } from 'react';
import { Warehouse, Package, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

export const Inventory: React.FC = () => {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [filterLowStock, setFilterLowStock] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
        const { data } = await supabase.from('parts').select('*').order('name');
        if (data) setParts(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const filteredParts = filterLowStock 
      ? parts.filter(p => (p.current_stock || 0) <= (p.min_stock || 0)) 
      : parts;

  const lowStockItems = parts.filter(p => (p.current_stock || 0) <= (p.min_stock || 0));
  const totalValue = parts.reduce((acc, curr) => acc + ((curr.current_stock || 0) * (curr.unit_price || 0)), 0);

  const filterContent = (
      <div className="flex items-center gap-2">
           <label className="flex items-center gap-2 cursor-pointer">
               <input 
                  type="checkbox" 
                  checked={filterLowStock} 
                  onChange={e => setFilterLowStock(e.target.checked)} 
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
               />
               <span className="text-sm text-gray-700 dark:text-gray-300">نمایش فقط اقلام زیر نقطه سفارش</span>
           </label>
      </div>
  );

  const columns = [
      { header: 'کد قطعه', accessor: (p: any) => <span className="font-mono font-bold">{p.code}</span>, sortKey: 'code' },
      { header: 'نام قطعه', accessor: (p: any) => p.name, sortKey: 'name' },
      { header: 'موجودی فعلی', accessor: (p: any) => <span className={`font-bold ${p.current_stock <= p.min_stock ? 'text-red-600' : 'text-green-600'}`}>{p.current_stock || 0}</span>, sortKey: 'current_stock' },
      { header: 'نقطه سفارش', accessor: (p: any) => p.min_stock || 0, sortKey: 'min_stock' },
      { header: 'محل انبار', accessor: (p: any) => p.location_in_warehouse || '-', sortKey: 'location_in_warehouse' },
      { header: 'قیمت واحد (ریال)', accessor: (p: any) => (p.unit_price || 0).toLocaleString(), sortKey: 'unit_price' },
      { header: 'ارزش کل (ریال)', accessor: (p: any) => ((p.current_stock || 0) * (p.unit_price || 0)).toLocaleString() },
  ];

  const HeaderWidgets = (
      <div className="space-y-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
                  <div>
                      <span className="text-sm text-gray-500 block mb-1">تعداد اقلام تعریف شده</span>
                      <span className="text-2xl font-bold">{parts.length}</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Package className="w-6 h-6"/></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
                  <div>
                      <span className="text-sm text-gray-500 block mb-1">اقلام نیازمند سفارش</span>
                      <span className="text-2xl font-bold text-red-600">{lowStockItems.length}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-full text-red-600"><TrendingDown className="w-6 h-6"/></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
                  <div>
                      <span className="text-sm text-gray-500 block mb-1">ارزش کل موجودی</span>
                      <span className="text-xl font-bold text-green-700">{totalValue.toLocaleString()} <span className="text-xs font-normal text-gray-500">ریال</span></span>
                  </div>
                  <div className="bg-green-50 p-3 rounded-full text-green-600"><DollarSign className="w-6 h-6"/></div>
              </div>
          </div>
          {lowStockItems.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-sm mb-1">هشدار موجودی</h4>
                    <p className="text-xs leading-relaxed">
                        موجودی کالاهای زیر به نقطه سفارش رسیده است: 
                        {lowStockItems.map(i => i.name).slice(0, 5).join('، ')} 
                        {lowStockItems.length > 5 && ` و ${lowStockItems.length - 5} مورد دیگر.`}
                    </p>
                </div>
            </div>
          )}
      </div>
  );

  return (
    <DataPage
      title="مدیریت موجودی انبار"
      icon={Warehouse}
      data={filteredParts}
      isLoading={loading}
      columns={columns}
      onReload={fetchInventory}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      filterContent={filterContent}
      exportName="Inventory"
    >
        {HeaderWidgets}
    </DataPage>
  );
};

export default Inventory;
