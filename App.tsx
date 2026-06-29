import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ReportRouteResolver } from './components/ReportRouteResolver';
import { useCustomReportModules } from './components/DynamicReportModuleRoutes';

const ReportModulePage = React.lazy(() =>
  import('./components/ReportModulePage').then(m => ({ default: m.ReportModulePage }))
);
import { SnowEffect } from './components/SnowEffect';
import { SplashScreen } from './components/SplashScreen';
import { AppProvider, useApp } from './contexts/AppContext';
import { UserRole } from './types';
import { Loader2, Clock } from 'lucide-react';

const Login = React.lazy(() => import('./pages/auth/Login'));
const ChatAssistant = React.lazy(() =>
  import('./components/ChatAssistant').then(m => ({ default: m.ChatAssistant }))
);
const Dashboard = React.lazy(() => import('./pages/core/Dashboard'));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel'));
const WorkOrders = React.lazy(() => import('./pages/maintenance/WorkOrders'));
const WorkOrderList = React.lazy(() => import('./pages/maintenance/WorkOrderList'));
const Inspections = React.lazy(() => import('./pages/maintenance/Inspections'));
const PartRequests = React.lazy(() => import('./pages/supply/PartRequests'));
const Documents = React.lazy(() => import('./pages/engineering/Documents'));
const Meetings = React.lazy(() => import('./pages/engineering/Meetings'));
const Suggestions = React.lazy(() => import('./pages/engineering/Suggestions'));
const PurchaseRequests = React.lazy(() => import('./pages/supply/PurchaseRequests'));
const Settings = React.lazy(() => import('./pages/core/Settings'));
const Projects = React.lazy(() => import('./pages/engineering/Projects'));
const Performance = React.lazy(() => import('./pages/hr/Performance'));
const Inbox = React.lazy(() => import('./pages/workflow/Inbox'));
const Messages = React.lazy(() => import('./pages/workflow/Messages'));
const Notes = React.lazy(() => import('./pages/workflow/Notes'));
const WorkflowDesigner = React.lazy(() => import('./pages/workflow/WorkflowDesigner'));
const ProcessDesign = React.lazy(() => import('./pages/workflow/ProcessDesign'));
const ProcessFormDesign = React.lazy(() => import('./pages/workflow/ProcessFormDesign'));
const ProcessFormRoute = React.lazy(() => import('./components/ProcessFormRoute'));
const Reports = React.lazy(() => import('./pages/reports/Reports'));
const ListReport = React.lazy(() => import('./pages/reports/ListReport'));
const ReportDesign = React.lazy(() => import('./pages/reports/ReportDesign'));
const ReportTemplateDesign = React.lazy(() => import('./pages/reports/ReportTemplateDesign'));
const ReportFormDesign = React.lazy(() => import('./pages/reports/ReportFormDesign'));
const ReportTemplatePreview = React.lazy(() => import('./pages/reports/ReportTemplatePreview'));
const DynamicReportRuntime = React.lazy(() => import('./pages/reports/DynamicReportRuntime'));
const ShiftHandover = React.lazy(() => import('./pages/reports/ShiftHandover'));
const ProductionReport = React.lazy(() => import('./pages/reports/ProductionReport'));
const WorkCalendar = React.lazy(() => import('./pages/core/WorkCalendar'));
const ControlRoomReport = React.lazy(() => import('./pages/reports/ControlRoomReport'));
const LabReport = React.lazy(() => import('./pages/reports/LabReport'));
const WarehouseReport = React.lazy(() => import('./pages/reports/WarehouseReport'));
const ScaleReport = React.lazy(() => import('./pages/reports/ScaleReport'));
const PMScheduler = React.lazy(() => import('./pages/maintenance/PMScheduler'));
const BillOfMaterials = React.lazy(() => import('./pages/engineering/BillOfMaterials'));
const PermitToWork = React.lazy(() => import('./pages/hse/PermitToWork'));
const Inventory = React.lazy(() => import('./pages/supply/Inventory'));
const KPIs = React.lazy(() => import('./pages/maintenance/KPIs'));
const Training = React.lazy(() => import('./pages/hr/Training'));
const TrainingCourses = React.lazy(() => import('./pages/hr/TrainingCourses'));
const Integration = React.lazy(() => import('./pages/core/Integration'));
const HSEReport = React.lazy(() => import('./pages/reports/HSEReport'));
const SystemConfig = React.lazy(() => import('./pages/system/SystemConfig'));
const DataEntryToolSettings = React.lazy(() => import('./pages/system/DataEntryToolSettings'));
const SoftwareErrors = React.lazy(() => import('./pages/system/SoftwareErrors'));
const DataChangeTracking = React.lazy(() => import('./pages/system/DataChangeTracking'));
const ServiceRepair = React.lazy(() => import('./pages/maintenance/ServiceRepair'));
const Missions = React.lazy(() => import('./pages/hr/Missions'));
const FactoryExit = React.lazy(() => import('./pages/supply/FactoryExit'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-full w-full min-h-[400px]">
    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
    <span className="text-gray-500 text-sm">در حال بارگذاری...</span>
  </div>
);

function AppBody() {
  const { user, darkMode, setDarkMode, snowMode, setSnowMode, showSplash, autoLogoutModal, setAutoLogoutModal, handleLogin, handleLogout, handleUpdateUser } = useApp();
  const customReportModules = useCustomReportModules(!!user);

  if (showSplash) return <SplashScreen />;

  const processForm = (slug: string, Legacy: React.ComponentType<any>) =>
    user ? <ProcessFormRoute slug={slug} user={user} LegacyComponent={Legacy} /> : <Navigate to="/login" />;

  return (
    <HashRouter>
      <SnowEffect enabled={snowMode} />
      {autoLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-visible border border-gray-200 dark:border-gray-600">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center ring-4 ring-white dark:ring-gray-800">
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </div>
            </div>
            <div className="p-6 pt-12 flex flex-col items-center text-center">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">پایان نشست کاربری</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                کاربر گرامی، به دلیل عدم فعالیت به مدت <span className="font-bold text-primary">{autoLogoutModal.minutes}</span> دقیقه، جهت حفظ امنیت از سیستم خارج شدید.
              </p>
              <button
                onClick={() => setAutoLogoutModal(null)}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
      {user && (import.meta.env.VITE_GEMINI_API_KEY || '').trim() && (
        <Suspense fallback={null}>
          <ChatAssistant user={user} />
        </Suspense>
      )}
      <Layout user={user} onLogout={() => handleLogout(false)} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/work-calendar" element={user ? <WorkCalendar /> : <Navigate to="/login" />} />
            <Route path="/inbox" element={user ? <Inbox user={user} /> : <Navigate to="/login" />} />
            <Route path="/messages" element={user ? <Messages user={user} /> : <Navigate to="/login" />} />
            <Route path="/notes" element={user ? <Notes user={user} /> : <Navigate to="/login" />} />
            <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
            <Route path="/list-report" element={user ? <ListReport /> : <Navigate to="/login" />} />
            <Route path="/list-report/new" element={user ? <ListReport /> : <Navigate to="/login" />} />
            <Route path="/list-report/edit/:id" element={user ? <ListReport /> : <Navigate to="/login" />} />
            <Route path="/report-design" element={user?.role === UserRole.ADMIN ? <ReportDesign user={user} /> : <Navigate to="/" />} />
            <Route path="/report-template-design" element={user ? <ReportTemplateDesign /> : <Navigate to="/login" />} />
            <Route path="/report-form-design" element={user?.role === UserRole.ADMIN ? <ReportFormDesign user={user} /> : <Navigate to="/" />} />
            <Route path="/report-template-preview" element={user ? <ReportTemplatePreview /> : <Navigate to="/login" />} />
            <Route path="/reports/:slug" element={user ? <DynamicReportRuntime user={user} /> : <Navigate to="/login" />} />
            <Route
              path="/control-room"
              element={
                user ? (
                  <ReportRouteResolver
                    path="/control-room"
                    FallbackComponent={ControlRoomReport}
                    user={user}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="/shift-report" element={user ? <ReportRouteResolver path="/shift-report" FallbackComponent={ShiftHandover} user={user} /> : <Navigate to="/login" />} />
            <Route path="/production-report" element={user ? <ReportRouteResolver path="/production-report" FallbackComponent={ProductionReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/lab-report" element={user ? <ReportRouteResolver path="/lab-report" FallbackComponent={LabReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/warehouse-report" element={user ? <ReportRouteResolver path="/warehouse-report" FallbackComponent={WarehouseReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/scale-report" element={user ? <ReportRouteResolver path="/scale-report" FallbackComponent={ScaleReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/hse-report" element={user ? <ReportRouteResolver path="/hse-report" FallbackComponent={HSEReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/work-orders" element={user ? <WorkOrderList /> : <Navigate to="/login" />} />
            <Route path="/work-orders/new" element={processForm('work-order', WorkOrders)} />
            <Route path="/projects" element={processForm('project', Projects)} />
            <Route path="/performance" element={processForm('performance', Performance)} />
            <Route path="/missions" element={processForm('mission', Missions)} />
            <Route path="/part-requests" element={processForm('part-request', PartRequests)} />
            <Route path="/inspections" element={user ? <Inspections user={user} /> : <Navigate to="/login" />} />
            <Route path="/service-repair" element={processForm('service-repair', ServiceRepair)} />
            <Route path="/documents" element={processForm('tech-doc', Documents)} />
            <Route path="/meetings" element={processForm('meeting', Meetings)} />
            <Route path="/suggestions" element={processForm('suggestion', Suggestions)} />
            <Route path="/purchases" element={processForm('purchase', PurchaseRequests)} />
            <Route path="/factory-exit" element={processForm('factory-exit', FactoryExit)} />
            <Route path="/process-design" element={user?.role === UserRole.ADMIN ? <ProcessDesign user={user} /> : <Navigate to="/" />} />
            <Route path="/process-form-design" element={user?.role === UserRole.ADMIN ? <ProcessFormDesign user={user} /> : <Navigate to="/" />} />
            <Route path="/workflow-designer" element={user?.role === UserRole.ADMIN ? <WorkflowDesigner /> : <Navigate to="/" />} />
            <Route path="/admin" element={user?.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />
            <Route path="/admin/:tab" element={user?.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />
            <Route path="/settings" element={user ? <Settings user={user} onUpdateUser={handleUpdateUser} snowMode={snowMode} setSnowMode={setSnowMode} /> : <Navigate to="/login" />} />
            <Route path="/system-config" element={user?.role === UserRole.ADMIN ? <SystemConfig /> : <Navigate to="/" />} />
            <Route path="/data-entry-tool-settings" element={user?.role === UserRole.ADMIN ? <DataEntryToolSettings /> : <Navigate to="/" />} />
            <Route path="/software-errors" element={user?.role === UserRole.ADMIN ? <SoftwareErrors /> : <Navigate to="/" />} />
            <Route path="/data-change-tracking" element={user?.role === UserRole.ADMIN ? <DataChangeTracking /> : <Navigate to="/" />} />
            <Route path="/pm-scheduler" element={processForm('pm-plan', PMScheduler)} />
            <Route path="/bom" element={user ? <BillOfMaterials user={user} /> : <Navigate to="/login" />} />
            <Route path="/permits" element={processForm('permit', PermitToWork)} />
            <Route path="/inventory" element={user ? <Inventory /> : <Navigate to="/login" />} />
            <Route path="/kpis" element={user ? <KPIs /> : <Navigate to="/login" />} />
            <Route path="/training" element={processForm('personnel-skill', Training)} />
            <Route path="/training-courses" element={processForm('training-course', TrainingCourses)} />
            <Route path="/integration" element={user ? <Integration /> : <Navigate to="/login" />} />
            {customReportModules.map(mod => (
              <Route
                key={mod.id}
                path={mod.path}
                element={
                  user ? (
                    <Suspense fallback={<PageLoader />}>
                      <ReportModulePage user={user} module={mod} />
                    </Suspense>
                  ) : (
                    <Navigate to="/login" />
                  )
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  );
}

const App: React.FC = () => (
  <AppProvider>
    <AppBody />
  </AppProvider>
);

export default App;
