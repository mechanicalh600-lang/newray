
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SnowEffect } from './components/SnowEffect';
import { ChatAssistant } from './components/ChatAssistant'; 
import { SplashScreen } from './components/SplashScreen'; 
import { User, UserRole } from './types';
import { getShamsiDate, getTime, getPublicIp } from './utils';
import { supabase } from './supabaseClient';
import { Loader2 } from 'lucide-react';

// Static Imports to prevent dynamic import errors in some environments
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { WorkOrders } from './pages/WorkOrders';
import { WorkOrderList } from './pages/WorkOrderList';
import { Inspections } from './pages/Inspections';
import { PartRequests } from './pages/PartRequests';
import { Documents } from './pages/Documents';
import { Meetings } from './pages/Meetings';
import { Suggestions } from './pages/Suggestions';
import { PurchaseRequests } from './pages/PurchaseRequests';
import { Settings } from './pages/Settings';
import { Projects } from './pages/Projects';
import { Performance } from './pages/Performance';
import { Inbox } from './pages/Inbox';
import { Messages } from './pages/Messages';
import { Notes } from './pages/Notes';
import { WorkflowDesigner } from './pages/WorkflowDesigner';
import { Reports } from './pages/Reports';
import { ShiftHandover } from './pages/ShiftHandover';
import { ProductionReport } from './pages/ProductionReport';

const INACTIVITY_LIMIT = 300 * 1000; // 300 Seconds

const App: React.FC = () => {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Global State
  const [user, setUser] = useState<User | null>(() => {
    try {
      // Check for session expiry on initial load (e.g. if browser was closed)
      const lastActivity = localStorage.getItem('lastActivityTime');
      if (lastActivity) {
        const diff = Date.now() - parseInt(lastActivity, 10);
        if (diff > INACTIVITY_LIMIT) {
          localStorage.removeItem('currentUser');
          return null;
        }
      }
      
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
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

  // Splash Screen Effect
  useEffect(() => {
    // Show splash screen for 6 seconds (4s animation + 2s wait)
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // --- Auto Logout Logic ---
  const handleLogout = useCallback(async (isAuto = false) => {
    if (user) {
        // Fetch Real IP
        const ip = await getPublicIp();

        // Record Logout Log to DB
        try {
            await supabase.from('system_logs').insert([{
                user_id: user.id,
                user_name: user.fullName,
                personnel_code: user.personnelCode || '---',
                action: isAuto ? 'خروج خودکار (عدم فعالیت)' : 'خروج از سیستم',
                ip_address: ip,
                details: `Logout Time: ${getShamsiDate()} ${getTime()}`
            }]);
        } catch (error) {
            console.error("Logout logging failed:", error);
        }
        
        // Preserve settings and logs before clearing cache
        const theme = localStorage.getItem('theme');
        const snow = localStorage.getItem('snowMode');
        
        // Clear EVERYTHING to ensure fresh data fetch from DB on next login
        localStorage.clear();

        // Restore preferences
        if (theme) localStorage.setItem('theme', theme);
        if (snow) localStorage.setItem('snowMode', snow);
    }
    
    setUser(null);
    if (isAuto) alert('کاربر گرامی، به دلیل عدم فعالیت بیش از ۵ دقیقه، جهت امنیت از سیستم خارج شدید.');
  }, [user]);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;

    // Update last activity timestamp for browser restart check
    localStorage.setItem('lastActivityTime', Date.now().toString());

    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    logoutTimerRef.current = setTimeout(() => {
      handleLogout(true);
    }, INACTIVITY_LIMIT);
  }, [user, handleLogout]);

  useEffect(() => {
    if (!user) return;

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Attach listeners
    const activityHandler = () => resetInactivityTimer();
    events.forEach(event => document.addEventListener(event, activityHandler));

    // Initial start
    resetInactivityTimer();

    return () => {
      // Cleanup
      events.forEach(event => document.removeEventListener(event, activityHandler));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [user, resetInactivityTimer]);

  // Effects
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('snowMode', String(snowMode));
  }, [snowMode]);

  const handleLogin = async (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    localStorage.setItem('lastActivityTime', Date.now().toString());
    
    // --- System Log Recording (To DB) ---
    // Fetch real IP asynchronously
    try {
        const ip = await getPublicIp();
        await supabase.from('system_logs').insert([{
            user_id: newUser.id,
            user_name: newUser.fullName,
            personnel_code: newUser.personnelCode || (newUser.username === 'admin' ? '9999' : '0000'),
            action: 'ورود به سیستم',
            ip_address: ip,
            details: `Role: ${newUser.role}`
        }]);
    } catch (error) {
        console.error("Login logging failed:", error);
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  // Render Splash Screen if active
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
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            
            <Route path="/inbox" element={user ? <Inbox user={user} /> : <Navigate to="/login" />} />
            <Route path="/messages" element={user ? <Messages user={user} /> : <Navigate to="/login" />} />
            <Route path="/notes" element={user ? <Notes user={user} /> : <Navigate to="/login" />} />
            
            <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
            <Route path="/shift-report" element={user ? <ShiftHandover user={user} /> : <Navigate to="/login" />} />
            <Route path="/production-report" element={user ? <ProductionReport user={user} /> : <Navigate to="/login" />} />
            
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
            
            <Route path="/settings" element={user ? <Settings user={user} onUpdateUser={handleUpdateUser} snowMode={snowMode} setSnowMode={setSnowMode} /> : <Navigate to="/login" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
