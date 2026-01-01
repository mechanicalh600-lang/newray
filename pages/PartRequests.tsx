
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { generateTrackingCode, getShamsiDate, getTime } from '../utils';
import { Package, X, Plus, Trash2, Search, Edit, Save, Loader2, List, Filter, RefreshCw } from 'lucide-react';
import { startWorkflow, getItemsByModule, fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';

interface Props {
  user: User;
}

interface RequestItem {
    id: string; // Temporary ID for UI
    partId: string;
    partName: string;
    partCode: string;
    qty: number;
    unit: string;
    note: string;
}

export const PartRequests: React.FC<Props> = ({ user }) => {
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [items, setItems] = useState<any[]>([]); // List of submitted requests
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Master Data State ---
  const [categories, setCategories] = useState<any[]>([]); // All categories flat list
  const [parts, setParts] = useState<any[]>([]); // All parts flat list
  const [units, setUnits] = useState<any[]>([]);
  const [activeWorkOrders, setActiveWorkOrders] = useState<any[]>([]);

  // --- Filter State for Part Selection ---
  const [filters, setFilters] = useState({
      mainCatId: '',
      subCatId: '',
      subSubCatId: '',
      search: ''
  });
  const [filteredParts, setFilteredParts] = useState<any[]>([]);

  // --- Form State ---
  const [requestHeader, setRequestHeader] = useState({
      requestDate: getShamsiDate(),
      requestTime: getTime(),
      workOrderId: '', // ID from cartable_items (active work orders)
      description: '' // General description if no WO is selected
  });

  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [currentItem, setCurrentItem] = useState<RequestItem>({
      id: '',
      partId: '',
      partName: '',
      partCode: '',
      qty: 1,
      unit: '',
      note: ''
  });
  const [isEditingItem, setIsEditingItem] = useState(false);

  // --- Initialization ---
  useEffect(() => {
      loadMasterData();
      refreshList();
  }, []);

  const refreshList = async () => {
      setIsLoading(true);
      // For now, fetching from workflow/cartable_items which tracks the process
      const stored = getItemsByModule('PART_REQUEST');
      setItems(stored.map(i => ({...i, ...i.data})));
      setIsLoading(false);
  };

  const loadMasterData = async () => {
      // setIsLoading(true); // Don't block UI for master data in List view, only when form opens if needed
      const [cats, pts, unts, wos] = await Promise.all([
          fetchMasterData('part_categories'),
          fetchMasterData('parts'),
          fetchMasterData('measurement_units'),
          supabase.from('cartable_items').select('*').eq('module', 'WORK_ORDER').neq('status', 'DONE')
      ]);
      
      setCategories(cats || []);
      setParts(pts || []);
      setUnits(unts || []);
      setActiveWorkOrders(wos.data || []);
      
      // Default Unit
      if(unts && unts.length > 0) {
          setCurrentItem(prev => ({ ...prev, unit: unts[0].title }));
      }
      // setIsLoading(false);
  };

  // --- Filtering Logic ---
  useEffect(() => {
      let res = parts;

      // 1. Filter by Category Cascade
      if (filters.subSubCatId) {
          res = res.filter(p => p.category_id === filters.subSubCatId);
      } else if (filters.subCatId) {
          // Find all sub-sub categories belonging to this sub
          const validSubSubs = categories.filter(c => c.parent_id === filters.subCatId).map(c => c.id);
          res = res.filter(p => validSubSubs.includes(p.category_id));
      } else if (filters.mainCatId) {
          // Find all sub categories
          const validSubs = categories.filter(c => c.parent_id === filters.mainCatId).map(c => c.id);
          // Find all sub-sub categories
          const validSubSubs = categories.filter(c => validSubs.includes(c.parent_id)).map(c => c.id);
          res = res.filter(p => validSubSubs.includes(p.category_id));
      }

      // 2. Filter by Search Text
      if (filters.search) {
          const lower = filters.search.toLowerCase();
          res = res.filter(p => 
              (p.name && p.name.toLowerCase().includes(lower)) || 
              (p.code && p.code.toLowerCase().includes(lower))
          );
      }

      setFilteredParts(res);
  }, [filters, parts, categories]);

  // --- Handlers ---

  const handlePartSelect = (partId: string) => {
      const part = parts.find(p => p.id === partId);
      if (!part) return;

      // Try to find default unit name
      const defaultUnit = units.find(u => u.id === part.consumption_unit_id)?.title || units[0]?.title || 'عدد';

      setCurrentItem(prev => ({
          ...prev,
          partId: part.id,
          partName: part.name,
          partCode: part.code,
          unit: defaultUnit
      }));
  };

  const handleAddItem = () => {
      if (!currentItem.partId && !currentItem.partName) {
          alert("لطفا یک قطعه را انتخاب یا نام آن را وارد کنید.");
          return;
      }
      if (currentItem.qty <= 0) {
          alert("تعداد باید بیشتر از صفر باشد.");
          return;
      }

      const newItem = { ...currentItem, id: Math.random().toString() };
      setRequestItems(prev => [...prev, newItem]);
      
      // Reset current item but keep unit potentially
      setCurrentItem({
          id: '',
          partId: '',
          partName: '',
          partCode: '',
          qty: 1,
          unit: currentItem.unit,
          note: ''
      });
      // Reset filters partially? No, keep context usually helpful.
  };

  const handleEditItem = (item: RequestItem) => {
      setCurrentItem(item);
      setIsEditingItem(true);
      // Remove from list temporarily
      setRequestItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleUpdateItem = () => {
      if (!currentItem.partName || currentItem.qty <= 0) return;
      setRequestItems(prev => [...prev, currentItem]);
      setIsEditingItem(false);
      setCurrentItem({
          id: '',
          partId: '',
          partName: '',
          partCode: '',
          qty: 1,
          unit: units[0]?.title || '',
          note: ''
      });
  };

  const handleDeleteItem = (id: string) => {
      if (window.confirm("آیا از حذف این ردیف اطمینان دارید؟")) {
          setRequestItems(prev => prev.filter(i => i.id !== id));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (requestItems.length === 0) {
          alert("لیست درخواست خالی است. لطفا حداقل یک قطعه اضافه کنید.");
          return;
      }
      if (!requestHeader.workOrderId && !requestHeader.description.trim()) {
          alert("در صورت عدم انتخاب دستور کار، توضیحات (علت درخواست) الزامی است.");
          return;
      }

      setIsSubmitting(true);
      try {
          // 1. Generate Tracking Code
          const date = new Date();
          const j = getShamsiDate().split('/'); // reuse util properly in real app
          // Simple prefix P + YearMonth
          const trackingCode = await fetchNextTrackingCode('P');

          // 2. Prepare Data
          const selectedWO = activeWorkOrders.find(w => w.id === requestHeader.workOrderId);
          const woCode = selectedWO ? selectedWO.tracking_code : null;

          const requestData = {
              tracking_code: trackingCode,
              requester_id: user.id,
              requester_name: user.fullName,
              work_order_id: requestHeader.workOrderId || null,
              work_order_code: woCode,
              request_date: requestHeader.requestDate,
              description: requestHeader.description || (selectedWO ? `پیرو دستور کار ${selectedWO.title}` : ''),
              status: 'PENDING'
          };

          // 3. Insert Header
          const { data: insertedReq, error: reqError } = await supabase
              .from('part_requests')
              .insert([requestData])
              .select()
              .single();

          if (reqError) throw reqError;

          // 4. Insert Items
          const itemsPayload = requestItems.map(item => ({
              request_id: insertedReq.id,
              part_id: item.partId || null,
              part_name: item.partName,
              qty: item.qty,
              unit: item.unit,
              note: item.note
          }));

          const { error: itemsError } = await supabase
              .from('part_request_items')
              .insert(itemsPayload);

          if (itemsError) throw itemsError;

          // 5. Start Workflow (Legacy Integration)
          // We still create a cartable item so managers can approve it
          // The data payload will contain a snapshot of the request
          startWorkflow(
              'PART_REQUEST', 
              { ...requestData, items: requestItems }, 
              user, 
              trackingCode, 
              `درخواست قطعه: ${requestItems.length} قلم`
          );

          alert(`درخواست با شماره پیگیری ${trackingCode} با موفقیت ثبت شد.`);
          setView('LIST');
          refreshList();
          
          // Reset Form
          setRequestItems([]);
          setRequestHeader({
              requestDate: getShamsiDate(),
              requestTime: getTime(),
              workOrderId: '',
              description: ''
          });

      } catch (err: any) {
          console.error(err);
          alert("خطا در ثبت درخواست: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- Derived Lists for Dropdowns ---
  const mainCategories = categories.filter(c => c.level_type === 'MAIN');
  const subCategories = categories.filter(c => c.level_type === 'SUB' && (!filters.mainCatId || c.parent_id === filters.mainCatId));
  const subSubCategories = categories.filter(c => c.level_type === 'SUB_SUB' && (!filters.subCatId || c.parent_id === filters.subCatId));

  const extraActions = (
      <button 
        onClick={refreshList} 
        className="p-2.5 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:rotate-180 transition duration-500 shadow-sm" 
        title="بروزرسانی"
      >
          <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
  );

  if (view === 'LIST') {
      return (
          <div className="max-w-7xl mx-auto pb-20">
              <SmartTable
                title="درخواست‌های قطعه و کالا"
                icon={Package}
                data={items}
                onAdd={() => setView('NEW')}
                isLoading={isLoading}
                extraActions={extraActions}
                columns={[
                    { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.trackingCode}</span> },
                    { header: 'تاریخ درخواست', accessor: (i: any) => i.createdAt },
                    { header: 'دستور کار مرتبط', accessor: (i: any) => i.data?.work_order_code || '-' },
                    { header: 'تعداد اقلام', accessor: (i: any) => <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">{i.data?.items?.length || 0}</span> },
                    { header: 'درخواست کننده', accessor: (i: any) => i.data?.requester_name || user.fullName },
                    { header: 'وضعیت', accessor: (i: any) => (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${i.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {i.status === 'PENDING' ? 'در انتظار تایید' : 'تایید شده'}
                        </span>
                    )},
                ]}
              />
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                    <Package className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">ثبت درخواست قطعه / کالا</h1>
                    <p className="text-xs text-gray-500">فرم درخواست اقلام از انبار</p>
                </div>
            </div>
            <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: FORM INPUTS */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Header Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">اطلاعات پایه درخواست</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">درخواست کننده</label>
                            <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">{user.fullName}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">تاریخ</label>
                            <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono text-center">{requestHeader.requestDate}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">دستور کار مرتبط</label>
                            <select 
                                value={requestHeader.workOrderId}
                                onChange={e => setRequestHeader({...requestHeader, workOrderId: e.target.value})}
                                className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-600 text-sm outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">انتخاب کنید (اختیاری)</option>
                                {activeWorkOrders.map(wo => (
                                    <option key={wo.id} value={wo.id}>{wo.tracking_code} - {wo.title}</option>
                                ))}
                            </select>
                        </div>
                        {!requestHeader.workOrderId && (
                            <div className="md:col-span-3 animate-fadeIn">
                                <label className="block text-xs font-bold text-gray-500 mb-1">علت درخواست (الزامی) <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={requestHeader.description}
                                    onChange={e => setRequestHeader({...requestHeader, description: e.target.value})}
                                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="توضیحات فنی و علت نیاز..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Item Entry Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-green-600"/> 
                        {isEditingItem ? 'ویرایش قلم کالا' : 'افزودن قلم کالا'}
                    </h3>

                    {/* Filters */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-2">
                            <Filter className="w-4 h-4" /> فیلتر قطعات
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            <select 
                                value={filters.mainCatId}
                                onChange={e => setFilters({...filters, mainCatId: e.target.value, subCatId: '', subSubCatId: ''})}
                                className="p-2 rounded border outline-none text-xs"
                            >
                                <option value="">همه گروه‌های اصلی</option>
                                {mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select 
                                value={filters.subCatId}
                                onChange={e => setFilters({...filters, subCatId: e.target.value, subSubCatId: ''})}
                                className="p-2 rounded border outline-none text-xs"
                                disabled={!filters.mainCatId}
                            >
                                <option value="">همه گروه‌های فرعی</option>
                                {subCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select 
                                value={filters.subSubCatId}
                                onChange={e => setFilters({...filters, subSubCatId: e.target.value})}
                                className="p-2 rounded border outline-none text-xs"
                                disabled={!filters.subCatId}
                            >
                                <option value="">همه زیرگروه‌ها</option>
                                {subSubCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="relative">
                                <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="جستجو نام/کد..."
                                    value={filters.search}
                                    onChange={e => setFilters({...filters, search: e.target.value})}
                                    className="w-full p-2 pl-8 rounded border outline-none text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Part Selector */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 mb-1">انتخاب قطعه <span className="text-red-500">*</span></label>
                        <select 
                            value={currentItem.partId}
                            onChange={e => handlePartSelect(e.target.value)}
                            className="w-full p-3 border rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">-- قطعه را انتخاب کنید --</option>
                            {filteredParts.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.code ? `(${p.code})` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="mt-1 text-xs text-gray-400">
                            {filteredParts.length === 0 ? 'هیچ قطعه‌ای یافت نشد.' : `${filteredParts.length} قطعه پیدا شد.`}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">نام قطعه (اگر در لیست نبود)</label>
                            <input 
                                type="text" 
                                value={currentItem.partName}
                                onChange={e => setCurrentItem({...currentItem, partName: e.target.value})}
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                placeholder="نام قطعه..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">تعداد <span className="text-red-500">*</span></label>
                            <input 
                                type="number" 
                                min="0.01" step="0.01"
                                value={currentItem.qty}
                                onChange={e => setCurrentItem({...currentItem, qty: Number(e.target.value)})}
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-center font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">واحد <span className="text-red-500">*</span></label>
                            <select 
                                value={currentItem.unit}
                                onChange={e => setCurrentItem({...currentItem, unit: e.target.value})}
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            >
                                {units.map(u => <option key={u.id} value={u.title}>{u.title}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-3">
                        <input 
                            type="text" 
                            value={currentItem.note}
                            onChange={e => setCurrentItem({...currentItem, note: e.target.value})}
                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                            placeholder="توضیحات تکمیلی برای این قلم (اختیاری)..."
                        />
                    </div>

                    <div className="mt-4 flex justify-end">
                        {isEditingItem ? (
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditingItem(false); setCurrentItem({id:'', partId:'', partName:'', partCode:'', qty:1, unit:units[0]?.title||'', note:''}); }} className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-100">انصراف</button>
                                <button onClick={handleUpdateItem} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg">بروزرسانی</button>
                            </div>
                        ) : (
                            <button onClick={handleAddItem} className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 font-bold transition transform active:scale-95">
                                <Plus className="w-5 h-5" /> افزودن به لیست
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: ITEMS LIST */}
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><List className="w-5 h-5"/> اقلام درخواست شده</h3>
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">{requestItems.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[500px]">
                        {requestItems.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                هنوز موردی اضافه نشده است.
                            </div>
                        ) : (
                            requestItems.map((item, idx) => (
                                <div key={item.id} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition relative group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.partName}</span>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded font-mono text-gray-500">{item.partCode || '---'}</span>
                                    </div>
                                    <div className="text-sm text-blue-600 font-bold mb-1">
                                        {item.qty} {item.unit}
                                    </div>
                                    {item.note && <div className="text-xs text-gray-500 italic border-t pt-1 mt-1">{item.note}</div>}
                                    
                                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-gray-800/80 rounded p-0.5 backdrop-blur-sm">
                                        <button onClick={() => handleEditItem(item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <button 
                            onClick={handleSubmit} 
                            disabled={requestItems.length === 0 || isSubmitting || (!requestHeader.workOrderId && !requestHeader.description)}
                            className="w-full bg-primary text-white py-3 rounded-xl shadow-xl hover:bg-red-800 transition font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />}
                            ثبت نهایی درخواست
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
