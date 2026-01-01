
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { supabase } from '../supabaseClient';
import { parseShamsiDate } from '../utils';
import { Calendar, User as UserIcon, RefreshCw, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, Label } from 'recharts';

const SHAMSI_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

interface TabBudgetProps {
    reportDate: string;
    onDateChange: (date: string) => void;
    budgetData: any;
    onBudgetChange: (data: any) => void;
    user?: User;
}

// --- Tab 1: Report Information & Production Plan ---
export const TabBudget: React.FC<TabBudgetProps> = ({ reportDate, onDateChange, budgetData, onBudgetChange, user }) => {
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [yearPlans, setYearPlans] = useState<any[]>([]);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(-1);

    useEffect(() => {
        if (reportDate) {
            // 1. Calculate Day of Week & Identify Current Month
            const date = parseShamsiDate(reportDate);
            if (date) {
                const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
                setDayOfWeek(days[date.getDay()]);
            }

            const parts = reportDate.split('/');
            if (parts.length === 3) {
                const monthIdx = parseInt(parts[1]) - 1;
                setCurrentMonthIndex(monthIdx);
                const year = parseInt(parts[0]);
                
                // 2. Fetch Plan Data for the WHOLE Year
                fetchPlanData(year);
            }
        }
    }, [reportDate]);

    // NEW: Effect to pre-fill budgetData inputs if DB has values for the current month
    useEffect(() => {
        if (yearPlans.length > 0 && currentMonthIndex !== -1) {
            const currentMonthName = SHAMSI_MONTHS[currentMonthIndex];
            const currentRow = yearPlans.find(r => r.month === currentMonthName);
            
            if (currentRow) {
                // Only update if the values exist in DB to avoid clearing inputs unnecessarily
                onBudgetChange({
                    feedUsage: currentRow.feed_usage !== null ? String(currentRow.feed_usage) : '',
                    feedDevPercent: currentRow.feed_dev_percent !== null ? String(currentRow.feed_dev_percent) : '100',
                    prodUsage: currentRow.prod_usage !== null ? String(currentRow.prod_usage) : '',
                    prodDevPercent: currentRow.prod_dev_percent !== null ? String(currentRow.prod_dev_percent) : '100'
                });
            }
        }
    }, [yearPlans, currentMonthIndex]);

    const fetchPlanData = async (year: number) => {
        setLoadingPlan(true);
        try {
            const { data, error } = await supabase
                .from('production_plans')
                .select('*')
                .eq('year', year);

            if (!error && data) {
                // Sort by Month Index
                const sorted = data.sort((a, b) => {
                    return SHAMSI_MONTHS.indexOf(a.month) - SHAMSI_MONTHS.indexOf(b.month);
                });
                setYearPlans(sorted);
            } else {
                setYearPlans([]);
            }
        } catch (e) {
            console.error("Plan fetch error:", e);
            setYearPlans([]);
        } finally {
            setLoadingPlan(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        const numVal = parseFloat(value);
        // Allow empty string or non-negative numbers
        if (value !== '' && numVal < 0) return; 
        
        onBudgetChange({
            ...budgetData,
            [field]: value
        });
    };

    // Calculate Final Value = Usage * (Dev% / 100)
    const calculateFinal = (usageStr: string, devPercentStr: string) => {
        if (!usageStr || !devPercentStr) return 0;
        const usage = parseFloat(usageStr);
        const percent = parseFloat(devPercentStr);
        return usage * (percent / 100);
    };

    // Deviation Amount = Final (Calculated) - Plan (Target)
    // If Positive: Green +, If Negative: Red -
    const renderDeviation = (plan: number, final: number) => {
        const diff = final - plan;
        
        if (diff === 0) return <span className="text-gray-500 font-bold">0</span>;
        
        const isPositive = diff > 0;
        const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
        const sign = isPositive ? '+' : ''; 

        return (
            <span className={`${colorClass} font-black text-sm`} dir="ltr">
                {sign}{Math.round(diff).toLocaleString()}
            </span>
        );
    };

    // Prepare Chart Data
    const chartData = yearPlans.map(row => {
        const isCurrentMonth = SHAMSI_MONTHS.indexOf(row.month) === currentMonthIndex;
        
        // Dynamic Calculation Logic for ALL rows
        const feedUsageVal = isCurrentMonth ? parseFloat(budgetData.feedUsage || '0') : Number(row.feed_usage || 0);
        const feedDevVal = isCurrentMonth ? parseFloat(budgetData.feedDevPercent || '100') : Number(row.feed_dev_percent || 100);
        const finalFeed = feedUsageVal * (feedDevVal / 100);

        const prodUsageVal = isCurrentMonth ? parseFloat(budgetData.prodUsage || '0') : Number(row.prod_usage || 0);
        const prodDevVal = isCurrentMonth ? parseFloat(budgetData.prodDevPercent || '100') : Number(row.prod_dev_percent || 100);
        const finalProd = prodUsageVal * (prodDevVal / 100);

        return {
            name: row.month,
            "برنامه خوراک": Number(row.feed_plan || 0),
            "خوراک نهایی": finalFeed,
            "برنامه تولید": Number(row.prod_plan || 0),
            "تولید نهایی": finalProd
        };
    });

    return (
        <div className="space-y-6">
            {/* Top Cards: User, Day, Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 block mb-1">کاربر ثبت کننده</span>
                        <span className="font-bold text-gray-800 dark:text-white">{user?.fullName || 'ناشناس'}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-full">
                        <Calendar className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 block mb-1">روز هفته</span>
                        <span className="font-bold text-gray-800 dark:text-white">{dayOfWeek || '---'}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <ShamsiDatePicker 
                        label="تاریخ گزارش"
                        value={reportDate}
                        onChange={onDateChange}
                    />
                </div>
            </div>

            {/* Production Plan Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
                <h3 className="font-bold text-lg mb-4 text-blue-600 border-b pb-2 dark:border-gray-700">جدول برنامه و بودجه سالانه</h3>
                
                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-center text-sm border-collapse min-w-[1600px]">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-b-2 border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="p-3 whitespace-nowrap min-w-[140px] sticky right-0 bg-gray-50 dark:bg-gray-700 z-10 border-l">سال / ماه</th>
                                <th className="p-3 whitespace-nowrap">روز کل</th>
                                <th className="p-3 whitespace-nowrap">روز فعال</th>
                                <th className="p-3 whitespace-nowrap text-red-500 border-l border-gray-200">روز توقف</th>
                                
                                {/* Feed Section */}
                                <th className="p-3 whitespace-nowrap bg-blue-100 dark:bg-blue-900/40 text-blue-900 border-r border-blue-200">برنامه خوراک</th>
                                <th className="p-3 whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 text-blue-800 border-r border-blue-200">خوراک مصرفی</th>
                                <th className="p-3 whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 text-blue-800 border-r border-blue-200">درصد انحراف</th>
                                <th className="p-3 whitespace-nowrap bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-r border-blue-200">خوراک نهایی</th>
                                <th className="p-3 whitespace-nowrap border-l border-gray-200">انحراف مقدار</th>

                                {/* Production Section */}
                                <th className="p-3 whitespace-nowrap bg-green-100 dark:bg-green-900/40 text-green-900 border-r border-green-200">برنامه تولید</th>
                                <th className="p-3 whitespace-nowrap bg-green-50 dark:bg-green-900/20 text-green-800 border-r border-green-200">محصول تولیدی</th>
                                <th className="p-3 whitespace-nowrap bg-green-50 dark:bg-green-900/20 text-green-800 border-r border-green-200">درصد انحراف</th>
                                <th className="p-3 whitespace-nowrap bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-r border-green-200">تولید نهایی</th>
                                <th className="p-3 whitespace-nowrap border-l border-gray-200">انحراف مقدار</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingPlan ? (
                                <tr>
                                    <td colSpan={14} className="p-8 text-gray-400">در حال دریافت اطلاعات برنامه...</td>
                                </tr>
                            ) : yearPlans.length > 0 ? (
                                yearPlans.map((row) => {
                                    const isCurrentMonth = SHAMSI_MONTHS.indexOf(row.month) === currentMonthIndex;
                                    const rowClass = isCurrentMonth 
                                        ? "bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-400 transform scale-[1.01] shadow-md z-10 relative" 
                                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-500 opacity-80 hover:opacity-100";

                                    const feedPlan = Math.round(Number(row.feed_plan || 0));
                                    const prodPlan = Math.round(Number(row.prod_plan || 0));

                                    // Calculations: Final = Usage * (Dev% / 100)
                                    // Use live input for current month, otherwise use DB values
                                    const finalFeed = isCurrentMonth 
                                        ? calculateFinal(budgetData.feedUsage, budgetData.feedDevPercent)
                                        : calculateFinal(String(row.feed_usage || 0), String(row.feed_dev_percent || 100));
                                        
                                    const finalProd = isCurrentMonth
                                        ? calculateFinal(budgetData.prodUsage, budgetData.prodDevPercent)
                                        : calculateFinal(String(row.prod_usage || 0), String(row.prod_dev_percent || 100));

                                    return (
                                        <tr key={row.id} className={`transition duration-200 ${rowClass}`}>
                                            <td className="p-3 border-b dark:border-gray-700 font-bold sticky right-0 bg-inherit border-l z-10">
                                                <div className="flex justify-between items-center w-full px-2 gap-4">
                                                    <span className="text-right flex-1">{row.month}</span>
                                                    <span className="text-gray-400 font-mono text-xs w-10 text-left border-l pl-2 border-gray-300 dark:border-gray-600">{row.year}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 border-b dark:border-gray-700">{row.total_days}</td>
                                            <td className="p-3 border-b dark:border-gray-700 font-medium text-green-600">{row.active_days}</td>
                                            <td className="p-3 border-b border-l dark:border-gray-700 font-medium text-red-500 bg-red-50/30 dark:bg-red-900/10">
                                                {row.downtime_days || 0}
                                            </td>
                                            
                                            {/* FEED INPUTS & CALCS */}
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-blue-100/50 dark:bg-blue-900/30 font-bold text-blue-800">{feedPlan.toLocaleString()}</td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10">
                                                {isCurrentMonth ? (
                                                    <input 
                                                        type="number" 
                                                        className="w-24 p-1.5 text-center border border-blue-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="0"
                                                        value={budgetData.feedUsage}
                                                        onChange={(e) => handleInputChange('feedUsage', e.target.value)}
                                                    />
                                                ) : <span>{Number(row.feed_usage || 0).toLocaleString()}</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10">
                                                {isCurrentMonth ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input 
                                                            type="number" 
                                                            className="w-16 p-1.5 text-center border border-blue-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                            placeholder="100"
                                                            value={budgetData.feedDevPercent}
                                                            onChange={(e) => handleInputChange('feedDevPercent', e.target.value)}
                                                        />
                                                        <span className="text-xs text-gray-500">%</span>
                                                    </div>
                                                ) : <span>{row.feed_dev_percent || 100}%</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-gray-100 dark:bg-gray-600 font-bold">
                                                {Math.round(finalFeed).toLocaleString()}
                                            </td>
                                            <td className="p-3 border-b border-l dark:border-gray-700">
                                                {renderDeviation(feedPlan, finalFeed)}
                                            </td>

                                            {/* PRODUCTION INPUTS & CALCS */}
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-green-100/50 dark:bg-green-900/30 font-bold text-green-800">{prodPlan.toLocaleString()}</td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-green-50/30 dark:bg-green-900/10">
                                                {isCurrentMonth ? (
                                                    <input 
                                                        type="number" 
                                                        className="w-24 p-1.5 text-center border border-green-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                                                        placeholder="0"
                                                        value={budgetData.prodUsage}
                                                        onChange={(e) => handleInputChange('prodUsage', e.target.value)}
                                                    />
                                                ) : <span>{Number(row.prod_usage || 0).toLocaleString()}</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-green-50/30 dark:bg-green-900/10">
                                                {isCurrentMonth ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input 
                                                            type="number" 
                                                            className="w-16 p-1.5 text-center border border-green-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                                                            placeholder="100"
                                                            value={budgetData.prodDevPercent}
                                                            onChange={(e) => handleInputChange('prodDevPercent', e.target.value)}
                                                        />
                                                        <span className="text-xs text-gray-500">%</span>
                                                    </div>
                                                ) : <span>{row.prod_dev_percent || 100}%</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-gray-100 dark:bg-gray-600 font-bold">
                                                {Math.round(finalProd).toLocaleString()}
                                            </td>
                                            <td className="p-3 border-b border-l dark:border-gray-700">
                                                {renderDeviation(prodPlan, finalProd)}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={14} className="p-8 text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                                        برای سال جاری برنامه تولیدی تعریف نشده است.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* COMPARISON CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn delay-100">
                {/* Feed Chart */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-center mb-4 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span>
                        مقایسه برنامه و عملکرد خوراک
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                                    interval={0} 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={70} 
                                    tickMargin={10}
                                />
                                <YAxis 
                                    tick={{ fontSize: 10 }} 
                                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                                    width={40} 
                                    tickMargin={5}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => value.toLocaleString()}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="برنامه خوراک" fill="#fb923c" radius={[4, 4, 0, 0]} name="برنامه" /> {/* Contrast Orange */}
                                <Bar dataKey="خوراک نهایی" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="عملکرد" /> {/* Contrast Blue */}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Production Chart */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-center mb-4 text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-green-600 rounded-full inline-block"></span>
                        مقایسه برنامه و عملکرد تولید
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                                    interval={0} 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={70} 
                                    tickMargin={10}
                                />
                                <YAxis 
                                    tick={{ fontSize: 10 }} 
                                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                                    width={40}
                                    tickMargin={5}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => value.toLocaleString()}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="برنامه تولید" fill="#c084fc" radius={[4, 4, 0, 0]} name="برنامه" /> {/* Contrast Purple */}
                                <Bar dataKey="تولید نهایی" fill="#15803d" radius={[4, 4, 0, 0]} name="عملکرد" /> {/* Contrast Green */}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TabFeedProps {
    reportDate?: string;
}

// --- Shared Table & Chart Component for Feed, Production, Waste ---
const CommonReportTab: React.FC<{ 
    title: string; 
    colorClass: string; 
    tonnageLabel: string; 
    reportDate?: string; 
    planType: 'feed' | 'prod' | 'waste'; // To distinguish plan logic if needed, currently mainly for structure
    fetchActuals?: boolean; // New prop to control fetching
}> = ({ title, colorClass, tonnageLabel, reportDate, planType, fetchActuals = false }) => {
    
    // Structure similar to TabFeed
    const [tableData, setTableData] = useState({
        daily: { fe: '', feo: '', s: '', k80: '', mois: '', blaine: '', lineA: '', lineB: '', totalRealization: '', currentRealization: '' },
        monthly: { fe: '', feo: '', s: '', k80: '', mois: '', blaine: '', lineA: '', lineB: '', totalRealization: '', currentRealization: '' },
        yearly: { fe: '', feo: '', s: '', k80: '', mois: '', blaine: '', lineA: '', lineB: '', totalRealization: '', currentRealization: '' }
    });
    
    const [loading, setLoading] = useState(false);
    const [dailyPlanTarget, setDailyPlanTarget] = useState(0);
    // Chart data is initialized empty as per instruction to "not calculate it from somewhere" (meaning manual entry focus)
    // However, to show *something* in the chart if user wants, we can populate the X-axis days.
    const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);

    useEffect(() => {
        if (reportDate) {
            initData(reportDate);
        }
    }, [reportDate]);

    const initData = async (dateStr: string) => {
        setLoading(true);
        try {
            const parts = dateStr.split('/');
            const year = parseInt(parts[0]);
            const monthIdx = parseInt(parts[1]) - 1;
            const monthName = SHAMSI_MONTHS[monthIdx];
            
            // Fetch Plan ONLY for target line
            const { data: allPlans } = await supabase
                .from('production_plans')
                .select('*')
                .eq('year', year);

            const currentMonthPlanObj = allPlans?.find(p => p.month === monthName);
            // Decide which plan field to use based on planType
            const planTotal = planType === 'feed' ? (currentMonthPlanObj?.feed_plan || 0) : (currentMonthPlanObj?.prod_plan || 0); // fallback for waste?
            
            const daysInMonth = currentMonthPlanObj?.total_days || (monthIdx < 6 ? 31 : (monthIdx < 11 ? 30 : 29));
            const target = daysInMonth > 0 ? planTotal / daysInMonth : 0;
            setDailyPlanTarget(target);

            // Generate Empty Chart Structure (Days 1 to N)
            const chartArr = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, '0');
                chartArr.push({
                    date: `${parts[0]}/${parts[1]}/${dayStr}`,
                    shortDate: `${parts[1]}/${dayStr}`,
                    day: dayStr,
                    value: 0, // Placeholder
                    target: target
                });
            }
            setMonthlyChartData(chartArr);

            // Only fetch actuals if requested (e.g. for Feed tab)
            if (fetchActuals) {
                // ... fetch logic from shift_reports would go here if needed ...
                // But for Production and Waste, user requested manual input.
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (period: 'daily' | 'monthly' | 'yearly', field: string, value: string) => {
        setTableData(prev => ({
            ...prev,
            [period]: { ...prev[period], [field]: value }
        }));
    };

    const calculateSum = (lineA: string, lineB: string) => {
        const a = parseFloat(lineA) || 0;
        const b = parseFloat(lineB) || 0;
        return a + b;
    };

    const periods = [
        { key: 'daily', label: 'روزانه' },
        { key: 'monthly', label: 'ماهانه' },
        { key: 'yearly', label: 'سالانه' }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
                {loading && <div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> در حال آماده‌سازی...</div>}
                <button onClick={() => reportDate && initData(reportDate)} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:rotate-180 transition duration-500" title="بازنشانی"><RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-300"/></button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-center text-sm border-collapse border border-gray-200 dark:border-gray-700 table-fixed">
                    <thead>
                        <tr className={`bg-opacity-20 ${colorClass.replace('text-', 'bg-')} dark:bg-opacity-20 text-gray-800 dark:text-gray-200`}>
                            <th className="p-2 border border-gray-200 dark:border-gray-600 w-24" rowSpan={2}>دوره</th>
                            <th className="p-2 border border-gray-200 dark:border-gray-600" colSpan={3}>مقدار عناصر (%)</th>
                            <th className="p-2 border border-gray-200 dark:border-gray-600" colSpan={3}>اطلاعات کیفی</th>
                            <th className="p-2 border border-gray-200 dark:border-gray-600" colSpan={3}>{tonnageLabel}</th>
                            <th className="p-2 border border-gray-200 dark:border-gray-600" colSpan={2}>درصد تحقق (%)</th>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                            <th className="p-2 border dark:border-gray-600 w-16">Fe</th>
                            <th className="p-2 border dark:border-gray-600 w-16">FeO</th>
                            <th className="p-2 border dark:border-gray-600 w-16">S</th>
                            <th className="p-2 border dark:border-gray-600 w-16">K80</th>
                            <th className="p-2 border dark:border-gray-600 w-16">Mois</th>
                            <th className="p-2 border dark:border-gray-600 w-16">Blaine</th>
                            <th className="p-2 border dark:border-gray-600 min-w-[120px]">Line A</th>
                            <th className="p-2 border dark:border-gray-600 min-w-[120px]">Line B</th>
                            <th className="p-2 border dark:border-gray-600 bg-gray-100 dark:bg-gray-600/50 min-w-[120px]">SUM</th>
                            <th className="p-2 border dark:border-gray-600 w-20">جاری</th>
                            <th className="p-2 border dark:border-gray-600 w-20">کل</th>
                        </tr>
                    </thead>
                    <tbody>
                        {periods.map((p) => {
                            const data = tableData[p.key as 'daily' | 'monthly' | 'yearly'];
                            const sum = calculateSum(data.lineA, data.lineB);
                            return (
                                <tr key={p.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-2 border dark:border-gray-600 font-bold bg-gray-50 dark:bg-gray-700/30">{p.label}</td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.fe} onChange={(e) => handleChange(p.key as any, 'fe', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.feo} onChange={(e) => handleChange(p.key as any, 'feo', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.s} onChange={(e) => handleChange(p.key as any, 's', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.k80} onChange={(e) => handleChange(p.key as any, 'k80', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.mois} onChange={(e) => handleChange(p.key as any, 'mois', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.blaine} onChange={(e) => handleChange(p.key as any, 'blaine', e.target.value)} /></td>
                                    
                                    {/* Manual Inputs for Tonnage (Changed from ReadOnly in TabFeed) */}
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none font-bold text-blue-600" placeholder="0" value={data.lineA} onChange={(e) => handleChange(p.key as any, 'lineA', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none font-bold text-red-600" placeholder="0" value={data.lineB} onChange={(e) => handleChange(p.key as any, 'lineB', e.target.value)} /></td>
                                    
                                    <td className="p-1 border dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 font-black"><span className="block truncate">{sum.toLocaleString()}</span></td>
                                    
                                    {/* Manual Inputs for Realization (Since no auto fetch/calc) */}
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="%" value={data.currentRealization} onChange={(e) => handleChange(p.key as any, 'currentRealization', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="%" value={data.totalRealization} onChange={(e) => handleChange(p.key as any, 'totalRealization', e.target.value)} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <span className={`w-2 h-6 rounded ${colorClass.replace('text-', 'bg-')}`}></span>
                    مقایسه مصرف خوراک روزانه با برنامه
                </h4>
                <div className="h-80 w-full bg-white dark:bg-gray-900/50 rounded-xl p-2 border border-gray-100 dark:border-gray-700">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                            <XAxis dataKey="date" angle={-90} textAnchor="end" height={100} tick={{ fontSize: 10, fill: '#6b7280' }} tickMargin={30} interval={0} dy={25} />
                            <YAxis tick={{ fontSize: 10 }} width={40} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value: number) => [value.toLocaleString(), 'مصرف واقعی']} labelFormatter={(label) => `تاریخ: ${label}`} />
                            <ReferenceLine y={dailyPlanTarget} stroke="#800020" strokeDasharray="5 5" strokeWidth={2} ifOverflow="extendDomain" label={{ position: 'top', value: `برنامه روزانه: ${Math.round(dailyPlanTarget).toLocaleString()} تن`, fill: '#800020', fontSize: 12, fontWeight: 'bold' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {monthlyChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.value >= dailyPlanTarget ? '#22c55e' : '#f97316'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// --- Tab 2: Feed ---
export const TabFeed: React.FC<TabFeedProps> = ({ reportDate }) => {
    // State for the table data
    const [feedTableData, setFeedTableData] = useState({
        daily: { fe: '', feo: '', s: '', k80: '', mois: '', blaine: '', lineA: '', lineB: '', totalRealization: '', currentRealization: '' },
        monthly: { fe: '', feo: '', s: '', k80: '', mois: '', blaine: '', lineA: '', lineB: '', totalRealization: '', currentRealization: '' },
        yearly: { fe: '', feo: '', s: '', k80: '', mois: '', blaine: '', lineA: '', lineB: '', totalRealization: '', currentRealization: '' }
    });
    const [loading, setLoading] = useState(false);
    
    // New States for Chart
    const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
    const [dailyPlanTarget, setDailyPlanTarget] = useState(0);

    useEffect(() => {
        if (reportDate) {
            fetchFeedData(reportDate);
        }
    }, [reportDate]);

    const fetchFeedData = async (dateStr: string) => {
        setLoading(true);
        try {
            const parts = dateStr.split('/');
            const year = parseInt(parts[0]);
            const monthIdx = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            const monthName = SHAMSI_MONTHS[monthIdx];
            
            const monthPrefix = `${parts[0]}/${parts[1]}`; // YYYY/MM
            const yearPrefix = `${parts[0]}`; // YYYY

            // 1. Fetch ALL Plans for the Year
            const { data: allPlans } = await supabase
                .from('production_plans')
                .select('*')
                .eq('year', year);

            const currentMonthPlanObj = allPlans?.find(p => p.month === monthName);
            const monthlyPlanTotal = currentMonthPlanObj?.feed_plan || 0;
            // Use DB total days or fallback to standard calendar rules
            const daysInMonth = currentMonthPlanObj?.total_days || (monthIdx < 6 ? 31 : (monthIdx < 11 ? 30 : 29));

            // Daily Target (Plan / Days)
            const dailyPlanTargetCalc = daysInMonth > 0 ? monthlyPlanTotal / daysInMonth : 0;
            setDailyPlanTarget(dailyPlanTargetCalc); // Store for chart

            // Yearly Target Logic
            const yearlyPlanTotal = allPlans?.reduce((sum, p) => sum + (p.feed_plan || 0), 0) || 0;
            
            // Calculate Yearly Current Target (Past months full + current month partial)
            let yearlyPlanCurrent = 0;
            const monthlyPlanCurrent = dailyPlanTargetCalc * day; // Target up to today for current month

            allPlans?.forEach(p => {
                const pIdx = SHAMSI_MONTHS.indexOf(p.month);
                if (pIdx < monthIdx) {
                    yearlyPlanCurrent += (p.feed_plan || 0);
                } else if (pIdx === monthIdx) {
                    yearlyPlanCurrent += monthlyPlanCurrent;
                }
            });

            // 2. Fetch Actuals from Shift Reports
            
            // Daily Actuals
            const { data: dailyReports } = await supabase
                .from('shift_reports')
                .select('total_production_a, total_production_b')
                .eq('shift_date', dateStr);
            
            const dailyA = dailyReports?.reduce((acc, curr) => acc + (curr.total_production_a || 0), 0) || 0;
            const dailyB = dailyReports?.reduce((acc, curr) => acc + (curr.total_production_b || 0), 0) || 0;
            const dailyActual = dailyA + dailyB;

            // Monthly Actuals (Modified to fetch detailed list for chart)
            const { data: monthlyReports } = await supabase
                .from('shift_reports')
                .select('shift_date, total_production_a, total_production_b')
                .like('shift_date', `${monthPrefix}%`);
            
            const monthlyA = monthlyReports?.reduce((acc, curr) => acc + (curr.total_production_a || 0), 0) || 0;
            const monthlyB = monthlyReports?.reduce((acc, curr) => acc + (curr.total_production_b || 0), 0) || 0;
            const monthlyActual = monthlyA + monthlyB;

            // --- PROCESS MONTHLY CHART DATA ---
            const chartArr = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, '0');
                const fullDate = `${monthPrefix}/${dayStr}`;
                
                // Sum actuals for this specific day
                const dayTotal = monthlyReports?.filter(r => r.shift_date === fullDate)
                    .reduce((sum, r) => sum + (r.total_production_a || 0) + (r.total_production_b || 0), 0) || 0;

                chartArr.push({
                    date: fullDate,
                    shortDate: `${parts[1]}/${dayStr}`, // MM/DD
                    day: dayStr,
                    value: dayTotal,
                    target: dailyPlanTargetCalc
                });
            }
            setMonthlyChartData(chartArr);

            // Yearly Actuals
            const { data: yearlyReports } = await supabase
                .from('shift_reports')
                .select('total_production_a, total_production_b')
                .like('shift_date', `${yearPrefix}%`);
            
            const yearlyA = yearlyReports?.reduce((acc, curr) => acc + (curr.total_production_a || 0), 0) || 0;
            const yearlyB = yearlyReports?.reduce((acc, curr) => acc + (curr.total_production_b || 0), 0) || 0;
            const yearlyActual = yearlyA + yearlyB;

            // --- Realization Calculations ---
            
            // Daily: Total and Current are effectively same for a single day context (Actual / Daily Target)
            const dailyRealization = dailyPlanTargetCalc > 0 ? (dailyActual / dailyPlanTargetCalc) * 100 : 0;

            // Monthly
            // Total: Actual Month / Total Month Plan
            const monthlyRealizationTotal = monthlyPlanTotal > 0 ? (monthlyActual / monthlyPlanTotal) * 100 : 0;
            // Current: Actual Month / (Daily Plan * Current Day)
            const monthlyRealizationCurrent = monthlyPlanCurrent > 0 ? (monthlyActual / monthlyPlanCurrent) * 100 : 0;

            // Yearly
            // Total: Actual Year / Total Year Plan
            const yearlyRealizationTotal = yearlyPlanTotal > 0 ? (yearlyActual / yearlyPlanTotal) * 100 : 0;
            // Current: Actual Year / (Past Plans + Current Partial Plan)
            const yearlyRealizationCurrent = yearlyPlanCurrent > 0 ? (yearlyActual / yearlyPlanCurrent) * 100 : 0;

            // Update State
            setFeedTableData(prev => ({
                ...prev,
                daily: { 
                    ...prev.daily, 
                    lineA: String(dailyA), 
                    lineB: String(dailyB),
                    totalRealization: dailyRealization.toFixed(1),
                    currentRealization: dailyRealization.toFixed(1)
                },
                monthly: { 
                    ...prev.monthly, 
                    lineA: String(monthlyA), 
                    lineB: String(monthlyB),
                    totalRealization: monthlyRealizationTotal.toFixed(1),
                    currentRealization: monthlyRealizationCurrent.toFixed(1)
                },
                yearly: { 
                    ...prev.yearly, 
                    lineA: String(yearlyA), 
                    lineB: String(yearlyB),
                    totalRealization: yearlyRealizationTotal.toFixed(1),
                    currentRealization: yearlyRealizationCurrent.toFixed(1)
                }
            }));

        } catch (e) {
            console.error("Error fetching feed data:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFeedChange = (period: 'daily' | 'monthly' | 'yearly', field: string, value: string) => {
        setFeedTableData(prev => ({
            ...prev,
            [period]: { ...prev[period], [field]: value }
        }));
    };

    const calculateSum = (lineA: string, lineB: string) => {
        const a = parseFloat(lineA) || 0;
        const b = parseFloat(lineB) || 0;
        return a + b;
    };

    const periods = [
        { key: 'daily', label: 'روزانه' },
        { key: 'monthly', label: 'ماهانه' },
        { key: 'yearly', label: 'سالانه' }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                <h3 className="font-bold text-lg text-orange-600">اطلاعات خوراک مصرفی</h3>
                {loading && <div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> در حال محاسبه...</div>}
                <button 
                    onClick={() => reportDate && fetchFeedData(reportDate)} 
                    className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:rotate-180 transition duration-500" 
                    title="بروزرسانی اطلاعات"
                >
                    <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-300"/>
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-center text-sm border-collapse border border-gray-200 dark:border-gray-700 table-fixed">
                    <thead>
                        {/* Main Headers */}
                        <tr className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200">
                            <th className="p-2 border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 w-24" rowSpan={2}>دوره</th>
                            <th className="p-2 border border-orange-200 dark:border-orange-800" colSpan={3}>مقدار عناصر (%)</th>
                            <th className="p-2 border border-orange-200 dark:border-orange-800" colSpan={3}>اطلاعات کیفی</th>
                            <th className="p-2 border border-orange-200 dark:border-orange-800" colSpan={3}>تناژ مصرفی (تن)</th>
                            <th className="p-2 border border-orange-200 dark:border-orange-800" colSpan={2}>درصد تحقق (%)</th>
                        </tr>
                        {/* Sub Headers */}
                        <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                            <th className="p-2 border dark:border-gray-600 w-16">Fe</th>
                            <th className="p-2 border dark:border-gray-600 w-16">FeO</th>
                            <th className="p-2 border dark:border-gray-600 w-16">S</th>
                            
                            <th className="p-2 border dark:border-gray-600 w-16">K80</th>
                            <th className="p-2 border dark:border-gray-600 w-16">Mois</th>
                            <th className="p-2 border dark:border-gray-600 w-16">Blaine</th>
                            
                            <th className="p-2 border dark:border-gray-600 min-w-[120px]">Line A</th>
                            <th className="p-2 border dark:border-gray-600 min-w-[120px]">Line B</th>
                            <th className="p-2 border dark:border-gray-600 bg-gray-100 dark:bg-gray-600/50 min-w-[120px]">SUM</th>
                            
                            {/* Swapped Columns based on request: Current first, then Total */}
                            <th className="p-2 border dark:border-gray-600 w-20">جاری</th>
                            <th className="p-2 border dark:border-gray-600 w-20">کل</th>
                        </tr>
                    </thead>
                    <tbody>
                        {periods.map((p) => {
                            const data = feedTableData[p.key as 'daily' | 'monthly' | 'yearly'];
                            const sum = calculateSum(data.lineA, data.lineB);
                            
                            return (
                                <tr key={p.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-2 border dark:border-gray-600 font-bold bg-gray-50 dark:bg-gray-700/30">{p.label}</td>
                                    
                                    {/* Elements - Manual Input */}
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.fe} onChange={(e) => handleFeedChange(p.key as any, 'fe', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.feo} onChange={(e) => handleFeedChange(p.key as any, 'feo', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.s} onChange={(e) => handleFeedChange(p.key as any, 's', e.target.value)} /></td>
                                    
                                    {/* Quality - Manual Input */}
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.k80} onChange={(e) => handleFeedChange(p.key as any, 'k80', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.mois} onChange={(e) => handleFeedChange(p.key as any, 'mois', e.target.value)} /></td>
                                    <td className="p-1 border dark:border-gray-600"><input type="number" className="w-full p-1 text-center bg-transparent outline-none" placeholder="-" value={data.blaine} onChange={(e) => handleFeedChange(p.key as any, 'blaine', e.target.value)} /></td>
                                    
                                    {/* Tonnage - Auto Calculated (Read Only) */}
                                    <td className="p-1 border dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                                        <span className="font-bold text-blue-600 block truncate" title={Number(data.lineA).toLocaleString()}>{Number(data.lineA).toLocaleString()}</span>
                                    </td>
                                    <td className="p-1 border dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                                        <span className="font-bold text-red-600 block truncate" title={Number(data.lineB).toLocaleString()}>{Number(data.lineB).toLocaleString()}</span>
                                    </td>
                                    <td className="p-1 border dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 font-black">
                                        <span className="block truncate" title={sum.toLocaleString()}>{sum.toLocaleString()}</span>
                                    </td>
                                    
                                    {/* Current Realization - Auto Calculated (Swapped) */}
                                    <td className="p-1 border dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                                        <span className={`font-bold ${parseFloat(data.currentRealization) >= 90 ? 'text-green-600' : 'text-orange-500'}`}>
                                            {data.currentRealization}%
                                        </span>
                                    </td>

                                    {/* Realization Total - Auto Calculated (Swapped) */}
                                    <td className="p-1 border dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/50">
                                        <span className={`font-bold ${parseFloat(data.totalRealization) >= 90 ? 'text-green-600' : 'text-orange-500'}`}>
                                            {data.totalRealization}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Daily Consumption Chart */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-orange-500 rounded"></span>
                    مقایسه مصرف خوراک روزانه با برنامه
                </h4>
                <div className="h-80 w-full bg-white dark:bg-gray-900/50 rounded-xl p-2 border border-gray-100 dark:border-gray-700">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                            <XAxis 
                                dataKey="date" 
                                angle={-90} 
                                textAnchor="end" 
                                height={100} // Increased height to accommodate lower labels
                                tick={{ fontSize: 10, fill: '#6b7280' }} 
                                tickMargin={30} // Increased margin
                                interval={0}
                                dy={25} // Increased dy to move text down
                            />
                            <YAxis 
                                tick={{ fontSize: 10 }} 
                                width={40}
                                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                formatter={(value: number) => [value.toLocaleString(), 'مصرف واقعی']}
                                labelFormatter={(label) => `تاریخ: ${label}`}
                            />
                            {/* Dotted Line for Daily Plan */}
                            <ReferenceLine 
                                y={dailyPlanTarget} 
                                stroke="#800020" 
                                strokeDasharray="5 5" 
                                strokeWidth={2}
                                ifOverflow="extendDomain"
                                label={{ 
                                    position: 'top', 
                                    value: `برنامه مصرف خوراک روزانه: ${Math.round(dailyPlanTarget).toLocaleString()} تن`, 
                                    fill: '#800020', 
                                    fontSize: 12,
                                    fontWeight: 'bold' 
                                }} 
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {monthlyChartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.value >= dailyPlanTarget ? '#22c55e' : '#f97316'} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// --- Tab 3: Production ---
export const TabProduction: React.FC<TabFeedProps> = ({ reportDate }) => {
    return <CommonReportTab title="آمار تولید کنسانتره" colorClass="text-green-600" tonnageLabel="تناژ تولیدی (تن)" reportDate={reportDate} planType="prod" />;
};

// --- Tab 4: Waste ---
export const TabWaste: React.FC<TabFeedProps> = ({ reportDate }) => {
    return <CommonReportTab title="آمار باطله کارخانه" colorClass="text-red-500" tonnageLabel="تناژ باطله (تن)" reportDate={reportDate} planType="feed" />;
};

// --- Tab 5: Downtime ---
export const TabDowntime = () => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-red-600 border-b pb-2 dark:border-gray-700">گزارش توقفات اضطراری و برنامه‌ای</h3>
            <div className="p-10 text-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <p className="mb-2 font-bold">محل قرارگیری فیلدهای مربوط به توقفات خطوط</p>
                <span className="text-xs">لطفاً فیلدهای مورد نیاز این بخش را اعلام کنید.</span>
            </div>
        </div>
    );
};

// --- Tab 6: Equipment Availability ---
export const TabAvailability = () => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-purple-600 border-b pb-2 dark:border-gray-700">شاخص دسترس‌پذیری تجهیزات (PA/UA)</h3>
            <div className="p-10 text-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <p className="mb-2 font-bold">محل قرارگیری محاسبات ساعت کارکرد و در دسترس بودن تجهیزات</p>
                <span className="text-xs">لطفاً فیلدهای مورد نیاز این بخش را اعلام کنید.</span>
            </div>
        </div>
    );
};

// --- Tab 7: Logistics (Entry/Exit) ---
export const TabLogistics = () => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-teal-600 border-b pb-2 dark:border-gray-700">گزارش باسکول و تردد کامیون</h3>
            <div className="p-10 text-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <p className="mb-2 font-bold">محل قرارگیری آمار ورود مواد خام و خروج محصول</p>
                <span className="text-xs">لطفاً فیلدهای مورد نیاز این بخش را اعلام کنید.</span>
            </div>
        </div>
    );
};
