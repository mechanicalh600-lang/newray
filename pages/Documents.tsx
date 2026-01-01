
import React, { useState, useRef, useEffect } from 'react';
import { Archive, Upload, Trash2, X, Loader2, RefreshCw } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';

interface DocumentItem {
    id: string;
    code: string;
    title: string; // Mapped from 'name' in UI
    type: string;
    file_name: string;
    created_at: string;
}

export const Documents: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDoc, setNewDoc] = useState({ code: '', name: '', type: '' });

  useEffect(() => {
      fetchDocuments();
  }, [view]);

  const fetchDocuments = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
              .from('technical_documents')
              .select('*')
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          setDocs(data || []);
      } catch (err) {
          console.error("Error fetching documents:", err);
      } finally {
          setLoading(false);
      }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const isFormValid = () => {
      return newDoc.code.trim() !== '' && 
             newDoc.name.trim() !== '' && 
             newDoc.type !== '';
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    setIsSubmitting(true);
    try {
        const payload = {
            code: newDoc.code,
            title: newDoc.name,
            type: newDoc.type,
            file_name: selectedFile ? selectedFile.name : 'بدون فایل',
        };

        const { error } = await supabase
            .from('technical_documents')
            .insert([payload]);

        if (error) throw error;

        alert('سند با موفقیت بایگانی شد.');
        
        setNewDoc({ code: '', name: '', type: '' });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setView('LIST');
        fetchDocuments(); // Refresh list

    } catch (err: any) {
        alert('خطا در ثبت سند: ' + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: DocumentItem) => {
      if(window.confirm('آیا از حذف این سند اطمینان دارید؟')) {
          try {
              const { error } = await supabase
                  .from('technical_documents')
                  .delete()
                  .eq('id', item.id);
              
              if (error) throw error;
              setDocs(prev => prev.filter(d => d.id !== item.id));
          } catch (err: any) {
              alert('خطا در حذف: ' + err.message);
          }
      }
  };

  const extraActions = (
      <button 
        onClick={fetchDocuments} 
        className="p-2.5 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:rotate-180 transition duration-500 shadow-sm" 
        title="بروزرسانی"
      >
          <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
      </button>
  );

  if (view === 'LIST') {
      return (
          <div className="max-w-7xl mx-auto pb-20">
              <SmartTable 
                title="بایگانی اسناد فنی"
                icon={Archive}
                data={docs}
                onAdd={() => setView('NEW')}
                onDelete={handleDelete}
                isLoading={loading}
                extraActions={extraActions}
                columns={[
                    { header: 'کد سند', accessor: (d) => <span className="font-mono font-bold">{d.code}</span> },
                    { header: 'عنوان سند', accessor: (d) => d.title },
                    { header: 'نوع سند', accessor: (d) => d.type },
                    { header: 'فایل پیوست', accessor: (d) => d.file_name || '-' },
                    { header: 'تاریخ بایگانی', accessor: (d) => new Date(d.created_at).toLocaleDateString('fa-IR') },
                ]}
              />
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Archive className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">افزودن سند جدید به بایگانی</h1>
          </div>
          <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-fit border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 font-bold text-gray-700 dark:text-gray-300">کد بایگانی <span className="text-red-500">*</span></label>
              <input 
                value={newDoc.code}
                onChange={(e) => setNewDoc({...newDoc, code: e.target.value})}
                className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary transition-all"
                required
                placeholder="مثال: MAP-101"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 font-bold text-gray-700 dark:text-gray-300">عنوان سند <span className="text-red-500">*</span></label>
              <input 
                value={newDoc.name}
                onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary transition-all"
                required
                placeholder="عنوان نقشه یا کاتالوگ..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1 font-bold text-gray-700 dark:text-gray-300">نوع سند <span className="text-red-500">*</span></label>
              <select 
                value={newDoc.type}
                onChange={(e) => setNewDoc({...newDoc, type: e.target.value})}
                className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                required
              >
                <option value="">انتخاب کنید...</option>
                <option value="MAP">نقشه فنی</option>
                <option value="CATALOG">کاتالوگ و دیتاشیت</option>
                <option value="MANUAL">دستورالعمل تعمیراتی</option>
                <option value="OTHER">سایر اسناد</option>
              </select>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            
            <div 
              onClick={handleFileClick}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mt-6
                ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
              `}
            >
               <Upload className={`w-10 h-10 mx-auto mb-4 ${selectedFile ? 'text-green-600' : 'text-gray-400'}`} />
               <span className="text-sm font-bold text-gray-600 dark:text-gray-300 block">
                 {selectedFile ? selectedFile.name : 'برای آپلود فایل کلیک کنید'}
               </span>
               <span className="text-xs text-gray-400 mt-2 block">PDF, JPG, PNG (Max 10MB)</span>
            </div>

            <div className="flex gap-3 pt-6 border-t dark:border-gray-700 mt-6">
                <button type="button" onClick={() => setView('LIST')} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">انصراف</button>
                <button 
                    type="submit" 
                    disabled={!isFormValid() || isSubmitting}
                    className={`flex-[2] py-3 rounded-xl shadow-lg font-bold transition-all flex items-center justify-center gap-2
                        ${isFormValid() && !isSubmitting 
                            ? 'bg-primary text-white hover:bg-red-800 cursor-pointer transform active:scale-95' 
                            : 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed opacity-70'}
                    `}
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Archive className="w-5 h-5"/>}
                    افزودن به بایگانی
                </button>
            </div>
          </form>
        </div>
    </div>
  );
};
