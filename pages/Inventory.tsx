
import React, { useState, useEffect } from 'react';
import { Warehouse, Package, TrendingDown, DollarSign, AlertCircle, X } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

export const Inventory: React.FC = () => {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Edit/Add Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any | null>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: '', name: '', current_stock: 0, min_stock: 0, reorder_quantity: 0, warehouse_row: '', shelf: '', unit_price: 0,
    stock_unit_id: '', consumption_unit_id: '',
    temp_main_cat_id: '', temp_sub_cat_id: '', category_id: '',
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
        const all: any[] = [];
        const pageSize = 1000;
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
            const { data, error } = await supabase
                .from('parts')
                .select('*')
                .order('name')
                .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            all.push(...data);
            hasMore = data.length === pageSize;
            offset += pageSize;
        }
        setParts(all);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const fetchPartCategories = async () => {
    const { data, error } = await supabase.from('part_categories').select('id, name, level_type, parent_id').order('name');
    if (error) throw error;
    return data || [];
  };

  const fetchMeasurementUnits = async () => {
    const { data, error } = await supabase.from('measurement_units').select('id, title, symbol').order('title');
    if (error) throw error;
    return data || [];
  };

  const openAddForm = async () => {
    setEditingPart(null);
    setFormData({
      code: '', name: '', current_stock: 0, min_stock: 0, reorder_quantity: 0, warehouse_row: '', shelf: '', unit_price: 0,
      stock_unit_id: '', consumption_unit_id: '',
      temp_main_cat_id: '', temp_sub_cat_id: '', category_id: '',
    });
    try {
      const [cats, units] = await Promise.all([fetchPartCategories(), fetchMeasurementUnits()]);
      setAllCategories(cats);
      setMeasurementUnits(units);
    } catch (e) {
      console.error(e);
      setAllCategories([]);
      setMeasurementUnits([]);
    }
    setIsFormOpen(true);
  };

  const openEditForm = async (item: any) => {
    setEditingPart(item);
    const [cats, units] = await Promise.all([fetchPartCategories().catch(() => []), fetchMeasurementUnits().catch(() => [])]);
    setAllCategories(cats);
    setMeasurementUnits(units);

    let tempMain = '', tempSub = '';
    const catId = item.category_id;
    if (catId && cats.length) {
      const cat = cats.find((c: any) => c.id === catId);
      if (cat) {
        if (cat.level_type === 'SUB_SUB') {
          tempSub = cat.parent_id || '';
          const subCat = cats.find((c: any) => c.id === tempSub);
          tempMain = subCat?.parent_id || '';
        } else if (cat.level_type === 'SUB') {
          tempMain = cat.parent_id || '';
          tempSub = cat.id;
        } else if (cat.level_type === 'MAIN') {
          tempMain = cat.id;
        }
      }
    }

    setFormData({
      code: item.code || '',
      name: item.name || '',
      current_stock: Number(item.current_stock ?? 0),
      min_stock: Number(item.min_stock ?? 0),
      reorder_quantity: Number(item.reorder_quantity ?? 0),
      warehouse_row: item.warehouse_row || '',
      shelf: item.shelf || '',
      unit_price: Number(item.unit_price ?? 0),
      stock_unit_id: item.stock_unit_id || '',
      consumption_unit_id: item.consumption_unit_id || '',
      temp_main_cat_id: tempMain,
      temp_sub_cat_id: tempSub,
      category_id: catId || '',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPart(null);
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.code?.trim()) return;
    setLoading(true);
    try {
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category_id: formData.category_id || null,
        current_stock: formData.current_stock,
        min_stock: formData.min_stock,
        reorder_quantity: formData.reorder_quantity,
        stock_unit_id: formData.stock_unit_id || null,
        consumption_unit_id: formData.consumption_unit_id || null,
        warehouse_row: formData.warehouse_row.trim() || null,
        shelf: formData.shelf.trim() || null,
        unit_price: formData.unit_price,
      };
      if (editingPart?.id) {
        const { error } = await supabase.from('parts').update(payload).eq('id', editingPart.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('parts').insert(payload);
        if (error) throw error;
      }
      closeForm();
      await fetchInventory();
    } catch (err: any) {
      console.error(err);
      alert('خطا: ' + (err.message || 'خطا در ذخیره'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('parts').delete().in('id', ids);
      if (error) throw error;
      setSelectedIds([]);
      await fetchInventory();
    } catch (err: any) {
      console.error(err);
      throw err;
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
      { header: 'ردیف انبار', accessor: (p: any) => p.warehouse_row || '-', sortKey: 'warehouse_row' },
      { header: 'قفسه', accessor: (p: any) => p.shelf || '-', sortKey: 'shelf' },
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
    <>
      <DataPage
        title="مدیریت موجودی انبار"
        icon={Warehouse}
        data={filteredParts}
        isLoading={loading}
        columns={columns}
        onReload={fetchInventory}
        onAdd={openAddForm}
        onEdit={openEditForm}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        exportName="Inventory"
      >
          {HeaderWidgets}
      </DataPage>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeForm}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingPart ? 'ویرایش قطعه' : 'افزودن قطعه جدید'}</h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePart} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">دسته‌بندی قطعه</h4>
                <div className="space-y-2">
                  <select
                    value={formData.temp_main_cat_id}
                    onChange={(e) => setFormData({ ...formData, temp_main_cat_id: e.target.value, temp_sub_cat_id: '', category_id: '' })}
                    className="w-full p-2.5 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 outline-none"
                  >
                    <option value="">۱. گروه اصلی قطعات...</option>
                    {allCategories.filter((c: any) => c.level_type === 'MAIN').map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={formData.temp_sub_cat_id}
                    onChange={(e) => setFormData({ ...formData, temp_sub_cat_id: e.target.value, category_id: '' })}
                    disabled={!formData.temp_main_cat_id}
                    className="w-full p-2.5 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 outline-none disabled:opacity-50"
                  >
                    <option value="">۲. گروه فرعی قطعات...</option>
                    {allCategories.filter((c: any) => c.level_type === 'SUB' && c.parent_id === formData.temp_main_cat_id).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    disabled={!formData.temp_main_cat_id}
                    className="w-full p-2.5 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 border-primary outline-none disabled:opacity-50"
                  >
                    <option value="">۳. گروه فرعیِ فرعی قطعات...</option>
                    {formData.temp_main_cat_id && !formData.temp_sub_cat_id && allCategories.filter((c: any) => c.id === formData.temp_main_cat_id).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} (اصلی)</option>
                    ))}
                    {formData.temp_sub_cat_id && allCategories.filter((c: any) => c.id === formData.temp_sub_cat_id).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} (فرعی)</option>
                    ))}
                    {formData.temp_sub_cat_id && allCategories.filter((c: any) => c.level_type === 'SUB_SUB' && c.parent_id === formData.temp_sub_cat_id).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} (فرعی فرعی)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">کد قطعه <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نام قطعه <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">واحد انبارش</label>
                  <select value={formData.stock_unit_id} onChange={e => setFormData({ ...formData, stock_unit_id: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 outline-none">
                    <option value="">انتخاب...</option>
                    {measurementUnits.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">واحد مصرف</label>
                  <select value={formData.consumption_unit_id} onChange={e => setFormData({ ...formData, consumption_unit_id: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 outline-none">
                    <option value="">انتخاب...</option>
                    {measurementUnits.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">موجودی فعلی</label>
                  <input type="number" min={0} value={formData.current_stock} onChange={e => setFormData({ ...formData, current_stock: Number(e.target.value) })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نقطه سفارش</label>
                  <input type="number" min={0} value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: Number(e.target.value) })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">تعداد سفارش</label>
                  <input type="number" min={0} value={formData.reorder_quantity} onChange={e => setFormData({ ...formData, reorder_quantity: Number(e.target.value) })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">قیمت واحد (ریال)</label>
                  <input type="number" min={0} value={formData.unit_price} onChange={e => setFormData({ ...formData, unit_price: Number(e.target.value) })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ردیف انبار</label>
                  <input type="text" value={formData.warehouse_row} onChange={e => setFormData({ ...formData, warehouse_row: e.target.value })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" placeholder="مثال: 3" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">قفسه</label>
                  <input type="text" value={formData.shelf} onChange={e => setFormData({ ...formData, shelf: e.target.value })} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" placeholder="مثال: A" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">انصراف</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">ذخیره</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Inventory;
