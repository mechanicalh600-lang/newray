import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Lightbulb, Loader2, Send, Paperclip, Mic, X } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { supabase } from '../supabaseClient';
import { getShamsiDate } from '../utils';
import { fetchNextTrackingCode } from '../workflowStore';

const SUGGESTION_BUCKET = 'technical-documents';
const MAX_FILE_MB = 5;
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg'];

interface Props {
  user: User;
}

export const Suggestions: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [suggestion, setSuggestion] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let res = items;
    if (filterStatus !== 'ALL') {
      res = res.filter(i => i.status === filterStatus);
    }
    setFilteredItems(res);
  }, [items, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('technical_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleDelete = async (ids: string[]) => {
    await supabase.from('technical_suggestions').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`حداکثر حجم هر فایل ${MAX_FILE_MB} مگابایت است.`);
        continue;
      }
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        alert(`فرمت مجاز: PDF, JPG. فایل ${f.name} رد شد.`);
        continue;
      }
      valid.push(f);
    }
    setSelectedFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx));

  const handleReset = () => {
    setSuggestion('');
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const attachments: { name: string; url: string }[] = [];
    try {
      if (selectedFiles.length > 0) {
        for (const f of selectedFiles) {
          const path = `suggestions/${Date.now()}_${Math.random().toString(36).slice(2)}_${f.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage.from(SUGGESTION_BUCKET).upload(path, f, { upsert: false });
          if (!uploadErr && uploadData?.path) {
            const { data: urlData } = supabase.storage.from(SUGGESTION_BUCKET).getPublicUrl(uploadData.path);
            attachments.push({ name: f.name, url: urlData.publicUrl });
          }
        }
      }
      const trackingCode = await fetchNextTrackingCode('SUG');
      const { error } = await supabase.from('technical_suggestions').insert({
        tracking_code: trackingCode,
        user_id: user.id,
        user_name: user.fullName || 'ناشناس',
        description: suggestion.trim(),
        attachments: attachments,
      });
      if (error) throw error;
      alert('پیشنهاد فنی با موفقیت ثبت شد.');
      handleReset();
      setView('LIST');
      fetchData();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Bucket not found') || msg.includes('bucket') || msg.includes('Storage')) {
        const trackingCode = await fetchNextTrackingCode('SUG');
        const { error: insErr } = await supabase.from('technical_suggestions').insert({
          tracking_code: trackingCode,
          user_id: user.id,
          user_name: user.fullName || 'ناشناس',
          description: suggestion.trim(),
          attachments: [],
        });
        if (insErr) {
          alert('خطا: ' + (insErr?.message || insErr));
          return;
        }
        alert('پیشنهاد ثبت شد. برای آپلود فایل‌ها، باکت technical-documents را در Supabase Storage بسازید.');
        handleReset();
        setView('LIST');
        fetchData();
      } else {
        alert('خطا: ' + msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (s: string) => ({ PENDING: 'در حال بررسی', APPROVED: 'تایید شده', REJECTED: 'رد شده' }[s] || s);

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="PENDING">در حال بررسی</option>
          <option value="APPROVED">تایید شده</option>
          <option value="REJECTED">رد شده</option>
        </select>
      </div>
    </div>
  );

  if (view === 'NEW') {
    return (
      <div className="w-full max-w-full pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><Lightbulb className="w-6 h-6 text-primary"/> ثبت پیشنهاد فنی</h1>
          <button onClick={() => { handleReset(); setView('LIST'); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">پیشنهاد دهنده</label>
              <input type="text" value={user.fullName} disabled className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">تاریخ ثبت</label>
              <input type="text" value={getShamsiDate()} disabled className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500" />
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
              />
              <button type="button" className="absolute bottom-3 left-3 p-2 text-gray-400 hover:text-primary transition-colors" title="ضبط صوتی (به زودی)">
                <Mic className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div>
            <input type="file" ref={fileInputRef} multiple className="hidden" accept=".pdf,.jpg,.jpeg" onChange={handleFileChange} />
            <div className="flex items-center gap-4 flex-wrap">
              <button type="button" onClick={handleFileClick} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg transition hover:bg-gray-50 dark:hover:bg-gray-700">
                <Paperclip className="w-4 h-4" /> افزودن مستندات
              </button>
              <span className="text-xs text-gray-400">فایل‌های مجاز: PDF, JPG (max 5MB)</span>
            </div>
            {selectedFiles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {selectedFiles.map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{f.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4"/></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={() => { handleReset(); setView('LIST'); }} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
            <button type="submit" disabled={!suggestion.trim() || isSubmitting} className={`flex-[2] text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition ${!suggestion.trim() || isSubmitting ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-primary hover:bg-red-800'}`}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />} ثبت پیشنهاد
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
      <DataPage
        title="نظام پیشنهادات فنی"
        icon={Lightbulb}
        data={filteredItems}
        isLoading={loading}
        onAdd={() => setView('NEW')}
        onReload={fetchData}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={() => setView('NEW')}
        onViewDetails={() => alert('مشاهده جزئیات')}
        exportName="Suggestions"
        columns={[
          { header: 'کد رهگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.tracking_code || '-'}</span>, sortKey: 'tracking_code' },
          { header: 'پیشنهاد دهنده', accessor: (i: any) => i.user_name || 'ناشناس', sortKey: 'user_name' },
          { header: 'شرح پیشنهاد', accessor: (i: any) => (i.description || '').slice(0, 80) + ((i.description || '').length > 80 ? '...' : ''), sortKey: 'description' },
          { header: 'وضعیت', accessor: (i: any) => getStatusLabel(i.status) || i.status, sortKey: 'status' },
          { header: 'تاریخ ثبت', accessor: (i: any) => i.created_at ? new Date(i.created_at).toLocaleDateString('fa-IR') : '-', sortKey: 'created_at' },
        ]}
      />
  );
};

export default Suggestions;
