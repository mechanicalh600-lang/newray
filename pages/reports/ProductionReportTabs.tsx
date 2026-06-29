
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { ShamsiDatePicker } from '../../components/ShamsiDatePicker';
import { supabase } from '../../supabaseClient';
import { parseShamsiDate, getShiftRotation } from '../../utils';
import { Calendar, User as UserIcon, Factory, Activity, Trash2, StopCircle, CheckCircle, Truck, Sun, Moon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Cell } from 'recharts';
import {
  SHAMSI_MONTHS,
  fetchMonthlyUsageForYear,
  buildProductionReportSnapshot,
  parseTimeToMinutes,
  minutesToTime,
  type MonthlyUsageTotals,
  type ShamsiMonthName,
  type DailyProductionSnapshot,
} from '../../services/productionReportAggregation';

const SHAMSI_MONTHS_LIST = [...SHAMSI_MONTHS];

function useProductionDaySnapshot(reportDate: string) {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DailyProductionSnapshot | null>(null);

  useEffect(() => {
    if (!reportDate) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    buildProductionReportSnapshot(reportDate)
      .then(setSnapshot)
      .catch(() => setSnapshot(null))
      .finally(() => setLoading(false));
  }, [reportDate]);

  return { loading, snapshot };
}

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
    const [monthlyUsage, setMonthlyUsage] = useState<Record<ShamsiMonthName, MonthlyUsageTotals>>(
        () => Object.fromEntries(SHAMSI_MONTHS_LIST.map((m) => [m, { feed: 0, product: 0 }])) as Record<ShamsiMonthName, MonthlyUsageTotals>
    );

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
                fetchMonthlyUsageForYear(year).then(setMonthlyUsage).catch(() => {
                    setMonthlyUsage(Object.fromEntries(SHAMSI_MONTHS_LIST.map((m) => [m, { feed: 0, product: 0 }])) as Record<ShamsiMonthName, MonthlyUsageTotals>);
                });
            }
        }
    }, [reportDate]);

    useEffect(() => {
        if (currentMonthIndex < 0) return;
        const currentMonthName = SHAMSI_MONTHS_LIST[currentMonthIndex];
        const usage = monthlyUsage[currentMonthName];
        if (!usage) return;
        onBudgetChange({
            feedUsage: usage.feed ? String(Math.round(usage.feed)) : '',
            feedDevPercent: budgetData.feedDevPercent || '100',
            prodUsage: usage.product ? String(Math.round(usage.product)) : '',
            prodDevPercent: budgetData.prodDevPercent || '100',
        });
    }, [monthlyUsage, currentMonthIndex]);

    const fetchPlanData = async (year: number) => {
        setLoadingPlan(true);
        try {
            const { data, error } = await supabase
                .from('production_plans')
                .select('*')
                .eq('year', year);

            if (!error && data) {
                const sorted = data.sort((a, b) => {
                    return SHAMSI_MONTHS_LIST.indexOf(a.month) - SHAMSI_MONTHS_LIST.indexOf(b.month);
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

    const getMonthFeedUsage = (month: string, isCurrentMonth: boolean, fallback = 0) => {
        const computed = monthlyUsage[month as ShamsiMonthName]?.feed ?? 0;
        if (isCurrentMonth) return Number(budgetData.feedUsage || computed || fallback || 0);
        return Math.round(computed || fallback || 0);
    };

    const getMonthProdUsage = (month: string, isCurrentMonth: boolean, fallback = 0) => {
        const computed = monthlyUsage[month as ShamsiMonthName]?.product ?? 0;
        if (isCurrentMonth) return Number(budgetData.prodUsage || computed || fallback || 0);
        return Math.round(computed || fallback || 0);
    };

    const renderDeviation = (plan: number, final: number) => {
        const diff = final - plan;
        if (diff === 0) return <span className="text-gray-500">0</span>;
        const isPositive = diff > 0;
        const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        const sign = isPositive ? '+' : '';
        return (
            <span className={`${colorClass} font-medium text-sm`} dir="ltr">
                {sign}{Math.round(diff).toLocaleString()}
            </span>
        );
    };

    const chartData = yearPlans.map(row => {
        const isCurrentMonth = SHAMSI_MONTHS_LIST.indexOf(row.month) === currentMonthIndex;
        const feedUsageVal = isCurrentMonth ? parseFloat(budgetData.feedUsage || '0') : Number(row.feed_usage || 0);
        const feedDevVal = isCurrentMonth ? parseFloat(budgetData.feedDevPercent || '100') : Number(row.feed_dev_percent || 100);
        const finalFeed = feedUsageVal * (feedDevVal / 100);
        const prodUsageVal = isCurrentMonth ? parseFloat(budgetData.prodUsage || '0') : Number(row.prod_usage || 0);
        const prodDevVal = isCurrentMonth ? parseFloat(budgetData.prodDevPercent || '100') : Number(row.prod_dev_percent || 100);
        const finalProd = prodUsageVal * (prodDevVal / 100);

        return {
            name: row.month,
            "برنامه خوراک": Number(row.feed_plan || 0),
            "خوراک دپومتری": finalFeed,
            "برنامه تولید": Number(row.prod_plan || 0),
            "محصول دپومتری": finalProd
        };
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 min-w-0 min-h-[5rem]">
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2.5 rounded-full shrink-0">
                        <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                        <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">روز هفته</label>
                        <span className="block p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm font-medium text-gray-800 dark:text-white">{dayOfWeek || '—'}</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-w-0 min-h-[5rem] flex flex-col justify-center">
                    <ShamsiDatePicker label="تاریخ گزارش" value={reportDate} onChange={onDateChange} />
                </div>
                {/* شیفت جاری — وابسته به تاریخ گزارش و تقویم کاری */}
                {reportDate ? (() => {
                    const rotation = getShiftRotation(reportDate);
                    const dayShifts = Object.entries(rotation).filter(([, v]) => v.type === 'DAY_1' || v.type === 'DAY_2');
                    const nightShifts = Object.entries(rotation).filter(([, v]) => v.type === 'NIGHT_1' || v.type === 'NIGHT_2');
                    return (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-w-0 min-h-[5rem]">
                            <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">شیفت جاری</label>
                            <div className="flex-1 flex flex-row items-stretch gap-0 min-h-[2.25rem] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                                <div className="flex-1 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5">
                                    <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-xs font-bold text-amber-900 dark:text-amber-100 truncate">
                                        {dayShifts.length ? dayShifts.map(([code, { label }]) => `شیفت ${code} (${label})`).join(' · ') : '—'}
                                    </span>
                                </div>
                                <div className="w-px bg-gray-300 dark:bg-gray-500 shrink-0" />
                                <div className="flex-1 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1.5">
                                    <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {nightShifts.length ? nightShifts.map(([code, { label }]) => `شیفت ${code} (${label})`).join(' · ') : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })() : (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-w-0 min-h-[5rem]">
                        <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">شیفت جاری</label>
                        <div className="flex-1 flex items-center text-sm text-gray-400 min-h-[2.25rem] p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600">تاریخ را انتخاب کنید</div>
                    </div>
                )}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 min-w-0 min-h-[5rem]">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-full shrink-0">
                            <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-200">ثبت‌کننده گزارش</label>
                            <span className="block p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600 text-sm font-bold text-gray-800 dark:text-white truncate">{user?.fullName || 'ناشناس'}</span>
                        </div>
                    </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 text-gray-700 dark:text-gray-200 pb-2 border-b border-gray-200 dark:border-gray-600">جدول برنامه و بودجه سالانه</h3>
                <div className="overflow-auto max-h-[65vh] pb-4 overflow-x-hidden">
                    <table className="w-full text-center text-sm border-collapse border border-gray-200 dark:border-gray-600">
                        <thead className="bg-orange-100 dark:bg-orange-900/40 text-gray-800 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-500 sticky top-0 z-20">
                            <tr>
                                <th className="p-2 bg-orange-100 dark:bg-orange-900/40 border-r border-gray-300 dark:border-gray-500 font-medium">ماه / سال</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">روز کل</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">روز فعال</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">روز توقف</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">برنامه خوراک</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">خوراک مصرفی</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">درصد مطابقت</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">خوراک دپومتری</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">انحراف</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">برنامه تولید</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">محصول تولیدی</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">درصد مطابقت</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">محصول دپومتری</th>
                                <th className="p-2 whitespace-nowrap sticky top-0 bg-orange-100 dark:bg-orange-900/40 z-20 border-r border-gray-300 dark:border-gray-500">انحراف</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingPlan ? (
                                <tr><td colSpan={14} className="p-8 text-gray-400">در حال دریافت اطلاعات برنامه...</td></tr>
                            ) : yearPlans.length > 0 ? (
                                <>
                                {yearPlans.map((row, rowIndex) => {
                                    const isCurrentMonth = SHAMSI_MONTHS_LIST.indexOf(row.month) === currentMonthIndex;
                                    const isLastDataRow = rowIndex === yearPlans.length - 1;
                                    const isEven = rowIndex % 2 === 0;
                                    const baseZebra = isCurrentMonth ? "bg-gray-50 dark:bg-gray-700/30" : isEven ? "bg-white dark:bg-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-700/20" : "bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200/70 dark:hover:bg-gray-700/60";
                                    const zebraClass = isLastDataRow ? (isEven ? "!bg-white dark:!bg-gray-800" : "!bg-gray-100 dark:!bg-gray-700/50") + " " + baseZebra : baseZebra;
                                    const feedPlan = Math.round(Number(row.feed_plan || 0));
                                    const prodPlan = Math.round(Number(row.prod_plan || 0));
                                    const feedUsageVal = getMonthFeedUsage(row.month, isCurrentMonth, Number(row.feed_usage || 0));
                                    const prodUsageVal = getMonthProdUsage(row.month, isCurrentMonth, Number(row.prod_usage || 0));
                                    const finalFeed = isCurrentMonth ? calculateFinal(budgetData.feedUsage, budgetData.feedDevPercent) : calculateFinal(String(feedUsageVal), String(row.feed_dev_percent || 100));
                                    const finalProd = isCurrentMonth ? calculateFinal(budgetData.prodUsage, budgetData.prodDevPercent) : calculateFinal(String(prodUsageVal), String(row.prod_dev_percent || 100));
                                    const stickyBg = isLastDataRow ? (isEven ? "!bg-white dark:!bg-gray-800" : "!bg-gray-100 dark:!bg-gray-700/50") : (isCurrentMonth ? "bg-gray-50 dark:bg-gray-800" : isEven ? "bg-white dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-700/50");
                                    const firstCellClass = `p-2 border-b border-r border-gray-200 dark:border-gray-600 font-medium ${stickyBg}`;

                                    return (
                                        <tr key={row.id} className={`transition-colors ${zebraClass}`}>
                                            <td className={firstCellClass}>
                                                <div className="flex flex-row items-center justify-between gap-2 min-w-0 w-full">
                                                    <span className="text-sm truncate text-right flex-1 min-w-0" title={row.month}>{row.month}</span>
                                                    <span className="text-gray-400 dark:text-gray-500 font-mono text-sm font-medium shrink-0 text-left">{row.year}</span>
                                                </div>
                                            </td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">{row.total_days}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">{row.active_days}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">{row.downtime_days || 0}</td>

                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">{feedPlan.toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600">
                                                <span className="text-gray-700 dark:text-gray-300">{feedUsageVal.toLocaleString()}</span>
                                            </td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600">
                                                <span className="text-gray-700 dark:text-gray-300">{isCurrentMonth ? (budgetData.feedDevPercent || 100) + '%' : (row.feed_dev_percent || 100) + '%'}</span>
                                            </td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{Math.round(finalFeed).toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600">{renderDeviation(feedPlan, finalFeed)}</td>

                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">{prodPlan.toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600">
                                                <span className="text-gray-700 dark:text-gray-300">{prodUsageVal.toLocaleString()}</span>
                                            </td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600">
                                                <span className="text-gray-700 dark:text-gray-300">{isCurrentMonth ? (budgetData.prodDevPercent || 100) + '%' : (row.prod_dev_percent || 100) + '%'}</span>
                                            </td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{Math.round(finalProd).toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600">{renderDeviation(prodPlan, finalProd)}</td>
                                        </tr>
                                    );
                                })}
                                {(() => {
                                    const totalDays = yearPlans.reduce((s, r) => s + Number(r.total_days || 0), 0);
                                    const activeDays = yearPlans.reduce((s, r) => s + Number(r.active_days || 0), 0);
                                    const downtimeDays = yearPlans.reduce((s, r) => s + Number(r.downtime_days || 0), 0);
                                    const totalFeedPlan = yearPlans.reduce((s, r) => s + Math.round(Number(r.feed_plan || 0)), 0);
                                    const totalProdPlan = yearPlans.reduce((s, r) => s + Math.round(Number(r.prod_plan || 0)), 0);
                                    let totalFinalFeed = 0, totalFinalProd = 0, totalFeedUsage = 0, totalProdUsage = 0, sumFeedPct = 0, sumProdPct = 0;
                                    yearPlans.forEach((row) => {
                                        const isCur = SHAMSI_MONTHS_LIST.indexOf(row.month) === currentMonthIndex;
                                        totalFinalFeed += isCur ? calculateFinal(budgetData.feedUsage, budgetData.feedDevPercent) : calculateFinal(String(row.feed_usage || 0), String(row.feed_dev_percent || 100));
                                        totalFinalProd += isCur ? calculateFinal(budgetData.prodUsage, budgetData.prodDevPercent) : calculateFinal(String(row.prod_usage || 0), String(row.prod_dev_percent || 100));
                                        totalFeedUsage += isCur ? Number(budgetData.feedUsage || 0) : Number(row.feed_usage || 0);
                                        totalProdUsage += isCur ? Number(budgetData.prodUsage || 0) : Number(row.prod_usage || 0);
                                        sumFeedPct += isCur ? Number(budgetData.feedDevPercent || 100) : Number(row.feed_dev_percent || 100);
                                        sumProdPct += isCur ? Number(budgetData.prodDevPercent || 100) : Number(row.prod_dev_percent || 100);
                                    });
                                    const avgFeedPct = yearPlans.length ? Math.round(sumFeedPct / yearPlans.length) : 0;
                                    const avgProdPct = yearPlans.length ? Math.round(sumProdPct / yearPlans.length) : 0;
                                    return (
                                        <tr className="bg-cyan-100 dark:bg-cyan-900/40 border-t-2 border-gray-300 dark:border-gray-500">
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold bg-cyan-100 dark:bg-cyan-900/40">مجموع</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{totalDays}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{activeDays}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{downtimeDays}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{totalFeedPlan.toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{totalFeedUsage.toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{avgFeedPct}%</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{Math.round(totalFinalFeed).toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold bg-cyan-100 dark:bg-cyan-900/40">{renderDeviation(totalFeedPlan, totalFinalFeed)}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{totalProdPlan.toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{totalProdUsage.toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{avgProdPct}%</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 bg-cyan-100 dark:bg-cyan-900/40">{Math.round(totalFinalProd).toLocaleString()}</td>
                                            <td className="p-2 border-b border-r border-gray-200 dark:border-gray-600 font-bold bg-cyan-100 dark:bg-cyan-900/40">{renderDeviation(totalProdPlan, totalFinalProd)}</td>
                                        </tr>
                                    );
                                })()}
                                </>
                            ) : (
                                <tr><td colSpan={14} className="p-8 text-gray-400 bg-gray-50/50 dark:bg-gray-800/30">برای سال جاری برنامه تولیدی تعریف نشده است.</td></tr>
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
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280', dx: -25, dy: 5 }} interval={0} angle={-45} textAnchor="end" height={70} tickMargin={15} />
                                <YAxis tick={{ fontSize: 10, dx: -20 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} width={40} tickMargin={5} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value: number) => value.toLocaleString()} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="برنامه خوراک" fill="#fb923c" radius={[4, 4, 0, 0]} name="برنامه" />
                                <Bar dataKey="خوراک دپومتری" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="عملکرد" />
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
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280', dx: -25, dy: 5 }} interval={0} angle={-45} textAnchor="end" height={70} tickMargin={15} />
                                <YAxis tick={{ fontSize: 10, dx: -20 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} width={40} tickMargin={5} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value: number) => value.toLocaleString()} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="برنامه تولید" fill="#c084fc" radius={[4, 4, 0, 0]} name="برنامه" />
                                <Bar dataKey="محصول دپومتری" fill="#15803d" radius={[4, 4, 0, 0]} name="عملکرد" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const normalizeDateKey = (d: string) => {
    const p = d.split('/').map(x => parseInt(x, 10) || 0);
    if (p.length < 3) return d;
    return `${p[0]}/${String(p[1]).padStart(2, '0')}/${String(p[2]).padStart(2, '0')}`;
};

/** مقادیر خوراک خط A، خط B و مجموع بر اساس گزارش اتاق کنترل */
function useFeedFromControlRoom(reportDate: string) {
    const [loading, setLoading] = useState(false);
    const [daily, setDaily] = useState({ lineA: 0, lineB: 0 });
    const [monthly, setMonthly] = useState({ lineA: 0, lineB: 0 });
    const [yearly, setYearly] = useState({ lineA: 0, lineB: 0 });
    const [monthlyToDate, setMonthlyToDate] = useState(0);
    const [yearlyToDate, setYearlyToDate] = useState(0);
    const [monthDaily, setMonthDaily] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!reportDate || reportDate.length < 8) {
            setDaily({ lineA: 0, lineB: 0 });
            setMonthly({ lineA: 0, lineB: 0 });
            setYearly({ lineA: 0, lineB: 0 });
            setMonthlyToDate(0);
            setYearlyToDate(0);
            setMonthDaily({});
            return;
        }
        const parts = reportDate.split('/');
        const y = parts[0];
        const m = parts[1];
        const prefixDay = reportDate;
        const prefixMonth = `${y}/${m}`;
        const prefixYear = `${y}`;

        setLoading(true);
        supabase
            .from('control_room_reports')
            .select('report_date, full_data')
            .like('report_date', `${y}/%`)
            .not('full_data', 'is', null)
            .then(({ data: rows, error }) => {
                if (error) {
                    setDaily({ lineA: 0, lineB: 0 });
                    setMonthly({ lineA: 0, lineB: 0 });
                    setYearly({ lineA: 0, lineB: 0 });
                    setMonthlyToDate(0);
                    setYearlyToDate(0);
                    setMonthDaily({});
                    return;
                }
                const list = rows || [];
                const dayTotals: Record<string, number> = {};

                const toNum = (v: any) => Math.max(0, Number(v) || 0);
                const getLine = (fd: any) => ({
                    a: toNum(fd?.total_production_a ?? fd?.feed_line_a ?? fd?.line_a),
                    b: toNum(fd?.total_production_b ?? fd?.feed_line_b ?? fd?.line_b),
                });

                let dayA = 0, dayB = 0, monthA = 0, monthB = 0, yearA = 0, yearB = 0, monthToDate = 0, yearToDate = 0;
                list.forEach((r: any) => {
                    const d = r.report_date || '';
                    const fd = typeof r.full_data === 'object' ? r.full_data : {};
                    const { a, b } = getLine(fd);
                    const tot = a + b;
                    if (d === prefixDay) {
                        dayA += a;
                        dayB += b;
                    }
                    if (d.startsWith(prefixMonth)) {
                        monthA += a;
                        monthB += b;
                        if (d <= reportDate) monthToDate += tot;
                        const key = normalizeDateKey(d);
                        dayTotals[key] = (dayTotals[key] || 0) + tot;
                    }
                    if (d.startsWith(prefixYear)) {
                        yearA += a;
                        yearB += b;
                        if (d <= reportDate) yearToDate += tot;
                    }
                });

                setDaily({ lineA: dayA, lineB: dayB });
                setMonthly({ lineA: monthA, lineB: monthB });
                setYearly({ lineA: yearA, lineB: yearB });
                setMonthlyToDate(monthToDate);
                setYearlyToDate(yearToDate);
                setMonthDaily(dayTotals);
            })
            .then(() => setLoading(false), () => setLoading(false));
    }, [reportDate]);

    return { loading, daily, monthly, yearly, monthlyToDate, yearlyToDate, monthDaily };
}

/** مقادیر باطله خط A، خط B و مجموع = خوراک − محصول از گزارش اتاق کنترل */
function useWasteFromControlRoom(reportDate: string) {
    const [loading, setLoading] = useState(false);
    const [daily, setDaily] = useState({ lineA: 0, lineB: 0 });
    const [monthly, setMonthly] = useState({ lineA: 0, lineB: 0 });
    const [yearly, setYearly] = useState({ lineA: 0, lineB: 0 });
    const [monthlyToDate, setMonthlyToDate] = useState(0);
    const [yearlyToDate, setYearlyToDate] = useState(0);
    const [monthDaily, setMonthDaily] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!reportDate || reportDate.length < 8) {
            setDaily({ lineA: 0, lineB: 0 });
            setMonthly({ lineA: 0, lineB: 0 });
            setYearly({ lineA: 0, lineB: 0 });
            setMonthlyToDate(0);
            setYearlyToDate(0);
            setMonthDaily({});
            return;
        }
        const parts = reportDate.split('/');
        const y = parts[0];
        const m = parts[1];
        const prefixDay = reportDate;
        const prefixMonth = `${y}/${m}`;
        const prefixYear = `${y}`;

        setLoading(true);
        supabase
            .from('control_room_reports')
            .select('report_date, full_data')
            .like('report_date', `${y}/%`)
            .not('full_data', 'is', null)
            .then(({ data: rows, error }) => {
                if (error) {
                    setDaily({ lineA: 0, lineB: 0 });
                    setMonthly({ lineA: 0, lineB: 0 });
                    setYearly({ lineA: 0, lineB: 0 });
                    setMonthlyToDate(0);
                    setYearlyToDate(0);
                    setMonthDaily({});
                    return;
                }
                const list = rows || [];
                const dayTotals: Record<string, number> = {};
                const toNum = (v: any) => Math.max(0, Number(v) || 0);
                let dayA = 0, dayB = 0, monthA = 0, monthB = 0, yearA = 0, yearB = 0, monthToDate = 0, yearToDate = 0;
                list.forEach((r: any) => {
                    const d = r.report_date || '';
                    const fd = typeof r.full_data === 'object' ? r.full_data : {};
                    const feedA = toNum(fd?.feed_line_a ?? fd?.total_production_a ?? fd?.line_a);
                    const feedB = toNum(fd?.feed_line_b ?? fd?.total_production_b ?? fd?.line_b);
                    const prodA = toNum(fd?.product_line_a ?? fd?.concentrate_line_a ?? fd?.total_production_a);
                    const prodB = toNum(fd?.product_line_b ?? fd?.concentrate_line_b ?? fd?.total_production_b);
                    const wasteA = Math.max(0, feedA - prodA);
                    const wasteB = Math.max(0, feedB - prodB);
                    const tot = wasteA + wasteB;
                    if (d === prefixDay) {
                        dayA += wasteA;
                        dayB += wasteB;
                    }
                    if (d.startsWith(prefixMonth)) {
                        monthA += wasteA;
                        monthB += wasteB;
                        if (d <= reportDate) monthToDate += tot;
                        const key = normalizeDateKey(d);
                        dayTotals[key] = (dayTotals[key] || 0) + tot;
                    }
                    if (d.startsWith(prefixYear)) {
                        yearA += wasteA;
                        yearB += wasteB;
                        if (d <= reportDate) yearToDate += tot;
                    }
                });
                setDaily({ lineA: dayA, lineB: dayB });
                setMonthly({ lineA: monthA, lineB: monthB });
                setYearly({ lineA: yearA, lineB: yearB });
                setMonthlyToDate(monthToDate);
                setYearlyToDate(yearToDate);
                setMonthDaily(dayTotals);
            })
            .then(() => setLoading(false), () => setLoading(false));
    }, [reportDate]);

    return { loading, daily, monthly, yearly, monthlyToDate, yearlyToDate, monthDaily };
}
function useFeedPlan(reportDate: string) {
    const [plans, setPlans] = useState<{ month: string; feed_plan: number }[]>([]);

    useEffect(() => {
        if (!reportDate || reportDate.length < 8) {
            setPlans([]);
            return;
        }
        const y = reportDate.split('/')[0];
        supabase
            .from('production_plans')
            .select('month, feed_plan')
            .eq('year', parseInt(y, 10))
            .then(({ data }) => {
                const list = (data || []).map((r: any) => ({
                    month: r.month,
                    feed_plan: Math.max(0, Number(r.feed_plan) || 0),
                }));
                setPlans(list);
            });
    }, [reportDate]);

    const getDaysInMonth = (year: number, month: number) => {
        if (month <= 0) return 0;
        if (month <= 6) return 31;
        if (month <= 11) return 30;
        const isLeap = (year % 33 === 1 || year % 33 === 5 || year % 33 === 9 || year % 33 === 13 || year % 33 === 17 || year % 33 === 22 || year % 33 === 26 || year % 33 === 30);
        return isLeap ? 30 : 29;
    };

    const monthIndex = reportDate.length >= 8 ? parseInt(reportDate.split('/')[1], 10) : 0;
    const yearNum = reportDate.length >= 8 ? parseInt(reportDate.split('/')[0], 10) : 0;
    const dayOfMonth = reportDate.length >= 10 ? parseInt(reportDate.split('/')[2], 10) : 0;
    const currentMonthName = monthIndex >= 1 && monthIndex <= 12 ? SHAMSI_MONTHS_LIST[monthIndex - 1] : '';
    const monthPlan = plans.find(p => p.month === currentMonthName)?.feed_plan ?? 0;
    const yearPlan = plans.reduce((s, p) => s + p.feed_plan, 0);
    const daysInMonth = getDaysInMonth(yearNum, monthIndex) || 30;
    const daysElapsedInMonth = Math.min(dayOfMonth || 0, daysInMonth);
    let daysElapsedInYear = 0;
    for (let mo = 1; mo < monthIndex; mo++) daysElapsedInYear += getDaysInMonth(yearNum, mo);
    daysElapsedInYear += daysElapsedInMonth;
    let totalDaysInYear = 0;
    for (let mo = 1; mo <= 12; mo++) totalDaysInYear += getDaysInMonth(yearNum, mo);
    const dailyPlanTotal = daysInMonth > 0 ? monthPlan / daysInMonth : 0;
    const dailyPlanPerLine = dailyPlanTotal / 2;
    const monthlyPlanPerLine = monthPlan / 2;

    return {
        dailyPlanPerLine,
        dailyPlanTotal,
        monthlyPlanPerLine,
        monthPlan,
        yearPlanPerLine: yearPlan / 2,
        yearPlanTotal: yearPlan,
        daysInMonth,
        daysElapsedInMonth,
        daysElapsedInYear,
        totalDaysInYear: totalDaysInYear || 365,
    };
}

/** برنامه تولید از جدول برنامه و بودجه (production_plans) برای سال تاریخ گزارش */
function useProductionPlan(reportDate: string) {
    const [plans, setPlans] = useState<{ month: string; prod_plan: number }[]>([]);

    useEffect(() => {
        if (!reportDate || reportDate.length < 8) {
            setPlans([]);
            return;
        }
        const y = reportDate.split('/')[0];
        supabase
            .from('production_plans')
            .select('month, prod_plan')
            .eq('year', parseInt(y, 10))
            .then(({ data }) => {
                const list = (data || []).map((r: any) => ({
                    month: r.month,
                    prod_plan: Math.max(0, Number(r.prod_plan) || 0),
                }));
                setPlans(list);
            });
    }, [reportDate]);

    const getDaysInMonth = (year: number, month: number) => {
        if (month <= 0) return 0;
        if (month <= 6) return 31;
        if (month <= 11) return 30;
        const isLeap = (year % 33 === 1 || year % 33 === 5 || year % 33 === 9 || year % 33 === 13 || year % 33 === 17 || year % 33 === 22 || year % 33 === 26 || year % 33 === 30);
        return isLeap ? 30 : 29;
    };

    const monthIndex = reportDate.length >= 8 ? parseInt(reportDate.split('/')[1], 10) : 0;
    const yearNum = reportDate.length >= 8 ? parseInt(reportDate.split('/')[0], 10) : 0;
    const dayOfMonth = reportDate.length >= 10 ? parseInt(reportDate.split('/')[2], 10) : 0;
    const currentMonthName = monthIndex >= 1 && monthIndex <= 12 ? SHAMSI_MONTHS_LIST[monthIndex - 1] : '';
    const monthPlan = plans.find(p => p.month === currentMonthName)?.prod_plan ?? 0;
    const yearPlan = plans.reduce((s, p) => s + p.prod_plan, 0);
    const daysInMonth = getDaysInMonth(yearNum, monthIndex) || 30;
    const daysElapsedInMonth = Math.min(dayOfMonth || 0, daysInMonth);
    let daysElapsedInYear = 0;
    for (let mo = 1; mo < monthIndex; mo++) daysElapsedInYear += getDaysInMonth(yearNum, mo);
    daysElapsedInYear += daysElapsedInMonth;
    let totalDaysInYear = 0;
    for (let mo = 1; mo <= 12; mo++) totalDaysInYear += getDaysInMonth(yearNum, mo);
    const dailyPlanTotal = daysInMonth > 0 ? monthPlan / daysInMonth : 0;
    const dailyPlanPerLine = dailyPlanTotal / 2;
    const monthlyPlanPerLine = monthPlan / 2;

    return {
        dailyPlanPerLine,
        dailyPlanTotal,
        monthlyPlanPerLine,
        monthPlan,
        yearPlanPerLine: yearPlan / 2,
        yearPlanTotal: yearPlan,
        daysInMonth,
        daysElapsedInMonth,
        daysElapsedInYear,
        totalDaysInYear: totalDaysInYear || 365,
    };
}

const ORG_COLOR = '#ea580c'; // نارنجی سازمانی
const GREEN_BAR = '#16a34a';
const ORANGE_BAR = '#ea580c';

const QUALITY_PARAM_KEYS = ['Fe', 'FeO', 'S', 'K80', 'Moisture', 'Blaine'] as const;
const QUALITY_FIELDS = [
    { key: 'lineA_daily', label: 'خط A روزانه' },
    { key: 'lineA_monthly', label: 'خط A ماهانه' },
    { key: 'lineA_yearly', label: 'خط A سالانه' },
    { key: 'lineB_daily', label: 'خط B روزانه' },
    { key: 'lineB_monthly', label: 'خط B ماهانه' },
    { key: 'lineB_yearly', label: 'خط B سالانه' },
    { key: 'total_daily', label: 'مجموع روزانه' },
    { key: 'total_monthly', label: 'مجموع ماهانه' },
    { key: 'total_yearly', label: 'مجموع سالانه' },
] as const;

const initialQualityState = (): Record<string, string> => {
    const o: Record<string, string> = {};
    QUALITY_PARAM_KEYS.forEach(p => QUALITY_FIELDS.forEach(f => { o[`${p}_${f.key}`] = ''; }));
    return o;
};

/** میانگین پارامتر خط A و B برای یک دوره (مجموع = میانگین) */
const qualityAvg = (params: Record<string, string>, param: string, period: 'daily' | 'monthly' | 'yearly'): string => {
    const a = Number(params[`${param}_lineA_${period}`]);
    const b = Number(params[`${param}_lineB_${period}`]);
    const na = !Number.isFinite(a);
    const nb = !Number.isFinite(b);
    if (na && nb) return '';
    if (na) return String(b);
    if (nb) return String(a);
    const avg = (a + b) / 2;
    return avg % 1 === 0 ? String(avg) : avg.toFixed(2);
};

/** نگاشت پارامتر جدول به فیلد گزارش آزمایشگاه؛ K80 از mesh_size */
const LAB_PARAM_COLUMN: Record<string, string> = {
    Fe: 'fe_percent',
    FeO: 'feo_percent',
    S: 's_percent',
    K80: 'mesh_size',
    Moisture: 'moisture_percent',
    Blaine: 'blaine',
};

/** استخراج میانگین پارامترها از یک خط در full_data (مغناطیس + فلوتاسیون، همه ساعات) */
function avgParamsFromLineData(lineData: any): Record<string, number> {
    const sum: Record<string, number> = {};
    const cnt: Record<string, number> = {};
    (['Fe', 'FeO', 'S', 'K80', 'Moisture', 'Blaine'] as const).forEach(p => { sum[p] = 0; cnt[p] = 0; });
    if (!lineData || typeof lineData !== 'object') return sum;
    const collect = (m: Record<string, Record<string, string>>) => {
        if (!m || typeof m !== 'object') return;
        Object.values(m).forEach(row => {
            if (row && typeof row === 'object')
                (['Fe', 'FeO', 'S', 'K80', 'Moisture', 'Blaine'] as const).forEach(p => {
                    const v = Number(row[p]);
                    if (Number.isFinite(v)) { sum[p] += v; cnt[p]++; }
                });
        });
    };
    collect(lineData.magnet);
    collect(lineData.flotation);
    const out: Record<string, number> = {};
    (['Fe', 'FeO', 'S', 'K80', 'Moisture', 'Blaine'] as const).forEach(p => {
        out[p] = cnt[p] > 0 ? sum[p] / cnt[p] : NaN;
    });
    return out;
}

/** داده پارامترهای کیفی از گزارش آزمایشگاه برای تاریخ و سال مربوط (پشتیبانی از full_data و رکورد قدیمی) */
function useLabQualityForFeed(reportDate: string) {
    const [params, setParams] = useState<Record<string, string>>(() => initialQualityState());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!reportDate || reportDate.length < 8) {
            setParams(initialQualityState());
            return;
        }
        const parts = reportDate.split('/');
        const y = parts[0];
        const m = parts[1];
        const prefixDay = reportDate;
        const prefixMonth = `${y}/${m}`;
        const prefixYear = `${y}`;

        setLoading(true);
        supabase
            .from('lab_reports')
            .select('report_date, shift, fe_percent, feo_percent, s_percent, moisture_percent, blaine, mesh_size, full_data')
            .like('report_date', `${y}/%`)
            .then(({ data: rows, error }) => {
                if (error) {
                    setParams(initialQualityState());
                    setLoading(false);
                    return;
                }
                const list = rows || [];
                const next: Record<string, string> = initialQualityState();

                const avg = (arr: number[]) => {
                    const valid = arr.filter(n => Number.isFinite(n));
                    if (valid.length === 0) return '';
                    const sum = valid.reduce((a, b) => a + b, 0);
                    const v = sum / valid.length;
                    return v % 1 === 0 ? String(v) : v.toFixed(2);
                };

                (['Fe', 'FeO', 'S', 'K80', 'Moisture', 'Blaine'] as const).forEach(param => {
                    const col = LAB_PARAM_COLUMN[param];
                    const lineA_day: number[] = [], lineB_day: number[] = [];
                    const lineA_month: number[] = [], lineB_month: number[] = [];
                    const lineA_year: number[] = [], lineB_year: number[] = [];
                    list.forEach((r: any) => {
                        const d = r.report_date || '';
                        const fd = r.full_data;
                        const useNewStruct = fd && fd.feed && typeof fd.feed.lineA === 'object';
                        if (useNewStruct) {
                            const a = avgParamsFromLineData(fd.feed.lineA);
                            const b = avgParamsFromLineData(fd.feed.lineB);
                            const va = a[param], vb = b[param];
                            if (d === prefixDay) { if (Number.isFinite(va)) lineA_day.push(va); if (Number.isFinite(vb)) lineB_day.push(vb); }
                            if (d.startsWith(prefixMonth)) { if (Number.isFinite(va)) lineA_month.push(va); if (Number.isFinite(vb)) lineB_month.push(vb); }
                            if (d.startsWith(prefixYear)) { if (Number.isFinite(va)) lineA_year.push(va); if (Number.isFinite(vb)) lineB_year.push(vb); }
                        } else if (col) {
                            const val = Number(r[col]);
                            if (!Number.isFinite(val)) return;
                            const shift = (r.shift || 'A').toUpperCase();
                            const isA = shift === 'A';
                            const isB = shift === 'B';
                            if (d === prefixDay) { if (isA) lineA_day.push(val); if (isB) lineB_day.push(val); }
                            if (d.startsWith(prefixMonth)) { if (isA) lineA_month.push(val); if (isB) lineB_month.push(val); }
                            if (d.startsWith(prefixYear)) { if (isA) lineA_year.push(val); if (isB) lineB_year.push(val); }
                        }
                    });
                    next[`${param}_lineA_daily`] = avg(lineA_day);
                    next[`${param}_lineB_daily`] = avg(lineB_day);
                    next[`${param}_lineA_monthly`] = avg(lineA_month);
                    next[`${param}_lineB_monthly`] = avg(lineB_month);
                    next[`${param}_lineA_yearly`] = avg(lineA_year);
                    next[`${param}_lineB_yearly`] = avg(lineB_year);
                });
                setParams(next);
            })
            .then(() => setLoading(false), () => setLoading(false));
    }, [reportDate]);

    return { qualityParams: params, qualityLoading: loading };
}

export const TabFeed: React.FC<{ reportDate: string }> = ({ reportDate }) => {
    const { loading, daily, monthly, yearly, monthlyToDate, yearlyToDate, monthDaily } = useFeedFromControlRoom(reportDate);
    const plan = useFeedPlan(reportDate);
    const { qualityParams, qualityLoading } = useLabQualityForFeed(reportDate);

    const planToDateMonth = plan.daysInMonth > 0 ? plan.monthPlan * plan.daysElapsedInMonth / plan.daysInMonth : 0;
    const planToDateYear = plan.totalDaysInYear > 0 ? plan.yearPlanTotal * plan.daysElapsedInYear / plan.totalDaysInYear : 0;

    const pctTotal = (cons: number, pl: number) => (pl > 0 ? (cons / pl) * 100 : 0);
    const pctCurrentDaily = (cons: number, pl: number) => (pl > 0 ? (cons / pl) * 100 : 0);
    const pctCurrentMonth = planToDateMonth > 0 ? (monthlyToDate / planToDateMonth) * 100 : 0;
    const pctCurrentYear = planToDateYear > 0 ? (yearlyToDate / planToDateYear) * 100 : 0;

    const rows = [
        {
            label: 'روزانه',
            lineAConsumption: daily.lineA,
            lineBConsumption: daily.lineB,
            lineAPlan: plan.dailyPlanPerLine,
            lineBPlan: plan.dailyPlanPerLine,
            totalConsumption: daily.lineA + daily.lineB,
            totalPlan: plan.dailyPlanTotal,
            pctTotal: pctTotal(daily.lineA + daily.lineB, plan.dailyPlanTotal),
            pctCurrent: pctCurrentDaily(daily.lineA + daily.lineB, plan.dailyPlanTotal),
        },
        {
            label: 'ماهانه',
            lineAConsumption: monthly.lineA,
            lineBConsumption: monthly.lineB,
            lineAPlan: plan.monthlyPlanPerLine,
            lineBPlan: plan.monthlyPlanPerLine,
            totalConsumption: monthly.lineA + monthly.lineB,
            totalPlan: plan.monthPlan,
            pctTotal: pctTotal(monthly.lineA + monthly.lineB, plan.monthPlan),
            pctCurrent: pctCurrentMonth,
        },
        {
            label: 'سالانه',
            lineAConsumption: yearly.lineA,
            lineBConsumption: yearly.lineB,
            lineAPlan: plan.yearPlanPerLine,
            lineBPlan: plan.yearPlanPerLine,
            totalConsumption: yearly.lineA + yearly.lineB,
            totalPlan: plan.yearPlanTotal,
            pctTotal: pctTotal(yearly.lineA + yearly.lineB, plan.yearPlanTotal),
            pctCurrent: pctCurrentYear,
        },
    ];

    const parts = reportDate.split('/');
    const y = parts[0] || '';
    const m = parts[1] || '';
    const daysInMonth = plan.daysInMonth || 30;
    const dailyPlan = plan.dailyPlanTotal ?? 0;
    const feedChartData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const key = `${y}/${String(parseInt(m, 10)).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        const consumption = monthDaily[key] ?? 0;
        return {
            date: String(day),
            consumption,
            plan: dailyPlan,
            barColor: dailyPlan > 0 && consumption >= dailyPlan ? GREEN_BAR : ORANGE_BAR,
        };
    });

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3 flex items-center gap-2">
                    <Factory className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">خلاصه خوراک (از گزارش اتاق کنترل و جدول برنامه و بودجه)</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-5 pt-3">مصرف از گزارش اتاق کنترل (مجموع دو شیفت). برنامه از جدول برنامه و بودجه سالانه.</p>
                <div className="p-5 overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <span>در حال بارگذاری...</span>
                        </div>
                    ) : (
                        <table className="w-full max-w-4xl mx-auto text-center border-collapse rounded-xl overflow-hidden shadow-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                    <th rowSpan={2} className="p-3 border border-gray-200 dark:border-gray-600 font-medium w-28 align-middle">دوره</th>
                                    <th colSpan={2} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">خط A</th>
                                    <th colSpan={2} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">خط B</th>
                                    <th colSpan={4} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">مجموع</th>
                                </tr>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40 w-24">مصرف <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40 w-24">مصرف <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">مصرف <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">درصد تحقق کل</th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">درصد تحقق جاری</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={row.label} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                                        <td className="p-3 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-cyan-100/50 dark:bg-cyan-900/30">{row.lineAConsumption.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-cyan-100/50 dark:bg-cyan-900/30">{Math.round(row.lineAPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-red-50/70 dark:bg-red-900/30">{row.lineBConsumption.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-red-50/70 dark:bg-red-900/30">{Math.round(row.lineBPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30">{row.totalConsumption.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30">{Math.round(row.totalPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30" dir="ltr">{row.pctTotal.toFixed(1)}%</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30" dir="ltr">{row.pctCurrent.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {!loading && feedChartData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3">
                        <h3 className="text-base font-bold text-orange-900 dark:text-orange-100">مصرف روزانه مجموع در ماه</h3>
                        <p className="text-xs text-orange-800/80 dark:text-orange-200/80 mt-0.5">سبز: رسیدن یا بالاتر از برنامه — نارنجی: کمتر از برنامه (تن)</p>
                    </div>
                    <div className="p-5">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={feedChartData} margin={{ top: 8, right: 56, left: 8, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} name="روز ماه" />
                                    <YAxis tick={{ fontSize: 10, dx: -15 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} name="تن" />
                                    <Tooltip formatter={(value: number) => value.toLocaleString()} labelFormatter={(label) => `روز ${label}`} />
                                    <Legend />
                                    <Bar dataKey="consumption" name="مصرف" radius={[4, 4, 0, 0]}>
                                        {feedChartData.map((_, index) => (
                                            <Cell key={index} fill={feedChartData[index].barColor} />
                                        ))}
                                    </Bar>
                                    <Line type="monotone" dataKey="plan" stroke={ORG_COLOR} strokeDasharray="6 4" name="برنامه" strokeWidth={2} dot={false} label={({ index, x, y, value }) => index === feedChartData.length - 1 && value != null ? <text x={x} y={y} dx={6} dy={-8} textAnchor="start" fill={ORG_COLOR} fontSize={11}>{Math.round(Number(value)).toLocaleString()} تن</text> : null} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3">
                    <h3 className="text-base font-bold text-orange-900 dark:text-orange-100">پارامترهای کیفی خوراک</h3>
                    <p className="text-xs text-orange-800/80 dark:text-orange-200/80 mt-0.5">برای هر خط و مجموع (میانگین خط A و B) به صورت روزانه، ماهانه و سالانه. مقادیر از گزارش آزمایشگاه بر اساس تاریخ گزارش بارگذاری می‌شوند.</p>
                </div>
                <div className="p-5 overflow-x-auto">
                    {qualityLoading ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">در حال بارگذاری پارامترهای کیفی از گزارش آزمایشگاه...</div>
                    ) : (
                    <table className="w-full text-center border-collapse rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 table-fixed">
                        <colgroup>
                            <col className="w-24" />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                        </colgroup>
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">
                                <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium">پارامتر</th>
                                <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">خط A</th>
                                <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">خط B</th>
                                <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">مجموع</th>
                            </tr>
                            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium">—</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">روزانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">ماهانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">سالانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">روزانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">ماهانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">سالانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">روزانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">ماهانه</th>
                                <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">سالانه</th>
                            </tr>
                        </thead>
                        <tbody>
                            {QUALITY_PARAM_KEYS.map((param, i) => (
                                <tr key={param} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                                    <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{param}</td>
                                    {QUALITY_FIELDS.map(({ key }) => {
                                        const fieldKey = `${param}_${key}`;
                                        const isLineA = key.startsWith('lineA');
                                        const isLineB = key.startsWith('lineB');
                                        const isTotal = key.startsWith('total');
                                        const cellClass = isLineA ? 'bg-cyan-50/50 dark:bg-cyan-900/20' : isLineB ? 'bg-red-50/50 dark:bg-red-900/20' : 'bg-green-50/50 dark:bg-green-900/20';
                                        if (isTotal) {
                                            const period = key.replace('total_', '') as 'daily' | 'monthly' | 'yearly';
                                            const avgVal = qualityAvg(qualityParams, param, period);
                                            return (
                                                <td key={fieldKey} className={`p-2 border border-gray-200 dark:border-gray-600 ${cellClass} text-gray-700 dark:text-gray-300 text-sm`} dir="ltr">
                                                    {avgVal || '—'}
                                                </td>
                                            );
                                        }
                                        const val = qualityParams[fieldKey] ?? '';
                                        return (
                                            <td key={fieldKey} className={`p-2 border border-gray-200 dark:border-gray-600 ${cellClass} text-gray-700 dark:text-gray-300 text-sm`} dir="ltr">
                                                {val || '—'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TabProduction: React.FC<{ reportDate: string }> = ({ reportDate }) => {
    const { loading, daily, monthly, yearly, monthlyToDate, yearlyToDate, monthDaily } = useFeedFromControlRoom(reportDate);
    const plan = useProductionPlan(reportDate);
    const { qualityParams, qualityLoading } = useLabQualityForFeed(reportDate);

    const planToDateMonth = plan.daysInMonth > 0 ? plan.monthPlan * plan.daysElapsedInMonth / plan.daysInMonth : 0;
    const planToDateYear = plan.totalDaysInYear > 0 ? plan.yearPlanTotal * plan.daysElapsedInYear / plan.totalDaysInYear : 0;

    const pctTotal = (prod: number, pl: number) => (pl > 0 ? (prod / pl) * 100 : 0);
    const pctCurrentDaily = (prod: number, pl: number) => (pl > 0 ? (prod / pl) * 100 : 0);
    const pctCurrentMonth = planToDateMonth > 0 ? (monthlyToDate / planToDateMonth) * 100 : 0;
    const pctCurrentYear = planToDateYear > 0 ? (yearlyToDate / planToDateYear) * 100 : 0;

    const rows = [
        { label: 'روزانه', lineA: daily.lineA, lineB: daily.lineB, lineAPlan: plan.dailyPlanPerLine, lineBPlan: plan.dailyPlanPerLine, total: daily.lineA + daily.lineB, totalPlan: plan.dailyPlanTotal, pctTotal: pctTotal(daily.lineA + daily.lineB, plan.dailyPlanTotal), pctCurrent: pctCurrentDaily(daily.lineA + daily.lineB, plan.dailyPlanTotal) },
        { label: 'ماهانه', lineA: monthly.lineA, lineB: monthly.lineB, lineAPlan: plan.monthlyPlanPerLine, lineBPlan: plan.monthlyPlanPerLine, total: monthly.lineA + monthly.lineB, totalPlan: plan.monthPlan, pctTotal: pctTotal(monthly.lineA + monthly.lineB, plan.monthPlan), pctCurrent: pctCurrentMonth },
        { label: 'سالانه', lineA: yearly.lineA, lineB: yearly.lineB, lineAPlan: plan.yearPlanPerLine, lineBPlan: plan.yearPlanPerLine, total: yearly.lineA + yearly.lineB, totalPlan: plan.yearPlanTotal, pctTotal: pctTotal(yearly.lineA + yearly.lineB, plan.yearPlanTotal), pctCurrent: pctCurrentYear },
    ];

    const parts = reportDate.split('/');
    const y = parts[0] || '';
    const m = parts[1] || '';
    const daysInMonth = plan.daysInMonth || 30;
    const dailyPlan = plan.dailyPlanTotal ?? 0;
    const prodChartData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const key = `${y}/${String(parseInt(m, 10)).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        const production = monthDaily[key] ?? 0;
        return {
            date: String(day),
            production,
            plan: dailyPlan,
            barColor: dailyPlan > 0 && production >= dailyPlan ? GREEN_BAR : ORANGE_BAR,
        };
    });

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">خلاصه محصول (از گزارش اتاق کنترل و جدول برنامه و بودجه)</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-5 pt-3">تولید از گزارش اتاق کنترل (مجموع دو شیفت). برنامه از جدول برنامه و بودجه سالانه.</p>
                <div className="p-5 overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <span>در حال بارگذاری...</span>
                        </div>
                    ) : (
                        <table className="w-full max-w-4xl mx-auto text-center border-collapse rounded-xl overflow-hidden shadow-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                    <th rowSpan={2} className="p-3 border border-gray-200 dark:border-gray-600 font-medium w-28 align-middle">دوره</th>
                                    <th colSpan={2} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">خط A</th>
                                    <th colSpan={2} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">خط B</th>
                                    <th colSpan={4} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">مجموع</th>
                                </tr>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40 w-24">تولید <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40 w-24">تولید <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">تولید <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">درصد تحقق کل</th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">درصد تحقق جاری</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={row.label} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                                        <td className="p-3 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-cyan-100/50 dark:bg-cyan-900/30">{row.lineA.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-cyan-100/50 dark:bg-cyan-900/30">{Math.round(row.lineAPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-red-50/70 dark:bg-red-900/30">{row.lineB.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-red-50/70 dark:bg-red-900/30">{Math.round(row.lineBPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30">{row.total.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30">{Math.round(row.totalPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30" dir="ltr">{row.pctTotal.toFixed(1)}%</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30" dir="ltr">{row.pctCurrent.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {!loading && prodChartData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3">
                        <h3 className="text-base font-bold text-orange-900 dark:text-orange-100">تولید روزانه مجموع در ماه</h3>
                        <p className="text-xs text-orange-800/80 dark:text-orange-200/80 mt-0.5">سبز: رسیدن یا بالاتر از برنامه — نارنجی: کمتر از برنامه (تن)</p>
                    </div>
                    <div className="p-5">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={prodChartData} margin={{ top: 8, right: 56, left: 8, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} name="روز ماه" />
                                    <YAxis tick={{ fontSize: 10, dx: -15 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} name="تن" />
                                    <Tooltip formatter={(value: number) => value.toLocaleString()} labelFormatter={(label) => `روز ${label}`} />
                                    <Legend />
                                    <Bar dataKey="production" name="تولید" radius={[4, 4, 0, 0]}>
                                        {prodChartData.map((_, index) => (
                                            <Cell key={index} fill={prodChartData[index].barColor} />
                                        ))}
                                    </Bar>
                                    <Line type="monotone" dataKey="plan" stroke={ORG_COLOR} strokeDasharray="6 4" name="برنامه" strokeWidth={2} dot={false} label={({ index, x, y, value }) => index === prodChartData.length - 1 && value != null ? <text x={x} y={y} dx={6} dy={-8} textAnchor="start" fill={ORG_COLOR} fontSize={11}>{Math.round(Number(value)).toLocaleString()} تن</text> : null} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3">
                    <h3 className="text-base font-bold text-orange-900 dark:text-orange-100">پارامترهای کیفی محصول</h3>
                    <p className="text-xs text-orange-800/80 dark:text-orange-200/80 mt-0.5">برای هر خط و مجموع (میانگین خط A و B) به صورت روزانه، ماهانه و سالانه. مقادیر از گزارش آزمایشگاه بر اساس تاریخ گزارش بارگذاری می‌شوند.</p>
                </div>
                <div className="p-5 overflow-x-auto">
                    {qualityLoading ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">در حال بارگذاری پارامترهای کیفی از گزارش آزمایشگاه...</div>
                    ) : (
                        <table className="w-full text-center border-collapse rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 table-fixed">
                            <colgroup>
                                <col className="w-24" />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium">پارامتر</th>
                                    <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">خط A</th>
                                    <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">خط B</th>
                                    <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">مجموع</th>
                                </tr>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium">—</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">روزانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">ماهانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">سالانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">روزانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">ماهانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">سالانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">روزانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">ماهانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">سالانه</th>
                                </tr>
                            </thead>
                            <tbody>
                                {QUALITY_PARAM_KEYS.map((param, i) => (
                                    <tr key={param} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{param}</td>
                                        {QUALITY_FIELDS.map(({ key }) => {
                                            const fieldKey = `${param}_${key}`;
                                            const isLineA = key.startsWith('lineA');
                                            const isLineB = key.startsWith('lineB');
                                            const isTotal = key.startsWith('total');
                                            const cellClass = isLineA ? 'bg-cyan-50/50 dark:bg-cyan-900/20' : isLineB ? 'bg-red-50/50 dark:bg-red-900/20' : 'bg-green-50/50 dark:bg-green-900/20';
                                            if (isTotal) {
                                                const period = key.replace('total_', '') as 'daily' | 'monthly' | 'yearly';
                                                const avgVal = qualityAvg(qualityParams, param, period);
                                                return (
                                                    <td key={fieldKey} className={`p-2 border border-gray-200 dark:border-gray-600 ${cellClass} text-gray-700 dark:text-gray-300 text-sm`} dir="ltr">
                                                        {avgVal || '—'}
                                                    </td>
                                                );
                                            }
                                            const val = qualityParams[fieldKey] ?? '';
                                            return (
                                                <td key={fieldKey} className={`p-2 border border-gray-200 dark:border-gray-600 ${cellClass} text-gray-700 dark:text-gray-300 text-sm`} dir="ltr">
                                                    {val || '—'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TabWaste: React.FC<{ reportDate: string }> = ({ reportDate }) => {
    const { loading, daily, monthly, yearly, monthlyToDate, yearlyToDate, monthDaily } = useWasteFromControlRoom(reportDate);
    const feedPlan = useFeedPlan(reportDate);
    const prodPlan = useProductionPlan(reportDate);
    const { qualityParams, qualityLoading } = useLabQualityForFeed(reportDate);

    const dailyWastePlan = Math.max(0, feedPlan.dailyPlanTotal - prodPlan.dailyPlanTotal);
    const monthWastePlan = Math.max(0, feedPlan.monthPlan - prodPlan.monthPlan);
    const yearWastePlan = Math.max(0, feedPlan.yearPlanTotal - prodPlan.yearPlanTotal);
    const dailyWastePlanPerLine = dailyWastePlan / 2;
    const monthWastePlanPerLine = monthWastePlan / 2;
    const yearWastePlanPerLine = yearWastePlan / 2;

    const planToDateMonth = feedPlan.daysInMonth > 0 ? monthWastePlan * feedPlan.daysElapsedInMonth / feedPlan.daysInMonth : 0;
    const planToDateYear = feedPlan.totalDaysInYear > 0 ? yearWastePlan * feedPlan.daysElapsedInYear / feedPlan.totalDaysInYear : 0;

    const pctTotal = (w: number, pl: number) => (pl > 0 ? (w / pl) * 100 : 0);
    const pctCurrentDaily = (w: number, pl: number) => (pl > 0 ? (w / pl) * 100 : 0);
    const pctCurrentMonth = planToDateMonth > 0 ? (monthlyToDate / planToDateMonth) * 100 : 0;
    const pctCurrentYear = planToDateYear > 0 ? (yearlyToDate / planToDateYear) * 100 : 0;

    const rows = [
        { label: 'روزانه', lineA: daily.lineA, lineB: daily.lineB, lineAPlan: dailyWastePlanPerLine, lineBPlan: dailyWastePlanPerLine, total: daily.lineA + daily.lineB, totalPlan: dailyWastePlan, pctTotal: pctTotal(daily.lineA + daily.lineB, dailyWastePlan), pctCurrent: pctCurrentDaily(daily.lineA + daily.lineB, dailyWastePlan) },
        { label: 'ماهانه', lineA: monthly.lineA, lineB: monthly.lineB, lineAPlan: monthWastePlanPerLine, lineBPlan: monthWastePlanPerLine, total: monthly.lineA + monthly.lineB, totalPlan: monthWastePlan, pctTotal: pctTotal(monthly.lineA + monthly.lineB, monthWastePlan), pctCurrent: pctCurrentMonth },
        { label: 'سالانه', lineA: yearly.lineA, lineB: yearly.lineB, lineAPlan: yearWastePlanPerLine, lineBPlan: yearWastePlanPerLine, total: yearly.lineA + yearly.lineB, totalPlan: yearWastePlan, pctTotal: pctTotal(yearly.lineA + yearly.lineB, yearWastePlan), pctCurrent: pctCurrentYear },
    ];

    const parts = reportDate.split('/');
    const y = parts[0] || '';
    const m = parts[1] || '';
    const daysInMonth = feedPlan.daysInMonth || 30;
    const wasteChartData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const key = `${y}/${String(parseInt(m, 10)).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        const waste = monthDaily[key] ?? 0;
        return {
            date: String(day),
            waste,
            plan: dailyWastePlan,
            barColor: dailyWastePlan > 0 && waste >= dailyWastePlan ? GREEN_BAR : ORANGE_BAR,
        };
    });

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3 flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">خلاصه باطله (از گزارش اتاق کنترل؛ برنامه = برنامه خوراک − برنامه تولید)</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-5 pt-3">باطله از گزارش اتاق کنترل (خوراک − محصول). برنامه باطله = برنامه خوراک − برنامه تولید (بدون برنامه جداگانه برای باطله).</p>
                <div className="p-5 overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <span>در حال بارگذاری...</span>
                        </div>
                    ) : (
                        <table className="w-full max-w-4xl mx-auto text-center border-collapse rounded-xl overflow-hidden shadow-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                    <th rowSpan={2} className="p-3 border border-gray-200 dark:border-gray-600 font-medium w-28 align-middle">دوره</th>
                                    <th colSpan={2} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">خط A</th>
                                    <th colSpan={2} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">خط B</th>
                                    <th colSpan={4} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">مجموع</th>
                                </tr>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40 w-24">باطله <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40 w-24">باطله <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">باطله <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">برنامه <span className="text-[10px] font-normal opacity-90">تن</span></th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">درصد تحقق کل</th>
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40 w-24">درصد تحقق جاری</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={row.label} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                                        <td className="p-3 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-cyan-100/50 dark:bg-cyan-900/30">{row.lineA.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-cyan-100/50 dark:bg-cyan-900/30">{Math.round(row.lineAPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-red-50/70 dark:bg-red-900/30">{row.lineB.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-red-50/70 dark:bg-red-900/30">{Math.round(row.lineBPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30">{row.total.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30">{Math.round(row.totalPlan).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30" dir="ltr">{row.pctTotal.toFixed(1)}%</td>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200 bg-green-100/50 dark:bg-green-900/30" dir="ltr">{row.pctCurrent.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {!loading && wasteChartData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3">
                        <h3 className="text-base font-bold text-orange-900 dark:text-orange-100">باطله روزانه مجموع در ماه</h3>
                        <p className="text-xs text-orange-800/80 dark:text-orange-200/80 mt-0.5">سبز: رسیدن یا بالاتر از برنامه — نارنجی: کمتر از برنامه (تن). برنامه = خوراک − تولید.</p>
                    </div>
                    <div className="p-5">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={wasteChartData} margin={{ top: 8, right: 56, left: 8, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} name="روز ماه" />
                                    <YAxis tick={{ fontSize: 10, dx: -15 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} name="تن" />
                                    <Tooltip formatter={(value: number) => value.toLocaleString()} labelFormatter={(label) => `روز ${label}`} />
                                    <Legend />
                                    <Bar dataKey="waste" name="باطله" radius={[4, 4, 0, 0]}>
                                        {wasteChartData.map((_, index) => (
                                            <Cell key={index} fill={wasteChartData[index].barColor} />
                                        ))}
                                    </Bar>
                                    <Line type="monotone" dataKey="plan" stroke={ORG_COLOR} strokeDasharray="6 4" name="برنامه" strokeWidth={2} dot={false} label={({ index, x, y, value }) => index === wasteChartData.length - 1 && value != null ? <text x={x} y={y} dx={6} dy={-8} textAnchor="start" fill={ORG_COLOR} fontSize={11}>{Math.round(Number(value)).toLocaleString()} تن</text> : null} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-orange-100 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800 px-5 py-3">
                    <h3 className="text-base font-bold text-orange-900 dark:text-orange-100">پارامترهای کیفی باطله</h3>
                    <p className="text-xs text-orange-800/80 dark:text-orange-200/80 mt-0.5">برای هر خط و مجموع (میانگین خط A و B) به صورت روزانه، ماهانه و سالانه. مقادیر از گزارش آزمایشگاه بر اساس تاریخ گزارش بارگذاری می‌شوند.</p>
                </div>
                <div className="p-5 overflow-x-auto">
                    {qualityLoading ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">در حال بارگذاری پارامترهای کیفی از گزارش آزمایشگاه...</div>
                    ) : (
                        <table className="w-full text-center border-collapse rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 table-fixed">
                            <colgroup>
                                <col className="w-24" />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                                <col style={{ width: 'calc((100% - 6rem) / 9)' }} />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">
                                    <th className="p-2 border border-gray-200 dark:border-gray-600 font-medium">پارامتر</th>
                                    <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">خط A</th>
                                    <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">خط B</th>
                                    <th colSpan={3} className="p-2 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">مجموع</th>
                                </tr>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium">—</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">روزانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">ماهانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-cyan-100 dark:bg-cyan-900/40">سالانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">روزانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">ماهانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-red-100 dark:bg-red-900/40">سالانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">روزانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">ماهانه</th>
                                    <th className="p-1.5 border border-gray-200 dark:border-gray-600 font-medium bg-green-100 dark:bg-green-900/40">سالانه</th>
                                </tr>
                            </thead>
                            <tbody>
                                {QUALITY_PARAM_KEYS.map((param, i) => (
                                    <tr key={param} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                                        <td className="p-2 border border-gray-200 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{param}</td>
                                        {QUALITY_FIELDS.map(({ key }) => {
                                            const fieldKey = `${param}_${key}`;
                                            const isLineA = key.startsWith('lineA');
                                            const isLineB = key.startsWith('lineB');
                                            const isTotal = key.startsWith('total');
                                            const cellClass = isLineA ? 'bg-cyan-50/50 dark:bg-cyan-900/20' : isLineB ? 'bg-red-50/50 dark:bg-red-900/20' : 'bg-green-50/50 dark:bg-green-900/20';
                                            if (isTotal) {
                                                const period = key.replace('total_', '') as 'daily' | 'monthly' | 'yearly';
                                                const avgVal = qualityAvg(qualityParams, param, period);
                                                return (
                                                    <td key={fieldKey} className={`p-2 border border-gray-200 dark:border-gray-600 ${cellClass} text-gray-700 dark:text-gray-300 text-sm`} dir="ltr">
                                                        {avgVal || '—'}
                                                    </td>
                                                );
                                            }
                                            const val = qualityParams[fieldKey] ?? '';
                                            return (
                                                <td key={fieldKey} className={`p-2 border border-gray-200 dark:border-gray-600 ${cellClass} text-gray-700 dark:text-gray-300 text-sm`} dir="ltr">
                                                    {val || '—'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TabDowntime: React.FC<{ reportDate: string }> = ({ reportDate }) => {
    const { loading, snapshot } = useProductionDaySnapshot(reportDate);
    const dt = snapshot?.downtime;
    const lines: { key: 'lineA' | 'lineB' | 'plant'; label: string; color: string }[] = [
        { key: 'lineA', label: 'خط A', color: 'text-blue-600' },
        { key: 'lineB', label: 'خط B', color: 'text-red-600' },
        { key: 'plant', label: 'کارخانه', color: 'text-amber-600' },
    ];

    const availabilityPct = (work: string, stop: string) => {
        const w = parseTimeToMinutes(work);
        const s = parseTimeToMinutes(stop);
        const total = w + s;
        if (total <= 0) return '—';
        return `${Math.round((w / total) * 100)}%`;
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-400">در حال جمع‌آوری توقفات از گزارش اتاق کنترل...</div>;
    }

    if (!snapshot || snapshot.shiftCount === 0) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[320px] text-gray-400">
                <StopCircle className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2 text-gray-600 dark:text-gray-300">توقفات</h3>
                <p className="text-sm">برای تاریخ {reportDate} گزارش اتاق کنترل ثبت نشده است.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
                داده‌های {snapshot.shiftCount} شیفت در تاریخ {reportDate} از گزارش اتاق کنترل جمع‌آوری شده است.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lines.map(({ key, label, color }) => (
                    <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                        <h4 className={`font-bold mb-3 ${color}`}>{label}</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">کارکرد</span><span dir="ltr">{dt?.[key].workTime || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">توقف</span><span dir="ltr">{dt?.[key].stopTime || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">دسترسی</span><span>{availabilityPct(dt?.[key].workTime || '', dt?.[key].stopTime || '')}</span></div>
                        </div>
                        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed border-t pt-3 dark:border-gray-700">
                            {dt?.[key].reason || 'علت توقف ثبت نشده.'}
                        </p>
                    </div>
                ))}
            </div>

            {dt?.shifts && dt.shifts.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-3 border-b">شیفت</th>
                                <th className="p-3 border-b">خط A کارکرد</th>
                                <th className="p-3 border-b">خط A توقف</th>
                                <th className="p-3 border-b">خط B کارکرد</th>
                                <th className="p-3 border-b">خط B توقف</th>
                                <th className="p-3 border-b">کارخانه کارکرد</th>
                                <th className="p-3 border-b">کارخانه توقف</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dt.shifts.map((s, i) => (
                                <tr key={i} className="border-b dark:border-gray-700">
                                    <td className="p-3 font-medium">{s.shift}</td>
                                    <td className="p-3" dir="ltr">{s.lineA.workTime || '—'}</td>
                                    <td className="p-3" dir="ltr">{s.lineA.stopTime || '—'}</td>
                                    <td className="p-3" dir="ltr">{s.lineB.workTime || '—'}</td>
                                    <td className="p-3" dir="ltr">{s.lineB.stopTime || '—'}</td>
                                    <td className="p-3" dir="ltr">{s.plant.workTime || '—'}</td>
                                    <td className="p-3" dir="ltr">{s.plant.stopTime || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {dt?.generalDescription && dt.generalDescription.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border dark:border-gray-700">
                    <h4 className="font-bold mb-2 text-gray-700 dark:text-gray-200">توضیحات عمومی توقف</h4>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {dt.generalDescription.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};

export const TabAvailability: React.FC<{ reportDate: string }> = ({ reportDate }) => {
    const { loading, snapshot } = useProductionDaySnapshot(reportDate);
    const av = snapshot?.availability;
    const energy = snapshot?.energy;

    if (loading) {
        return <div className="p-8 text-center text-gray-400">در حال محاسبه شاخص‌های دسترس‌پذیری...</div>;
    }

    if (!snapshot || snapshot.shiftCount === 0) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[320px] text-gray-400">
                <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2 text-gray-600 dark:text-gray-300">دسترس‌پذیری</h3>
                <p className="text-sm">برای تاریخ {reportDate} داده توقف/کارکرد ثبت نشده است.</p>
            </div>
        );
    }

    const rows = [
        { key: 'lineA', label: 'خط A', color: 'text-blue-600', data: av!.lineA },
        { key: 'lineB', label: 'خط B', color: 'text-red-600', data: av!.lineB },
        { key: 'plant', label: 'کارخانه', color: 'text-amber-600', data: av!.plant },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">UA کلی (Utilization)</p>
                    <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">{av!.overall.ua}%</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">PA کلی (Physical)</p>
                    <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{av!.overall.pa}%</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">کارکرد کل</p>
                    <p className="text-2xl font-bold" dir="ltr">{minutesToTime(av!.overall.workMin)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">توقف کل</p>
                    <p className="text-2xl font-bold" dir="ltr">{minutesToTime(av!.overall.stopMin)}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="bg-orange-50 dark:bg-orange-900/20">
                        <tr>
                            <th className="p-3 border-b">خط / بخش</th>
                            <th className="p-3 border-b">کارکرد</th>
                            <th className="p-3 border-b">توقف</th>
                            <th className="p-3 border-b">UA (%)</th>
                            <th className="p-3 border-b">PA (%)</th>
                            <th className="p-3 border-b">برنامه (دقیقه)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ label, color, data }) => (
                            <tr key={label} className="border-b dark:border-gray-700">
                                <td className={`p-3 font-bold ${color}`}>{label}</td>
                                <td className="p-3" dir="ltr">{minutesToTime(data.workMin)}</td>
                                <td className="p-3" dir="ltr">{minutesToTime(data.stopMin)}</td>
                                <td className="p-3 font-medium">{data.ua}%</td>
                                <td className="p-3 font-medium">{data.pa}%</td>
                                <td className="p-3">{av!.plannedMinutesPerLine}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="font-bold mb-3 flex items-center gap-2 text-amber-600">
                    <Activity className="w-5 h-5" /> مصرف انرژی
                </h4>
                {energy && energy.dailyKwh > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <p className="text-xs text-gray-500">روزانه</p>
                            <p className="text-xl font-bold">{energy.dailyKwh.toLocaleString()} <span className="text-sm font-normal">kWh</span></p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
                            <p className="text-xs text-gray-500">ماهانه (اتاق کنترل)</p>
                            <p className="text-xl font-bold">{energy.monthlyKwh.toLocaleString()} <span className="text-sm font-normal">kWh</span></p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
                            <p className="text-xs text-gray-500">سالانه (اتاق کنترل)</p>
                            <p className="text-xl font-bold">{energy.yearlyKwh.toLocaleString()} <span className="text-sm font-normal">kWh</span></p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">مصرف انرژی برای این تاریخ در گزارشات ثبت نشده (فیلدهای energy_kwh در full_data).</p>
                )}
                {energy && energy.byShift.length > 0 && (
                    <table className="w-full text-xs mt-2">
                        <thead><tr><th className="p-2 text-right">منبع</th><th className="p-2 text-right">شیفت</th><th className="p-2 text-right">kWh</th></tr></thead>
                        <tbody>
                            {energy.byShift.map((e, i) => (
                                <tr key={i} className="border-t dark:border-gray-700">
                                    <td className="p-2">{e.source}</td>
                                    <td className="p-2">{e.shift}</td>
                                    <td className="p-2">{e.kwh.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="text-xs text-gray-400">
                UA = کارکرد ÷ (کارکرد + توقف) · PA = کارکرد ÷ زمان برنامه ({av!.plannedMinutesPerLine} دقیقه برای هر خط در {snapshot.shiftCount} شیفت)
            </p>
        </div>
    );
};

export const TabLogistics: React.FC<{ reportDate: string }> = ({ reportDate }) => {
    const { loading, snapshot } = useProductionDaySnapshot(reportDate);
    const logistics = snapshot?.logistics;

    if (loading) {
        return <div className="p-8 text-center text-gray-400">در حال دریافت آمار لجستیک...</div>;
    }

    const wh = logistics?.warehouse;
    const sc = logistics?.scale;
    const hasData = (wh && (wh.rows.length > 0 || wh.entryCount + wh.exitCount > 0)) || (sc && sc.truckCount > 0);

    if (!hasData) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center min-h-[320px] text-gray-400">
                <Truck className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2 text-gray-600 dark:text-gray-300">لجستیک</h3>
                <p className="text-sm">برای تاریخ {reportDate} گزارش انبار یا باسکول ثبت نشده است.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-700 dark:text-green-300">ورود انبار</p>
                    <p className="text-2xl font-bold">{wh?.entryCount ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{wh?.entryQty.toLocaleString() ?? 0} واحد</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-red-700 dark:text-red-300">خروج انبار</p>
                    <p className="text-2xl font-bold">{wh?.exitCount ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{wh?.exitQty.toLocaleString() ?? 0} واحد</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-blue-700 dark:text-blue-300">تردد باسکول</p>
                    <p className="text-2xl font-bold">{sc?.truckCount ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">دستگاه</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-purple-700 dark:text-purple-300">وزن خالص باسکول</p>
                    <p className="text-2xl font-bold">{(sc?.totalNetWeight ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">کیلوگرم</p>
                </div>
            </div>

            {wh && wh.rows.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <h4 className="font-bold p-4 border-b dark:border-gray-700">گردش انبار</h4>
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-3">نوع</th>
                                <th className="p-3">قطعه</th>
                                <th className="p-3">مقدار</th>
                                <th className="p-3">تحویل‌گیرنده</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wh.rows.map((r, i) => (
                                <tr key={i} className="border-t dark:border-gray-700">
                                    <td className="p-3">{r.type === 'ENTRY' ? 'ورود' : r.type === 'EXIT' ? 'خروج' : r.type}</td>
                                    <td className="p-3">{r.partName}</td>
                                    <td className="p-3">{r.qty.toLocaleString()} {r.unit}</td>
                                    <td className="p-3">{r.receiverName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {sc && sc.rows.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <h4 className="font-bold p-4 border-b dark:border-gray-700">توزین باسکول</h4>
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-3">پلاک</th>
                                <th className="p-3">ماده</th>
                                <th className="p-3">وزن خالص</th>
                                <th className="p-3">مبدا</th>
                                <th className="p-3">مقصد</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sc.rows.map((r, i) => (
                                <tr key={i} className="border-t dark:border-gray-700">
                                    <td className="p-3">{r.truckNo}</td>
                                    <td className="p-3">{r.material}</td>
                                    <td className="p-3">{r.netWeight.toLocaleString()} kg</td>
                                    <td className="p-3">{r.origin}</td>
                                    <td className="p-3">{r.destination}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
