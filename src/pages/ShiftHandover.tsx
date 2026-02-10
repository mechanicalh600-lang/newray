
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Clipboard, X, Save, Trash2, Plus, FileSpreadsheet, RefreshCw, Eye, Printer, Edit, ArrowRight, ArrowLeft, Loader2
} from 'lucide-react';
import { getShamsiDate } from '../utils';
import { fetchMasterData, fetchShiftReports, saveShiftReport, fetchNextTrackingCode } from '../workflowStore';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { DataPage } from '../components/DataPage';
import * as XLSX from 'xlsx';
import { 
    parseTimeToMinutes,
    AttendanceStatus, LeaveType, FeedInput, TABS, SHIFT_TYPE_MAP,
    ShiftReportData
} from './ShiftHandoverTypes';
import { 
    TabProduction, TabMills, TabHydrocyclones, TabDrumMagnets, 
    TabConcentrateFilters, TabThickeners, TabRecoveryFilters, TabDowntime 
} from './ShiftHandoverTabs';
import { ShiftReportView } from './ShiftHandoverReport';
import { SHIFT_REPORT_COLUMNS, INITIAL_SHIFT_INFO, INITIAL_PRODUCTION, INITIAL_DOWNTIME } from './ShiftHandoverConfig';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';

interface Props {
  user: User;
}

