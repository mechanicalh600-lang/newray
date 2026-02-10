
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Monitor, Save, ArrowRight, ArrowLeft, Info, Factory, Package, Clock, StopCircle, Zap, RefreshCcw, Droplet, X } from 'lucide-react';
import { DataPage } from '../components/DataPage';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { getShamsiDate } from '../utils';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';

interface Props {
  user: User;
}

const TABS = [
    { id: 1, label: 'اطلاعات گزارش', icon: Info },
    { id: 2, label: 'خوراک', icon: Factory },
    { id: 3, label: 'محصول', icon: Package },
    { id: 4, label: 'ساعت کارکرد', icon: Clock },
    { id: 5, label: 'توقفات', icon: StopCircle },
    { id: 6, label: 'جریان الکتریکی', icon: Zap },
    { id: 7, label: 'هیدروسیکلون', icon: RefreshCcw },
    { id: 8, label: 'تیکنر', icon: Droplet },
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
      // Mock Data Load
      const mockData = [
          { id: '1', code: 'CR-1403-001', date: '1403/11/01', shift: 'A', operator: 'علی رضایی', status: 'تکمیل شده', data: {} },
          { id: '2', code: 'CR-1403-002', date: '1403/11/01', shift: 'B', operator: 'حسن محمدی', status: 'تکمیل شده', data: {} },
      ];
      setItems(mockData);
      setFilteredItems(mockData);
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

  const handleDelete = async (ids: string[]) => {
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
      alert('حذف شد (شبیه‌سازی)');
  };

  const handleSave = () => {
      alert('گزارش ثبت شد.');
      setView('LIST');
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
      <div className="max-w-5xl mx-auto pb-24">
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
              <div className="flex items-center gap-2">
                  <Monitor className="w-8 h-8 text-primary" />
                  <h1 className="text-2xl font-bold">ثبت گزارش اتاق کنترل</h1>
              </div>
              <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky top-16 z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto">
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

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[300px]">
              <div className="text-center py-20 text-gray-400">محتوای فرم (شبیه‌سازی شده)</div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button onClick={() => setActiveTab(prev => Math.max(1, prev - 1))} disabled={activeTab === 1} className="px-6 py-3 border rounded-xl hover:bg-gray-100 disabled:opacity-50">
                  <ArrowRight className="w-5 h-5" /> مرحله قبل
              </button>
              
              {activeTab === TABS.length ? (
                  <button onClick={handleSave} className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 font-bold flex items-center gap-2">
                      <Save className="w-6 h-6" /> ثبت نهایی
                  </button>
              ) : (
                  <button onClick={() => setActiveTab(prev => Math.min(TABS.length, prev + 1))} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2 hover:bg-blue-700">
                      مرحله بعد <ArrowLeft className="w-5 h-5" />
                  </button>
              )}
          </div>
      </div>
  );
};

export default ControlRoomReport;
