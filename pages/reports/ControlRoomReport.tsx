
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { Monitor, Save, ArrowRight, ArrowLeft, Info, Factory, Package, StopCircle, Zap, RefreshCcw, Droplet, X, FileText } from 'lucide-react';
import { DataPage } from '../../components/DataPage';
import { ShamsiDatePicker } from '../../components/ShamsiDatePicker';
import { getShamsiDate } from '../../utils';
import { openReportTemplatePreview } from '../../utils/reportTemplateNavigation';
import { ensureDefaultReportTemplate } from '../../services/reportTemplates';
import { supabase } from '../../supabaseClient';
import { fetchNextTrackingCode } from '../../workflowStore';
import { TabDowntime, TabShiftNotes } from '../../features/reports/presets/shift/ShiftHandoverTabs';

interface Props {
  user: User;
}

const TABS = [
    { id: 1, label: 'اطلاعات گزارش', icon: Info },
    { id: 2, label: 'خوراک', icon: Factory },
    { id: 3, label: 'کارکرد و توقفات', icon: StopCircle },
    { id: 4, label: 'محصول', icon: Package },
    { id: 5, label: 'جریان الکتریکی', icon: Zap },
    { id: 6, label: 'هیدروسیکلون', icon: RefreshCcw },
    { id: 7, label: 'تیکنر', icon: Droplet },
    { id: 8, label: 'توضیحات', icon: FileText },
];