export const ShiftHandover: React.FC<Props> = ({ user }) => {
  // --- View State ---
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'VIEW'>('LIST');
  const [loading, setLoading] = useState(false);
  
  // --- List Data State ---
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterShiftType, setFilterShiftType] = useState('ALL');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- Form Data State ---
  const [activeTab, setActiveTab] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  
  // Report View Data
  const [reportData, setReportData] = useState<ShiftReportData | null>(null);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [personnel, setPersonnel] = useState<any[]>([]);

  // --- Form Fields ---
  const [shiftInfo, setShiftInfo] = useState(INITIAL_SHIFT_INFO(user));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [leaveTypes, setLeaveTypes] = useState<Record<string, LeaveType>>({}); 
  const [production, setProduction] = useState<any>(INITIAL_PRODUCTION);
  const [feedInfo, setFeedInfo] = useState<{lineA: any, lineB: any}>({ lineA: {}, lineB: {} });
  const [feedLinesActive, setFeedLinesActive] = useState<{lineA: boolean, lineB: boolean}>({ lineA: true, lineB: true });
  const [ballMills, setBallMills] = useState({
      lineA: { primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] }, secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] } },
      lineB: { primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] }, secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] } }
  });
  const [hydrocyclones, setHydrocyclones] = useState({
      lineA: { primary: { active: false, activeCyclones: [], pressure08: '', angle08: '', pressure02: '', angle02: '' }, secondary: { active: false, activeCyclones: [], pressure08: '', angle08: '', pressure02: '', angle02: '' } },
      lineB: { primary: { active: false, activeCyclones: [], pressure08: '', angle08: '', pressure02: '', angle02: '' }, secondary: { active: false, activeCyclones: [], pressure08: '', angle08: '', pressure02: '', angle02: '' } }
  });
  const [drumMagnets, setDrumMagnets] = useState({
      lineA: { active: false, single: false, upper: false, middle: false, lower: false, description: '' },
      lineB: { active: false, single: false, upper: false, middle: false, lower: false, description: '' }
  });
  const [concentrateFilters, setConcentrateFilters] = useState({
      lineA: { active: false, operator: '', hours: '', cloths: [] },
      lineB: { active: false, operator: '', hours: '', cloths: [] },
      reserve: { active: false, operator: '', hours: '', cloths: [] }
  });
  const [thickeners, setThickeners] = useState<{lineA: any[]; lineB: any[];}>({
      lineA: Array(3).fill(null).map(() => ({ active: false, hoursWorked: '', channelOutput: '', description: '', data: {} })),
      lineB: Array(3).fill(null).map(() => ({ active: false, hoursWorked: '', channelOutput: '', description: '', data: {} }))
  });
  const [recoveryFilters, setRecoveryFilters] = useState({
      lineA: [{ active: false, operator: '', hours: '', cloths: [] }, { active: false, operator: '', hours: '', cloths: [] }],
      lineB: [{ active: false, operator: '', hours: '', cloths: [] }, { active: false, operator: '', hours: '', cloths: [] }]
  });
  const [pumps, setPumps] = useState({ process: [], cleanWater: [] });
  const [downtime, setDowntime] = useState<any>(INITIAL_DOWNTIME);
  const [footer, setFooter] = useState({ nextShiftActions: [''] as string[] });

  // --- Effects ---
  useEffect(() => {
      fetchMasterData('personnel').then(setPersonnel);
      loadReports();
      fetchAdminAvatar();
      setShiftInfo(prev => ({ ...prev, date: getShamsiDate() }));
  }, []);

  useEffect(() => {
      let res = reportsList;
      if (filterDate) res = res.filter(i => i.shift_date === filterDate);
      if (filterShiftType !== 'ALL') res = res.filter(i => i.shift_type === filterShiftType);
      setFilteredItems(res);
  }, [filterDate, filterShiftType, reportsList]);

  // --- Logic ---
  const fetchAdminAvatar = async () => {
      const { data } = await supabase.from('app_users').select('avatar').eq('role', 'ADMIN').limit(1).single();
      if(data) setAdminAvatar(data.avatar);
  };

  const loadReports = async () => {
      setLoading(true);
      try {
          const data = await fetchShiftReports();
          const formattedData = data.map((d: any) => ({
              ...d,
              total_production_a: Number(d.total_production_a),
              total_production_b: Number(d.total_production_b)
          }));
          setReportsList(formattedData);
          setFilteredItems(formattedData);
      } catch (e) {
          console.error("Error loading reports", e);
      } finally {
          setLoading(false);
      }
  };

  const confirmDelete = async () => {
      try {
          const { error } = await supabase.from('shift_reports').delete().in('id', selectedIds);
          if (error) throw error;
          setReportsList(prev => prev.filter(i => !selectedIds.includes(i.id)));
          setSelectedIds([]);
          setIsDeleteModalOpen(false);
      } catch (e: any) {
          alert("خطا در حذف: " + e.message);
      }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? filteredItems.filter(i => selectedIds.includes(i.id)) : filteredItems;
    if (dataToExport.length === 0) { alert('داده‌ای برای گزارش وجود ندارد.'); return; }
    
    const rows = dataToExport.map(item => ({ 
        "کد گزارش": item.tracking_code, 
        "تاریخ": item.shift_date, 
        "شیفت": item.shift_name, 
        "نوع شیفت": SHIFT_TYPE_MAP[item.shift_type] || item.shift_type, 
        "سرپرست": item.supervisor_name, 
        "خوراک A": item.total_production_a, 
        "خوراک B": item.total_production_b 
    }));
    
    const ws = XLSX.utils.json_to_sheet(rows); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "ShiftReports"); 
    XLSX.writeFile(wb, `shift_reports_${Date.now()}.xlsx`);
  };

  const handleCreateNew = () => {
      // Reset all states
      setShiftInfo({ ...INITIAL_SHIFT_INFO(user), date: getShamsiDate() });
      setProduction(INITIAL_PRODUCTION);
      setDowntime(INITIAL_DOWNTIME);
      setFeedInfo({ lineA: {}, lineB: {} });
      setAttendanceMap({});
      setBallMills({
          lineA: { primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] }, secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] } },
          lineB: { primary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] }, secondary: { active: false, amp08: '', amp02: '', dens08: '', dens02: '', ballSize: '', barrelCount: '', charges: [] } }
      });
      // ... reset other complex states if needed ...
      
      setViewMode('FORM');
      setActiveTab(1);
  };

  const handleEdit = (item: any) => {
      const data = item.full_data;
      if(data) {
          setShiftInfo(data.shiftInfo); setProduction(data.production); setFeedInfo(data.feedInfo || { lineA: {}, lineB: {} });
          setBallMills(data.ballMills); setHydrocyclones(data.hydrocyclones); setDrumMagnets(data.drumMagnets);
          setConcentrateFilters(data.concentrateFilters); setThickeners(data.thickeners); setRecoveryFilters(data.recoveryFilters);
          setPumps(data.pumps); setDowntime(data.downtime); setFooter(data.footer); setAttendanceMap(data.attendanceMap || {});
          setLeaveTypes(data.leaveTypes || {});
      }
      setViewMode('FORM'); 
      setActiveTab(1);
  };

  const handleViewDetails = (item: any) => {
      setReportData(item.full_data); 
      setViewMode('VIEW'); 
  };

  const handleConfirmSubmit = async () => {
      setIsSubmitting(true);
      try {
          const code = await fetchNextTrackingCode('T');
          const payload: ShiftReportData = {
              code,
              shiftInfo,
              production,
              feedInfo,
              ballMills,
              hydrocyclones,
              drumMagnets,
              concentrateFilters,
              thickeners,
              recoveryFilters,
              pumps,
              downtime,
              footer,
              totalA: (Object.values(production.lineA || {}) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0),
              totalB: (Object.values(production.lineB || {}) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0),
              attendanceMap,
              leaveTypes
          };
          await saveShiftReport(payload);
          alert('گزارش با موفقیت ثبت شد.');
          setIsConfirmSubmitOpen(false);
          setReportData(payload);
          setViewMode('VIEW');
          loadReports(); 
      } catch (e: any) {
          alert('خطا در ثبت گزارش: ' + e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const validateAllTabs = (): boolean => {
      if (!shiftInfo.date || !shiftInfo.shiftDuration) return false;
      const shiftMins = parseTimeToMinutes(shiftInfo.shiftDuration);
      const totalA = parseTimeToMinutes(downtime.lineA.workTime) + parseTimeToMinutes(downtime.lineA.stopTime);
      const totalB = parseTimeToMinutes(downtime.lineB.workTime) + parseTimeToMinutes(downtime.lineB.stopTime);
      if (totalA !== shiftMins || totalB !== shiftMins) return false;
      return true;
  };

  // --- Render Handlers for Form Logic ---
  // To avoid huge file, we keep passing props, but logic is centralized here.
  const handleTonnageChange = (line: 'lineA'|'lineB', time: string, val: string) => { 
      setProduction((prev: any) => ({...prev, [line]: {...prev[line], [time]: Number(val)}})); 
  };

  // --- Sub-Components for Filters ---
  const filterContent = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold text-gray-500 mb-1">تاریخ</label><input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600" placeholder="1403/--/--" value={filterDate} onChange={e => setFilterDate(e.target.value)}/></div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1">نوبت کاری</label><select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 outline-none" value={filterShiftType} onChange={e => setFilterShiftType(e.target.value)}><option value="ALL">همه</option><option value="Day1">روز کار اول</option><option value="Day2">روز کار دوم</option><option value="Night1">شب کار اول</option><option value="Night2">شب کار دوم</option></select></div>
      </div>
  );

  // --- VIEW: REPORT DETAIL ---
  if (viewMode === 'VIEW' && reportData) {
      return <ShiftReportView reportData={reportData} adminAvatar={adminAvatar} onBack={() => setViewMode('LIST')} />;
  }

  // --- VIEW: FORM ---
  if (viewMode === 'FORM') {
    return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Form Header */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20 py-2">
        <div className="flex items-center gap-2"><Clipboard className="w-8 h-8 text-primary" /><div><h1 className="text-2xl font-bold">ثبت گزارش شیفت جدید</h1></div></div>
        <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6"/></button>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 sticky top-16 z-10 border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex min-w-max">
              {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      <tab.icon className="w-5 h-5" /> {tab.label}
                  </button>
              ))}
          </div>
      </div>

      {/* Form Content */}
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsConfirmSubmitOpen(true); }}>
           {activeTab === 1 && (
               <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
                   <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                       <div><label className="block text-xs font-bold mb-1">شیفت</label><select value={shiftInfo.name} onChange={e => setShiftInfo({...shiftInfo, name: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm">{['A', 'B', 'C'].map(s => <option key={s} value={s}>شیفت {s}</option>)}</select></div>
                       <div><label className="block text-xs font-bold mb-1">نوبت کاری</label><select value={shiftInfo.type} onChange={e => setShiftInfo({...shiftInfo, type: e.target.value})} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none text-sm"><option value="Day1">روز کار اول</option><option value="Day2">روز کار دوم</option><option value="Night1">شب کار اول</option><option value="Night2">شب کار دوم</option></select></div>
                       <div><div className="w-full"><label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">مدت شیفت</label><ClockTimePicker value={shiftInfo.shiftDuration} onChange={t => setShiftInfo({...shiftInfo, shiftDuration: t})} /></div></div>
                       <div><label className="block text-xs font-bold mb-1">روز هفته</label><div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 text-center text-sm">-</div></div>
                       <div><div className="w-full"><label className="block text-xs font-black mb-1.5 text-gray-800 dark:text-white">تاریخ</label><ShamsiDatePicker value={shiftInfo.date} onChange={d => setShiftInfo({...shiftInfo, date: d})} /></div></div>
                       <div><label className="block text-xs font-bold mb-1">سرپرست شیفت</label><div className="w-full p-2.5 border rounded-xl bg-gray-100 dark:bg-gray-600 truncate text-sm">{shiftInfo.supervisorName}</div></div>
                   </div>
               </div>
           )}
           {activeTab === 2 && <TabProduction production={production} feedInfo={feedInfo} isReadOnly={false} handleTonnageChange={handleTonnageChange} feedLinesActive={feedLinesActive} setFeedLinesActive={setFeedLinesActive} handleFeedTypeChange={()=>{}} handleCustomFeedType={()=>{}} resetFeedType={()=>{}} handleFeedPercentChange={()=>{}} />}
           {activeTab === 3 && <TabMills ballMills={ballMills} setBallMills={setBallMills} isReadOnly={false} handleAddBallCharge={()=>{}} handleRemoveBallCharge={()=>{}} />}
           {activeTab === 4 && <TabHydrocyclones hydrocyclones={hydrocyclones} setHydrocyclones={setHydrocyclones} isReadOnly={false} />}
           {activeTab === 5 && <TabDrumMagnets drumMagnets={drumMagnets} setDrumMagnets={setDrumMagnets} isReadOnly={false} handleVoiceInputMultiline={()=>{}} />}
           {activeTab === 6 && <TabConcentrateFilters concentrateFilters={concentrateFilters} setConcentrateFilters={setConcentrateFilters} isReadOnly={false} validateDurationVsShift={()=>{return true}} personnel={personnel} attendanceMap={attendanceMap} />}
           {activeTab === 7 && <TabThickeners thickeners={thickeners} setThickeners={setThickeners} isReadOnly={false} handleThickenerMetaChange={()=>{}} handleThickenerDataChange={()=>{}} />}
           {activeTab === 8 && <TabRecoveryFilters recoveryFilters={recoveryFilters} setRecoveryFilters={setRecoveryFilters} isReadOnly={false} validateDurationVsShift={()=>{return true}} personnel={personnel} attendanceMap={attendanceMap} />}
           {activeTab === 9 && <TabDowntime downtime={downtime} setDowntime={setDowntime} footer={footer} setFooter={setFooter} pumps={pumps} setPumps={setPumps} isReadOnly={false} handleDowntimeChange={()=>{}} handleDynamicListChange={()=>{}} addDynamicRecord={()=>{}} removeDynamicRecord={()=>{}} handleVoiceInputMultiline={()=>{}} handleVoiceInputDynamic={()=>{}} shiftDuration={shiftInfo.shiftDuration} />}

           <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700 pb-20">
               <button type="button" onClick={() => setActiveTab(prev => Math.max(1, prev - 1))} disabled={activeTab === 1} className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2"><ArrowRight className="w-5 h-5" /> مرحله قبل</button>
               {activeTab === 9 ? (
                  <button type="submit" disabled={isSubmitting || !validateAllTabs()} className={`bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition font-bold flex items-center gap-2 ${(!validateAllTabs() || isSubmitting) ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''}`}>{isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <Save className="w-6 h-6" />} ثبت نهایی</button>
               ) : (
                  <button type="button" onClick={() => setActiveTab(prev => Math.min(9, prev + 1))} className="px-8 py-3 rounded-xl shadow transition font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">مرحله بعد <ArrowLeft className="w-5 h-5" /></button>
               )}
           </div>
      </form>

      <ConfirmModal 
        isOpen={isConfirmSubmitOpen}
        onClose={() => setIsConfirmSubmitOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="ثبت نهایی گزارش"
        message="آیا از صحت اطلاعات وارد شده اطمینان دارید؟"
        confirmText="بله، ثبت شود"
        variant="info"
      />
    </div>
    );
  }

  // --- VIEW: LIST (DEFAULT) ---
  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف گزارش"
        message={`آیا از حذف ${selectedIds.length} گزارش انتخاب شده اطمینان دارید؟`}
      />

      <DataPage
        title="گزارشات تولید"
        icon={Clipboard}
        data={filteredItems}
        isLoading={loading}
        columns={SHIFT_REPORT_COLUMNS.map(col => ({
            header: col.header,
            accessor: (item: any) => {
                if (col.accessor(item) === undefined) return '-';
                if (col.sortKey === 'total_production_a') return <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">{item.total_production_a}</span>;
                if (col.sortKey === 'total_production_b') return <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{item.total_production_b}</span>;
                return col.accessor(item);
            },
            sortKey: col.sortKey
        }))}
        onAdd={handleCreateNew}
        onReload={loadReports}
        onDelete={async () => setIsDeleteModalOpen(true)}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onEdit={handleEdit}
        onViewDetails={handleViewDetails}
        onPrint={(item) => handleViewDetails(item)}
        onExport={handleExport}
        exportName="ShiftReports"
      />
    </div>
  );
};

export default ShiftHandover;
