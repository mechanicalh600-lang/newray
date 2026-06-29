import React from 'react';
import { BarChart3, Inbox, Wrench, CalendarRange, Bell, Moon, Menu, ChevronRight } from 'lucide-react';
import { Logo } from './Logo';

/** پیش‌نمایش زنده رابط نرم‌افزار — از بالای صفحه (هدر + منو + محتوا) */
export const ThemeAppPreview: React.FC = () => {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-900 theme-geometric-soft max-w-md mx-auto">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-9 flex items-center justify-between px-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Menu className="w-4 h-4 text-gray-500 md:hidden shrink-0" />
          <ChevronRight className="w-4 h-4 text-gray-400 hidden sm:block shrink-0" />
          <span className="text-[10px] font-bold text-gray-800 dark:text-white truncate">تنظیمات کاربری</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Bell className="w-3.5 h-3.5" />
          <Moon className="w-3.5 h-3.5" />
        </div>
      </header>

      <div className="flex h-[168px] text-right" dir="rtl">
        <aside className="w-[26%] min-w-[72px] max-w-[96px] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1 justify-center">
            <Logo className="w-6 h-6 shrink-0" />
            <span className="text-[8px] font-black text-primary dark:text-primary-accent">رای‌نو</span>
          </div>
          <nav className="flex-1 p-1 space-y-0.5 text-[8px] overflow-hidden">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500">
              <BarChart3 className="w-3 h-3 shrink-0" />
              <span className="truncate">داشبورد</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-primary dark:text-primary-accent bg-primary/10 font-bold">
              <Inbox className="w-3 h-3 shrink-0" />
              <span className="truncate">گزارشات</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500">
              <CalendarRange className="w-3 h-3 shrink-0" />
              <span className="truncate">تقویم</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500">
              <Wrench className="w-3 h-3 shrink-0" />
              <span className="truncate">دستور کار</span>
            </div>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900/80 p-2 gap-1.5 overflow-hidden">
          <div className="grid grid-cols-2 gap-1.5 shrink-0">
            <div className="rounded-lg p-2 theme-gradient-br text-white shadow-sm">
              <p className="text-[7px] opacity-90">دستورکار باز</p>
              <p className="text-base font-black leading-none mt-0.5">۱۲</p>
            </div>
            <div className="rounded-lg p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 theme-geometric-soft">
              <p className="text-[7px] text-gray-500">کارتابل</p>
              <p className="text-base font-black text-primary dark:text-primary-accent leading-none mt-0.5">۳</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="reports-table-header px-2 py-1 text-[7px] font-bold shrink-0">
              هدر جدول گزارش
            </div>
            <div className="flex-1 bg-white dark:bg-gray-800 p-2 space-y-1">
              <div className="h-1.5 rounded bg-gray-100 dark:bg-gray-700 w-full" />
              <div className="h-1.5 rounded bg-gray-100 dark:bg-gray-700 w-4/5" />
              <div className="h-1.5 rounded bg-gray-100 dark:bg-gray-700 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
