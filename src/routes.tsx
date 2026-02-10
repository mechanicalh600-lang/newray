
import React from 'react';
import { User, UserRole } from './types';

// Lazy Load Pages
const Login = React.lazy(() => import('./pages/auth/Login'));
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel'));
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

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  protected?: boolean;
  adminOnly?: boolean;
}

export const getRoutes = (
    user: User | null, 
    onLogin: (u: User) => void, 
    onUpdateUser: (u: User) => void, 
    snowMode: boolean, 
    setSnowMode: (b: boolean) => void
): RouteConfig[] => [
  { path: "/login", element: <Login onLogin={onLogin} /> },
  { path: "/", element: <Dashboard />, protected: true },
  { path: "/work-calendar", element: <WorkCalendar />, protected: true },
  { path: "/kpis", element: <KPIs />, protected: true },
  
  // Communication
  { path: "/inbox", element: user ? <Inbox user={user} /> : null, protected: true },
  { path: "/messages", element: user ? <Messages user={user} /> : null, protected: true },
  { path: "/notes", element: user ? <Notes user={user} /> : null, protected: true },
  
  // Reports
  { path: "/reports", element: <Reports />, protected: true },
  { path: "/report-template-design", element: <ReportTemplateDesign />, protected: true, adminOnly: true },
  
  // Reports Group
  { path: "/control-room", element: user ? <ControlRoomReport user={user} /> : null, protected: true },
  { path: "/shift-report", element: user ? <ShiftHandover user={user} /> : null, protected: true },
  { path: "/production-report", element: user ? <ProductionReport user={user} /> : null, protected: true },
  { path: "/lab-report", element: user ? <LabReport user={user} /> : null, protected: true },
  { path: "/warehouse-report", element: user ? <WarehouseReport user={user} /> : null, protected: true },
  { path: "/scale-report", element: user ? <ScaleReport user={user} /> : null, protected: true },
  { path: "/hse-report", element: <HSEReport />, protected: true },

  // Maintenance & Operations
  { path: "/work-orders", element: <WorkOrderList />, protected: true },
  { path: "/work-orders/new", element: <WorkOrders />, protected: true },
  { path: "/projects", element: user ? <Projects user={user} /> : null, protected: true },
  { path: "/performance", element: user ? <Performance user={user} /> : null, protected: true },
  { path: "/part-requests", element: user ? <PartRequests user={user} /> : null, protected: true },
  { path: "/inspections", element: user ? <Inspections user={user} /> : null, protected: true },
  { path: "/documents", element: <Documents />, protected: true },
  { path: "/meetings", element: user ? <Meetings user={user} /> : null, protected: true },
  { path: "/suggestions", element: user ? <Suggestions user={user} /> : null, protected: true },
  { path: "/purchases", element: user ? <PurchaseRequests user={user} /> : null, protected: true },
  
  // Admin & Settings
  { path: "/workflow-designer", element: <WorkflowDesigner />, protected: true, adminOnly: true },
  { path: "/admin", element: <AdminPanel />, protected: true, adminOnly: true },
  { path: "/admin/:tab", element: <AdminPanel />, protected: true, adminOnly: true },
  { path: "/settings", element: user ? <Settings user={user} onUpdateUser={onUpdateUser} snowMode={snowMode} setSnowMode={setSnowMode} /> : null, protected: true },
  { path: "/system-config", element: <SystemConfig />, protected: true, adminOnly: true },

  // Modules
  { path: "/pm-scheduler", element: user ? <PMScheduler user={user} /> : null, protected: true },
  { path: "/bom", element: user ? <BillOfMaterials user={user} /> : null, protected: true },
  { path: "/permits", element: user ? <PermitToWork user={user} /> : null, protected: true },
  { path: "/inventory", element: <Inventory />, protected: true },
  { path: "/kpis", element: <KPIs />, protected: true },
  { path: "/training", element: <Training />, protected: true },
  { path: "/training-courses", element: <TrainingCourses />, protected: true },
  { path: "/integration", element: <Integration />, protected: true },
];
