
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Factory, Save, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { getShamsiDate } from '../utils';
import { PRODUCTION_TABS } from './ProductionReportTypes';
import { TabBudget, TabFeed, TabProduction, TabWaste, TabDowntime, TabAvailability, TabLogistics } from './ProductionReportTabs';
import { DataPage } from '../components/DataPage';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { openReportTemplatePreview } from '../utils/reportTemplateNavigation';
import { ensureDefaultReportTemplate } from '../services/reportTemplates';
import { supabase } from '../supabaseClient';
import { fetchNextTrackingCode } from '../workflowStore';

interface Props {
  user: User;
}

export const ProductionReport: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [activeTab, setActiveTab] = useState(1);
  const [reportDate, setReportDate] = useState(getShamsiDate());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [budgetData, setBudgetData] = useState({ feedUsage: '', feedDevPercent: '100', prodUsage: '', prodDevPercent: '100' });

  useEffect(() => {
      ensureDefaultReportTemplate('productionreport', 'قالب پیش فرض گزارش تولید');
      fetchReports();
  }, [viewMode]);

  useEffect(() => {
      let res = data;
      if (fromDate) res = res.filter(i => i.date >= fromDate);
      if (toDate) res = res.filter(i => i.date <= toDate);
      if (filterStatus !== 'ALL') res = res.filter(i => i.status === filterStatus);
      setFilteredData(res);
  }, [fromDate, toDate, filterStatus, data]);

  const fetchReports = async () => {
      setLoading(true);
      try {
          const { data: rows, error } = await supabase
            .from('production_reports')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          const mapped = (rows || []).map((row: any) => ({
            id: row.id,
            code: row.tracking_code,
            date: row.report_date,
            created_at: row.created_at,
            totalProd: Number(row.total_production || 0),
            status: row.status || 'تکمیل شده',
            raw: row,
          }));
          setData(mapped);
          setFilteredData(mapped);
      } catch {
          setData([]);
          setFilteredData([]);
      } finally {
          setLoading(false);
      }
  };

  const handleDelete = async (ids: string[]) => {
      setData(prev => prev.filter(i => !ids.includes(i.id)));
      alert('حذف شد (شبیه‌سازی)');
  };

  const formatDateTime = (raw?: string) => {
    if (!raw) return '-';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    const time = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = dt.toLocaleDateString('fa-IR');
    return `${time} | ${date}`;
  };

  const columns = [
      { header: 'کد گزارش', accessor: (i: any) => <span className="font-mono font-bold">{i.code}</span>, sortKey: 'code' },
      { header: 'تاریخ گزارش', accessor: (i: any) => i.date, sortKey: 'date' },
      { header: 'تاریخ ثبت', accessor: (i: any) => formatDateTime(i.created_at), sortKey: 'created_at' },
      { header: 'تولید کل (تن)', accessor: (i: any) => i.totalProd.toLocaleString(), sortKey: 'totalProd' },
      { header: 'وضعیت', accessor: (i: any) => i.status, sortKey: 'status' },
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
              <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
              <select className="w-full p-2 border rounded-lg" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="ALL">همه</option>
                  <option value="تکمیل شده">تکمیل شده</option>
                  <option value="در حال انجام">در حال انجام</option>
              </select>
          </div>
      </div>
  );

  if (viewMode === 'LIST') {
      return (
          <DataPage
            title="گزارش جامع تولید"
            icon={Factory}
            data={filteredData}
            isLoading={loading}
            columns={columns}
            onAdd={() => { setReportDate(getShamsiDate()); setViewMode('FORM'); setActiveTab(1); }}
            onReload={fetchReports}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            filterContent={filterContent}
            onViewDetails={() => setViewMode('FORM')}
            onEdit={() => setViewMode('FORM')}
            onPrint={(item) => openReportTemplatePreview(navigate, 'productionreport', item)}
            exportName="ProductionReports"
          />
      );
  }

  // FORM VIEW
  return (
      <div className="w-full max-w-full pb-24">
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
            <div className="flex items-center gap-2">
                <Factory className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold">ثبت گزارش تولید روزانه</h1>
            </div>
            <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky top-16 z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <div className="flex min-w-max">
                  {PRODUCTION_TABS.map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                          <tab.icon className="w-5 h-5" /> {tab.label}
                      </button>
                  ))}
              </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
               {activeTab === 1 && <TabBudget reportDate={reportDate} onDateChange={setReportDate} budgetData={budgetData} onBudgetChange={setBudgetData} user={user} />}
               {activeTab === 2 && <TabFeed reportDate={reportDate} />}
               {activeTab === 3 && <TabProduction />}
               {activeTab === 4 && <TabWaste />}
               {activeTab === 5 && <TabDowntime />}
               {activeTab === 6 && <TabAvailability />}
               {activeTab === 7 && <TabLogistics />}

               <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700 mt-6 pb-20">
                  <button type="button" onClick={() => setActiveTab(prev => Math.max(1, prev - 1))} disabled={activeTab === 1} className="px-6 py-3 rounded-xl border hover:bg-gray-100 disabled:opacity-50 transition flex items-center gap-2">
                      <ArrowRight className="w-5 h-5" /> مرحله قبل
                  </button>
                  
                  {activeTab === PRODUCTION_TABS.length ? (
                      <button type="button" onClick={async () => {
                        if (!reportDate) {
                          alert('تاریخ گزارش الزامی است.');
                          return;
                        }
                        const trackingCode = await fetchNextTrackingCode('PR-');
                        const payload = {
                          tracking_code: trackingCode,
                          report_date: reportDate,
                          total_production: Number(budgetData.prodUsage || 0),
                          status: 'تکمیل شده',
                          full_data: { reportDate, budgetData, createdBy: user.fullName },
                        };
                        const { error } = await supabase.from('production_reports').insert([payload]);
                        if (error) {
                          alert(`خطا در ثبت: ${error.message}`);
                          return;
                        }
                        alert("ذخیره شد");
                        await fetchReports();
                        setViewMode('LIST');
                      }} className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition flex items-center gap-2 transform active:scale-95 font-bold text-lg">
                          <Save className="w-6 h-6" /> ذخیره گزارش
                      </button>
                  ) : (
                      <button type="button" onClick={() => setActiveTab(prev => Math.min(PRODUCTION_TABS.length, prev + 1))} className="px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold bg-blue-600 text-white hover:bg-blue-700">
                          مرحله بعد <ArrowLeft className="w-5 h-5" />
                      </button>
                  )}
              </div>
          </form>
      </div>
  );
};

export default ProductionReport;
