
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { supabase } from '../supabaseClient';
import { parseShamsiDate } from '../utils';
import { Calendar, User as UserIcon, Factory, Activity, Trash2, StopCircle, CheckCircle, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

export const TabBudget: React.FC<TabBudgetProps> = ({ reportDate, onDateChange, budgetData, onBudgetChange, user }) => {
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [yearPlans, setYearPlans] = useState<any[]>([]);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(-1);

    useEffect(() => {
        if (reportDate) {
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
                fetchPlanData(year);
            }
        }
    }, [reportDate]);

    useEffect(() => {
        if (yearPlans.length > 0 && currentMonthIndex !== -1) {
            const currentMonthName = SHAMSI_MONTHS[currentMonthIndex];
            const currentRow = yearPlans.find(r => r.month === currentMonthName);
            
            if (currentRow) {
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
        if (value !== '' && numVal < 0) return; 
        onBudgetChange({ ...budgetData, [field]: value });
    };

    const calculateFinal = (usageStr: string, devPercentStr: string) => {
        if (!usageStr || !devPercentStr) return 0;
        const usage = parseFloat(usageStr);
        const percent = parseFloat(devPercentStr);
        return usage * (percent / 100);
    };

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

    const chartData = yearPlans.map(row => {
        const isCurrentMonth = SHAMSI_MONTHS.indexOf(row.month) === currentMonthIndex;
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
                    <ShamsiDatePicker label="تاریخ گزارش" value={reportDate} onChange={onDateChange} />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 text-blue-600 border-b pb-2 dark:border-gray-700">جدول برنامه و بودجه سالانه</h3>
                <div className="overflow-auto max-h-[65vh] pb-4">
                    <table className="w-full text-center text-sm border-collapse min-w-[1600px]">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-b-2 border-gray-200 dark:border-gray-600 sticky top-0 z-40">
                            <tr>
                                <th className="p-3 whitespace-nowrap min-w-[140px] sticky right-0 top-0 bg-gray-50 dark:bg-gray-700 z-50 border-l shadow-sm">سال / ماه</th>
                                <th className="p-3 whitespace-nowrap sticky top-0 bg-gray-50 dark:bg-gray-700 z-40">روز کل</th>
                                <th className="p-3 whitespace-nowrap sticky top-0 bg-gray-50 dark:bg-gray-700 z-40">روز فعال</th>
                                <th className="p-3 whitespace-nowrap text-red-500 border-l border-gray-200 sticky top-0 bg-gray-50 dark:bg-gray-700 z-40">روز توقف</th>
                                <th className="p-3 whitespace-nowrap bg-blue-100 dark:bg-blue-900/40 text-blue-900 border-r border-blue-200 sticky top-0 z-40">برنامه خوراک</th>
                                <th className="p-3 whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 text-blue-800 border-r border-blue-200 sticky top-0 z-40">خوراک مصرفی</th>
                                <th className="p-3 whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 text-blue-800 border-r border-blue-200 sticky top-0 z-40">درصد مطابقت</th>
                                <th className="p-3 whitespace-nowrap bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-r border-blue-200 sticky top-0 z-40">خوراک نهایی</th>
                                <th className="p-3 whitespace-nowrap border-l border-gray-200 sticky top-0 bg-gray-50 dark:bg-gray-700 z-40">انحراف مقدار</th>
                                <th className="p-3 whitespace-nowrap bg-green-100 dark:bg-green-900/40 text-green-900 border-r border-green-200 sticky top-0 z-40">برنامه تولید</th>
                                <th className="p-3 whitespace-nowrap bg-green-50 dark:bg-green-900/20 text-green-800 border-r border-green-200 sticky top-0 z-40">محصول تولیدی</th>
                                <th className="p-3 whitespace-nowrap bg-green-50 dark:bg-green-900/20 text-green-800 border-r border-green-200 sticky top-0 z-40">درصد مطابقت</th>
                                <th className="p-3 whitespace-nowrap bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-r border-green-200 sticky top-0 z-40">تولید نهایی</th>
                                <th className="p-3 whitespace-nowrap border-l border-gray-200 sticky top-0 bg-gray-50 dark:bg-gray-700 z-40">انحراف مقدار</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingPlan ? (
                                <tr><td colSpan={14} className="p-8 text-gray-400">در حال دریافت اطلاعات برنامه...</td></tr>
                            ) : yearPlans.length > 0 ? (
                                yearPlans.map((row) => {
                                    const isCurrentMonth = SHAMSI_MONTHS.indexOf(row.month) === currentMonthIndex;
                                    const rowClass = isCurrentMonth ? "bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-400 transform scale-[1.01] shadow-md z-10 relative" : "group hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-500 opacity-80 hover:opacity-100";
                                    const feedPlan = Math.round(Number(row.feed_plan || 0));
                                    const prodPlan = Math.round(Number(row.prod_plan || 0));
                                    const finalFeed = isCurrentMonth ? calculateFinal(budgetData.feedUsage, budgetData.feedDevPercent) : calculateFinal(String(row.feed_usage || 0), String(row.feed_dev_percent || 100));
                                    const finalProd = isCurrentMonth ? calculateFinal(budgetData.prodUsage, budgetData.prodDevPercent) : calculateFinal(String(row.prod_usage || 0), String(row.prod_dev_percent || 100));
                                    const stickyCellClass = isCurrentMonth ? "p-3 border-b dark:border-gray-700 font-bold sticky right-0 border-l z-20 bg-yellow-50 dark:bg-gray-800" : "p-3 border-b dark:border-gray-700 font-bold sticky right-0 border-l z-20 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700";

                                    return (
                                        <tr key={row.id} className={`transition duration-200 ${rowClass}`}>
                                            <td className={stickyCellClass}>
                                                <div className="flex justify-between items-center w-full px-2 gap-4">
                                                    <span className="text-right flex-1">{row.month}</span>
                                                    <span className="text-gray-400 font-mono text-xs w-10 text-left border-l pl-2 border-gray-300 dark:border-gray-600">{row.year}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 border-b dark:border-gray-700">{row.total_days}</td>
                                            <td className="p-3 border-b dark:border-gray-700 font-medium text-green-600">{row.active_days}</td>
                                            <td className="p-3 border-b border-l dark:border-gray-700 font-medium text-red-500 bg-red-50/30 dark:bg-red-900/10">{row.downtime_days || 0}</td>
                                            
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-blue-100/50 dark:bg-blue-900/30 font-bold text-blue-800">{feedPlan.toLocaleString()}</td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10">
                                                {isCurrentMonth ? (
                                                    <input type="number" className="w-24 p-1.5 text-center border border-blue-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" value={budgetData.feedUsage} onChange={(e) => handleInputChange('feedUsage', e.target.value)} />
                                                ) : <span>{Number(row.feed_usage || 0).toLocaleString()}</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10">
                                                {isCurrentMonth ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input type="number" className="w-16 p-1.5 text-center border border-blue-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="100" value={budgetData.feedDevPercent} onChange={(e) => handleInputChange('feedDevPercent', e.target.value)} />
                                                        <span className="text-xs text-gray-500">%</span>
                                                    </div>
                                                ) : <span>{row.feed_dev_percent || 100}%</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-gray-100 dark:bg-gray-600 font-bold">{Math.round(finalFeed).toLocaleString()}</td>
                                            <td className="p-3 border-b border-l dark:border-gray-700">{renderDeviation(feedPlan, finalFeed)}</td>

                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-green-100/50 dark:bg-green-900/30 font-bold text-green-800">{prodPlan.toLocaleString()}</td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-green-50/30 dark:bg-green-900/10">
                                                {isCurrentMonth ? (
                                                    <input type="number" className="w-24 p-1.5 text-center border border-green-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" value={budgetData.prodUsage} onChange={(e) => handleInputChange('prodUsage', e.target.value)} />
                                                ) : <span>{Number(row.prod_usage || 0).toLocaleString()}</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-green-50/30 dark:bg-green-900/10">
                                                {isCurrentMonth ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input type="number" className="w-16 p-1.5 text-center border border-green-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none" placeholder="100" value={budgetData.prodDevPercent} onChange={(e) => handleInputChange('prodDevPercent', e.target.value)} />
                                                        <span className="text-xs text-gray-500">%</span>
                                                    </div>
                                                ) : <span>{row.prod_dev_percent || 100}%</span>}
                                            </td>
                                            <td className="p-3 border-b border-r dark:border-gray-700 bg-gray-100 dark:bg-gray-600 font-bold">{Math.round(finalProd).toLocaleString()}</td>
                                            <td className="p-3 border-b border-l dark:border-gray-700">{renderDeviation(prodPlan, finalProd)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={14} className="p-8 text-gray-400 bg-gray-50 dark:bg-gray-900/50">برای سال جاری برنامه تولیدی تعریف نشده است.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn delay-100">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-center mb-4 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span> مقایسه برنامه و عملکرد خوراک
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} angle={-45} textAnchor="end" height={70} tickMargin={10} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} width={40} tickMargin={5} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value: number) => value.toLocaleString()} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="برنامه خوراک" fill="#fb923c" radius={[4, 4, 0, 0]} name="برنامه" />
                                <Bar dataKey="خوراک نهایی" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="عملکرد" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-center mb-4 text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-green-600 rounded-full inline-block"></span> مقایسه برنامه و عملکرد تولید
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} angle={-45} textAnchor="end" height={70} tickMargin={10} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} width={40} tickMargin={5} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value: number) => value.toLocaleString()} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="برنامه تولید" fill="#c084fc" radius={[4, 4, 0, 0]} name="برنامه" />
                                <Bar dataKey="تولید نهایی" fill="#15803d" radius={[4, 4, 0, 0]} name="عملکرد" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TabFeed: React.FC<{ reportDate: string }> = ({ reportDate }) => {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Factory className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">اطلاعات خوراک</h3>
            <p className="text-sm">این بخش در حال توسعه است. (اطلاعات روزانه خوراک اینجا نمایش داده می‌شود)</p>
        </div>
    );
};

export const TabProduction: React.FC<any> = () => {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Activity className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">اطلاعات تولید</h3>
            <p className="text-sm">این بخش در حال توسعه است. (آمار تولید کنسانتره)</p>
        </div>
    );
};

export const TabWaste: React.FC<any> = () => {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Trash2 className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">اطلاعات باطله</h3>
            <p className="text-sm">این بخش در حال توسعه است. (آمار باطله کارخانه)</p>
        </div>
    );
};

export const TabDowntime: React.FC<any> = () => {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <StopCircle className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">توقفات</h3>
            <p className="text-sm">این بخش در حال توسعه است. (گزارش توقفات خطوط)</p>
        </div>
    );
};

export const TabAvailability: React.FC<any> = () => {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">دسترس‌پذیری</h3>
            <p className="text-sm">این بخش در حال توسعه است. (شاخص‌های PA/UA)</p>
        </div>
    );
};

export const TabLogistics: React.FC<any> = () => {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Truck className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">لجستیک</h3>
            <p className="text-sm">این بخش در حال توسعه است. (آمار ورود و خروج)</p>
        </div>
    );
};
