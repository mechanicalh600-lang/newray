
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { getShamsiDate } from '../utils';
import { ShoppingCart, Mic, AlertCircle, X, Loader2, Save, Paperclip, FileText, Trash2, RefreshCw } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { startWorkflow, getItemsByModule, fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { supabase } from '../supabaseClient';

export const PurchaseRequests: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [items, setItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  useEffect(() => {
      loadData();
  }, [view]);

  const loadData = async () => {
      setLoading(true);
      // Load List from DB directly for better accuracy
      const { data } = await supabase.from('purchase_requests').select('*').order('created_at', { ascending: false });
      if (data) {
          setItems(data.map((i: any) => ({
              ...i,
              trackingCode: i.tracking_code,
              requestNumber: i.request_number,
              desc: i.description,
              requestDate: i.request_date
          })));
      } else {
          // Fallback to workflow store if DB fails (offline mode)
          const stored = getItemsByModule('PURCHASE');
          setItems(stored.map(i => ({...i, ...i.data})));
      }
      
      fetchMasterData('measurement_units').then(setUnits);
      setLoading(false);
  };

  const [formData, setFormData] = useState({
      requestNumber: '',
      requestDate: getShamsiDate(),
      location: 'مجتمع (کارخانه)',
      priority: 'عادی',
      desc: '',
      qty: 1,
      unit: ''
  });

  const [error, setError] = useState<string | null>(null);

  // Set default unit
  useEffect(() => {
      if(units.length > 0 && !formData.unit) {
          setFormData(prev => ({ ...prev, unit: units[0].title }));
      }
  }, [units]);

  // Validation Helper
  const isFormValid = () => {
      const regex = /^\d{2}\/\d{4}$/;
      const isFormatValid = regex.test(formData.requestNumber);
      
      return (
          isFormatValid &&
          formData.desc.trim().length > 0 &&
          formData.qty > 0 &&
          formData.unit.length > 0
      );
  };

  const handleRequestNumberChange = (val: string) => {
      setFormData({ ...formData, requestNumber: val });
      const regex = /^\d{2}\/\d{4}$/;
      if (val && !regex.test(val)) {
          setError('فرمت صحیح نیست (مثال: 03/1234)');
      } else {
          setError(null);
      }
  };

  // Helper: Convert file to Base64
  const convertFileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles: File[] = Array.from(e.target.files);
          // Limit file size (e.g., 2MB per file)
          const validFiles = newFiles.filter(f => f.size <= 2 * 1024 * 1024);
          if (validFiles.length !== newFiles.length) {
              alert('برخی فایل‌ها به دلیل حجم بیش از 2 مگابایت حذف شدند.');
          }
          setAttachedFiles(prev => [...prev, ...validFiles]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
        // 1. Process Files
        const attachmentsData = await Promise.all(attachedFiles.map(async (file: any) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            data: await convertFileToBase64(file)
        })));

        // 2. Generate Tracking Code
        const trackingCode = await fetchNextTrackingCode('K');

        // 3. Prepare Payload
        const payload = {
            tracking_code: trackingCode,
            request_number: formData.requestNumber,
            requester_id: user.id,
            requester_name: user.fullName,
            request_date: formData.requestDate,
            description: formData.desc,
            qty: formData.qty,
            unit: formData.unit,
            location: formData.location,
            priority: formData.priority,
            attachments: attachmentsData,
            status: 'PENDING'
        };

        // 4. Save to DB
        const { error: dbError } = await supabase.from('purchase_requests').insert([payload]);
        if (dbError) throw dbError;

        // 5. Start Workflow
        startWorkflow('PURCHASE', payload, user, trackingCode, `خرید: ${formData.desc.substring(0, 20)}...`);
        
        alert(`درخواست خرید با کد رهگیری ${trackingCode} ثبت شد.`);
        
        // Reset & Switch View
        setView('LIST');
        setFormData({
            requestNumber: '',
            requestDate: getShamsiDate(),
            location: 'مجتمع (کارخانه)',
            priority: 'عادی',
            desc: '',
            qty: 1,
            unit: units[0]?.title || ''
        });
        setAttachedFiles([]);

    } catch (err: any) {
        console.error(err);
        alert('خطا در ثبت درخواست: ' + (err.message || JSON.stringify(err)));
    } finally {
        setIsSubmitting(false);
    }
  };

  const extraActions = (
      <button 
        onClick={loadData} 
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
                title="درخواست‌های خرید"
                icon={ShoppingCart}
                data={items}
                onAdd={() => setView('NEW')}
                isLoading={loading}
                extraActions={extraActions}
                columns={[
                    { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.trackingCode}</span> },
                    { header: 'شماره درخواست', accessor: (i: any) => <span className="font-mono">{i.requestNumber || i.request_number}</span> },
                    { header: 'شرح کالا', accessor: (i: any) => i.desc || i.description },
                    { header: 'تعداد', accessor: (i: any) => `${i.qty} ${i.unit || ''}` },
                    { header: 'تاریخ', accessor: (i: any) => i.requestDate || i.request_date },
                    { header: 'وضعیت', accessor: (i: any) => <span className="bg-yellow-100 text-yellow-800 px-2 rounded text-xs font-bold">{i.status === 'PENDING' ? 'در جریان' : 'تایید شده'}</span> },
                    { header: 'پیوست', accessor: (i: any) => (i.attachments && i.attachments.length > 0) ? <Paperclip className="w-4 h-4 text-gray-500" /> : '-' },
                ]}
              />
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
       <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">درخواست خرید کالا/خدمات</h1>
        </div>
        <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
      </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="label-text">درخواست دهنده</label>
                      <input type="text" value={user.fullName} disabled className="input-field bg-gray-100 dark:bg-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                      <label className="label-text">شماره درخواست (فرمت: 03/1234) <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.requestNumber}
                        onChange={(e) => handleRequestNumberChange(e.target.value)}
                        className={`input-field font-mono text-center ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        placeholder="03/1234"
                        required 
                        maxLength={7}
                      />
                      {error && <div className="flex items-center gap-1 text-red-500 text-xs mt-1"><AlertCircle className="w-3 h-3" /><span>{error}</span></div>}
                  </div>
                  <div>
                      <label className="label-text">تاریخ درخواست</label>
                      <ShamsiDatePicker 
                        value={formData.requestDate}
                        onChange={(d) => setFormData({...formData, requestDate: d})}
                      />
                  </div>
                  <div>
                      <label className="label-text">محل خرید</label>
                      <select 
                        className="input-field"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      >
                          <option>ستاد (دفتر مرکزی)</option>
                          <option>مجتمع (کارخانه)</option>
                      </select>
                  </div>
                  <div>
                      <label className="label-text">اولویت</label>
                      <select 
                        className="input-field"
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      >
                          <option>عادی</option>
                          <option>فوری</option>
                          <option>بحرانی (توقف تولید)</option>
                      </select>
                  </div>
              </div>

              <div>
                  <label className="label-text">شرح درخواست <span className="text-red-500">*</span></label>
                  <div className="relative">
                      <textarea 
                        value={formData.desc}
                        onChange={e => setFormData({...formData, desc: e.target.value})}
                        className="input-field h-32 pl-10" 
                        required 
                        placeholder="مشخصات فنی دقیق کالا یا خدمات..."
                      ></textarea>
                      <Mic className="absolute left-3 bottom-3 text-gray-400 cursor-pointer hover:text-primary" />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                      <label className="label-text">تعداد <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        value={formData.qty}
                        onChange={e => setFormData({...formData, qty: Number(e.target.value)})}
                        className="input-field text-center font-bold" 
                        required 
                        min="0.01"
                      />
                  </div>
                  <div className="col-span-1">
                      <label className="label-text">واحد <span className="text-red-500">*</span></label>
                      <select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="input-field">
                          {units.length > 0 ? units.map(u => (
                              <option key={u.id} value={u.title}>{u.title}</option>
                          )) : <option value="عدد">عدد</option>}
                      </select>
                  </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                      <label className="label-text flex items-center gap-2"><Paperclip className="w-4 h-4"/> پیوست‌ها (تصویر، PDF)</label>
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                      >
                          + افزودن فایل
                      </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept="image/*,.pdf"
                  />
                  
                  {attachedFiles.length > 0 ? (
                      <div className="space-y-2">
                          {attachedFiles.map((file, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <span className="truncate max-w-[200px]">{file.name}</span>
                                      <span className="text-gray-400 text-xs">({(file.size/1024).toFixed(0)} KB)</span>
                                  </div>
                                  <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-gray-400 italic text-center py-2">هیچ فایلی ضمیمه نشده است.</p>
                  )}
              </div>

              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setView('LIST')} className="flex-1 border py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">انصراف</button>
                <button 
                    type="submit" 
                    disabled={!isFormValid() || isSubmitting}
                    className={`flex-[2] text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition
                        ${!isFormValid() || isSubmitting ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-primary hover:bg-red-800'}
                    `}
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                    ثبت و ارسال به بازرگانی
                </button>
              </div>
          </form>

      <style>{`
        .label-text { display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #4b5563; font-weight: 500; }
        .dark .label-text { color: #d1d5db; }
        .input-field { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; background-color: #f9fafb; transition: all 0.2s; outline: none; }
        .dark .input-field { background-color: #374151; border-color: #4b5563; color: white; }
        .input-field:focus { border-color: #800020; box-shadow: 0 0 0 2px rgba(128, 0, 32, 0.1); }
      `}</style>
    </div>
  );
};
