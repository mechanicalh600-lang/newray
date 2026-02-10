
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MOCK_CHART_DATA, MOCK_LINE_DATA } from '../constants';
import { getShamsiDate, getShiftRotation, getPersianDayName } from '../utils';
import { Sun, Moon, Coffee, CalendarRange, ChevronLeft, Wrench, ClipboardCheck, Package, AlertTriangle, ArrowUpLeft, TrendingUp, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const today = getShamsiDate();
  const dayName = getPersianDayName(today);
  const rotations = getShiftRotation(today);
  
  const [stats, setStats] = useState({
      openWorkOrders: 0,
      inspections: 0,
      partRequests: 0,
      emergency: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
      fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
      setLoadingStats(true);
      try {
          // 1. Work Orders (Status not FINISHED)
          const { count: woCount } = await supabase
              .from('work_orders')
              .select('id', { count: 'exact', head: true })
              .neq('status', 'FINISHED');

          // 2. Part Requests (Pending)
          const { count: prCount } = await supabase
              .from('part_requests')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'PENDING');

          // 3. Emergency (Work Type = REPAIR and Priority = CRITICAL/URGENT)
          const { count: emCount } = await supabase
              .from('work_orders')
              .select('id', { count: 'exact', head: true })
              .eq('work_type', 'REPAIR')
              .in('priority', ['URGENT', 'CRITICAL'])
              .neq('status', 'FINISHED');

          // 4. Inspections (Mocked as PMs due for today for now, or just fixed)
          // For now, we can query scheduled PMs
          const { count: pmCount } = await supabase
              .from('pm_plans')
              .select('id', { count: 'exact', head: true })
              .like('next_run_date', `%${today}%`);

          setStats({
              openWorkOrders: woCount || 0,
              partRequests: prCount || 0,
              emergency: emCount || 0,
              inspections: pmCount || 0
          });
      } catch (e) {
          console.error("Error fetching stats:", e);
      } finally {
          setLoadingStats(false);
      }
  };

  const quickStats = [
    { 
      label: 'دستورکارهای باز', 
      val: stats.openWorkOrders, 
      gradient: 'bg-gradient-to-br from-orange-400 to-orange-500', 
      shadow: 'shadow-orange-500/20',
      icon: Wrench,
      path: '/work-orders?status=OPEN'
    },
    { 
      label: 'برنامه نت امروز', 
      val: stats.inspections, 
      gradient: 'bg-gradient-to-br from-cyan-400 to-cyan-600', 
      shadow: 'shadow-cyan-500/20',
      icon: ClipboardCheck,
      path: '/pm-scheduler'
    },
    { 
      label: 'درخواست قطعه باز', 
      val: stats.partRequests, 
      gradient: 'bg-gradient-to-br from-emerald-400 to-emerald-500', 
      shadow: 'shadow-emerald-500/20',
      icon: Package,
      path: '/part-requests'
    },
    { 
      label: 'خرابی‌های اضطراری', 
      val: stats.emergency, 
      gradient: 'bg-gradient-to-br from-rose-400 to-red-500', 
      shadow: 'shadow-rose-500/20',
      icon: AlertTriangle,
      path: '/work-orders?priority=CRITICAL'
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white mb-1">داشبورد مدیریتی</h1>
            <p className="text-sm text-gray-500">خلاصه وضعیت عملیات کارخانه در یک نگاه</p>
        </div>
        <button onClick={fetchRealStats} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 transition">
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${loadingStats ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Operational Overview Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Right Side (RTL): Calendar Widget */}
        <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col group transition-all hover:shadow-md h-full">
               {/* Widget Header */}
               <div className="bg-gradient-to-br from-[#800020] to-rose-600 p-6 text-white flex justify-between items-start relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 opacity-10 transform rotate-12 transition-transform duration-500 group-hover:scale-110">
                      <CalendarRange className="w-40 h-40" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
                            <CalendarRange className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-2xl font-black">{dayName}</h3>
                    </div>
                    <p className="text-sm font-mono opacity-90 tracking-widest mr-1">{today}</p>
                  </div>
                  <button 
                    onClick={() => navigate('/work-calendar')}
                    className="relative z-10 p-2 bg-white/20 hover:bg-white/30 rounded-xl transition backdrop-blur-sm"
                    title="تقویم کامل"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
               </div>

               {/* Shift List - Vertical with distributed spacing */}
               <div className="p-4 flex-1 flex flex-col justify-evenly gap-3">
                 {['A', 'B', 'C'].map(s => {
                   const shift = rotations[s];
                   const type = shift?.type || '';
                   
                   let config = { 
                       icon: Coffee, 
                       style: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100' 
                   };
                   
                   if (type.startsWith('DAY')) {
                       config = { 
                           icon: Sun, 
                           style: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100' 
                       };
                   } else if (type.startsWith('NIGHT')) {
                       config = { 
                           icon: Moon, 
                           style: 'bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100' 
                       };
                   }

                   const Icon = config.icon;

                   return (
                     <div key={s} className={`relative overflow-hidden p-3 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-md ${config.style}`}>
                        <div className="relative z-10 flex items-center gap-4">
                            {/* Letter Container - Brighter Border */}
                            <div className="w-12 h-12 rounded-xl bg-white/40 dark:bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl shadow-sm border border-white/50 dark:border-white/20">
                                {s}
                            </div>
                            <div className="flex flex-col">
                                {/* Wrapped Icon Container */}
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 rounded-lg bg-white/30 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/20 shadow-sm">
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold opacity-80 uppercase tracking-wider">شیفت {s}</span>
                                </div>
                                <span className="text-lg font-black tracking-tight leading-none">{shift?.label}</span>
                            </div>
                        </div>
                        {/* Background Decor */}
                        <div className="absolute -bottom-2 -left-2 opacity-40 transform rotate-12 pointer-events-none">
                            <Icon className="w-16 h-16 text-white" />
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
        </div>

        {/* Left Side (RTL): Stacked Stats Widgets (Interactive) */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {quickStats.map((stat, idx) => (
              <div 
                key={idx} 
                onClick={() => navigate(stat.path)}
                className={`relative overflow-hidden p-5 rounded-2xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer ${stat.gradient} ${stat.shadow} group`}
              >
                
                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
                            <stat.icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm text-white/90 font-bold opacity-90">{stat.label}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-4xl font-black text-white tracking-tight">{loadingStats ? '...' : stat.val}</p>
                        <div className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpLeft className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* Decorative background icon */}
                <div className="absolute -bottom-6 -left-6 opacity-10 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <stat.icon className="w-32 h-32 text-white" />
                </div>
                
                {/* Subtle shine effect */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 blur-3xl rounded-full"></div>
              </div>
            ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">توقفات تجهیزات (دقیقه)</h3>
              <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#800020]"></span>
              </div>
          </div>
          <div className="h-72 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickMargin={10} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontFamily: 'inherit' }} 
                />
                <Bar dataKey="value" fill="#800020" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-6 text-gray-700 dark:text-gray-200">روند درخواست‌ها</h3>
          <div className="h-72 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_LINE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickMargin={10} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontFamily: 'inherit' }}
                />
                <Line type="monotone" dataKey="uv" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
