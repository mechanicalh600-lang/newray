
import React from 'react';
import { FileText, Download, Eye, Plus, CheckCircle } from 'lucide-react';

export const ReadyTemplates: React.FC = () => {
  const templates = [
    { id: 1, title: 'گزارش تولید روزانه (استاندارد)', category: 'تولید', description: 'شامل جداول تولید، توقفات و مصرف مواد اولیه', date: '1403/01/01' },
    { id: 2, title: 'گزارش توقفات اضطراری', category: 'نت', description: 'فرم استاندارد ثبت خرابی‌های اضطراری و علل ریشه‌ای', date: '1403/01/10' },
    { id: 3, title: 'چک‌لیست ایمنی عمومی', category: 'HSE', description: 'لیست کنترل موارد ایمنی قبل از شروع شیفت', date: '1403/02/05' },
    { id: 4, title: 'درخواست خرید قطعات', category: 'بازرگانی', description: 'فرم رسمی درخواست خرید با فلوچارت تایید', date: '1403/02/20' },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20 p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">قالب‌های گزارش آماده</h1>
            <p className="text-sm text-gray-500 mt-1">بانک قالب‌های استاندارد و از پیش طراحی شده</p>
          </div>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition shadow-lg">
          <Plus className="w-5 h-5" /> افزودن قالب جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group overflow-hidden flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-lg font-bold">{tpl.category}</span>
                <span className="text-[10px] text-gray-400">{tpl.date}</span>
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors">{tpl.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{tpl.description}</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t dark:border-gray-700 flex gap-2">
              <button className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 text-sm font-medium flex items-center justify-center gap-2 transition">
                <Eye className="w-4 h-4" /> پیش‌نمایش
              </button>
              <button className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-bold flex items-center justify-center gap-2 transition">
                <CheckCircle className="w-4 h-4" /> استفاده
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadyTemplates;
