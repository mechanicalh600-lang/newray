
import React, { useState, useEffect } from 'react';
import { Archive, Plus, Eye, Edit, Save, Loader2, X } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [newDoc, setNewDoc] = useState({ code: '', title: '', type: 'MANUAL', description: '' });

  useEffect(() => {
      fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
      setLoading(true);
      const { data } = await supabase.from('technical_documents').select('*').order('created_at', { ascending: false });
      if(data) setDocuments(data);
      setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
      setDocuments(prev => prev.filter(d => !ids.includes(d.id)));
      alert('حذف شد (شبیه‌سازی)');
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          await supabase.from('technical_documents').insert({ code: newDoc.code, title: newDoc.title, type: newDoc.type });
          alert('سند با موفقیت ثبت شد');
          setNewDoc({ code: '', title: '', type: 'MANUAL', description: '' });
          setView('LIST');
          fetchDocuments();
      } catch (e) {
          alert('خطا');
      } finally {
          setIsSubmitting(false);
      }
  };

  const filterContent = (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">نوع سند</label>
              <select className="w-full p-2 border rounded-lg" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="ALL">همه</option>
                  <option value="MANUAL">دفترچه راهنما</option>
                  <option value="DRAWING">نقشه فنی</option>
                  <option value="DATASHEET">دیتاشیت</option>
              </select>
          </div>
      </div>
  );

  const filteredData = filterType === 'ALL' ? documents : documents.filter(d => d.type === filterType);
  const selectedItem = documents.find(i => selectedIds.includes(i.id));

  const extraActions = selectedIds.length === 1 && selectedItem ? (
      <>
        <button onClick={() => alert('مشاهده')} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition" title="مشاهده">
            <Eye className="w-5 h-5" />
        </button>
        <button onClick={() => alert('ویرایش')} className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition" title="ویرایش">
            <Edit className="w-5 h-5" />
        </button>
      </>
  ) : null;

  if (view === 'NEW') {
      return (
          <div className="max-w-2xl mx-auto pb-20">
              <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold flex items-center gap-2"><Archive className="w-6 h-6 text-primary"/> ثبت سند فنی</h1>
                  <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-bold mb-1">کد سند</label><input required className="w-full p-2.5 border rounded-lg dark:bg-gray-700" value={newDoc.code} onChange={e => setNewDoc({...newDoc, code: e.target.value})} /></div>
                      <div><label className="block text-sm font-bold mb-1">نوع سند</label><select className="w-full p-2.5 border rounded-lg dark:bg-gray-700" value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value})}><option value="MANUAL">دفترچه راهنما</option><option value="DRAWING">نقشه فنی</option><option value="DATASHEET">دیتاشیت</option></select></div>
                  </div>
                  <div><label className="block text-sm font-bold mb-1">عنوان سند</label><input required className="w-full p-2.5 border rounded-lg dark:bg-gray-700" value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} /></div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white py-2.5 rounded-lg flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} ذخیره</button>
              </form>
          </div>
      )
  }

  const columns = [
      { header: 'کد سند', accessor: (i:any) => <span className="font-mono font-bold">{i.code}</span>, sortKey: 'code' },
      { header: 'عنوان', accessor: (i:any) => i.title, sortKey: 'title' },
      { header: 'نوع', accessor: (i:any) => i.type, sortKey: 'type' },
      { header: 'تاریخ ثبت', accessor: (i:any) => new Date(i.created_at).toLocaleDateString('fa-IR'), sortKey: 'created_at' },
  ];

  return (
      <DataPage
        title="آرشیو اسناد فنی"
        icon={Archive}
        data={filteredData}
        isLoading={loading}
        columns={columns}
        onAdd={() => setView('NEW')}
        onReload={fetchDocuments}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        exportName="Documents"
        extraActions={extraActions}
      />
  );
};

export default Documents;
