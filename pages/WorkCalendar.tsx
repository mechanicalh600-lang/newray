
import React, { useState, useEffect } from 'react';
import { 
  CalendarRange, ChevronRight, ChevronLeft, Sun, Moon, Coffee, Info, 
  StickyNote, Timer, Wrench, FileText, X, CheckCircle, AlertTriangle, Clock
} from 'lucide-react';
import { getShamsiDate, getShiftRotation, jalaliToGregorian, toPersianDigits } from '../utils';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface DayEvents {
  notes: any[];
  pms: any[];
  workOrders: any[];
  reports: any[];
}

export const WorkCalendar: React.FC = () => {
  const navigate = useNavigate();
  const today = getShamsiDate();
  const [currentYear, setCurrentYear] = useState(parseInt(today.split('/')[0]));
  const [currentMonth, setCurrentMonth] = useState(parseInt(today.split('/')[1]));
  
  // Data State
  const [eventsMap, setEventsMap] = useState<Record<string, DayEvents>>({});
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthNames = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ];

  const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const years = Array.from({ length: 11 }, (_, i) => 1400 + i);

  // --- Fetch Data Logic ---
  useEffect(() => {
    fetchMonthData();
  }, [currentYear, currentMonth]);

  const fetchMonthData = async () => {
    setLoading(true);
    const prefix = `${currentYear}/${String(currentMonth).padStart(2, '0')}`;
    const map: Record<string, DayEvents> = {};

    try {
      // 1. Fetch Personal Notes (Reminders)
      const { data: notes } = await supabase
        .from('personal_notes')
        .select('id, title, reminder_date, is_completed')
        .like('reminder_date', `${prefix}%`);

      // 2. Fetch PM Plans (Scheduled)
      const { data: pms } = await supabase
        .from('pm_plans')
        .select('id, title, next_run_date, equipment(name)')
        .like('next_run_date', `${prefix}%`);

      // 3. Fetch Work Orders (Requests)
      const { data: wos } = await supabase
        .from('work_orders')
        .select('id, tracking_code, request_date, equipment_name, status, failure_description')
        .like('request_date', `${prefix}%`);

      // 4. Fetch Shift Reports
      const { data: reports } = await supabase
        .from('shift_reports')
        .select('id, tracking_code, shift_date, shift_name, total_production_a, total_production_b')
        .like('shift_date', `${prefix}%`);

      // Aggregation Helper
      const addToMap = (date: string, key: keyof DayEvents, item: any) => {
        if (!map[date]) map[date] = { notes: [], pms: [], workOrders: [], reports: [] };
        map[date][key].push(item);
      };

      notes?.forEach(n => addToMap(n.reminder_date, 'notes', n));
      pms?.forEach(p => addToMap(p.next_run_date, 'pms', p));
      wos?.forEach(w => addToMap(w.request_date, 'workOrders', w));
      reports?.forEach(r => addToMap(r.shift_date, 'reports', r));

      setEventsMap(map);
    } catch (e) {
      console.error("Error fetching calendar events:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Calendar Helpers ---
  const getDaysInMonth = (y: number, m: number) => {
    if (m <= 6) return 31;
    if (m <= 11) return 30;
    const isLeap = (y % 33 === 1 || y % 33 === 5 || y % 33 === 9 || y % 33 === 13 || y % 33 === 17 || y % 33 === 22 || y % 33 === 26 || y % 33 === 30);
    return isLeap ? 30 : 29;
  };

  const getStartDayOfMonth = (y: number, m: number) => {
    const { gy, gm, gd } = jalaliToGregorian(y, m, 1);
    const date = new Date(gy, gm - 1, gd);
    return (date.getDay() + 1) % 7;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const startDayIndex = getStartDayOfMonth(currentYear, currentMonth);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const getStatusColor = (type: string) => {
    if (type.startsWith('DAY')) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    if (type.startsWith('NIGHT')) return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  };

  const getStatusIcon = (type: string) => {
    if (type.startsWith('DAY')) return <Sun className="w-3 h-3" />;
    if (type.startsWith('NIGHT')) return <Moon className="w-3 h-3" />;
    return <Coffee className="w-3 h-3" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-xl text-primary">
            <CalendarRange className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">تقویم جامع نت</h1>
            <p className="text-sm text-gray-500">مشاهده شیفت‌ها، برنامه‌ها و گزارشات روزانه</p>
          </div>
        </div>

        <div className="w-full lg:w-auto flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 border-l pl-3 dark:border-gray-700">
             <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition shadow-sm border dark:border-gray-700"><ChevronRight className="w-5 h-5" /></button>
             <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition shadow-sm border dark:border-gray-700"><ChevronLeft className="w-5 h-5" /></button>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
                value={currentMonth} 
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            >
                {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            
            <select 
                value={currentYear} 
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            
            <button 
                onClick={() => {
                    const t = getShamsiDate();
                    setCurrentYear(parseInt(t.split('/')[0]));
                    setCurrentMonth(parseInt(t.split('/')[1]));
                }}
                className="p-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition"
            >
                امروز
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs px-2">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span>یادداشت شخصی</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div><span>برنامه نت (PM)</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span>دستور کار باز</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span>گزارش تولید</span></div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                  {/* Week Headers */}
                  <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      {weekDays.map((day, idx) => (
                          <div key={idx} className={`py-3 text-center text-sm font-bold ${idx === 6 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                              {day}
                          </div>
                      ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 auto-rows-fr">
                      {Array.from({ length: startDayIndex }).map((_, i) => (
                          <div key={`empty-${i}`} className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-l dark:border-gray-700 min-h-[120px]" />
                      ))}

                      {daysArray.map(day => {
                          const dateStr = `${currentYear}/${String(currentMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                          const rotations = getShiftRotation(dateStr);
                          const isToday = dateStr === today;
                          const isFriday = (startDayIndex + day - 1) % 7 === 6;
                          const events = eventsMap[dateStr];

                          return (
                              <div 
                                key={day} 
                                onClick={() => setSelectedDate(dateStr)}
                                className={`
                                    p-2 min-h-[120px] relative transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer group
                                    ${isToday 
                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-2 border-primary shadow-sm z-10' 
                                        : 'border-b border-l dark:border-gray-700'}
                                `}
                              >
                                  <div className="flex justify-between items-center mb-2">
                                      <span className={`text-lg font-black ${isToday ? 'text-primary' : (isFriday ? 'text-red-500' : 'text-gray-700 dark:text-gray-200')}`}>
                                          {toPersianDigits(day)}
                                      </span>
                                      {isToday && <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-md font-bold">امروز</span>}
                                  </div>

                                  {/* Shift Info */}
                                  <div className="space-y-1 mb-2">
                                      {['A', 'B', 'C'].map(s => {
                                          const shift = rotations[s];
                                          return (
                                              <div key={s} className={`flex items-center justify-between px-1 py-0.5 rounded text-[8px] font-bold border opacity-80 group-hover:opacity-100 ${getStatusColor(shift?.type || '')}`}>
                                                  <span>{s}: {shift?.label.split(' ')[0]}</span>
                                                  {getStatusIcon(shift?.type || '')}
                                              </div>
                                          );
                                      })}
                                  </div>

                                  {/* Event Dots */}
                                  {events && (
                                      <div className="flex gap-1 justify-end flex-wrap">
                                          {events.notes.length > 0 && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" title={`${events.notes.length} یادداشت`}></div>}
                                          {events.pms.length > 0 && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm" title={`${events.pms.length} برنامه نت`}></div>}
                                          {events.workOrders.length > 0 && <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" title={`${events.workOrders.length} دستور کار`}></div>}
                                          {events.reports.length > 0 && <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" title="گزارش ثبت شده"></div>}
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                      
                      {Array.from({ length: (7 - ((startDayIndex + daysCount) % 7)) % 7 }).map((_, i) => (
                          <div key={`fill-${i}`} className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-l dark:border-gray-700" />
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* Day Detail Modal (Dashboard) */}
      {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-start relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                      <div className="relative z-10">
                          <h2 className="text-3xl font-black mb-1">{selectedDate}</h2>
                          <p className="text-sm opacity-80 font-medium">داشبورد وضعیت روزانه</p>
                      </div>
                      <button onClick={() => setSelectedDate(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition relative z-10">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
                      
                      {/* Shift Status Widget */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-primary"/> شیفت‌های کاری امروز
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
                              {['A', 'B', 'C'].map(s => {
                                  const rot = getShiftRotation(selectedDate)[s];
                                  return (
                                      <div key={s} className={`p-3 rounded-xl border text-center ${getStatusColor(rot?.type || '')}`}>
                                          <div className="text-xs font-bold opacity-70 mb-1">شیفت {s}</div>
                                          <div className="font-black text-sm">{rot?.label}</div>
                                          <div className="mt-1">{getStatusIcon(rot?.type || '')}</div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>

                      {/* Notes Section */}
                      <div>
                          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                              <StickyNote className="w-4 h-4 text-blue-500"/> یادداشت‌ها و یادآوری‌ها
                          </h3>
                          {eventsMap[selectedDate]?.notes.length > 0 ? (
                              <div className="space-y-2">
                                  {eventsMap[selectedDate].notes.map(n => (
                                      <div key={n.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                                          <span className={`text-sm ${n.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{n.title}</span>
                                          {n.is_completed && <CheckCircle className="w-4 h-4 text-green-500"/>}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-400">یادداشتی وجود ندارد</div>
                          )}
                      </div>

                      {/* PM Plans Section */}
                      <div>
                          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                              <Timer className="w-4 h-4 text-orange-500"/> برنامه نت (PM)
                          </h3>
                          {eventsMap[selectedDate]?.pms.length > 0 ? (
                              <div className="space-y-2">
                                  {eventsMap[selectedDate].pms.map(p => (
                                      <div key={p.id} className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800">
                                          <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{p.title}</div>
                                          <div className="text-xs text-gray-500 mt-1">{p.equipment?.name}</div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-400">برنامه‌ای وجود ندارد</div>
                          )}
                      </div>

                      {/* Work Orders Section */}
                      <div>
                          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                              <Wrench className="w-4 h-4 text-red-500"/> دستور کارهای ثبت شده
                          </h3>
                          {eventsMap[selectedDate]?.workOrders.length > 0 ? (
                              <div className="space-y-2">
                                  {eventsMap[selectedDate].workOrders.map(w => (
                                      <div key={w.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm">
                                          <div>
                                              <div className="font-bold text-sm">{w.equipment_name || 'تجهیز عمومی'}</div>
                                              <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{w.failure_description}</div>
                                          </div>
                                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${w.status === 'FINISHED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {w.status === 'FINISHED' ? 'تکمیل' : 'باز'}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-400">دستور کاری ثبت نشده</div>
                          )}
                      </div>

                      {/* Reports Section */}
                      <div>
                          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-green-500"/> گزارشات تولید
                          </h3>
                          {eventsMap[selectedDate]?.reports.length > 0 ? (
                              <div className="space-y-2">
                                  {eventsMap[selectedDate].reports.map(r => (
                                      <div key={r.id} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800 flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-sm">شیفت {r.shift_name}</span>
                                              <span className="text-xs text-gray-500 font-mono">({r.tracking_code})</span>
                                          </div>
                                          <div className="text-xs font-mono">
                                              A: {r.total_production_a} | B: {r.total_production_b}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-400">گزارشی ثبت نشده</div>
                          )}
                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WorkCalendar;
