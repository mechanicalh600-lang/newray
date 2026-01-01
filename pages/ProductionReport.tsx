
import React, { useState } from 'react';
import { User } from '../types';
import { Factory, Save, ArrowRight, ArrowLeft, Plus, X } from 'lucide-react';
import { getShamsiDate } from '../utils';
import { PRODUCTION_TABS } from './ProductionReportTypes';
import { TabBudget, TabFeed, TabProduction, TabWaste, TabDowntime, TabAvailability, TabLogistics } from './ProductionReportTabs';
import { SmartTable } from '../components/SmartTable';

interface Props {
  user: User;
}

export const ProductionReport: React.FC<Props> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [activeTab, setActiveTab] = useState(1);
  const [reportDate, setReportDate] = useState(getShamsiDate());
  
  // Updated state for new calculation logic
  const [budgetData, setBudgetData] = useState({
      feedUsage: '',       // خوراک مصرفی (Input)
      feedDevPercent: '100', // درصد انحراف خوراک (Input)
      prodUsage: '',       // محصول تولیدی (Input)
      prodDevPercent: '100'  // درصد انحراف تولید (Input)
  });

  const handleCreateNew = () => {
      setReportDate(getShamsiDate());
      setBudgetData({ 
          feedUsage: '', 
          feedDevPercent: '100', 
          prodUsage: '', 
          prodDevPercent: '100' 
      });
      setViewMode('FORM');
      setActiveTab(1);
  };

  const handleSave = () => {
      alert("این قابلیت در حال پیاده‌سازی است.");
  };

  if (viewMode === 'FORM') {
      return (
        <div className="max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
                <div className="flex items-center gap-2">
                    <Factory className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold">ثبت گزارش تولید روزانه</h1>
                </div>
                <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky top-16 z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <div className="flex min-w-max">
                    {PRODUCTION_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 
                                ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <tab.icon className="w-5 h-5" /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">
                {activeTab === 1 && (
                    <TabBudget 
                        reportDate={reportDate} 
                        onDateChange={setReportDate} 
                        budgetData={budgetData}
                        onBudgetChange={setBudgetData}
                        user={user}
                    />
                )}
                {activeTab === 2 && <TabFeed reportDate={reportDate} />}
                {activeTab === 3 && <TabProduction />}
                {activeTab === 4 && <TabWaste />}
                {activeTab === 5 && <TabDowntime />}
                {activeTab === 6 && <TabAvailability />}
                {activeTab === 7 && <TabLogistics />}
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700 mt-6">
                <button 
                    type="button" 
                    onClick={() => setActiveTab(prev => Math.max(1, prev - 1))} 
                    disabled={activeTab === 1} 
                    className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                    <ArrowRight className="w-5 h-5" /> مرحله قبل
                </button>
                
                {activeTab === 7 ? (
                    <button 
                        type="button"
                        onClick={handleSave}
                        className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition flex items-center gap-2 transform active:scale-95 font-bold text-lg"
                    >
                        <Save className="w-6 h-6" />
                        ثبت نهایی گزارش
                    </button>
                ) : (
                    <button 
                        type="button" 
                        onClick={() => setActiveTab(prev => Math.min(7, prev + 1))} 
                        className="px-8 py-3 rounded-xl shadow transition flex items-center gap-2 font-bold bg-blue-600 text-white hover:bg-blue-700"
                    >
                        مرحله بعد <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
      );
  }

  // List View
  return (
      <div className="max-w-7xl mx-auto pb-20">
          <SmartTable
            title="لیست گزارشات تولید"
            icon={Factory}
            data={[]} // To be populated from DB later
            onAdd={handleCreateNew}
            columns={[
                { header: 'کد گزارش', accessor: (i: any) => i.code },
                { header: 'تاریخ', accessor: (i: any) => i.date },
                { header: 'تولید کل', accessor: (i: any) => i.totalProd },
                { header: 'وضعیت', accessor: (i: any) => i.status },
            ]}
          />
      </div>
  );
};