export const ControlRoomReport: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [activeTab, setActiveTab] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');

  useEffect(() => {
      let cancelled = false;
      const loadReports = async () => {
        setLoading(true);
        try {
          await ensureDefaultReportTemplate('control-room', 'قالب پیش فرض گزارش اتاق کنترل');
          const { data } = await supabase
            .from('control_room_reports')
            .select('*')
            .order('created_at', { ascending: false });
          if (cancelled) return;
          const rows = (data || []).map((row: any) => ({
            id: row.id,
            code: row.tracking_code,
            date: row.report_date,
            shift: row.shift,
            operator: row.operator_name,
            status: row.status || 'تکمیل شده',
            data: row.full_data || {},
          }));
          setItems(rows);
          setFilteredItems(rows);
        } catch (err) {
          console.error('Failed to load control room reports:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      loadReports();
      return () => { cancelled = true; };
  }, []);

  // Filter Logic
  useEffect(() => {
      let res = items;
      if (fromDate) res = res.filter(i => i.date >= fromDate);
      if (toDate) res = res.filter(i => i.date <= toDate);
      if (filterShift !== 'ALL') res = res.filter(i => i.shift === filterShift);
      setFilteredItems(res);
  }, [fromDate, toDate, filterShift, items]);

  const [formData, setFormData] = useState({
      date: getShamsiDate(),
      shift: 'A',
  });

  // وضعیت کارکرد/توقف و توضیحات (مخصوص فرم اتاق کنترل)
  const [pumps, setPumps] = useState({
      process: [] as string[],
      cleanWater: [] as string[],
  });
  const [downtime, setDowntime] = useState({
      lineA: { workTime: '', stopTime: '', reason: '' },
      lineB: { workTime: '', stopTime: '', reason: '' },
      plant: { workTime: '', stopTime: '', reason: '' },
      generalDescription: [''] as string[],
  });
  const [footer, setFooter] = useState({
      nextShiftActions: [''] as string[],
  });

  const handleDelete = async (ids: string[]) => {
      const { error } = await supabase.from('control_room_reports').delete().in('id', ids);
      if (error) {
          alert(`خطا در حذف: ${error.message}`);
          return;
      }
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
      setSelectedIds([]);
  };

  const handleSave = () => {
      if (!formData.date || !formData.shift) {
          alert('تاریخ و شیفت الزامی است.');
          return;
      }
      fetchNextTrackingCode('CR-').then(async trackingCode => {
        const payload = {
          tracking_code: trackingCode,
          report_date: formData.date,
          shift: formData.shift,
          operator_name: user.fullName,
          status: 'تکمیل شده',
          full_data: { ...formData, downtime, pumps, footer },
        };
        const { error } = await supabase.from('control_room_reports').insert([payload]);
        if (error) {
          alert(`خطا در ثبت: ${error.message}`);
          return;
        }
        alert('گزارش ثبت شد.');
        const appended = {
          id: `${Date.now()}`,
          code: trackingCode,
          date: formData.date,
          shift: formData.shift,
          operator: user.fullName,
          status: 'تکمیل شده',
          data: formData,
        };
        setItems(prev => [appended, ...prev]);
        setView('LIST');
      });
  };

  const handleDowntimeChange = (line: 'lineA' | 'lineB' | 'plant', field: 'workTime' | 'stopTime', value: string) => {
      setDowntime(prev => ({
          ...prev,
          [line]: { ...prev[line], [field]: value },
      }));
  };

  const handleDynamicListChange = (section: 'downtime' | 'footer', idx: number, value: string) => {
      if (section === 'downtime') {
          setDowntime(prev => {
              const list = [...prev.generalDescription];
              list[idx] = value;
              return { ...prev, generalDescription: list };
          });
      } else {
          setFooter(prev => {
              const list = [...prev.nextShiftActions];
              list[idx] = value;
              return { ...prev, nextShiftActions: list };
          });
      }
  };

  const addDynamicRecord = (section: 'downtime' | 'footer') => {
      if (section === 'downtime') {
          setDowntime(prev => ({ ...prev, generalDescription: [...prev.generalDescription, ''] }));
      } else {
          setFooter(prev => ({ ...prev, nextShiftActions: [...prev.nextShiftActions, ''] }));
      }
  };

  const removeDynamicRecord = (section: 'downtime' | 'footer', idx: number) => {
      if (section === 'downtime') {
          setDowntime(prev => ({
              ...prev,
              generalDescription: prev.generalDescription.filter((_, i) => i !== idx),
          }));
      } else {
          setFooter(prev => ({
              ...prev,
              nextShiftActions: prev.nextShiftActions.filter((_, i) => i !== idx),
          }));
      }
  };

  const handleVoiceInputMultiline = (setter: (val: string) => void, current: string) => {
      // شبیه‌سازی ورودی صوتی
      const simulated = current || '';
      setter(simulated);
  };

  const handleVoiceInputDynamic = (section: 'downtime' | 'footer', idx: number) => {
      // شبیه‌سازی ورودی صوتی برای لیست‌ها
      // در نسخه فعلی فقط یک alert ساده است
      alert('ورودی صوتی (شبیه‌سازی شده)');
  };

  const columns = [
      { header: 'کد گزارش', accessor: (i: any) => i.code, sortKey: 'code' },
      { header: 'تاریخ', accessor: (i: any) => i.date, sortKey: 'date' },
      { header: 'شیفت', accessor: (i: any) => i.shift, sortKey: 'shift' },
      { header: 'اپراتور', accessor: (i: any) => i.operator, sortKey: 'operator' },
      { header: 'وضعیت کلی', accessor: (i: any) => i.status, sortKey: 'status' },
  ];

  const filterContent = (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <ShamsiDatePicker label="از تاریخ" value={fromDate} onChange={setFromDate} />
          </div>
          <div>
              <ShamsiDatePicker label="تا تاریخ" value={toDate} onChange={setToDate} />
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">شیفت</label>
              <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
                  <option value="ALL">همه</option>
                  <option value="A">شیفت A</option>
                  <option value="B">شیفت B</option>
                  <option value="C">شیفت C</option>
              </select>
          </div>
      </div>
  );

  const handleEdit = (item: any) => {
      setFormData(item.data || { date: item.date, shift: item.shift });
      setView('NEW');
  };

  const handleView = (item: any) => {
      setFormData(item.data || { date: item.date, shift: item.shift });
      setView('NEW'); // Reusing new form for viewing in this mock
  };

  if (view === 'LIST') {
      return (
          <DataPage
            title="گزارشات اتاق کنترل"
            icon={Monitor}
            data={filteredItems}
            isLoading={loading}
            columns={columns}
            onAdd={() => setView('NEW')}
            onReload={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            filterContent={filterContent}
            exportName="ControlRoomReports"
            onEdit={handleEdit}
            onViewDetails={handleView}
            onPrint={(item) => openReportTemplatePreview(navigate, 'control-room', item)}
          />
      );
  }

  // FORM RENDER
  return (
      <div className="report-form w-full max-w-full h-full min-h-0 flex flex-col bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center flex-shrink-0 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                  <Monitor className="w-8 h-8 text-primary" />
                  <h1 className="text-2xl font-bold">ثبت گزارش اتاق کنترل</h1>
              </div>
              <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
          </div>

          <div className="bg-white dark:bg-gray-800 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              <div className="flex min-w-max">
                  {TABS.map(tab => (
                      <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 
                              ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                      >
                          <tab.icon className="w-5 h-5" /> {tab.label}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-1">
            <div className="py-4 space-y-6">
              {activeTab === 3 && (
                <TabDowntime
                  downtime={downtime}
                  setDowntime={setDowntime}
                  isReadOnly={false}
                  handleDowntimeChange={handleDowntimeChange}
                  handleVoiceInputMultiline={handleVoiceInputMultiline}
                  shiftDuration={'12:00'}
                />
              )}

              {activeTab === 8 && (
                <TabShiftNotes
                  downtime={downtime}
                  setDowntime={setDowntime}
                  footer={footer}
                  setFooter={setFooter}
                  pumps={pumps}
                  setPumps={setPumps}
                  isReadOnly={false}
                  handleDynamicListChange={handleDynamicListChange}
                  addDynamicRecord={addDynamicRecord}
                  removeDynamicRecord={removeDynamicRecord}
                  handleVoiceInputMultiline={handleVoiceInputMultiline}
                  handleVoiceInputDynamic={handleVoiceInputDynamic}
                />
              )}

              {activeTab !== 3 && activeTab !== 8 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[260px] flex items-center justify-center text-gray-400">
                  محتوای تب «{TABS.find(t => t.id === activeTab)?.label || ''}» بعداً تکمیل می‌شود.
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center justify-between pt-4 pb-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setActiveTab(prev => Math.max(1, prev - 1))}
                disabled={activeTab === 1}
                className="px-6 py-3 rounded-xl border hover:bg-gray-100 disabled:opacity-50 transition flex items-center gap-2"
              >
                  <ArrowRight className="w-5 h-5" /> مرحله قبل
              </button>
              
              {activeTab === TABS.length ? (
                  <button
                    onClick={handleSave}
                    className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition flex items-center gap-2 transform active:scale-95 font-bold text-lg"
                  >
                      <Save className="w-6 h-6" /> ثبت نهایی
                  </button>
              ) : (
                  <button
                    onClick={() => setActiveTab(prev => Math.min(TABS.length, prev + 1))}
                    className="px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold bg-blue-600 text-white hover:bg-blue-700"
                  >
                      مرحله بعد <ArrowLeft className="w-5 h-5" />
                  </button>
              )}
          </div>
      </div>
  );
};

export default ControlRoomReport;
