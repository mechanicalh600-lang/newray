
import React from 'react';
import { ArrowRight, Share2, Download, Printer, Users, UserCheck, UserX, CalendarOff, Activity, Droplet, Layers, Zap, Filter, Recycle, Magnet, Check, X, Gauge, RefreshCcw } from 'lucide-react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, CartesianGrid, XAxis, YAxis, Bar, Legend, LineChart, Line, Tooltip
} from 'recharts';
import { SHIFT_TYPE_MAP, parseTimeToMinutes, getProductionTimes, THICKENER_TIMES } from './ShiftHandoverTypes';
import { parseShamsiDate } from '../utils';

interface ShiftReportViewProps {
    reportData: any;
    adminAvatar: string | null;
    onBack: () => void;
}

export const ShiftReportView: React.FC<ShiftReportViewProps> = ({ reportData, adminAvatar, onBack }) => {
    const totalFeedA = reportData.totalA || 0;
    const totalFeedB = reportData.totalB || 0;
    const shiftDuration = reportData.shiftInfo?.shiftDuration || '12:00';
    
    // Personnel Counts
    const presentCount = Object.values(reportData.attendanceMap || {}).filter(s => s === 'PRESENT').length;
    const leaveCount = Object.values(reportData.attendanceMap || {}).filter(s => s === 'LEAVE').length;
    const absentCount = Object.values(reportData.attendanceMap || {}).filter(s => s === 'ABSENT').length;

    // Downtime Calculation
    const lineAWork = parseTimeToMinutes(reportData.downtime?.lineA?.workTime || '00:00');
    const lineAStop = parseTimeToMinutes(reportData.downtime?.lineA?.stopTime || '00:00');
    const lineBWork = parseTimeToMinutes(reportData.downtime?.lineB?.workTime || '00:00');
    const lineBStop = parseTimeToMinutes(reportData.downtime?.lineB?.stopTime || '00:00');

    // Chart Data
    const chartDataA = [{ name: 'کارکرد', value: lineAWork, color: '#22c55e' }, { name: 'توقف', value: lineAStop, color: '#ef4444' }];
    const chartDataB = [{ name: 'کارکرد', value: lineBWork, color: '#22c55e' }, { name: 'توقف', value: lineBStop, color: '#ef4444' }];

    const productionTimes = getProductionTimes(reportData.shiftInfo?.type || 'Day1');
    const barChartData = productionTimes.map(t => ({
        time: t,
        lineA: reportData.production?.lineA?.[t] || 0,
        lineB: reportData.production?.lineB?.[t] || 0
    }));

    const getDayOfWeek = (dateStr: string) => {
        const date = parseShamsiDate(dateStr);
        if (!date) return '';
        const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
        return days[date.getDay()];
    };

    // Calculate Average Feed Percentages
    const calculateFeedSummary = (line: 'lineA' | 'lineB') => {
        const feedMap: Record<string, { total: number, count: number }> = {};
        const feedInfo = reportData.feedInfo?.[line] || {};

        Object.values(feedInfo).forEach((feeds: any) => {
            if (Array.isArray(feeds)) {
                feeds.forEach(f => {
                    if (f.type && f.percent > 0) {
                        if (!feedMap[f.type]) feedMap[f.type] = { total: 0, count: 0 };
                        feedMap[f.type].total += f.percent;
                        feedMap[f.type].count += 1;
                    }
                });
            }
        });

        const activeHoursCount = Object.keys(feedInfo).length || 12; 
        
        return Object.entries(feedMap).map(([type, data]) => {
            const avg = Math.round(data.total / activeHoursCount);
            return { type, percent: avg };
        }).filter(i => i.percent > 0);
    };

    const feedSummaryA = calculateFeedSummary('lineA');
    const feedSummaryB = calculateFeedSummary('lineB');

    const handleDownloadPDF = () => {
        const element = document.getElementById('report-content');
        if (!element) return;
        
        const dateLatin = reportData.shiftInfo.date.replace(/\//g, '-');
        const fileNameLat = `ShiftReport_${dateLatin}_Shift${reportData.shiftInfo.name}_${reportData.shiftInfo.type}.pdf`;

        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => {
            const opt = {
                margin: 0,
                filename: fileNameLat,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        };
        document.body.appendChild(script);
    };

    const handleShareReport = async () => {
        const element = document.getElementById('report-content');
        if (!element) return;

        // Check if html2pdf is loaded, if not load it
        if (!(window as any).html2pdf) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            script.onload = () => handleShareReport(); // Retry after load
            document.body.appendChild(script);
            return;
        }

        const dateLatin = reportData.shiftInfo.date.replace(/\//g, '-');
        const fileNameLat = `ShiftReport_${dateLatin}_Shift${reportData.shiftInfo.name}.pdf`;

        const opt = {
            margin: 0,
            filename: fileNameLat,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            // @ts-ignore
            const worker = window.html2pdf().set(opt).from(element).toPdf();
            const blob = await worker.output('blob');
            const file = new File([blob], fileNameLat, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'گزارش شیفت',
                    text: `گزارش شیفت ${reportData.shiftInfo.date} - ${SHIFT_TYPE_MAP[reportData.shiftInfo.type]}`
                });
            } else {
                throw new Error('Sharing files not supported');
            }
        } catch (e) {
            console.error("Sharing failed, fallback to URL:", e);
            if (navigator.share) {
                navigator.share({ title: 'گزارش شیفت', url: window.location.href });
            } else {
                alert('مرورگر شما از اشتراک گذاری پشتیبانی نمی‌کند.');
            }
        }
    };

    // Helper Component for Machine Card
    const MachineCard = ({ title, icon: Icon, children, colorClass = "bg-gray-50 border-gray-200", isActive = true }: any) => (
        <div className={`border rounded-lg p-2 ${colorClass} h-full flex flex-col relative overflow-hidden`}>
            <div className="flex items-center gap-1 mb-2 border-b pb-1 border-gray-300/50">
                {Icon && <Icon className="w-3 h-3 opacity-50" />}
                <span className="font-bold text-[10px]">{title}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
                {isActive ? (
                    <div className="text-[9px] space-y-1">{children}</div>
                ) : (
                    <div className="flex items-center justify-center h-full absolute inset-0 top-6 bg-white/50 backdrop-blur-[1px]">
                        <span className="text-yellow-600 font-black text-xl bg-yellow-100 px-3 py-1 rounded -rotate-12 border-4 border-yellow-500 opacity-80 shadow-lg">خاموش</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-gray-200 min-h-screen p-8 flex flex-col items-center gap-8 text-black overflow-y-auto">
            {/* Actions Bar */}
            <div className="fixed bottom-4 z-50 flex gap-4 no-print bg-white/90 backdrop-blur p-3 rounded-2xl shadow-xl border border-gray-200 left-1/2 transform -translate-x-1/2">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold transition">
                    <ArrowRight className="w-5 h-5"/> بازگشت
                </button>
                <button onClick={handleShareReport} className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-bold transition">
                    <Share2 className="w-5 h-5"/> اشتراک گذاری
                </button>
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-bold transition">
                    <Download className="w-5 h-5"/> دانلود PDF
                </button>
                <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-6 py-2 bg-[#800020] text-white rounded-xl font-bold shadow-lg hover:bg-red-800 transition">
                    <Printer className="w-5 h-5"/> چاپ
                </button>
            </div>

            {/* REPORT CONTAINER */}
            <div id="report-content" className="w-[210mm] mx-auto box-border relative print:w-full print:shadow-none print:m-0 print:p-0">
                <style>{`
                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 0; 
                        }
                        
                        html, body {
                            width: 100%;
                            height: auto !important;
                            min-height: 100% !important;
                            overflow: visible !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white;
                        }

                        /* Hide everything by default */
                        body * {
                            visibility: hidden;
                        }

                        /* Ensure root doesn't constrain us, though we hide its children via body * */
                        #root {
                            display: block !important;
                            overflow: visible !important;
                            height: auto !important;
                        }
                        
                        /* Hide non-print elements explicitly */
                        .no-print {
                            display: none !important;
                        }

                        /* REPORT CONTAINER CONFIGURATION */
                        #report-content {
                            visibility: visible !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 210mm !important;
                            height: auto !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            z-index: 99999;
                            display: block !important;
                            box-shadow: none !important;
                        }
                        
                        #report-content * {
                            visibility: visible !important;
                        }

                        .page-sheet {
                            width: 210mm !important;
                            height: 297mm !important; /* Exact A4 Height */
                            page-break-after: always !important;
                            break-after: page !important;
                            padding: 10mm !important;
                            background: white !important;
                            box-shadow: none !important;
                            margin: 0 !important;
                            border: none !important;
                            position: relative !important;
                            overflow: hidden !important;
                        }

                        .page-sheet:last-of-type {
                            page-break-after: auto !important;
                            break-after: auto !important;
                        }
                    }
                `}</style>

                {/* --- PAGE 1 --- */}
                <div className="page-sheet bg-white shadow-2xl p-[10mm] h-[297mm] flex flex-col box-border relative">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b-4 border-[#800020] pb-2 mb-2">
                        <div className="w-1/4 flex justify-start">
                            <div className="w-16 h-16 rounded-full border-2 border-[#800020] overflow-hidden shadow-sm">
                                {adminAvatar ? <img src={adminAvatar} className="w-full h-full object-cover" alt="Admin" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"><Users className="w-8 h-8"/></div>}
                            </div>
                        </div>
                        <div className="text-center flex-1">
                            <h1 className="text-xl font-black text-[#800020] mb-1">شرکت توسعه معدنی و صنعتی صبانور</h1>
                            <h2 className="text-sm font-bold text-gray-700 px-3 py-1">گزارش شیفت تولید کارخانه کنسانتره همدان</h2>
                        </div>
                        <div className="w-1/4 text-xs space-y-1 text-right font-medium text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div className="flex justify-between"><span>کد رهگیری</span> <span className="font-mono font-bold text-black">{reportData.code}</span></div>
                            <div className="border-t border-dashed border-gray-300"></div>
                            <div className="flex justify-between"><span>تاریخ</span> <span className="font-bold text-black text-left" dir="ltr">{reportData.shiftInfo?.date} ({getDayOfWeek(reportData.shiftInfo?.date || '')})</span></div>
                            <div className="border-t border-dashed border-gray-300"></div>
                            <div className="flex justify-between"><span>شیفت</span> <span className="font-bold text-black text-left" dir="ltr">{SHIFT_TYPE_MAP[reportData.shiftInfo.type]} ({reportData.shiftInfo.name})</span></div>
                        </div>
                    </div>

                    {/* Summary Boxes - Reduced Height */}
                    <div className="grid grid-cols-4 gap-2 mb-3 h-24">
                        {/* Feed A */}
                        <div className="bg-blue-50 border border-blue-100 p-1.5 rounded-xl text-center flex flex-col justify-between shadow-sm">
                            <div className="border-b border-blue-200 pb-0.5 mb-0.5">
                                <span className="text-[9px] text-blue-600 font-bold block">خوراک مصرفی خط A</span>
                                <span className="text-base font-black text-blue-800 block">{totalFeedA.toLocaleString()} <span className="text-[9px] font-normal">تن</span></span>
                            </div>
                            <div className="flex flex-row flex-wrap justify-center gap-1 content-center flex-1">
                                {feedSummaryA.length > 0 ? feedSummaryA.map((f, i) => (
                                    <span key={i} className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[8px] font-bold">
                                        {f.type}: {f.percent}%
                                    </span>
                                )) : <span className="text-[8px] text-gray-400">-</span>}
                            </div>
                        </div>
                        
                        {/* Feed B */}
                        <div className="bg-red-50 border border-red-100 p-1.5 rounded-xl text-center flex flex-col justify-between shadow-sm">
                            <div className="border-b border-red-200 pb-0.5 mb-0.5">
                                <span className="text-[9px] text-red-600 font-bold block">خوراک مصرفی خط B</span>
                                <span className="text-base font-black text-red-800 block">{totalFeedB.toLocaleString()} <span className="text-[9px] font-normal">تن</span></span>
                            </div>
                            <div className="flex flex-row flex-wrap justify-center gap-1 content-center flex-1">
                                {feedSummaryB.length > 0 ? feedSummaryB.map((f, i) => (
                                    <span key={i} className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-bold">
                                        {f.type}: {f.percent}%
                                    </span>
                                )) : <span className="text-[8px] text-gray-400">-</span>}
                            </div>
                        </div>

                        {/* Shift Duration */}
                        <div className="bg-gray-50 border border-gray-200 p-2 rounded-xl text-center flex flex-col justify-center shadow-sm">
                            <span className="block text-[9px] text-gray-600 font-bold mb-1">مدت زمان شیفت</span>
                            <span className="text-2xl font-black text-gray-800 tracking-wider font-mono">{shiftDuration}</span>
                        </div>

                        {/* Personnel Status (Compact) */}
                        <div className="bg-white border border-gray-200 p-1.5 rounded-xl flex flex-col justify-between shadow-sm">
                            <div className="flex items-center justify-center gap-1 border-b border-gray-100 pb-0.5 mb-0.5">
                                <Users className="w-3 h-3 text-gray-500"/>
                                <span className="text-[9px] text-gray-700 font-bold">وضعیت نفرات</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] bg-green-50 px-1.5 py-0.5 rounded">
                                <span>حاضر</span><span className="font-bold text-green-800">{presentCount}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] bg-orange-50 px-1.5 py-0.5 rounded">
                                <span>مرخصی</span><span className="font-bold text-orange-800">{leaveCount}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] bg-red-50 px-1.5 py-0.5 rounded">
                                <span>غایب</span><span className="font-bold text-red-800">{absentCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 1: Pies & Bar */}
                    <div className="grid grid-cols-4 gap-3 mb-3 h-40">
                        {/* Pie A - Centered with Legend Below */}
                        <div className="bg-blue-50/30 rounded-xl p-1 border border-blue-100 relative flex flex-col justify-between">
                            <h4 className="text-[9px] font-bold text-blue-800 text-center absolute top-1 w-full">مدت کارکرد و توقف خط A</h4>
                            <div className="flex-1 flex items-center justify-center pt-3">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartDataA} cx="50%" cy="50%" innerRadius={0} outerRadius={35} dataKey="value" stroke="none">
                                            {chartDataA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-2 text-[9px] pb-1 font-mono font-bold">
                                <span className="text-green-600">کارکرد: {reportData.downtime.lineA.workTime}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-red-600">توقف: {reportData.downtime.lineA.stopTime}</span>
                            </div>
                        </div>

                        {/* Pie B - Centered with Legend Below */}
                        <div className="bg-red-50/30 rounded-xl p-1 border border-red-100 relative flex flex-col justify-between">
                            <h4 className="text-[9px] font-bold text-red-800 text-center absolute top-1 w-full">مدت کارکرد و توقف خط B</h4>
                            <div className="flex-1 flex items-center justify-center pt-3">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartDataB} cx="50%" cy="50%" innerRadius={0} outerRadius={35} dataKey="value" stroke="none">
                                            {chartDataB.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-2 text-[9px] pb-1 font-mono font-bold">
                                <span className="text-green-600">کارکرد: {reportData.downtime.lineB.workTime}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-red-600">توقف: {reportData.downtime.lineB.stopTime}</span>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-1 relative flex flex-col">
                            <h4 className="text-[9px] font-bold text-gray-500 absolute top-1 right-2">مصرف خوراک (تن/ساعت)</h4>
                            <div className="flex-1 mt-3">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{fontSize: 8, angle: -45, textAnchor: 'end'}} interval={0} height={30} tickMargin={5} />
                                        <YAxis tick={{fontSize: 8}} width={30} tickMargin={2} />
                                        <Tooltip contentStyle={{fontSize: '10px'}} />
                                        <Legend iconSize={6} wrapperStyle={{fontSize: '8px', paddingTop: '2px'}} />
                                        <Bar dataKey="lineA" name="خط A" fill="#3b82f6" radius={[2,2,0,0]} />
                                        <Bar dataKey="lineB" name="خط B" fill="#ef4444" radius={[2,2,0,0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Downtime Reasons - Moved Here */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2 min-h-[80px]">
                        <h3 className="font-bold text-gray-700 border-b pb-1 mb-2 text-xs">علل توقف خطوط</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-xs leading-relaxed p-2 bg-white rounded border border-gray-100 h-full">
                                <strong className="block text-blue-600 mb-1 border-b border-blue-50 pb-1">خط A:</strong>
                                {reportData.downtime.lineA.reason || 'توقفی ثبت نشده است.'}
                            </div>
                            <div className="text-xs leading-relaxed p-2 bg-white rounded border border-gray-100 h-full">
                                <strong className="block text-red-600 mb-1 border-b border-red-50 pb-1">خط B:</strong>
                                {reportData.downtime.lineB.reason || 'توقفی ثبت نشده است.'}
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 2: Trend Line Chart (Increased Height) */}
                    <div className="h-48 bg-white border border-gray-200 rounded-xl p-2 mb-3 relative">
                        <h4 className="text-[9px] font-bold text-gray-500 absolute top-2 right-2">روند خوراک‌دهی خطوط</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={barChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{fontSize: 9, angle: -45, textAnchor: 'end'}} height={40} />
                                <YAxis tick={{fontSize: 9}} width={30} />
                                <Tooltip contentStyle={{fontSize: '10px'}} />
                                <Legend iconSize={8} wrapperStyle={{fontSize: '10px'}} />
                                <Line type="monotone" dataKey="lineA" stroke="#3b82f6" strokeWidth={2} dot={{r: 2}} name="روند خط A" />
                                <Line type="monotone" dataKey="lineB" stroke="#ef4444" strokeWidth={2} dot={{r: 2}} name="روند خط B" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* --- Machinery Details Section (Grid 1 - Page 1 - Only Mills) --- */}
                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-2 overflow-hidden mb-2">
                        <h3 className="font-bold text-[#800020] border-b border-gray-300 pb-1 mb-2 text-xs text-center">وضعیت بالمیل‌ها</h3>
                        <div className="grid grid-cols-4 gap-2 h-full">
                            {['lineA', 'lineB'].map(line => {
                                const mills = reportData.ballMills[line];
                                const isA = line === 'lineA';
                                const color = isA ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200';
                                
                                return (
                                    <React.Fragment key={line}>
                                        {/* Primary Mill */}
                                        <MachineCard title={`بالمیل اولیه خط ${isA?'A':'B'}`} icon={Activity} colorClass={color} isActive={mills.primary.active}>
                                            <div className="flex justify-between items-center"><span>جریان (08:00) :</span> <span className={Number(mills.primary.amp08) > 970 ? "text-red-600 font-bold" : ""} dir="ltr">{mills.primary.amp08} A</span></div>
                                            <div className="flex justify-between items-center"><span>دانسیته (08:00) :</span> <span dir="ltr">{mills.primary.dens08} Gr/L</span></div>
                                            <div className="flex justify-between items-center border-t border-dashed pt-1 mt-1"><span>جریان (02:00) :</span> <span className={Number(mills.primary.amp02) > 970 ? "text-red-600 font-bold" : ""} dir="ltr">{mills.primary.amp02} A</span></div>
                                            <div className="flex justify-between items-center"><span>دانسیته (02:00) :</span> <span dir="ltr">{mills.primary.dens02} Gr/L</span></div>
                                            {mills.primary.charges.length > 0 && <div className="text-[8px] bg-white/50 p-1 rounded mt-1">شارژ گلوله: {mills.primary.charges.map((c:any)=>`${c.size}: ${c.count} بشکه`).join(' | ')}</div>}
                                        </MachineCard>

                                        {/* Secondary Mill */}
                                        <MachineCard title={`بالمیل ثانویه خط ${isA?'A':'B'}`} icon={Activity} colorClass={color} isActive={mills.secondary.active}>
                                            <div className="flex justify-between items-center"><span>جریان (08:00) :</span> <span className={Number(mills.secondary.amp08) > 970 ? "text-red-600 font-bold" : ""} dir="ltr">{mills.secondary.amp08} A</span></div>
                                            <div className="flex justify-between items-center"><span>دانسیته (08:00) :</span> <span dir="ltr">{mills.secondary.dens08} Gr/L</span></div>
                                            <div className="flex justify-between items-center border-t border-dashed pt-1 mt-1"><span>جریان (02:00) :</span> <span className={Number(mills.secondary.amp02) > 970 ? "text-red-600 font-bold" : ""} dir="ltr">{mills.secondary.amp02} A</span></div>
                                            <div className="flex justify-between items-center"><span>دانسیته (02:00) :</span> <span dir="ltr">{mills.secondary.dens02} Gr/L</span></div>
                                            {mills.secondary.charges.length > 0 && <div className="text-[8px] bg-white/50 p-1 rounded mt-1">شارژ گلوله: {mills.secondary.charges.map((c:any)=>`${c.size}: ${c.count} بشکه`).join(' | ')}</div>}
                                        </MachineCard>
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* --- SPACER FOR SCREEN VISIBILITY / HIDDEN IN PDF GENERATION --- */}
                {/* This element is visible on screen to separate pages, but has a data attribute for html2pdf to ignore it, solving the extra page issue */}
                <div className="h-8 bg-gray-200/50 print:hidden w-full my-4 rounded flex items-center justify-center text-xs text-gray-400" data-html2canvas-ignore="true">
                    فاصله بین صفحات (در خروجی PDF حذف می‌شود)
                </div>

                {/* --- PAGE 2 --- */}
                <div className="page-sheet bg-white shadow-2xl p-[10mm] h-[297mm] flex flex-col box-border relative">
                    {/* Header Page 2 (Small) */}
                    <div className="border-b-2 border-gray-200 pb-2 mb-4 flex justify-between text-xs text-gray-400">
                        <span>ادامه گزارش شیفت {reportData.shiftInfo.date}</span>
                        <span>صفحه ۲</span>
                    </div>

                    {/* --- Machinery Details Section (Grid 2 - All other equipment in individual boxes) --- */}
                    <div className="mb-4 flex-1">
                        <h3 className="font-bold text-[#800020] border-b border-gray-200 pb-2 mb-3 text-xs">وضعیت تجهیزات فرآیندی</h3>
                        
                        {/* ROW 1: Hydros & Pumps */}
                        <div className="grid grid-cols-3 gap-2 h-auto mb-2">
                            {/* 1. Hydrocyclones A */}
                            <MachineCard title="هیدروسیکلون‌های خط A" icon={RefreshCcw} colorClass="bg-blue-50 border-blue-200" isActive={true}>
                                {['primary', 'secondary'].map(type => {
                                    const h = reportData.hydrocyclones.lineA[type];
                                    const name = type === 'primary' ? 'اولیه' : 'ثانویه';
                                    const isA = true;
                                    if (!h.active) return <div key={type} className="mb-1 border-b border-dashed border-blue-300 pb-1 last:border-0 opacity-50"><span className="font-bold">{name} :</span> خاموش</div>;
                                    return (
                                        <div key={type} className="mb-1 border-b border-dashed border-blue-300 pb-1 last:border-0">
                                            <span className="font-bold block mb-0.5">{name}</span> 
                                            <div className="flex justify-between"><span>P(08:00) : {h.pressure08} Bar</span> <span>P(02:00) : {h.pressure02} Bar</span></div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {h.activeCyclones.map((c:number) => (
                                                    <span key={c} className={`w-4 h-4 rounded-full ${isA?'bg-blue-500':'bg-red-500'} text-white flex items-center justify-center font-bold text-[8px]`}>{c}</span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </MachineCard>

                            {/* 2. Hydrocyclones B */}
                            <MachineCard title="هیدروسیکلون‌های خط B" icon={RefreshCcw} colorClass="bg-red-50 border-red-200" isActive={true}>
                                {['primary', 'secondary'].map(type => {
                                    const h = reportData.hydrocyclones.lineB[type];
                                    const name = type === 'primary' ? 'اولیه' : 'ثانویه';
                                    const isA = false;
                                    if (!h.active) return <div key={type} className="mb-1 border-b border-dashed border-red-300 pb-1 last:border-0 opacity-50"><span className="font-bold">{name} :</span> خاموش</div>;
                                    return (
                                        <div key={type} className="mb-1 border-b border-dashed border-red-300 pb-1 last:border-0">
                                            <span className="font-bold block mb-0.5">{name}</span> 
                                            <div className="flex justify-between"><span>P(08:00) : {h.pressure08} Bar</span> <span>P(02:00) : {h.pressure02} Bar</span></div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {h.activeCyclones.map((c:number) => (
                                                    <span key={c} className={`w-4 h-4 rounded-full ${isA?'bg-blue-500':'bg-red-500'} text-white flex items-center justify-center font-bold text-[8px]`}>{c}</span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </MachineCard>

                            {/* 3. Pump Station (Moved here) */}
                            <MachineCard title="پمپ استیشن" icon={Gauge} colorClass="bg-yellow-50 border-yellow-200" isActive={true}>
                                <div className="mb-2">
                                    <strong className="block text-gray-700">پمپ‌های پروسس :</strong>
                                    <div className="flex gap-1 mt-1">
                                        {reportData.pumps.process.length > 0 ? reportData.pumps.process.map((p:string) => (
                                            <span key={p} className="w-4 h-4 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold text-[9px]">{p}</span>
                                        )) : '-'}
                                    </div>
                                </div>
                                <div>
                                    <strong className="block text-gray-700">پمپ‌های آب تمیز :</strong>
                                    <div className="flex gap-1 mt-1">
                                        {reportData.pumps.cleanWater.length > 0 ? reportData.pumps.cleanWater.map((p:string) => (
                                            <span key={p} className="w-4 h-4 rounded-full bg-blue-400 text-white flex items-center justify-center font-bold text-[9px]">{p}</span>
                                        )) : '-'}
                                    </div>
                                </div>
                            </MachineCard>
                        </div>

                        {/* ROW 2: Magnets & Filters */}
                        <div className="grid grid-cols-3 gap-2 h-auto mb-2">
                            {/* 4. Drum Magnets */}
                            <MachineCard title="درام مگنت‌ها" icon={Magnet} colorClass="bg-gray-50 border-gray-300" isActive={true}>
                                <div className="mb-1 text-blue-700">
                                    <strong>خط A :</strong> {reportData.drumMagnets.lineA.active ? 'فعال' : 'غیرفعال'}
                                    {reportData.drumMagnets.lineA.active && (
                                    <div className="text-[8px] opacity-70 flex flex-wrap gap-1">
                                        {[reportData.drumMagnets.lineA.single ? 'تکی' : '', reportData.drumMagnets.lineA.upper ? 'بالا' : '', reportData.drumMagnets.lineA.middle ? 'وسط' : '', reportData.drumMagnets.lineA.lower ? 'پایین' : ''].filter(Boolean).map(t=><span key={t} className="bg-blue-100 px-1 rounded">{t}</span>)}
                                    </div>
                                    )}
                                </div>
                                <div className="text-red-700">
                                    <strong>خط B :</strong> {reportData.drumMagnets.lineB.active ? 'فعال' : 'غیرفعال'}
                                    {reportData.drumMagnets.lineB.active && (
                                    <div className="text-[8px] opacity-70 flex flex-wrap gap-1">
                                        {[reportData.drumMagnets.lineB.single ? 'تکی' : '', reportData.drumMagnets.lineB.upper ? 'بالا' : '', reportData.drumMagnets.lineB.middle ? 'وسط' : '', reportData.drumMagnets.lineB.lower ? 'پایین' : ''].filter(Boolean).map(t=><span key={t} className="bg-red-100 px-1 rounded">{t}</span>)}
                                    </div>
                                    )}
                                </div>
                            </MachineCard>

                            {/* 5. Concentrate Filters */}
                            <MachineCard title="فیلترهای کنسانتره" icon={Filter} colorClass="bg-indigo-50 border-indigo-200" isActive={true}>
                                <div className="mb-1 flex justify-between items-center text-[8px]">
                                    <strong className="text-blue-700 text-[9px]">خط A:</strong> 
                                    {reportData.concentrateFilters.lineA.active ? (
                                        <span>{reportData.concentrateFilters.lineA.cloths.length} پارچه <span className="opacity-70">({reportData.concentrateFilters.lineA.hours})</span></span>
                                    ) : 'خاموش'}
                                </div>
                                <div className="mb-1 flex justify-between items-center text-[8px]">
                                    <strong className="text-red-700 text-[9px]">خط B:</strong> 
                                    {reportData.concentrateFilters.lineB.active ? (
                                        <span>{reportData.concentrateFilters.lineB.cloths.length} پارچه <span className="opacity-70">({reportData.concentrateFilters.lineB.hours})</span></span>
                                    ) : 'خاموش'}
                                </div>
                                <div className="flex justify-between items-center text-[8px]">
                                    <strong className="text-gray-600 text-[9px]">رزرو:</strong> 
                                    {reportData.concentrateFilters.reserve.active ? (
                                        <span>{reportData.concentrateFilters.reserve.cloths.length} پارچه <span className="opacity-70">({reportData.concentrateFilters.reserve.hours})</span></span>
                                    ) : 'خاموش'}
                                </div>
                            </MachineCard>

                            {/* 6. Recovery Filters */}
                            <MachineCard title="فیلترهای بازیافت" icon={Recycle} colorClass="bg-green-50 border-green-200" isActive={true}>
                                <div className="grid grid-cols-2 gap-1 h-full">
                                    {/* Col 1: Line A */}
                                    <div className="border-l border-dashed border-green-200 pl-1">
                                         <strong className="text-blue-700 text-[9px] block mb-1">خط A</strong>
                                         {reportData.recoveryFilters.lineA.map((f:any, i:number) => (
                                             <div key={i} className="mb-1">
                                                 <div className="flex justify-between text-[8px]">
                                                     <span>#{i+1}</span>
                                                     {f.active ? <span>{f.hours}</span> : <span className="text-gray-300">-</span>}
                                                 </div>
                                                 {f.active && <div className="text-[8px] text-right text-gray-500">{f.cloths.length} پارچه</div>}
                                             </div>
                                         ))}
                                    </div>
                                    {/* Col 2: Line B */}
                                    <div>
                                         <strong className="text-red-700 text-[9px] block mb-1">خط B</strong>
                                         {reportData.recoveryFilters.lineB.map((f:any, i:number) => (
                                             <div key={i} className="mb-1">
                                                 <div className="flex justify-between text-[8px]">
                                                     <span>#{i+1}</span>
                                                     {f.active ? <span>{f.hours}</span> : <span className="text-gray-300">-</span>}
                                                 </div>
                                                 {f.active && <div className="text-[8px] text-right text-gray-500">{f.cloths.length} پارچه</div>}
                                             </div>
                                         ))}
                                    </div>
                                </div>
                            </MachineCard>
                        </div>

                        {/* ROW 3: Thickeners */}
                        <div className="grid grid-cols-2 gap-2 h-auto">
                            {/* 7. Thickeners A */}
                            <MachineCard title="تیکنرهای خط A" icon={Droplet} colorClass="bg-blue-50 border-blue-200" isActive={true}>
                                {reportData.thickeners.lineA.map((t:any, i:number) => {
                                    if (!t.active) return <div key={i} className="mb-1 border-b border-dashed border-blue-300 pb-1 opacity-50"><span className="font-bold">#{i+1} :</span> خاموش</div>;
                                    return (
                                    <div key={i} className="mb-1 border-b border-dashed border-blue-300 pb-1 last:border-0">
                                        <div className="flex justify-between font-bold text-[9px]"><span>#{i+1}</span> <span>{t.hoursWorked} ساعت</span></div>
                                        <div className="grid grid-cols-4 gap-1 text-[7px] mt-0.5 text-center">
                                            {THICKENER_TIMES.map(tm => t.data[tm] ? (
                                                <div key={tm} className="bg-white/60 p-0.5 rounded flex flex-col">
                                                    <span className="font-bold border-b border-blue-100">{tm}</span>
                                                    <span>P:{t.data[tm].pressure}</span>
                                                    <span>J:{t.data[tm].jack}</span>
                                                    <span>M:{t.data[tm].mudLine}</span>
                                                </div>
                                            ) : null)}
                                        </div>
                                    </div>
                                    )
                                })}
                            </MachineCard>

                            {/* 8. Thickeners B */}
                            <MachineCard title="تیکنرهای خط B" icon={Droplet} colorClass="bg-red-50 border-red-200" isActive={true}>
                                {reportData.thickeners.lineB.map((t:any, i:number) => {
                                    if (!t.active) return <div key={i} className="mb-1 border-b border-dashed border-red-300 pb-1 opacity-50"><span className="font-bold">#{i+1} :</span> خاموش</div>;
                                    return (
                                    <div key={i} className="mb-1 border-b border-dashed border-red-300 pb-1 last:border-0">
                                        <div className="flex justify-between font-bold text-[9px]"><span>#{i+1}</span> <span>{t.hoursWorked} ساعت</span></div>
                                        <div className="grid grid-cols-4 gap-1 text-[7px] mt-0.5 text-center">
                                            {THICKENER_TIMES.map(tm => t.data[tm] ? (
                                                <div key={tm} className="bg-white/60 p-0.5 rounded flex flex-col">
                                                    <span className="font-bold border-red-100 border-b">{tm}</span>
                                                    <span>P:{t.data[tm].pressure}</span>
                                                    <span>J:{t.data[tm].jack}</span>
                                                    <span>M:{t.data[tm].mudLine}</span>
                                                </div>
                                            ) : null)}
                                        </div>
                                    </div>
                                    )
                                })}
                            </MachineCard>
                        </div>
                    </div>

                    {/* Descriptions */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 min-h-[160px]">
                        <h3 className="font-bold text-yellow-800 border-b border-yellow-200 pb-1 mb-2 text-xs">توضیحات کلی شیفت</h3>
                        <div className="text-xs leading-relaxed text-justify p-2">
                            {reportData.downtime.generalDescription.map((desc: string, i: number) => (
                                <p key={i} className="mb-2 border-b border-dashed border-yellow-100 pb-1 last:border-0">• {desc}</p>
                            ))}
                            {reportData.downtime.generalDescription.length === 0 && <span className="text-gray-400">موردی ثبت نشده است.</span>}
                        </div>
                    </div>

                    {/* Next Shift */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-auto min-h-[80px]">
                        <h3 className="font-bold text-green-800 border-b border-green-200 pb-1 mb-2 text-xs">اقدامات لازم برای شیفت بعد</h3>
                        <div className="text-xs leading-relaxed text-justify p-2">
                            {reportData.footer.nextShiftActions.map((action: string, i: number) => (
                                <p key={i} className="mb-2 border-b border-dashed border-green-100 pb-1 last:border-0">• {action}</p>
                            ))}
                            {reportData.footer.nextShiftActions.length === 0 && <span className="text-gray-400">موردی ثبت نشده است.</span>}
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-auto pt-4 pb-4">
                        <div className="grid grid-cols-3 gap-8 text-center">
                            <div className="flex flex-col gap-8">
                                <span className="font-bold text-xs text-gray-700">سرپرست شیفت</span>
                                <div className="border-b border-gray-300 w-3/4 mx-auto"></div>
                                <span className="text-[10px] text-gray-500">{reportData.shiftInfo.supervisorName}</span>
                            </div>
                            <div className="flex flex-col gap-8">
                                <span className="font-bold text-xs text-gray-700">کارشناس فرآیند</span>
                                <div className="border-b border-gray-300 w-3/4 mx-auto"></div>
                            </div>
                            <div className="flex flex-col gap-8">
                                <span className="font-bold text-xs text-gray-700">رئیس تولید</span>
                                <div className="border-b border-gray-300 w-3/4 mx-auto"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
