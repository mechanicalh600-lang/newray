
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { GitMerge, Plus, Trash2, Search, Package } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { fetchMasterData } from '../workflowStore';

export const BillOfMaterials: React.FC<{ user: User }> = ({ user }) => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [partsList, setPartsList] = useState<any[]>([]);
  const [selectedEquipId, setSelectedEquipId] = useState<string | null>(null);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Add Part Form
  const [isAdding, setIsAdding] = useState(false);
  const [newPartId, setNewPartId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
      fetchMasterData('equipment').then(setEquipmentList);
      fetchMasterData('parts').then(setPartsList);
  }, []);

  useEffect(() => {
      if (selectedEquipId) fetchBOM(selectedEquipId);
  }, [selectedEquipId]);

  const fetchBOM = async (equipId: string) => {
      setLoading(true);
      const { data } = await supabase
          .from('equipment_boms')
          .select('*, parts(code, name, stock_unit_id)')
          .eq('equipment_id', equipId);
      
      if (data) setBomItems(data);
      setLoading(false);
  };

  const handleAddPart = async () => {
      if (!selectedEquipId || !newPartId) return;

      if (newQty <= 0) {
          alert('تعداد باید بیشتر از صفر باشد.');
          return;
      }
      
      try {
          await supabase.from('equipment_boms').insert({
              equipment_id: selectedEquipId,
              part_id: newPartId,
              quantity: newQty,
              note: newNote
          });
          setIsAdding(false);
          setNewPartId('');
          setNewQty(1);
          setNewNote('');
          fetchBOM(selectedEquipId);
      } catch (e) {
          alert('خطا در افزودن قطعه');
      }
  };

  const handleRemovePart = async (id: string) => {
      if (!confirm('آیا حذف شود؟')) return;
      await supabase.from('equipment_boms').delete().eq('id', id);
      if (selectedEquipId) fetchBOM(selectedEquipId);
  };

  const selectedEquip = equipmentList.find(e => e.id === selectedEquipId);

  return (
      <div className="max-w-7xl mx-auto pb-20 p-4 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
          {/* Sidebar: Equipment List */}
          <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <h3 className="font-bold flex items-center gap-2"><GitMerge className="w-5 h-5 text-primary"/> انتخاب تجهیز</h3>
              </div>
              <div className="p-2 flex-1 overflow-y-auto">
                  {equipmentList.map(eq => (
                      <div 
                        key={eq.id} 
                        onClick={() => setSelectedEquipId(eq.id)}
                        className={`p-3 rounded-lg cursor-pointer mb-1 transition flex justify-between items-center ${selectedEquipId === eq.id ? 'bg-primary text-white shadow' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                          <span className="text-sm font-medium">{eq.name}</span>
                          <span className="text-xs opacity-70 font-mono">{eq.code}</span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Main: BOM Table */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex flex-col">
              {selectedEquipId ? (
                  <>
                      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                          <div>
                              <h2 className="font-bold text-lg">{selectedEquip?.name}</h2>
                              <p className="text-xs text-gray-500">لیست قطعات یدکی و مواد مصرفی (BOM)</p>
                          </div>
                          <button onClick={() => setIsAdding(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition">
                              <Plus className="w-4 h-4" /> افزودن قطعه
                          </button>
                      </div>

                      {isAdding && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                              <div className="md:col-span-2">
                                  <label className="block text-xs mb-1">قطعه</label>
                                  <select className="w-full p-2 border rounded text-sm dark:bg-gray-700" value={newPartId} onChange={e => setNewPartId(e.target.value)}>
                                      <option value="">انتخاب قطعه...</option>
                                      {partsList.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs mb-1">تعداد / مقدار</label>
                                  <input type="number" min="0.01" step="0.01" className="w-full p-2 border rounded text-center dark:bg-gray-700" value={newQty} onChange={e => setNewQty(Number(e.target.value))} />
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={handleAddPart} className="flex-1 bg-primary text-white p-2 rounded">ثبت</button>
                                  <button onClick={() => setIsAdding(false)} className="flex-1 border p-2 rounded bg-white dark:bg-gray-700">لغو</button>
                              </div>
                          </div>
                      )}

                      <div className="flex-1 overflow-y-auto p-4">
                          {loading ? <div className="text-center py-10">در حال بارگذاری...</div> : (
                              <table className="w-full text-right text-sm">
                                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                      <tr>
                                          <th className="p-3">کد قطعه</th>
                                          <th className="p-3">نام قطعه</th>
                                          <th className="p-3">تعداد</th>
                                          <th className="p-3">یادداشت</th>
                                          <th className="p-3">عملیات</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y dark:divide-gray-600">
                                      {bomItems.map(item => (
                                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                              <td className="p-3 font-mono">{item.parts?.code}</td>
                                              <td className="p-3 font-bold">{item.parts?.name}</td>
                                              <td className="p-3 font-bold text-blue-600">{item.quantity}</td>
                                              <td className="p-3 text-gray-500 text-xs">{item.note || '-'}</td>
                                              <td className="p-3">
                                                  <button onClick={() => handleRemovePart(item.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                                              </td>
                                          </tr>
                                      ))}
                                      {bomItems.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">قطعه‌ای تعریف نشده است.</td></tr>}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  </>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Package className="w-16 h-16 mb-4 opacity-20" />
                      <p>لطفاً یک تجهیز را از لیست انتخاب کنید.</p>
                  </div>
              )}
          </div>
      </div>
  );
};

export default BillOfMaterials;
