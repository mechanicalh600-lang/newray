
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SnowEffect } from './components/SnowEffect';
import { ChatAssistant } from './components/ChatAssistant'; 
import { SplashScreen } from './components/SplashScreen'; 
import { User, UserRole } from './types';
import { getShamsiDate, getTime, getPublicIp } from './utils';
import { supabase } from './supabaseClient';
import { Loader2 } from 'lucide-react';

// FIX: The following lazy-loaded components have been updated to include default exports.
// This resolves the TypeScript error "Property 'default' is missing".
const Login = React.lazy(() => import('./pages/Login'));
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

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-full w-full min-h-[400px]">
    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
    <span className="text-gray-500 text-sm">در حال بارگذاری...</span>
  </div>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [inactivityLimit, setInactivityLimit] = useState(300000); // Default 5 mins (ms)
  
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('currentUser');
      return null;
    }
  });
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [snowMode, setSnowMode] = useState<boolean>(() => {
    return localStorage.getItem('snowMode') === 'true';
  });

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeInsertSystemLog = useCallback(async (payload: any) => {
    try {
      const { error } = await supabase.from('system_logs').insert([payload]);
      if (!error) return;

      // If user_id is not linked to app_users (FK violation), retry without user_id.
      if (error.code === '23503') {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.user_id;
        await supabase.from('system_logs').insert([fallbackPayload]);
        return;
      }

      throw error;
    } catch (e) {
      // Keep app flow stable; logging must never block user actions.
      console.warn('System log insert skipped:', e);
    }
  }, []);

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const { data, error } = await supabase
                .from('app_settings')
                .select('session_timeout_minutes, org_logo')
                .order('created_at', { ascending: true })
                .limit(1);
              if (error) throw error;
              const row = Array.isArray(data) ? data[0] : null;
              if (row && row.session_timeout_minutes) {
                  setInactivityLimit(row.session_timeout_minutes * 60000);
              }
              if (
                row?.org_logo &&
                user &&
                String(user.username || '').toLowerCase() === 'admin' &&
                !user.avatar
              ) {
                const next = { ...user, avatar: row.org_logo };
                setUser(next);
                localStorage.setItem('currentUser', JSON.stringify(next));
              }
          } catch (e) {
              console.warn("Failed to fetch settings, using defaults.");
          }
      };
      fetchSettings();
  }, [user]);

  useEffect(() => {
      const lastActivity = localStorage.getItem('lastActivityTime');
      if (lastActivity && user) {
        const diff = Date.now() - parseInt(lastActivity, 10);
        if (diff > inactivityLimit) {
          handleLogout(true);
        }
      }
  }, [user, inactivityLimit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = useCallback(async (isAuto = false) => {
    if (user) {
        const ip = await getPublicIp();
        await safeInsertSystemLog({
          user_id: user.id,
          user_name: user.fullName,
          personnel_code: user.personnelCode || '---',
          action: isAuto ? 'خروج خودکار (عدم فعالیت)' : 'خروج از سیستم',
          ip_address: ip,
          details: `Logout Time: ${getShamsiDate()} ${getTime()}`
        });
        const theme = localStorage.getItem('theme');
        const snow = localStorage.getItem('snowMode');
        localStorage.clear();
        if (theme) localStorage.setItem('theme', theme);
        if (snow) localStorage.setItem('snowMode', snow);
    }
    setUser(null);
    if (isAuto) alert(`کاربر گرامی، به دلیل عدم فعالیت بیش از ${Math.round(inactivityLimit/60000)} دقیقه، جهت امنیت از سیستم خارج شدید.`);
  }, [user, inactivityLimit, safeInsertSystemLog]);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;
    localStorage.setItem('lastActivityTime', Date.now().toString());
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    logoutTimerRef.current = setTimeout(() => {
      handleLogout(true);
    }, inactivityLimit);
  }, [user, handleLogout, inactivityLimit]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const activityHandler = () => resetInactivityTimer();
    events.forEach(event => document.addEventListener(event, activityHandler));
    resetInactivityTimer();
    return () => {
      events.forEach(event => document.removeEventListener(event, activityHandler));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = async (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    localStorage.setItem('lastActivityTime', Date.now().toString());
    const ip = await getPublicIp();
    await safeInsertSystemLog({
      user_id: newUser.id,
      user_name: newUser.fullName,
      personnel_code: newUser.personnelCode || (newUser.username === 'admin' ? '9999' : '0000'),
      action: 'ورود به سیستم',
      ip_address: ip,
      details: `Role: ${newUser.role}`
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <HashRouter>
      <SnowEffect enabled={snowMode} />
      {user && <ChatAssistant user={user} />}
      <Layout 
        user={user} 
        onLogout={() => handleLogout(false)}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
      >
          <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/work-calendar" element={user ? <WorkCalendar /> : <Navigate to="/login" />} />
                <Route path="/inbox" element={user ? <Inbox user={user} /> : <Navigate to="/login" />} />
                <Route path="/messages" element={user ? <Messages user={user} /> : <Navigate to="/login" />} />
                <Route path="/notes" element={user ? <Notes user={user} /> : <Navigate to="/login" />} />
                <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
                <Route path="/report-template-design" element={user ? <ReportTemplateDesign /> : <Navigate to="/login" />} />
                <Route path="/report-form-design" element={user?.role === UserRole.ADMIN ? <ReportFormDesign user={user} /> : <Navigate to="/" />} />
                <Route path="/report-template-preview" element={user ? <ReportTemplatePreview /> : <Navigate to="/login" />} />
                <Route path="/reports/:slug" element={user ? <DynamicReportRuntime user={user} /> : <Navigate to="/login" />} />
                
                {/* Reports Group Routes */}
                <Route path="/control-room" element={user ? <ControlRoomReport user={user} /> : <Navigate to="/login" />} />
                <Route path="/shift-report" element={user ? <ShiftHandover user={user} /> : <Navigate to="/login" />} />
                <Route path="/production-report" element={user ? <ProductionReport user={user} /> : <Navigate to="/login" />} />
                <Route path="/lab-report" element={user ? <LabReport user={user} /> : <Navigate to="/login" />} />
                <Route path="/warehouse-report" element={user ? <WarehouseReport user={user} /> : <Navigate to="/login" />} />
                <Route path="/scale-report" element={user ? <ScaleReport user={user} /> : <Navigate to="/login" />} />
                <Route path="/hse-report" element={user ? <HSEReport /> : <Navigate to="/login" />} />
                
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
                
                {/* Updated Admin Route for Dynamic Tabs */}
                <Route path="/admin" element={user?.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />
                <Route path="/admin/:tab" element={user?.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />

                <Route path="/settings" element={user ? <Settings user={user} onUpdateUser={handleUpdateUser} snowMode={snowMode} setSnowMode={setSnowMode} /> : <Navigate to="/login" />} />
                
                {/* System Config */}
                <Route path="/system-config" element={user?.role === UserRole.ADMIN ? <SystemConfig /> : <Navigate to="/" />} />
                <Route path="/data-entry-tool-settings" element={user?.role === UserRole.ADMIN ? <DataEntryToolSettings /> : <Navigate to="/" />} />
                <Route path="/software-errors" element={user?.role === UserRole.ADMIN ? <SoftwareErrors /> : <Navigate to="/" />} />
                <Route path="/data-change-tracking" element={user?.role === UserRole.ADMIN ? <DataChangeTracking /> : <Navigate to="/" />} />

                {/* NEW MODULES */}
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
};

export default App;