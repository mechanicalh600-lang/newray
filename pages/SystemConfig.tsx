
import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Save, Upload, Building, Clock, Lock, Users, ArrowRight, MessageSquare, Cog, HardDrive, Hash, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { MENU_ITEMS } from '../constants';

// لیست گزارش‌ها و منوها برای اتصال فرمت کدگذاری
const LINKED_OPTIONS = (() => {
  const opts: { path: string; title: string }[] = [];
  MENU_ITEMS.forEach(m => {
    if (m.submenu) m.submenu.forEach((s: any) => { if (s.path && s.path !== '#') opts.push({ path: s.path, title: s.title }); });
    else if (m.path && m.path !== '#') opts.push({ path: m.path, title: m.title });
  });
  return opts.sort((a, b) => a.title.localeCompare(b.title));
})();

export const SystemConfig: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ackList, setAckList] = useState<{ user_name: string; acknowledged_at: string }[]>([]);
  const [showAckList, setShowAckList] = useState(false);
  
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
      training_course_prefix: 'TRN',
      ptw_prefix: 'PTW'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // فرمت‌های کدگذاری از جدول
  const [codingFormats, setCodingFormats] = useState<{ id: string; prefix_value: string; label: string; linked_to: string | null; sort_order: number }[]>([]);
  const [showAddCoding, setShowAddCoding] = useState(false);
  const [editingCoding, setEditingCoding] = useState<{ id: string; prefix_value: string; label: string; linked_to: string } | null>(null);
  const [newCoding, setNewCoding] = useState({ prefix_value: '', label: '', linked_to: '' });

  useEffect(() => {
      fetchSettings();
  }, []);

  useEffect(() => {
      fetchCodingFormats();
  }, []);

  const fetchCodingFormats = async () => {
      try {
          const { data, error } = await supabase.from('coding_formats').select('id, prefix_value, label, linked_to, sort_order').order('sort_order');
          if (error) throw error;
          setCodingFormats(data || []);
      } catch {
          setCodingFormats([]);
      }
  };

  const handleSaveCoding = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (editingCoding) {
              const { error } = await supabase.from('coding_formats').update({ prefix_value: editingCoding.prefix_value.trim().toUpperCase(), label: editingCoding.label.trim(), linked_to: editingCoding.linked_to || null }).eq('id', editingCoding.id);
              if (error) throw error;
              setEditingCoding(null);
          } else {
              if (!newCoding.label.trim() || !newCoding.prefix_value.trim()) return alert('عنوان و پیشوند الزامی است');
              const { error } = await supabase.from('coding_formats').insert({ prefix_value: newCoding.prefix_value.trim().toUpperCase(), label: newCoding.label.trim(), linked_to: newCoding.linked_to || null });
              if (error) throw error;
              setNewCoding({ prefix_value: '', label: '', linked_to: '' });
              setShowAddCoding(false);
          }
          await fetchCodingFormats();
      } catch (err: any) {
          alert('خطا: ' + (err?.message || err));
      }
  };

  const handleDeleteCoding = async (id: string) => {
      if (!confirm('آیا این فرمت حذف شود؟')) return;
      const { error } = await supabase.from('coding_formats').delete().eq('id', id);
      if (error) throw error;
      await fetchCodingFormats();
  };

  useEffect(() => {
    if (!showAckList || !settings.id) return;
    const loadAcks = async () => {
      try {
        const { data: acks } = await supabase
          .from('announcement_acknowledgments')
          .select('user_id, acknowledged_at')
          .eq('app_settings_id', settings.id)
          .order('acknowledged_at', { ascending: false });
        if (!acks?.length) {
          setAckList([]);
          return;
        }
        const { data: users } = await supabase
          .from('app_users')
          .select('id, username, personnel(full_name)')
          .in('id', acks.map((a: any) => a.user_id));
        const userMap = new Map((users || []).map((u: any) => [u.id, (u.personnel as any)?.full_name || u.username || '-']));
        setAckList(acks.map((a: any) => {
          if (!a.acknowledged_at) return { user_name: userMap.get(a.user_id) || '-', acknowledged_at: '-' };
          const d = new Date(a.acknowledged_at);
          const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const date = d.toLocaleDateString('fa-IR');
          return { user_name: userMap.get(a.user_id) || '-', acknowledged_at: `${time} | ${date}` };
        }));
      } catch {
        setAckList([]);
      }
    };
    loadAcks();
  }, [showAckList, settings.id]);

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
                  training_course_prefix: row.training_course_prefix || 'TRN',
                  ptw_prefix: row.ptw_prefix || 'PTW'
              });
          }
      } catch (e) {
          console.error('Error fetching settings:', e);
      } finally {
          setLoading(false);
      }
  };

  const LINKED_TO_APP_SETTINGS_KEY: Record<string, string> = {
      '/work-orders': 'work_order_prefix', '/pm-scheduler': 'pm_plan_prefix', '/part-requests': 'request_part_prefix',
      '/purchases': 'purchase_request_prefix', '/meetings': 'meeting_prefix', '/suggestions': 'suggestion_prefix',
      '/hse-report': 'incident_prefix', '/lab-report': 'lab_report_prefix',
      '/scale-report': 'scale_report_prefix', '/documents': 'document_prefix', '/projects': 'project_prefix',
      '/training-courses': 'training_course_prefix', '/permits': 'ptw_prefix',
  };
  const PREFIX_TO_APP_SETTINGS_KEY: Record<string, string> = {
      'W-IN': 'warehouse_entry_prefix', 'W-OUT': 'warehouse_exit_prefix',
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          const payload = { ...settings } as any;
          codingFormats.forEach(cf => {
              const key = PREFIX_TO_APP_SETTINGS_KEY[cf.prefix_value] || (cf.linked_to ? LINKED_TO_APP_SETTINGS_KEY[cf.linked_to] : null);
              if (key && payload[key] !== undefined) payload[key] = cf.prefix_value;
          });
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

  return (
      <div className="w-full max-w-full pb-20">
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
                          {settings.id && (
                            <div className="pt-3 border-t border-yellow-200 dark:border-yellow-800 mt-3">
                              <button
                                type="button"
                                onClick={() => setShowAckList(!showAckList)}
                                className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400 hover:underline"
                              >
                                {showAckList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {showAckList ? 'مخفی کردن لیست' : 'لیست کسانی که متوجه شدم زده‌اند'}
                              </button>
                              {showAckList && (
                                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <table className="w-full text-xs">
                                    <thead className="bg-yellow-100 dark:bg-yellow-900/30 sticky top-0">
                                      <tr>
                                        <th className="p-2 text-right">کاربر</th>
                                        <th className="p-2 text-right">زمان</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ackList.length === 0 ? (
                                        <tr><td colSpan={2} className="p-3 text-gray-500 text-center">هنوز هیچ‌کس متوجه شدم نزده است</td></tr>
                                      ) : (
                                        ackList.map((row, i) => (
                                          <tr key={i} className="border-t border-yellow-100 dark:border-yellow-900/20">
                                            <td className="p-2">{row.user_name}</td>
                                            <td className="p-2 text-gray-500">{row.acknowledged_at}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
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
                              <span className="text-[10px] text-gray-500">عدم فعالیت کاربر — برای همه‌ی کاربران اعمال می‌شود</span>
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
              <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between mb-4 border-b pb-2 flex-shrink-0">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                          <Hash className="w-5 h-5 text-indigo-500"/> فرمت کدگذاری
                      </h3>
                      <button type="button" onClick={() => setShowAddCoding(true)} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition" title="افزودن">
                          <Plus className="w-4 h-4" />
                      </button>
                  </div>
                  <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
                      {codingFormats.length === 0 ? (
                          <p className="text-xs text-gray-500 py-4 text-center">جدول فرمت کدگذاری خالی است. مایگریشن را اجرا کنید یا افزودن را بزنید.</p>
                      ) : (
                          codingFormats.map((cf) => (
                              <div key={cf.id} className="flex items-center justify-between gap-2 py-2 border-b dark:border-gray-700 last:border-0">
                                  <div className="flex-1 min-w-0">
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{cf.label}</span>
                                      <span className="text-[10px] text-gray-500 block truncate" title={cf.linked_to || '-'}>
                                          {cf.linked_to ? (LINKED_OPTIONS.find(o => o.path === cf.linked_to)?.title || cf.linked_to) : '—'}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      <span className="w-14 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 font-mono text-xs uppercase">{cf.prefix_value}</span>
                                      <button type="button" onClick={() => setEditingCoding({ id: cf.id, prefix_value: cf.prefix_value, label: cf.label, linked_to: cf.linked_to || '' })} className="p-1 text-gray-500 hover:text-indigo-600">ویرایش</button>
                                      <button type="button" onClick={() => handleDeleteCoding(cf.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5"/></button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  {/* مودال افزودن/ویرایش */}
                  {(showAddCoding || editingCoding) && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddCoding(false); setEditingCoding(null); }}>
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                              <h4 className="font-bold mb-4">{editingCoding ? 'ویرایش فرمت' : 'افزودن فرمت کدگذاری'}</h4>
                              <form onSubmit={handleSaveCoding} className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-medium mb-1">عنوان (فارسی)</label>
                                      <input type="text" value={editingCoding?.label ?? newCoding.label} onChange={e => editingCoding ? setEditingCoding({ ...editingCoding, label: e.target.value }) : setNewCoding({ ...newCoding, label: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-gray-700" required />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium mb-1">پیشوند کد</label>
                                      <input type="text" value={editingCoding?.prefix_value ?? newCoding.prefix_value} onChange={e => editingCoding ? setEditingCoding({ ...editingCoding, prefix_value: e.target.value }) : setNewCoding({ ...newCoding, prefix_value: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-gray-700 font-mono uppercase" placeholder="مثال: WO" required />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium mb-1">اتصال به گزارش/منو</label>
                                      <select value={editingCoding?.linked_to ?? newCoding.linked_to} onChange={e => editingCoding ? setEditingCoding({ ...editingCoding, linked_to: e.target.value }) : setNewCoding({ ...newCoding, linked_to: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-gray-700">
                                          <option value="">بدون اتصال</option>
                                          {LINKED_OPTIONS.map(o => <option key={o.path} value={o.path}>{o.title}</option>)}
                                      </select>
                                  </div>
                                  <div className="flex gap-2 justify-end pt-2">
                                      <button type="button" onClick={() => { setShowAddCoding(false); setEditingCoding(null); }} className="px-3 py-1.5 border rounded-lg">انصراف</button>
                                      <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg">ذخیره</button>
                                  </div>
                              </form>
                          </div>
                      </div>
                  )}
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
