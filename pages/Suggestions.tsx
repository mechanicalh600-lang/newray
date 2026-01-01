
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { generateTrackingCode, getShamsiDate } from '../utils';
import { Mic, Paperclip, Send, Trash2, Lightbulb, X, Loader2, RefreshCw } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { startWorkflow, getItemsByModule, fetchNextTrackingCode } from '../workflowStore';
import { supabase } from '../supabaseClient';

export const Suggestions: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [items, setItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      fetchSuggestions();
  }, [view]);

  const fetchSuggestions = async () => {
      setLoading(true);
      const stored = getItemsByModule('SUGGESTION');
      setItems(stored.map(i => ({...i, ...i.data})));
      setLoading(false);
  }

  const [suggestion, setSuggestion] = useState('');
  
  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setIsSubmitting(true);
    try {
        // 1. Generate Code
        const trackingCode = await fetchNextTrackingCode('H');

        // 2. Validate User ID (Handle '1' vs valid UUID for DB compatibility)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUserId = user.id && uuidRegex.test(user.id) ? user.id : null;

        // 3. Prepare Data - Correct Mapping
        const payload = {
            tracking_code: trackingCode,
            user_id: validUserId,
            user_name: user.fullName,
            description: suggestion,
            attached_files: attachedFiles.map(f => ({ name: f.name, size: f.size })), // Metadata only
            status: 'PENDING'
        };

        // 4. Save to DB
        const { error } = await supabase.from('technical_suggestions').insert([payload]);
        if (error) throw error;

        // 5. Start Workflow (Legacy Integration for Inbox)
        startWorkflow('SUGGESTION', { text: suggestion, ...payload }, user, trackingCode, `پیشنهاد: ${suggestion.substring(0, 20)}...`);
        
        alert(`پیشنهاد شما با کد رهگیری ${trackingCode} ثبت شد.`);
        
        // Reset
        setView('LIST');
        setSuggestion('');
        setAttachedFiles([]);

    } catch (err: any) {
        console.error(err);
        alert('خطا در ثبت پیشنهاد: ' + (err.message || JSON.stringify(err)));
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFiles([...attachedFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
      setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const extraActions = (
      <button 
        onClick={fetchSuggestions} 
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
                title="نظام پیشنهادات"
                icon={Lightbulb}
                data={items}
                onAdd={() => setView('NEW')}
                isLoading={loading}
                extraActions={extraActions}
                columns={[
                    { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.trackingCode}</span> },
                    { header: 'خلاصه پیشنهاد', accessor: (i: any) => i.description ? i.description.substring(0, 50) + '...' : i.title },
                    { header: 'تاریخ ثبت', accessor: (i: any) => i.createdAt },
                    { header: 'پیشنهاد دهنده', accessor: (i: any) => i.user_name || user.fullName },
                    { header: 'وضعیت', accessor: (i: any) => <span className="bg-yellow-100 text-yellow-800 px-2 rounded-full text-xs font-bold">{i.status === 'PENDING' ? 'در حال بررسی' : 'پاسخ داده شده'}</span> },
                ]}
              />
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">ثبت پیشنهادات فنی</h1>
          </div>
          <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
      </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">پیشنهاد دهنده</label>
              <input type="text" value={user.fullName} disabled className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">تاریخ ثبت</label>
              <input type="text" value={getShamsiDate()} disabled className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-500" />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium mb-1">شرح پیشنهاد فنی <span className="text-red-500">*</span></label>
             <div className="relative">
               <textarea 
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  className="w-full h-40 p-3 pl-10 border rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-primary outline-none resize-none"
                  placeholder="پیشنهاد خود را جهت بهبود عملکرد تجهیزات یا فرآیندها بنویسید..."
                  required
               ></textarea>
               <button type="button" className="absolute bottom-3 left-3 p-2 text-gray-400 hover:text-primary transition-colors">
                  <Mic className="w-6 h-6" />
               </button>
             </div>
          </div>

          <div>
             <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileChange} />
             <div className="flex items-center gap-4">
                <button type="button" onClick={handleFileClick} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg transition hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Paperclip className="w-4 h-4" /> افزودن مستندات
                </button>
                <span className="text-xs text-gray-400">فایل‌های مجاز: PDF, JPG (max 5MB)</span>
             </div>

             {attachedFiles.length > 0 && (
                 <div className="mt-4 space-y-2">
                     {attachedFiles.map((file, idx) => (
                         <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-sm border border-gray-100 dark:border-gray-600">
                             <span className="truncate max-w-[200px]">{file.name}</span>
                             <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                     ))}
                 </div>
             )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setView('LIST')} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
            <button 
                type="submit" 
                disabled={!suggestion.trim() || isSubmitting}
                className={`flex-[2] text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition
                    ${!suggestion.trim() || isSubmitting ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-primary hover:bg-red-800'}
                `}
            >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />} 
                ثبت پیشنهاد
            </button>
          </div>
        </form>
    </div>
  );
};
