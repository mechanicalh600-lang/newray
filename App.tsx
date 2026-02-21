import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ReportRouteResolver } from './components/ReportRouteResolver';
import { SnowEffect } from './components/SnowEffect';
import { ChatAssistant } from './components/ChatAssistant';
import { SplashScreen } from './components/SplashScreen';
import { AppProvider, useApp } from './contexts/AppContext';
import { UserRole } from './types';
import { Loader2, Clock } from 'lucide-react';

import Login from './pages/Login';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const WorkOrders = React.lazy(() => import('./pages/WorkOrders'));
const WorkOrderList = React.lazy(() => import('./pages/WorkOrderList'));
const Inspections = React.lazy(() => import('./pages/Inspections'));
const PartRequests = React.lazy(() => import('./pages/PartRequests'));
const Documents = React.lazy(() => import('./pages/Documents'));
const Meetings = React.lazy(() => import('./pages/Meetings'));
const Suggestions = React.lazy(() => import('./pages/Suggestions'));
const PurchaseRequests = React.lazy(() => import('./pages/PurchaseRequests'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Projects = React.lazy(() => import('./pages/Projects'));
const Performance = React.lazy(() => import('./pages/Performance'));
const Inbox = React.lazy(() => import('./pages/Inbox'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Notes = React.lazy(() => import('./pages/Notes'));
const WorkflowDesigner = React.lazy(() => import('./pages/WorkflowDesigner'));
const Reports = React.lazy(() => import('./pages/Reports'));
const ListReport = React.lazy(() => import('./pages/ListReport'));
const ReportTemplateDesign = React.lazy(() => import('./pages/ReportTemplateDesign'));
const ReportFormDesign = React.lazy(() => import('./pages/ReportFormDesign'));
const ReportTemplatePreview = React.lazy(() => import('./pages/ReportTemplatePreview'));
const DynamicReportRuntime = React.lazy(() => import('./pages/DynamicReportRuntime'));
const ShiftHandover = React.lazy(() => import('./pages/ShiftHandover'));
const ProductionReport = React.lazy(() => import('./pages/ProductionReport'));
const WorkCalendar = React.lazy(() => import('./pages/WorkCalendar'));
const ControlRoomReport = React.lazy(() => import('./pages/ControlRoomReport'));
const LabReport = React.lazy(() => import('./pages/LabReport'));
const WarehouseReport = React.lazy(() => import('./pages/WarehouseReport'));
const ScaleReport = React.lazy(() => import('./pages/ScaleReport'));
const PMScheduler = React.lazy(() => import('./pages/PMScheduler'));
const BillOfMaterials = React.lazy(() => import('./pages/BillOfMaterials'));
const PermitToWork = React.lazy(() => import('./pages/PermitToWork'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const KPIs = React.lazy(() => import('./pages/KPIs'));
const Training = React.lazy(() => import('./pages/Training'));
const TrainingCourses = React.lazy(() => import('./pages/TrainingCourses'));
const Integration = React.lazy(() => import('./pages/Integration'));
const HSEReport = React.lazy(() => import('./pages/HSEReport'));
const SystemConfig = React.lazy(() => import('./pages/SystemConfig'));
const DataEntryToolSettings = React.lazy(() => import('./pages/DataEntryToolSettings'));
const SoftwareErrors = React.lazy(() => import('./pages/SoftwareErrors'));
const DataChangeTracking = React.lazy(() => import('./pages/DataChangeTracking'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-full w-full min-h-[400px]">
    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
    <span className="text-gray-500 text-sm">در حال بارگذاری...</span>
  </div>
);

function AppBody() {
  const { user, darkMode, setDarkMode, snowMode, setSnowMode, showSplash, autoLogoutModal, setAutoLogoutModal, handleLogin, handleLogout, handleUpdateUser } = useApp();

  if (showSplash) return <SplashScreen />;

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
      {user && <ChatAssistant user={user} />}
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
            <Route path="/report-template-design" element={user ? <ReportTemplateDesign /> : <Navigate to="/login" />} />
            <Route path="/report-form-design" element={user?.role === UserRole.ADMIN ? <ReportFormDesign user={user} /> : <Navigate to="/" />} />
            <Route path="/report-template-preview" element={user ? <ReportTemplatePreview /> : <Navigate to="/login" />} />
            <Route path="/reports/:slug" element={user ? <DynamicReportRuntime user={user} /> : <Navigate to="/login" />} />
            <Route path="/control-room" element={user ? <ReportRouteResolver path="/control-room" FallbackComponent={ControlRoomReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/shift-report" element={user ? <ReportRouteResolver path="/shift-report" FallbackComponent={ShiftHandover} user={user} /> : <Navigate to="/login" />} />
            <Route path="/production-report" element={user ? <ReportRouteResolver path="/production-report" FallbackComponent={ProductionReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/lab-report" element={user ? <ReportRouteResolver path="/lab-report" FallbackComponent={LabReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/warehouse-report" element={user ? <ReportRouteResolver path="/warehouse-report" FallbackComponent={WarehouseReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/scale-report" element={user ? <ReportRouteResolver path="/scale-report" FallbackComponent={ScaleReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/hse-report" element={user ? <ReportRouteResolver path="/hse-report" FallbackComponent={HSEReport} user={user} /> : <Navigate to="/login" />} />
            <Route path="/work-orders" element={user ? <WorkOrderList /> : <Navigate to="/login" />} />
            <Route path="/work-orders/new" element={user ? <WorkOrders /> : <Navigate to="/login" />} />
            <Route path="/projects" element={user ? <Projects user={user} /> : <Navigate to="/login" />} />
            <Route path="/performance" element={user ? <Performance user={user} /> : <Navigate to="/login" />} />
            <Route path="/part-requests" element={user ? <PartRequests user={user} /> : <Navigate to="/login" />} />
            <Route path="/inspections" element={user ? <Inspections user={user} /> : <Navigate to="/login" />} />
            <Route path="/documents" element={user ? <Documents /> : <Navigate to="/login" />} />
            <Route path="/meetings" element={user ? <Meetings user={user} /> : <Navigate to="/login" />} />
            <Route path="/suggestions" element={user ? <Suggestions user={user} /> : <Navigate to="/login" />} />
            <Route path="/purchases" element={user ? <PurchaseRequests user={user} /> : <Navigate to="/login" />} />
            <Route path="/workflow-designer" element={user?.role === UserRole.ADMIN ? <WorkflowDesigner /> : <Navigate to="/" />} />
            <Route path="/admin" element={user?.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />
            <Route path="/admin/:tab" element={user?.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />
            <Route path="/settings" element={user ? <Settings user={user} onUpdateUser={handleUpdateUser} snowMode={snowMode} setSnowMode={setSnowMode} /> : <Navigate to="/login" />} />
            <Route path="/system-config" element={user?.role === UserRole.ADMIN ? <SystemConfig /> : <Navigate to="/" />} />
            <Route path="/data-entry-tool-settings" element={user?.role === UserRole.ADMIN ? <DataEntryToolSettings /> : <Navigate to="/" />} />
            <Route path="/software-errors" element={user?.role === UserRole.ADMIN ? <SoftwareErrors /> : <Navigate to="/" />} />
            <Route path="/data-change-tracking" element={user?.role === UserRole.ADMIN ? <DataChangeTracking /> : <Navigate to="/" />} />
            <Route path="/pm-scheduler" element={user ? <PMScheduler user={user} /> : <Navigate to="/login" />} />
            <Route path="/bom" element={user ? <BillOfMaterials user={user} /> : <Navigate to="/login" />} />
            <Route path="/permits" element={user ? <PermitToWork user={user} /> : <Navigate to="/login" />} />
            <Route path="/inventory" element={user ? <Inventory /> : <Navigate to="/login" />} />
            <Route path="/kpis" element={user ? <KPIs /> : <Navigate to="/login" />} />
            <Route path="/training" element={user ? <Training /> : <Navigate to="/login" />} />
            <Route path="/training-courses" element={user ? <TrainingCourses /> : <Navigate to="/login" />} />
            <Route path="/integration" element={user ? <Integration /> : <Navigate to="/login" />} />
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
