
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Clock, Wrench, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const KPIs: React.FC = () => {
  const [stats, setStats] = useState({
      mttr: 0,
      mtbf: 0,
      totalDowntime: 0,
      totalBreakdowns: 0,
      availability: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      calculateKPIs();
  }, []);

  const calculateKPIs = async () => {
      setLoading(true);
      try {
          const { data: workOrders } = await supabase
              .from('work_orders')
              .select('request_date, downtime, repair_time, status')
              .eq('work_type', 'REPAIR') // Only EM (Emergency Maintenance) counts for MTBF usually, or defined failure
              .order('request_date', { ascending: true });

          if (!workOrders || workOrders.length === 0) {
              setLoading(false);
              return;
          }

          const totalBreakdowns = workOrders.length;
          // downtime stored as minutes in DB (assumed based on App logic)
          const totalDowntimeMins = workOrders.reduce((acc, curr) => acc + (curr.downtime || 0), 0);
          const totalRepairMins = workOrders.reduce((acc, curr) => acc + (curr.repair_time || 0), 0);
          
          // Simplified Calc: 
          // MTTR = Total Repair Time / Total Breakdowns
          // MTBF = (Total Operating Time) / Total Breakdowns. 
          // Operating Time = (Total Time Period - Total Downtime). Assuming 24h operation for simplicity or sum of shift times.
          // Let's approximate Operating Time based on date range for now.
          
          const startDate = new Date(workOrders[0].created_at); // Fallback if request_date is string
          const endDate = new Date();
          const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
          const totalAvailableMins = totalDays * 24 * 60;
          const operatingMins = totalAvailableMins - totalDowntimeMins;

          const mttr = totalBreakdowns > 0 ? (totalRepairMins / totalBreakdowns) : 0;
          const mtbf = totalBreakdowns > 0 ? (operatingMins / totalBreakdowns) : 0;
          const availability = (operatingMins / totalAvailableMins) * 100;

          setStats({
              mttr: Math.round(mttr),
              mtbf: Math.round(mtbf / 60), // Show in hours
              totalDowntime: Math.round(totalDowntimeMins / 60), // Hours
              totalBreakdowns,
              availability: parseFloat(availability.toFixed(2))
          });

          // Mock Trend Data based on real totals to visualize something
          // In a real app, group workOrders by month
          const trend = workOrders.slice(0, 10).map((wo, idx) => ({
              name: wo.request_date || `WO-${idx}`,
              downtime: wo.downtime,
              repair: wo.repair_time
          }));
          setChartData(trend);

      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const KPICard = ({ title, value, unit, icon: Icon, colorClass, desc }: any) => (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start justify-between">
          <div>
              <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
              <h3 className={`text-3xl font-black ${colorClass}`}>{value} <span className="text-sm text-gray-400 font-normal">{unit}</span></h3>
              {desc && <p className="text-xs text-gray-400 mt-2">{desc}</p>}
          </div>
          <div className={`p-3 rounded-xl ${colorClass.replace('text-', 'bg-').replace('600', '50')} opacity-80`}>
              <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary"/> شاخص‌های کلیدی عملکرد (KPIs)
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
                title="MTTR (میانگین زمان تعمیر)" 
                value={stats.mttr} 
                unit="دقیقه" 
                icon={Wrench} 
                colorClass="text-orange-600" 
                desc="زمان متوسط برای رفع یک خرابی"
            />
            <KPICard 
                title="MTBF (فاصله بین خرابی‌ها)" 
                value={stats.mtbf} 
                unit="ساعت" 
                icon={Clock} 
                colorClass="text-blue-600" 
                desc="زمان متوسط کارکرد بدون وقفه"
            />
            <KPICard 
                title="دسترس‌پذیری تجهیزات" 
                value={stats.availability} 
                unit="%" 
                icon={TrendingUp} 
                colorClass="text-green-600" 
                desc="درصد زمانی که تجهیزات آماده کار بوده‌اند"
            />
            <KPICard 
                title="کل توقفات" 
                value={stats.totalDowntime} 
                unit="ساعت" 
                icon={AlertTriangle} 
                colorClass="text-red-600" 
                desc="مجموع ساعات توقف خط در بازه زمانی"
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 h-80">
                <h3 className="font-bold mb-4 text-gray-700 dark:text-gray-200">روند خرابی‌ها (دقیقه توقف)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Line type="monotone" dataKey="downtime" stroke="#ef4444" strokeWidth={2} name="زمان توقف" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 h-80">
                <h3 className="font-bold mb-4 text-gray-700 dark:text-gray-200">زمان خالص تعمیرات vs توقف</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="repair" fill="#3b82f6" name="زمان تعمیر" radius={[4,4,0,0]} />
                        <Bar dataKey="downtime" fill="#ef4444" name="کل توقف" radius={[4,4,0,0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default KPIs;
