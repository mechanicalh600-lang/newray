
import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Save, Upload, Building, Clock, Lock, Users, ArrowRight, MessageSquare, Cog, HardDrive, Hash } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ClockTimePicker } from '../components/ClockTimePicker';

export const SystemConfig: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({
      id: '',
      org_name: '',
      org_logo: '',
      session_timeout_minutes: 5,
      maintenance_mode: false,
      announcement_message: '',
      announcement_active: false,
      max_upload_size_mb: 5,
      shift_a_start: '07:00',
      shift_b_start: '15:00',
      shift_c_start: '23:00',
      // Coding Prefixes
      work_order_prefix: 'WO',
      pm_plan_prefix: 'PM',
      request_part_prefix: 'PR',
      purchase_request_prefix: 'PUR',
      meeting_prefix: 'MT',
      suggestion_prefix: 'SUG',
      incident_prefix: 'HSE',
      lab_report_prefix: 'LAB',
      warehouse_entry_prefix: 'W-IN',
      warehouse_exit_prefix: 'W-OUT',
      scale_report_prefix: 'SCL',
      document_prefix: 'DOC',
      project_prefix: 'PROJ',
      training_course_prefix: 'TRN'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      fetchSettings();
  }, []);

  const fetchSettings = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(1);
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : null;
          if (row) {
              setSettings({
                  id: row.id,
                  org_name: row.org_name || '',
                  org_logo: row.org_logo || '',
                  session_timeout_minutes: row.session_timeout_minutes || 5,
                  maintenance_mode: row.maintenance_mode || false,
                  announcement_message: row.announcement_message || '',
                  announcement_active: row.announcement_active || false,
                  max_upload_size_mb: row.max_upload_size_mb || 5,
                  shift_a_start: row.shift_a_start || '07:00',
                  shift_b_start: row.shift_b_start || '15:00',
                  shift_c_start: row.shift_c_start || '23:00',
                  
                  // Prefixes
                  work_order_prefix: row.work_order_prefix || 'WO',
                  pm_plan_prefix: row.pm_plan_prefix || 'PM',
                  request_part_prefix: row.request_part_prefix || 'PR',
                  purchase_request_prefix: row.purchase_request_prefix || 'PUR',
                  meeting_prefix: row.meeting_prefix || 'MT',
                  suggestion_prefix: row.suggestion_prefix || 'SUG',
                  incident_prefix: row.incident_prefix || 'HSE',
                  lab_report_prefix: row.lab_report_prefix || 'LAB',
                  warehouse_entry_prefix: row.warehouse_entry_prefix || 'W-IN',
                  warehouse_exit_prefix: row.warehouse_exit_prefix || 'W-OUT',
                  scale_report_prefix: row.scale_report_prefix || 'SCL',
                  document_prefix: row.document_prefix || 'DOC',
                  project_prefix: row.project_prefix || 'PROJ',
                  training_course_prefix: row.training_course_prefix || 'TRN'
              });
          }
      } catch (e) {
          console.error('Error fetching settings:', e);
      } finally {
          setLoading(false);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          const payload = { ...settings };
          if (payload.id) {
            const { error } = await supabase
              .from('app_settings')
              .update(payload)
              .eq('id', payload.id);
            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from('app_settings')
              .insert([payload])
              .select('id')
              .single();
            if (error) throw error;
            if (data?.id) setSettings((prev) => ({ ...prev, id: data.id }));
          }
          
          alert('تنظیمات با موفقیت ذخیره شد.');
          await fetchSettings();
      } catch (e: any) {
          alert('خطا در ذخیره تنظیمات: ' + e.message);
      } finally {
          setSaving(false);
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 500 * 1024) {
              alert('حجم فایل لوگو نباید بیشتر از 500 کیلوبایت باشد.');
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setSettings(prev => ({ ...prev, org_logo: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  // Helper Input Component for Prefixes
  const PrefixInput = ({ label, field }: { label: string, field: keyof typeof settings }) => (
      <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
          <input 
              type="text" 
              value={settings[field] as string}
              onChange={e => setSettings({...settings, [field]: e.target.value})}
              className="w-20 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 font-mono text-xs uppercase focus:ring-1 focus:ring-primary"
          />
      </div>
  );

  return (
      <div className="max-w-6xl mx-auto pb-20">
          <div className="flex items-center gap-2 mb-6">
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                  <Sliders className="w-6 h-6 text-primary" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold">تنظیمات نرم‌افزار</h1>
                  <p className="text-xs text-gray-500 mt-1">مدیریت پارامترهای عمومی و سیستمی</p>
              </div>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Logo & Branding */}
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-center gap-2">
                          <Building className="w-5 h-5 text-primary"/> هویت سازمان
                      </h3>
                      
                      <div className="relative w-32 h-32 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full border-4 border-white dark:border-gray-600 shadow-md flex items-center justify-center overflow-hidden group">
                          {settings.org_logo ? (
                              <img src={settings.org_logo} alt="Logo" className="w-full h-full object-contain p-2" />
                          ) : (
                              <span className="text-gray-400 text-xs">بدون لوگو</span>
                          )}
                          <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                              <Upload className="w-8 h-8 text-white" />
                          </div>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:underline">تغییر لوگو</button>
                      
                      <div className="mt-4 text-right">
                          <label className="block text-xs font-bold text-gray-500 mb-1">نام سازمان</label>
                          <input 
                              type="text" 
                              value={settings.org_name}
                              onChange={e => setSettings({...settings, org_name: e.target.value})}
                              className="w-full p-2 text-center border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
                              placeholder="نام شرکت..."
                          />
                      </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-yellow-500"/> اعلان سراسری
                      </h3>
                      
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">نمایش اعلان</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      className="sr-only peer" 
                                      checked={settings.announcement_active}
                                      onChange={(e) => setSettings({...settings, announcement_active: e.target.checked})}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                              </label>
                          </div>
                          <textarea 
                              className="w-full p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900 text-sm outline-none resize-none"
                              rows={3}
                              placeholder="متن پیام برای تمام کاربران..."
                              value={settings.announcement_message}
                              onChange={e => setSettings({...settings, announcement_message: e.target.value})}
                          ></textarea>
                      </div>
                  </div>
              </div>

              {/* Middle Column: Operational & Coding */}
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2 flex items-center gap-2">
                          <Cog className="w-5 h-5 text-purple-500"/> پارامترهای عملیاتی
                      </h3>
                      
                      <div className="space-y-4">
                          <div>
                              <h4 className="text-xs font-bold text-gray-500 mb-2">زمان‌بندی شیفت‌ها</h4>
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center"><span className="text-xs">شیفت A</span> <ClockTimePicker value={settings.shift_a_start} onChange={t => setSettings({...settings, shift_a_start: t})} /></div>
                                  <div className="flex justify-between items-center"><span className="text-xs">شیفت B</span> <ClockTimePicker value={settings.shift_b_start} onChange={t => setSettings({...settings, shift_b_start: t})} /></div>
                                  <div className="flex justify-between items-center"><span className="text-xs">شیفت C</span> <ClockTimePicker value={settings.shift_c_start} onChange={t => setSettings({...settings, shift_c_start: t})} /></div>
                              </div>
                          </div>

                          <div className="pt-2 border-t dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                  <span className="text-sm flex items-center gap-1"><HardDrive className="w-3 h-3"/> حجم آپلود (MB)</span>
                                  <input 
                                      type="number" 
                                      value={settings.max_upload_size_mb}
                                      onChange={e => setSettings({...settings, max_upload_size_mb: Number(e.target.value)})}
                                      className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-sm"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-orange-500"/> نشست کاربری
                      </h3>
                      <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg">
                          <div>
                              <span className="font-bold text-gray-800 dark:text-gray-200 block text-sm">خروج خودکار</span>
                              <span className="text-[10px] text-gray-500">عدم فعالیت کاربر</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <input 
                                  type="number" 
                                  min="1" 
                                  max="120"
                                  value={settings.session_timeout_minutes}
                                  onChange={e => setSettings({...settings, session_timeout_minutes: Number(e.target.value)})}
                                  className="w-16 p-2 text-center border border-orange-200 rounded-lg font-bold outline-none focus:ring-2 focus:ring-orange-400"
                              />
                              <span className="text-sm">دقیقه</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Right Column: Coding */}
              <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2 flex items-center gap-2">
                      <Hash className="w-5 h-5 text-indigo-500"/> فرمت کدگذاری
                  </h3>
                  <div className="space-y-3">
                      <PrefixInput label="دستور کار" field="work_order_prefix" />
                      <PrefixInput label="برنامه PM" field="pm_plan_prefix" />
                      <PrefixInput label="درخواست قطعه" field="request_part_prefix" />
                      <PrefixInput label="درخواست خرید" field="purchase_request_prefix" />
                      <PrefixInput label="صورتجلسه" field="meeting_prefix" />
                      <PrefixInput label="پیشنهاد" field="suggestion_prefix" />
                      <PrefixInput label="گزارش HSE" field="incident_prefix" />
                      <PrefixInput label="گزارش آزمایشگاه" field="lab_report_prefix" />
                      <PrefixInput label="ورود انبار" field="warehouse_entry_prefix" />
                      <PrefixInput label="خروج انبار" field="warehouse_exit_prefix" />
                      <PrefixInput label="باسکول" field="scale_report_prefix" />
                      <PrefixInput label="سند فنی" field="document_prefix" />
                      <PrefixInput label="پروژه" field="project_prefix" />
                      <PrefixInput label="دوره آموزشی" field="training_course_prefix" />
                  </div>
              </div>
              
              {/* Save Button */}
              <div className="lg:col-span-3">
                  <button type="submit" disabled={saving} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-red-900/20 hover:bg-red-800 transition flex items-center justify-center gap-2 disabled:opacity-50">
                      {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'} <Save className="w-5 h-5"/>
                  </button>
              </div>
          </form>
      </div>
  );
};

export default SystemConfig;
