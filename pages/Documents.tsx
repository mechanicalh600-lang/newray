
import React, { useState, useEffect, useRef } from 'react';
import { Archive, Plus, Eye, Edit, Loader2, X, Upload } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';

const DOC_BUCKET = 'technical-documents';
const MAX_FILE_MB = 10;

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newDoc, setNewDoc] = useState({ code: '', name: '', type: '' as string });

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
      setLoading(true);
      const { data } = await supabase.from('technical_documents').select('*').order('created_at', { ascending: false });
      if (data) setDocuments(data);
      setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
      try {
          const { error } = await supabase.from('technical_documents').delete().in('id', ids);
          if (error) throw error;
          setDocuments(prev => prev.filter(d => !ids.includes(d.id)));
          setSelectedIds([]);
      } catch (e: any) { alert('خطا در حذف: ' + (e?.message || e)); }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) {
          if (f.size > MAX_FILE_MB * 1024 * 1024) {
              alert(`حداکثر حجم فایل ${MAX_FILE_MB} مگابایت است.`);
              return;
          }
          const ext = (f.name.split('.').pop() || '').toLowerCase();
          if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
              alert('فرمت مجاز: PDF, JPG, PNG');
              return;
          }
          setSelectedFile(f);
      }
  };

  const handleReset = () => {
      setNewDoc({ code: '', name: '', type: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFormValid = () => !!newDoc.code?.trim() && !!newDoc.name?.trim() && !!newDoc.type && !!selectedFile;

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid() || isSubmitting) return;
      setIsSubmitting(true);
      let fileUrl: string | null = null;
      try {
          if (selectedFile) {
              const path = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
              const { data: uploadData, error: uploadErr } = await supabase.storage.from(DOC_BUCKET).upload(path, selectedFile, { upsert: false });
              if (!uploadErr && uploadData?.path) {
                  const { data: urlData } = supabase.storage.from(DOC_BUCKET).getPublicUrl(uploadData.path);
                  fileUrl = urlData.publicUrl;
              }
          }
          const { error } = await supabase.from('technical_documents').insert({
              code: newDoc.code.trim(),
              title: newDoc.name.trim(),
              type: newDoc.type,
              file_url: fileUrl,
          });
          if (error) throw error;
          alert('سند با موفقیت به بایگانی اضافه شد.');
          handleReset();
          setView('LIST');
          fetchDocuments();
      } catch (err: any) {
          const msg = err?.message || '';
          if (msg.includes('Bucket not found') || msg.includes('bucket') || msg.includes('Storage')) {
              const { error: insErr } = await supabase.from('technical_documents').insert({ code: newDoc.code.trim(), title: newDoc.name.trim(), type: newDoc.type, file_url: null });
              if (insErr) { alert('خطا: ' + (insErr?.message || insErr)); return; }
              alert('سند ثبت شد. برای آپلود فایل، باکت technical-documents را در Supabase Storage بسازید.');
              handleReset();
              setView('LIST');
              fetchDocuments();
          } else {
              alert('خطا: ' + msg);
          }
      } finally {
          setIsSubmitting(false);
      }
  };

  const filterContent = (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">نوع سند</label>
              <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="ALL">همه</option>
                  <option value="MAP">نقشه فنی</option>
                  <option value="CATALOG">کاتالوگ و دیتاشیت</option>
                  <option value="MANUAL">دستورالعمل تعمیراتی</option>
                  <option value="OTHER">سایر اسناد</option>
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

  const getTypeLabel = (t: string) => ({ MAP: 'نقشه فنی', CATALOG: 'کاتالوگ و دیتاشیت', MANUAL: 'دستورالعمل تعمیراتی', OTHER: 'سایر اسناد' }[t] || t);

  if (view === 'NEW') {
      return (
          <div className="w-full max-w-full pb-20">
              <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><Archive className="w-6 h-6 text-primary"/> ثبت سند فنی</h1>
                  <button onClick={() => { handleReset(); setView('LIST'); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleAdd} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-fit border border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm mb-1 font-bold text-gray-700 dark:text-gray-300">کد بایگانی <span className="text-red-500">*</span></label>
                          <input value={newDoc.code} onChange={e => setNewDoc({...newDoc, code: e.target.value})} required className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="مثال: MAP-101" />
                      </div>
                      <div>
                          <label className="block text-sm mb-1 font-bold text-gray-700 dark:text-gray-300">عنوان سند <span className="text-red-500">*</span></label>
                          <input value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} required className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="عنوان نقشه یا کاتالوگ..." />
                      </div>
                      <div>
                          <label className="block text-sm mb-1 font-bold text-gray-700 dark:text-gray-300">نوع سند <span className="text-red-500">*</span></label>
                          <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value})} required className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer">
                              <option value="">انتخاب کنید...</option>
                              <option value="MAP">نقشه فنی</option>
                              <option value="CATALOG">کاتالوگ و دیتاشیت</option>
                              <option value="MANUAL">دستورالعمل تعمیراتی</option>
                              <option value="OTHER">سایر اسناد</option>
                          </select>
                      </div>

                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />

                      <div onClick={handleFileClick} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mt-6 ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                          <Upload className={`w-10 h-10 mx-auto mb-4 ${selectedFile ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-300 block">{selectedFile ? selectedFile.name : 'برای آپلود فایل کلیک کنید'}</span>
                          <span className="text-xs text-gray-400 mt-2 block">PDF, JPG, PNG (Max 10MB)</span>
                      </div>

                      <div className="flex gap-3 pt-6 border-t dark:border-gray-700 mt-6">
                          <button type="button" onClick={() => { handleReset(); setView('LIST'); }} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">انصراف</button>
                          <button type="submit" disabled={!isFormValid() || isSubmitting} className={`flex-[2] py-3 rounded-xl shadow-lg font-bold transition-all flex items-center justify-center gap-2 ${isFormValid() && !isSubmitting ? 'bg-primary text-white hover:bg-red-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'}`}>
                              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Archive className="w-5 h-5"/>} افزودن به بایگانی
                          </button>
                      </div>
                  </div>
              </form>
          </div>
      );
  }

  const columns = [
      { header: 'کد سند', accessor: (i:any) => <span className="font-mono font-bold">{i.code}</span>, sortKey: 'code' },
      { header: 'عنوان', accessor: (i:any) => i.title, sortKey: 'title' },
      { header: 'نوع', accessor: (i:any) => getTypeLabel(i.type) || i.type, sortKey: 'type' },
      { header: 'فایل', accessor: (i:any) => i.file_url ? <a href={i.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">مشاهده</a> : '-', sortKey: 'file_url' },
      { header: 'تاریخ ثبت', accessor: (i:any) => i.created_at ? new Date(i.created_at).toLocaleDateString('fa-IR') : '-', sortKey: 'created_at' },
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
